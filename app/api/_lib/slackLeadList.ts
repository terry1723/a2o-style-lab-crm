import type { AdLead } from '../../src/features/ad-leads/adLeadService.js'

type SlackApiResponse = {
  ok?: boolean
  error?: string
  response_metadata?: { next_cursor?: string }
  items?: SlackListItem[]
  item?: SlackListItem
  list?: SlackListFile
  file?: SlackListFile
}

type SlackListField = {
  key?: string
  column_id?: string
  value?: unknown
  rich_text?: unknown
  phone?: unknown
  select?: unknown
  rating?: unknown
  user?: unknown
  channel?: unknown
}

type SlackListItem = {
  id?: string
  fields?: SlackListField[]
}

type SlackListChoice = {
  value?: string
  label?: string
}

type SlackListColumn = {
  id?: string
  key?: string
  name?: string
  type?: string
  is_primary_column?: boolean
  options?: {
    choices?: SlackListChoice[]
  }
}

type SlackListFile = {
  id?: string
  title?: string
  list_metadata?: {
    schema?: SlackListColumn[]
  }
}

type FieldPayload = Record<string, unknown> & {
  column_id: string
}

const DEFAULT_LIST_ID = 'F0BNEBT0FC2'
const DEFAULT_LEADS_CHANNEL_ID = 'C0BND5QP3AN'
const SAMPLE_TITLES = new Set(['Swift Supplies', 'Acme Widgets', 'Tech Innovators'])

const OWNER_USER_IDS: Record<string, string> = {
  Terry: process.env.SLACK_OWNER_TERRY_USER_ID || 'U0BMXN5CVBR',
  Ryan: process.env.SLACK_OWNER_RYAN_USER_ID || 'U0BMZ4FB97Z',
  Caren: process.env.SLACK_OWNER_CAREN_USER_ID || 'U0BNHREAMQC',
}

const COLUMN_ALIASES = {
  primary: ['Lead 名稱', '客人', '客人姓名', '交易'],
  amount: ['預計方案金額', '方案金額', '交易金額'],
  priority: ['Lead 溫度', '優先事項', '優先度'],
  stage: ['Pipeline 階段', 'Lead 狀態', '狀態', '階段'],
  channel: ['來源頻道', '頻道'],
  nextStep: ['快速回覆／下一步', '快速回覆模板', '下一步', '後續步驟'],
  contact: ['客人姓名', '主要聯絡人'],
  phone: ['電話／WhatsApp', 'WhatsApp', '電話號碼', '電話'],
  email: ['WhatsApp 連結', 'WhatsApp', '電子郵件地址', 'Email', '電郵'],
  owner: ['負責人', '交易負責人'],
} as const

function getSlackToken(): string {
  const token = process.env.SLACK_BOT_TOKEN
  if (!token) throw new Error('slack_not_configured')
  return token
}

