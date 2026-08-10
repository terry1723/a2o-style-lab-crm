// Google Apps Script coordinator for the four approved advertising lead tabs.
// AdLeadInbox.gs is loaded in the same Apps Script project and provides
// SOURCE_CONFIG and readSource(source). This file owns cursors, signing and
// installable triggers; it never holds Slack or Supabase privileged keys.

var SYNC_CURSOR_PREFIX = 'CURSOR_'
var SYNC_BATCH_LIMIT = 100
var SYNC_HANDLERS = ['runFiveMinuteSync', 'runFormSubmitSync']

function syncProperty(key) {
  return PropertiesService.getScriptProperties().getProperty(key)
}

function setSyncProperty(key, value) {
  PropertiesService.getScriptProperties().setProperty(key, String(value))
}

function cursorKey(source) {
  return SYNC_CURSOR_PREFIX + String(source.spreadsheetId + '_' + source.sheetName).replace(/[^A-Za-z0-9_]/g, '_')
}

function sourceRowNumber(lead) {
  var parts = String(lead && lead.id ? lead.id : '').split(':')
  var rowNumber = Number(parts[parts.length - 1])
  return isFinite(rowNumber) ? rowNumber : 0
}

function sourceIncrement(source, rows) {
  var cursor = Number(syncProperty(cursorKey(source)) || 0)
  var maxRow = cursor
  rows.forEach(function (lead) {
    maxRow = Math.max(maxRow, sourceRowNumber(lead))
  })

  var newRows = rows.filter(function (lead) { return sourceRowNumber(lead) > cursor })
  if (newRows.length === 0) return { rows: [], nextCursor: cursor }

  // Re-read the last ten rows whenever the source advances. source_key makes
  // these overlap rows idempotent while allowing recovery from a partial run.
  var overlapStart = Math.max(2, cursor - 9)
  return {
    rows: rows.filter(function (lead) {
      var rowNumber = sourceRowNumber(lead)
      return rowNumber >= overlapStart && rowNumber <= maxRow
    }),
    nextCursor: maxRow,
  }
}

function hexBytes(bytes) {
  return bytes.map(function (byte) {
    var unsigned = byte < 0 ? byte + 256 : byte
    return ('0' + unsigned.toString(16)).slice(-2)
  }).join('')
}

function syncSignature(secret, timestamp, requestId, rawBody) {
  var message = timestamp + '\n' + requestId + '\n' + rawBody
  return 'sha256=' + hexBytes(Utilities.computeHmacSha256Signature(message, secret))
}

function isoSubmittedAt(value) {
  var raw = String(value == null ? '' : value).trim()
  var parsed = new Date(raw)
  if (!isNaN(parsed.getTime())) return parsed.toISOString()
  var match = raw.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(上午|下午)\s+(\d{1,2}):(\d{2}):(\d{2})$/)
  if (!match) throw new Error('invalid_submitted_at')
  var hour = Number(match[5])
  if (match[4] === '下午' && hour < 12) hour += 12
  if (match[4] === '上午' && hour === 12) hour = 0
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), hour - 8, Number(match[6]), Number(match[7]))).toISOString()
}

function callSyncFunction(trigger, rows) {
  var endpoint = syncProperty('AD_LEAD_EDGE_FUNCTION_URL')
  var secret = syncProperty('AD_LEAD_INGEST_HMAC_SECRET')
  if (!endpoint || !secret) throw new Error('edge_sync_not_configured')

  var requestId = Utilities.getUuid()
  var timestamp = String(Math.floor(new Date().getTime() / 1000))
  var payloadRows = rows.map(function (row) {
    return {
      sourceKey: row.source + ':' + row.id,
      sourceForm: row.source,
      sourceId: row.id,
      submittedAt: isoSubmittedAt(row.submittedAt),
      name: row.name,
      phone: row.phone,
      tag: row.tag || '',
    }
  })
  var rawBody = JSON.stringify({ requestId: requestId, sentAt: new Date().toISOString(), trigger: trigger, rows: payloadRows })
  var response = UrlFetchApp.fetch(endpoint, {
    method: 'post',
    contentType: 'application/json',
    payload: rawBody,
    headers: {
      'X-A2O-Request-Id': requestId,
      'X-A2O-Timestamp': timestamp,
      'X-A2O-Signature': syncSignature(secret, timestamp, requestId, rawBody),
    },
    muteHttpExceptions: true,
  })
  var code = response.getResponseCode()
  var payload = {}
  try { payload = JSON.parse(response.getContentText() || '{}') } catch (error) { payload = {} }
  if (code < 200 || code >= 300 || payload.ok !== true) throw new Error('edge_sync_failed')
  return payload
}

function syncSources(trigger) {
  var lock = LockService.getScriptLock()
  lock.waitLock(1000)
  try {
    var config = typeof SOURCE_CONFIG === 'undefined' ? [] : SOURCE_CONFIG
    if (!config.length) throw new Error('source_config_missing')
    var requestCount = 0
    var importedRows = 0
    var advancedSources = 0
    var unavailableSources = []

    config.forEach(function (source) {
      var rows
      try {
        rows = readSource(source)
      } catch (error) {
        unavailableSources.push(source.source)
        return
      }
      var increment = sourceIncrement(source, rows)
      if (increment.rows.length === 0) return

      for (var offset = 0; offset < increment.rows.length; offset += SYNC_BATCH_LIMIT) {
        var batch = increment.rows.slice(offset, offset + SYNC_BATCH_LIMIT)
        callSyncFunction(trigger, batch)
        requestCount += 1
        importedRows += batch.length
      }
      setSyncProperty(cursorKey(source), increment.nextCursor)
      advancedSources += 1
    })

    // This heartbeat drains CRM status/owner/appointment Outbox rows even
    // when no Sheet source has a new row.
    if (requestCount === 0) {
      callSyncFunction(trigger, [])
      requestCount = 1
    }
    return { ok: true, trigger: trigger, requests: requestCount, rows: importedRows, sourcesAdvanced: advancedSources, unavailableSources: unavailableSources }
  } finally {
    if (lock.hasLock()) lock.releaseLock()
  }
}

function runFiveMinuteSync() {
  return syncSources('five_minute')
}

function runFormSubmitSync(event) {
  return syncSources('form_submit')
}

function installA2OTriggers() {
  var existing = ScriptApp.getProjectTriggers()
  existing.forEach(function (trigger) {
    if (SYNC_HANDLERS.indexOf(trigger.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(trigger)
  })

  var config = typeof SOURCE_CONFIG === 'undefined' ? [] : SOURCE_CONFIG
  var spreadsheets = {}
  config.forEach(function (source) { spreadsheets[source.spreadsheetId] = true })
  Object.keys(spreadsheets).forEach(function (spreadsheetId) {
    ScriptApp.newTrigger('runFormSubmitSync').forSpreadsheet(spreadsheetId).onFormSubmit().create()
  })
  ScriptApp.newTrigger('runFiveMinuteSync').timeBased().everyMinutes(5).create()
}
