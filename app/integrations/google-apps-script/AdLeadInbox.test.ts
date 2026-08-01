import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Script, createContext } from 'node:vm'
import { describe, expect, it } from 'vitest'

const scriptPath = join(process.cwd(), 'integrations/google-apps-script/AdLeadInbox.gs')

it('provides a dedicated read-only advertising lead inbox Apps Script', () => {
  expect(existsSync(scriptPath)).toBe(true)
})

const loadInboxContract = () => {
  const source = readFileSync(scriptPath, 'utf8')
  const context = createContext({})
  new Script(`${source}\n;globalThis.__inboxContract = { SOURCE_CONFIG, findHeaderIndex, normalizeLeadRow };`).runInContext(context)
  return {
    source,
    contract: (context as { __inboxContract: InboxContract }).__inboxContract,
  }
}

type SourceConfig = {
  source: string
  spreadsheetId: string
  sheetName: string
  submittedAt: string[]
  name: string[]
  phone: string[]
  tag: string[]
}

type NormalizedLead = {
  source: string
  id: string
  submittedAt: string
  name: string
  phone: string
  tag: string
}

type InboxContract = {
  SOURCE_CONFIG: SourceConfig[]
  findHeaderIndex(headers: string[], candidates: string[]): number
  normalizeLeadRow(source: SourceConfig, rowNumber: number, headers: string[], row: string[]): NormalizedLead | null
}

describe.runIf(existsSync(scriptPath))('advertising lead inbox Apps Script contract', () => {
  it('limits reads to the four approved sources and uses the read secret', () => {
    const { source, contract } = loadInboxContract()

    expect(contract.SOURCE_CONFIG).toEqual([
      {
        source: 'Men New Form',
        spreadsheetId: '1BGJtbAbJekS_94c6KCVpMTsob8zcZQT0qTO9vPuPUOI',
        sheetName: 'men-new form',
        submittedAt: ['時間戳記', 'created_time'],
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
    ])
    expect(source).toContain("getProperty('AD_LEAD_READ_SECRET')")
    expect(source).toContain('function doGet(event)')
    expect(source).not.toMatch(/\.(appendRow|setValue|setValues|deleteRow|deleteRows|clear|insertRowBefore|insertRowAfter)\s*\(/)
  })

  it('maps each approved header layout and omits rows missing a required field', () => {
    const { contract } = loadInboxContract()

    const examples = [
      { source: 0, headers: ['時間戳記', '姓名', '聯絡電話', 'form_name'], row: ['2026-07-28 09:10:00', '陳大文', '91234567', 'Meta July'] },
      { source: 1, headers: ['時間戳記', '你的姓名', 'WhatsApp 聯絡電話', '第 1 欄'], row: ['2026-07-28 10:20:00', '李小明', '92345678', 'IG Lead'] },
      { source: 2, headers: ['created_time', 'full_name', 'phone_number', 'ad_name'], row: ['2026-07-28T11:30:00+08:00', '王志明', '93456789', 'Campaign B'] },
      { source: 3, headers: ['提交時間', '稱呼／姓名', 'WhatsApp', 'UTM來源'], row: ['2026-07-28 12:40:00', '周先生', '94567890', 'google'] },
    ]

    for (const example of examples) {
      const config = contract.SOURCE_CONFIG[example.source]
      expect(contract.normalizeLeadRow(config, 7, example.headers, example.row)).toEqual({
        source: config.source,
        id: `${config.spreadsheetId}:${config.sheetName}:7`,
        submittedAt: example.row[0],
        name: example.row[1],
        phone: example.row[2],
        tag: example.row[3],
      })
    }

    const config = contract.SOURCE_CONFIG[0]
    expect(contract.normalizeLeadRow(config, 8, ['時間戳記', '姓名', '聯絡電話', 'form_name'], ['2026-07-28', '', '91234567', 'Meta'])).toBeNull()
  })

  it('keeps website leads when the optional UTM tag is blank', () => {
    const { contract } = loadInboxContract()
    const config = contract.SOURCE_CONFIG[3]

    expect(contract.normalizeLeadRow(
      config,
      3,
      ['提交時間', '稱呼／姓名', 'WhatsApp', 'UTM來源'],
      ['2026-07-29 20:07:21', 'Website Lead', '90000000', ''],
    )).toEqual({
      source: 'A2O Website',
      id: '1Xi_u4DYkkMtpl7ClpaxwOyGjU7VAud6d8_uQGmQRHcY:a2owebsite:3',
      submittedAt: '2026-07-29 20:07:21',
      name: 'Website Lead',
      phone: '90000000',
      tag: '',
    })
  })

  it('normalizes Meta lead rows appended with their own column layout', () => {
    const { contract } = loadInboxContract()
    const config = contract.SOURCE_CONFIG[0]
    const headers = [
      '時間戳記', '姓名', '聯絡電話', '您的職業', '動機', '目前最需優化的盲點',
      '願景', '同意', 'id', 'created_time', 'ad_id', 'ad_name', 'adset_id',
      'adset_name', 'campaign_id', 'campaign_name', 'form_id', 'form_name',
      'is_organic', 'platform', '改善方向', '目標', '開始時間', 'full_name',
      'whatsapp_電話號碼', 'lead_status',
    ]
    const row = [
      'l:1437781044863568', '2026-07-30T08:06:32-05:00', 'ag:52547019454721',
      'martin post 3', 'as:52547019454521', 'martin post 3', 'c:52547019454321',
      'martin post 3', 'f:1321249740153661', 'A2O MENS｜男士形象管理初步諮詢表-copy',
      'false', 'ig', '身型比例', '提升自信與氣場', '暫時希望先了解服務內容',
      'Oi Yat Leung', '+85256051618', '', '', '', '', '', '', '', '', 'CREATED',
    ]

    expect(contract.normalizeLeadRow(config, 19, headers, row)).toEqual({
      source: config.source,
      id: `${config.spreadsheetId}:${config.sheetName}:19`,
      submittedAt: '2026-07-30T08:06:32-05:00',
      name: 'Oi Yat Leung',
      phone: '+85256051618',
      tag: 'A2O MENS｜男士形象管理初步諮詢表-copy',
    })
  })
})
