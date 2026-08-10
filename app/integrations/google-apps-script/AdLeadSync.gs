// Google Apps Script coordinator for the four approved advertising lead tabs.
// AdLeadInbox.gs is loaded in the same Apps Script project and provides
// SOURCE_CONFIG and readSource(source). This file owns cursors, signing and
// installable triggers; it never holds Slack or Supabase privileged keys.

var SYNC_CURSOR_PREFIX = 'CURSOR_'
var SYNC_BATCH_LIMIT = 100
var SYNC_TIME_BUDGET_MS = 240000
var SYNC_HANDLERS = ['runFiveMinuteSync', 'runFormSubmitSync']

function sourceStatusKey(source, suffix) {
  return cursorKey(source) + '_' + suffix
}

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
  var raw = String(value == null ? '' : value).replace(/[\u00a0\u3000\t]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (!raw) throw new Error('invalid_submitted_at')
  var parsed = new Date(raw)
  if (!isNaN(parsed.getTime())) return parsed.toISOString()
  // Google Sheets may return locale-formatted values such as
  // `2026/7/31 下午 4:25` (seconds omitted) or `上午12:19:04` (no space).
  // Some tabs use Chinese 年／月／日 separators, so deliberately extract
  // the date/time tokens instead of relying on one locale's exact spacing.
  var match = raw.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})\D+(上午|下午)?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?/)
  if (!match) {
    console.log('invalid_submitted_at_raw=' + raw)
    throw new Error('invalid_submitted_at')
  }
  var hour = Number(match[5])
  if (match[4] === '下午' && hour < 12) hour += 12
  if (match[4] === '上午' && hour === 12) hour = 0
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), hour - 8, Number(match[6]), Number(match[7] || 0))).toISOString()
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
  var jsonBody = JSON.stringify({ requestId: requestId, sentAt: new Date().toISOString(), trigger: trigger, rows: payloadRows })
  // Sign and send an ASCII-only envelope. UrlFetchApp has been observed to
  // transcode non-empty JSON payloads, which changes the server-side HMAC.
  var rawBody = Utilities.base64Encode(Utilities.newBlob(jsonBody, 'application/json').getBytes())
  var requestSignature = syncSignature(secret, timestamp, requestId, rawBody)
  var response
  try {
    response = UrlFetchApp.fetch(endpoint, {
      method: 'post',
      contentType: 'application/json',
      payload: rawBody,
      headers: {
        'X-A2O-Request-Id': requestId,
        'X-A2O-Timestamp': timestamp,
        'X-A2O-Signature': requestSignature,
        'X-A2O-Body-Encoding': 'base64',
      },
      muteHttpExceptions: true,
    })
  } catch (error) {
    console.log('edge_fetch_error=' + String(error))
    throw new Error('edge_sync_failed')
  }
  var code = response.getResponseCode()
  var payload = {}
  try { payload = JSON.parse(response.getContentText() || '{}') } catch (error) { payload = {} }
  if (code < 200 || code >= 300 || payload.ok !== true) {
    console.log('edge_response_code=' + code + ' body=' + response.getContentText().slice(0, 500))
    throw new Error('edge_sync_failed')
  }
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
    var startedAt = new Date().getTime()

    for (var sourceIndex = 0; sourceIndex < config.length; sourceIndex += 1) {
      if (new Date().getTime() - startedAt >= SYNC_TIME_BUDGET_MS) {
        unavailableSources.push('time_budget_exceeded')
        break
      }
      var source = config[sourceIndex]
      var rows
      try {
        rows = readSource(source)
      } catch (error) {
        unavailableSources.push(source.source)
        setSyncProperty(sourceStatusKey(source, 'LAST_ERROR'), 'source_read_failed')
        continue
      }
      var increment = sourceIncrement(source, rows)
      if (increment.rows.length === 0) continue

      for (var offset = 0; offset < increment.rows.length; offset += SYNC_BATCH_LIMIT) {
        var batch = increment.rows.slice(offset, offset + SYNC_BATCH_LIMIT)
        var accepted
        try {
          accepted = callSyncFunction(trigger, batch)
        } catch (error) {
          setSyncProperty(sourceStatusKey(source, 'LAST_ERROR'), 'edge_sync_failed')
          throw error
        }
        if (accepted && accepted.requestId) setSyncProperty(sourceStatusKey(source, 'LAST_REQUEST_ID'), accepted.requestId)
        requestCount += 1
        importedRows += batch.length
      }
      setSyncProperty(cursorKey(source), increment.nextCursor)
      setSyncProperty(sourceStatusKey(source, 'LAST_SUCCESS_AT'), new Date().toISOString())
      setSyncProperty(sourceStatusKey(source, 'LAST_ERROR'), '')
      advancedSources += 1
    }

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
