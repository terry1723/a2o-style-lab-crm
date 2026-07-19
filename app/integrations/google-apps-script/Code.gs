const SPREADSHEET_ID = '1Xi_u4DYkkMtpl7ClpaxwOyGjU7VAud6d8_uQGmQRHcY'
const SHEET_NAME = '工作表1'
const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{16,80}$/

function jsonResponse(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON)
}

function safeText(value, maximumLength) {
  const text = String(value == null ? '' : value).trim().slice(0, maximumLength)
  return /^[=+\-@]/.test(text) ? "'" + text : text
}

function requireText(payload, key, maximumLength) {
  const value = safeText(payload[key], maximumLength)
  if (!value) throw new Error('invalid_' + key)
  return value
}

function doPost(event) {
  const lock = LockService.getScriptLock()
  try {
    const payload = JSON.parse(event && event.postData ? event.postData.contents || '{}' : '{}')
    const expectedSecret = PropertiesService.getScriptProperties().getProperty('SHARED_SECRET')
    if (!expectedSecret || payload.secret !== expectedSecret) {
      return jsonResponse({ ok: false, error: 'unauthorized' })
    }

    const sessionId = requireText(payload, 'sessionId', 80)
    if (!SESSION_ID_PATTERN.test(sessionId)) return jsonResponse({ ok: false, error: 'invalid_session_id' })

    const submittedDate = new Date(payload.submittedAt)
    if (isNaN(submittedDate.getTime())) return jsonResponse({ ok: false, error: 'invalid_submitted_at' })

    const row = [
      Utilities.formatDate(submittedDate, 'Asia/Hong_Kong', 'yyyy-MM-dd HH:mm:ss'),
      sessionId,
      requireText(payload, 'name', 80),
      requireText(payload, 'phone', 20),
      requireText(payload, 'q1', 20),
      requireText(payload, 'q2', 200),
      requireText(payload, 'q3', 200),
      requireText(payload, 'q4', 200),
      requireText(payload, 'resultTitle', 120),
      requireText(payload, 'photoPath', 500),
      requireText(payload, 'photoSignedUrl', 2000),
      safeText(payload.utmSource, 200),
      '新提交',
    ]

    lock.waitLock(10000)
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME)
    if (!sheet) return jsonResponse({ ok: false, error: 'sheet_missing' })

    const lastRow = sheet.getLastRow()
    if (lastRow > 1) {
      const existingSessionIds = sheet.getRange(2, 2, lastRow - 1, 1).getDisplayValues().flat()
      if (existingSessionIds.indexOf(sessionId) >= 0) {
        return jsonResponse({ ok: true, duplicate: true })
      }
    }

    sheet.appendRow(row)
    return jsonResponse({ ok: true, duplicate: false })
  } catch (error) {
    return jsonResponse({ ok: false, error: 'write_failed' })
  } finally {
    if (lock.hasLock()) lock.releaseLock()
  }
}