async function slackApi(method: string, body: Record<string, unknown>): Promise<SlackApiResponse> {
  const response = await fetch(`https://slack.com/api/${method}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getSlackToken()}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) throw new Error(`slack_http_${response.status}`)

  const payload = await response.json() as SlackApiResponse
  if (!payload.ok) throw new Error(`slack_api_${method}_${payload.error || 'unknown_error'}`)
  return payload
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function parseJson(value: unknown): unknown {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function collectText(value: unknown): string[] {
  const parsed = parseJson(value)
  if (typeof parsed === 'string') return [parsed]
  if (typeof parsed === 'number' || typeof parsed === 'boolean') return [String(parsed)]
  if (Array.isArray(parsed)) return parsed.flatMap(collectText)
  if (!isRecord(parsed)) return []

  const directKeys = ['text', 'label', 'value', 'originalUrl', 'url', 'name']
  const direct = directKeys.flatMap((key) => key in parsed ? collectText(parsed[key]) : [])
  if (direct.length) return direct
  return Object.values(parsed).flatMap(collectText)
}

function fieldValues(field: SlackListField | undefined): string[] {
  if (!field) return []
  const preferred = [field.phone, field.select, field.user, field.channel, field.rating, field.rich_text, field.value]
  for (const value of preferred) {
    const texts = collectText(value).map((item) => item.trim()).filter(Boolean)
    if (texts.length) return texts
  }
  return []
}

function normalizePhone(value: unknown): string {
  const digits = String(value || '').replace(/\D/g, '')
  if (digits.length > 8 && digits.startsWith('852')) return digits.slice(-8)
  return digits
}

function formatPhoneForSlack(value: unknown): string {
  const digits = normalizePhone(value)
  if (!digits) return ''
  if (digits.length === 8) return `+852${digits}`
  return `+${digits}`
}

function formatPhoneForWhatsApp(value: unknown): string {
  let digits = String(value || '').replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.length === 8) digits = `852${digits}`
  if (digits.length < 8 || digits.length > 15) return ''
  return digits
}

function richText(value: string) {
  return [
    {
      type: 'rich_text',
      elements: [
        {
          type: 'rich_text_section',
          elements: [{ type: 'text', text: value }],
        },
      ],
    },
  ]
}

function richTextLink(text: string, url: string) {
  return [
    {
      type: 'rich_text',
      elements: [
        {
          type: 'rich_text_section',
          elements: [{ type: 'link', url, text }],
        },
      ],
    },
  ]
}

function normalizeLabel(value: unknown): string {
  return String(value || '').trim().toLowerCase().replace(/[\s／/|｜_-]+/g, '')
}

function findColumn(schema: SlackListColumn[], aliases: readonly string[]): SlackListColumn | undefined {
  const normalizedAliases = aliases.map(normalizeLabel)
  return schema.find((column) => {
    const names = [column.name, column.key].map(normalizeLabel)
    return names.some((name) => normalizedAliases.includes(name))
  })
}

function stageAliases(status: AdLead['status']): string[] {
  switch (status) {
    case '未聯絡':
      return ['未聯絡', '新 Lead', 'New Lead', '符合資格']
    case 'WhatsApp 跟進中':
      return ['WhatsApp 跟進中', '已聯絡', '跟進中', '擬議中的提案']
    case '已預約':
      return ['已預約', '等待預約', 'Booked', '正在評估']
    case '已拒絕':
      return ['已拒絕', '未成交', 'Lost', '已失去']
  }
}

function findStageChoice(column: SlackListColumn | undefined, status: AdLead['status']): SlackListChoice | undefined {
  const choices = column?.options?.choices || []
  const aliases = stageAliases(status).map(normalizeLabel)
  const exact = choices.find((choice) => aliases.includes(normalizeLabel(choice.label || choice.value)))
  if (exact) return exact

  const fallbackIndex = status === '未聯絡' ? 0
    : status === 'WhatsApp 跟進中' ? 1
      : status === '已預約' ? 2
        : Math.max(0, choices.length - 1)
  return choices[fallbackIndex]
}

function leadTitle(lead: AdLead): string {
  const icon = lead.status === '未聯絡' ? '🆕'
    : lead.status === 'WhatsApp 跟進中' ? '💬'
      : lead.status === '已預約' ? '✅'
        : '❌'
  return `${icon} ${lead.name}｜${lead.source}`
}

function nextStepText(lead: AdLead): string {
  if (lead.status === '未聯絡') {
    return [
      '你好 ,',
      '',
      '收到你既形象提升申請 👍🏻',
      '想同你約番個時間 做返個諮詢先。',
      '主要睇睇你嘅需要同埋你嘅五官身形等等。',
      '',
      '請問你呢個星期六或日有半小時時間嗎？',
      'https://www.instagram.com/a2o.stylelab?igsh=NXZhc3pzNWdnYndt&utm_source=qr',
      '',
      '地址：香港九龍長沙灣長沙灣道883號億利工業中心204室',
      '（鄰近荔枝角港鐵站D2出口）',
    ].join('\n')
  }
  if (lead.status === 'WhatsApp 跟進中') {
    return '了解客人主要痛點、目的及場合；提供簡單分析，再邀請預約。'
  }
  if (lead.status === '已預約') {
    return '發送預約確認；預約前一日再次提醒。'
  }
  return '記錄未成交原因；有需要時轉入舊 Lead Reactivation。'
}

function whatsappUrl(lead: AdLead): string {
  const phone = formatPhoneForWhatsApp(lead.phone)
  if (!phone) return ''
  const message = lead.status === '未聯絡' ? nextStepText(lead) : ''
  return `https://wa.me/${phone}${message ? `?text=${encodeURIComponent(message)}` : ''}`
}

function whatsAppUrl(lead: AdLead): string {
  const digits = String(lead.phone || '').replace(/\D/g, '')
  const internationalPhone = digits.length === 8 ? `852${digits}` : digits
  return `https://wa.me/${internationalPhone}?text=${encodeURIComponent(nextStepText(lead))}`
}

function priorityRating(lead: AdLead): number {
  if (lead.status === '未聯絡') return 3
  if (lead.status === 'WhatsApp 跟進中') return 2
  return 1
}

function textPayload(column: SlackListColumn | undefined, value: string): FieldPayload | null {
  if (!column?.id || !value) return null
  return { column_id: column.id, rich_text: richText(value) }
}

function linkPayload(column: SlackListColumn | undefined, label: string, url: string): FieldPayload | null {
  if (!column?.id || !url) return null
  return { column_id: column.id, rich_text: richTextLink(label, url) }
}

function whatsappPayload(column: SlackListColumn | undefined, lead: AdLead): FieldPayload | null {
  if (!column?.id) return null
  const url = whatsappUrl(lead)
  if (!url) return textPayload(column, lead.name)
  return {
    column_id: column.id,
    rich_text: richTextLink(`💬 WhatsApp｜${lead.name}`, url),
  }
}

function phonePayload(column: SlackListColumn | undefined, value: string): FieldPayload | null {
  const formatted = formatPhoneForSlack(value)
  if (!column?.id || !formatted) return null
  return { column_id: column.id, phone: [formatted] }
}

function selectPayload(column: SlackListColumn | undefined, choice: SlackListChoice | undefined): FieldPayload | null {
  if (!column?.id || !choice?.value) return null
  return { column_id: column.id, select: [choice.value] }
}

function ratingPayload(column: SlackListColumn | undefined, value: number): FieldPayload | null {
  if (!column?.id) return null
  return { column_id: column.id, rating: [value] }
}

function channelPayload(column: SlackListColumn | undefined, channelId: string): FieldPayload | null {
  if (!column?.id || !channelId) return null
  return { column_id: column.id, channel: [channelId] }
}

function userPayload(column: SlackListColumn | undefined, userId: string | undefined): FieldPayload | null {
  if (!column?.id || !userId) return null
  return { column_id: column.id, user: [userId] }
}

async function listAllItems(listId: string): Promise<SlackListItem[]> {
  const items: SlackListItem[] = []
  let cursor = ''
  do {
    const payload = await slackApi('slackLists.items.list', {
      list_id: listId,
      limit: 100,
      ...(cursor ? { cursor } : {}),
    })
    items.push(...(payload.items || []))
    cursor = payload.response_metadata?.next_cursor || ''
  } while (cursor)
  return items
}

async function loadListFile(listId: string, items: SlackListItem[]): Promise<SlackListFile> {
  const firstId = items.find((item) => item.id)?.id
  if (firstId) {
    const info = await slackApi('slackLists.items.info', { list_id: listId, id: firstId })
    if (info.list?.list_metadata?.schema) return info.list
  }

  const fileInfo = await slackApi('files.info', { file: listId })
  if (fileInfo.file?.list_metadata?.schema) return fileInfo.file
  throw new Error('slack_list_schema_unavailable')
}

function currentField(item: SlackListItem, column: SlackListColumn | undefined): SlackListField | undefined {
  if (!column?.id) return undefined
  return (item.fields || []).find((field) => field.column_id === column.id || field.key === column.key)
}

function sameText(item: SlackListItem, column: SlackListColumn | undefined, expected: string): boolean {
  if (!column?.id) return true
  return fieldValues(currentField(item, column)).join(' ').includes(expected)
}

function samePhone(item: SlackListItem, column: SlackListColumn | undefined, expected: string): boolean {
  if (!column?.id) return true
  return normalizePhone(fieldValues(currentField(item, column))[0]) === normalizePhone(expected)
}

function sameSelect(item: SlackListItem, column: SlackListColumn | undefined, expected: SlackListChoice | undefined): boolean {
  if (!column?.id || !expected?.value) return true
  return fieldValues(currentField(item, column)).includes(expected.value)
}

function buildFields(
  lead: AdLead,
  columns: Record<keyof typeof COLUMN_ALIASES, SlackListColumn | undefined>,
  leadsChannelId: string,
): FieldPayload[] {
  const stageChoice = findStageChoice(columns.stage, lead.status)
  return [
    textPayload(columns.primary, leadTitle(lead)),
    ratingPayload(columns.priority, priorityRating(lead)),
    selectPayload(columns.stage, stageChoice),
    channelPayload(columns.channel, leadsChannelId),
    textPayload(columns.nextStep, nextStepText(lead)),
    whatsappPayload(columns.contact, lead),
    phonePayload(columns.phone, lead.phone),
    userPayload(columns.owner, OWNER_USER_IDS[lead.owner]),
  ].filter((field): field is FieldPayload => Boolean(field))
}

function rowNeedsUpdate(
  item: SlackListItem,
  lead: AdLead,
  columns: Record<keyof typeof COLUMN_ALIASES, SlackListColumn | undefined>,
): boolean {
  return !sameText(item, columns.primary, lead.name)
    || !samePhone(item, columns.phone, lead.phone)
    || !sameSelect(item, columns.stage, findStageChoice(columns.stage, lead.status))
    || !sameText(item, columns.nextStep, nextStepText(lead).slice(0, 35))
    || !sameText(item, columns.contact, whatsappUrl(lead) || lead.name)
}

function uniqueLatestLeads(leads: AdLead[]): AdLead[] {
  const seen = new Set<string>()
  return leads.filter((lead) => {
    const phone = normalizePhone(lead.phone)
    if (!phone || seen.has(phone)) return false
    seen.add(phone)
    return true
  })
}


function stageStatus(column: SlackListColumn | undefined, values: string[]): AdLead['status'] | null {
  const statuses: AdLead['status'][] = ['未聯絡', 'WhatsApp 跟進中', '已預約', '已拒絕']
  const choices = column?.options?.choices || []

  for (const rawValue of values) {
    const choice = choices.find((item) => item.value === rawValue)
    const candidates = [rawValue, choice?.label || '', choice?.value || ''].map(normalizeLabel).filter(Boolean)
    for (const status of statuses) {
      const aliases = stageAliases(status).map(normalizeLabel)
      if (candidates.some((candidate) => aliases.includes(candidate))) return status
    }
  }
  return null
}

export async function readA2OLeadListStatuses(): Promise<Record<string, AdLead['status']>> {
  const listId = process.env.SLACK_LEAD_LIST_ID || DEFAULT_LIST_ID
  const items = await listAllItems(listId)
  const listFile = await loadListFile(listId, items)
  const schema = listFile.list_metadata?.schema || []
  const stageColumn = findColumn(schema, COLUMN_ALIASES.stage) || schema[3]
  const phoneColumn = findColumn(schema, COLUMN_ALIASES.phone) || schema[7]

  if (!stageColumn?.id || !phoneColumn?.id) throw new Error('slack_list_status_columns_missing')

  const statuses: Record<string, AdLead['status']> = {}
  for (const item of items) {
    const phone = normalizePhone(fieldValues(currentField(item, phoneColumn))[0])
    if (!phone) continue
    const status = stageStatus(stageColumn, fieldValues(currentField(item, stageColumn)))
    if (status) statuses[phone] = status
  }
  return statuses
}

export async function syncA2OLeadList(leads: AdLead[]) {
  const listId = process.env.SLACK_LEAD_LIST_ID || DEFAULT_LIST_ID
  const leadsChannelId = process.env.SLACK_LEADS_CHANNEL_ID || DEFAULT_LEADS_CHANNEL_ID

  await slackApi('slackLists.update', {
    id: listId,
    name: 'A2O Lead Pipeline',
    description_blocks: richText('A2O 新 Lead 自動同步｜未聯絡 → WhatsApp 跟進中 → 已預約 → 已拒絕。電話旁邊可一鍵開啟 WhatsApp；未聯絡 Lead 會自動預填「後續步驟」訊息。'),
  })

  let items = await listAllItems(listId)
  const listFile = await loadListFile(listId, items)
  const schema = listFile.list_metadata?.schema || []
  const namedColumns = Object.fromEntries(
    Object.entries(COLUMN_ALIASES).map(([key, aliases]) => [key, findColumn(schema, aliases)]),
  ) as Record<keyof typeof COLUMN_ALIASES, SlackListColumn | undefined>
  const fallbackIndexes: Record<keyof typeof COLUMN_ALIASES, number> = {
    primary: 0,
    amount: 1,
    priority: 2,
    stage: 3,
    channel: 4,
    nextStep: 5,
    contact: 6,
    phone: 7,
    email: 8,
    owner: 9,
  }
  const columns = Object.fromEntries(
    (Object.keys(COLUMN_ALIASES) as Array<keyof typeof COLUMN_ALIASES>)
      .map((key) => [key, namedColumns[key] || schema[fallbackIndexes[key]]]),
  ) as Record<keyof typeof COLUMN_ALIASES, SlackListColumn | undefined>

  if (!columns.primary?.id || !columns.stage?.id || !columns.phone?.id) {
    throw new Error('slack_list_required_columns_missing')
  }

  const sampleRows = items.filter((item) =>
    (item.fields || []).some((field) =>
      fieldValues(field).some((value) => SAMPLE_TITLES.has(value.trim())),
    ),
  )
  for (const item of sampleRows) {
    if (item.id) await slackApi('slackLists.items.delete', { list_id: listId, id: item.id })
  }
  if (sampleRows.length) items = items.filter((item) => !sampleRows.includes(item))

  const existingByPhone = new Map<string, SlackListItem>()
  for (const item of items) {
    const phone = normalizePhone(fieldValues(currentField(item, columns.phone))[0])
    if (phone && !existingByPhone.has(phone)) existingByPhone.set(phone, item)
  }

  const orderedLeads = uniqueLatestLeads(leads).sort((a, b) => {
    const rank = (status: AdLead['status']) => status === '未聯絡' ? 0
      : status === 'WhatsApp 跟進中' ? 1
        : status === '已預約' ? 2
          : 3
    return rank(a.status) - rank(b.status)
  })

  const maxCreates = Math.max(1, Number(process.env.SLACK_LIST_MAX_CREATES_PER_RUN || 40))
  const maxUpdates = Math.max(1, Number(process.env.SLACK_LIST_MAX_UPDATES_PER_RUN || 40))
  let created = 0
  let updated = 0
  let createFailures = 0
  let updateFailures = 0
  const createErrors: string[] = []
  const updateErrors: string[] = []

  for (const lead of orderedLeads) {
    const phone = normalizePhone(lead.phone)
    const existing = existingByPhone.get(phone)
    if (!existing) {
      if (created >= maxCreates) continue
      try {
        const result = await slackApi('slackLists.items.create', {
          list_id: listId,
          initial_fields: buildFields(lead, columns, leadsChannelId),
        })
        if (result.item) existingByPhone.set(phone, result.item)
        created += 1
      } catch (error) {
        createFailures += 1
        if (createErrors.length < 5) {
          createErrors.push(error instanceof Error ? error.message : 'slack_list_create_failed')
        }
      }
      continue
    }

    if (!existing.id || updated >= maxUpdates || !rowNeedsUpdate(existing, lead, columns)) continue
    const cells = buildFields(lead, columns, leadsChannelId).map((field) => ({
      ...field,
      row_id: existing.id,
    }))
    try {
      await slackApi('slackLists.items.update', { list_id: listId, cells })
      updated += 1
    } catch (error) {
      updateFailures += 1
      if (updateErrors.length < 5) {
        updateErrors.push(error instanceof Error ? error.message : 'slack_list_update_failed')
      }
    }
  }

  return {
    listId,
    totalLeads: orderedLeads.length,
    existingRows: items.length,
    sampleRowsRemoved: sampleRows.length,
    created,
    updated,
    createFailures,
    updateFailures,
    createErrors,
    updateErrors,
  }
}
