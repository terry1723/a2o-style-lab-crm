const SOURCE_CONFIG = [
  {
    source: 'Men New Form',
    spreadsheetId: '1BGJtbAbJekS_94c6KCVpMTsob8zcZQT0qTO9vPuPUOI',
    sheetName: 'men-new form',
    submittedAt: ['created_time', '時間戳記'],
    name: ['姓名', 'full_name'],
    phone: ['聯絡電話', 'whatsapp_電話號碼'],
    tag: ['form_name', 'ad_name'],
  },
  {
    source: 'Style Lab New Form',
    spreadsheetId: '1BGJtbAbJekS_94c6KCVpMTsob8zcZQT0qTO9vPuPUOI',
    sheetName: 'style lab new form',
    submittedAt: ['時間戳記'],
    name: ['你的姓名'],
    phone: ['WhatsApp 聯絡電話'],
    tag: ['第 1 欄'],
  },
  {
    source: 'A2O Style Lab',
    spreadsheetId: '1q9pwOqwnkwJpPEsjrSJBjWmtbybiLxP5oMNm2yK90zc',
    sheetName: 'a2o style lab',
    submittedAt: ['created_time'],
    name: ['full_name'],
    phone: ['phone_number'],
    tag: ['form_name', 'ad_name'],
  },
  {
    source: 'A2O Website',
    spreadsheetId: '1Xi_u4DYkkMtpl7ClpaxwOyGjU7VAud6d8_uQGmQRHcY',
    sheetName: 'a2owebsite',
    submittedAt: ['提交時間'],
    name: ['稱呼／姓名'],
    phone: ['WhatsApp'],
    tag: ['UTM來源'],
  },
]

function jsonResponse(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON)
}

function text(value) {
  return String(value == null ? '' : value).trim()
}

function findHeaderIndex(headers, candidates) {
  for (let index = 0; index < candidates.length; index += 1) {
    const headerIndex = headers.indexOf(candidates[index])
    if (headerIndex >= 0) return headerIndex
  }
  return -1
}

function normalizeLeadRow(source, rowNumber, headers, row) {
  const submittedAtIndex = findHeaderIndex(headers, source.submittedAt)
  const nameIndex = findHeaderIndex(headers, source.name)
  const phoneIndex = findHeaderIndex(headers, source.phone)
  const tagIndex = findHeaderIndex(headers, source.tag)

  if (submittedAtIndex < 0 || nameIndex < 0 || phoneIndex < 0 || tagIndex < 0) return null

  const submittedAt = text(row[submittedAtIndex])
  const name = text(row[nameIndex])
  const phone = text(row[phoneIndex])
  const tag = text(row[tagIndex])
  if (!submittedAt || !name || !phone || !tag) return null

  return {
    source: source.source,
    id: `${source.spreadsheetId}:${source.sheetName}:${rowNumber}`,
    submittedAt: submittedAt,
    name: name,
    phone: phone,
    tag: tag,
  }
}

function readSource(source) {
  const sheet = SpreadsheetApp.openById(source.spreadsheetId).getSheetByName(source.sheetName)
  if (!sheet) throw new Error('sheet_missing')

  const values = sheet.getDataRange().getDisplayValues()
  if (values.length < 2) return []

  const headers = values[0].map(text)
  const leads = []
  for (let index = 1; index < values.length; index += 1) {
    const lead = normalizeLeadRow(source, index + 1, headers, values[index])
    if (lead) leads.push(lead)
  }
  return leads
}

function doGet(event) {
  const expectedSecret = PropertiesService.getScriptProperties().getProperty('AD_LEAD_READ_SECRET')
  const suppliedSecret = event && event.parameter ? event.parameter.secret : ''
  if (!expectedSecret || suppliedSecret !== expectedSecret) {
    return jsonResponse({ ok: false, error: 'unauthorized' })
  }

  const leads = []
  const unavailableSources = []
  for (let index = 0; index < SOURCE_CONFIG.length; index += 1) {
    const source = SOURCE_CONFIG[index]
    try {
      leads.push(...readSource(source))
    } catch (error) {
      unavailableSources.push(source.source)
    }
  }
  return jsonResponse({ ok: true, leads: leads, unavailableSources: unavailableSources })
}
