import { normalizePhone } from '../../src/features/ad-leads/adLeadCanonical.js'
import {
  AD_LEAD_OWNERS,
  AD_LEAD_STATUSES,
  type AdLeadOwner,
  type AdLeadStatus,
} from '../../src/features/ad-leads/adLeadService.js'
import type { CanonicalLeadSnapshot } from './adLeadCanonical.js'

export type SlackColumnMap = Partial<Record<
  'lead' | 'status' | 'owner' | 'phone' | 'whatsapp' | 'sourceForm' | 'tag'
  | 'latestSubmittedAt' | 'appointmentAt' | 'nextStep',
  string
>>

export type SlackLeadPipelineConfig = {
  token: string
  listId: string
  columnMap: SlackColumnMap
  statusOptionMap: Partial<Record<AdLeadStatus, string>>
  ownerUserMap: Partial<Record<AdLeadOwner, string>>
}

export type SlackField = {
  column_id: string
  row_id?: string
  rich_text?: Array<{
    type: 'rich_text'
    elements: Array<{
      type: 'rich_text_section'
      elements: Array<{ type: 'text'; text: string }>
    }>
  }>
  select?: string[]
  user?: string[]
  phone?: string[]
  date?: string[]
  link?: Array<{ original_url: string; display_as_url: boolean; display_name: string }>
}

type SlackApiResponse = Record<string, unknown> & { ok?: boolean; error?: string }
type SlackFetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export class SlackApiError extends Error {
  readonly code: string
  readonly retryAfterSeconds?: number

  constructor(code: string, retryAfterSeconds?: number) {
    super(`slack_${code}`)
    this.name = 'SlackApiError'
    this.code = code
    this.retryAfterSeconds = retryAfterSeconds
  }
}

const RETRYABLE_HTTP_CODES = new Set([408, 429, 500, 502, 503, 504])

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function parseJsonObject(value: string | undefined, key: string): Record<string, string> {
  if (!value) throw new Error(`slack_${key}_not_configured`)
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error(`slack_${key}_invalid`)
  }
  if (!isRecord(parsed) || Object.entries(parsed).some(([entryKey, entryValue]) => typeof entryKey !== 'string' || typeof entryValue !== 'string' || !entryValue)) {
    throw new Error(`slack_${key}_invalid`)
  }
  return parsed as Record<string, string>
}

export function loadSlackLeadPipelineConfig(env: Record<string, string | undefined> = process.env): SlackLeadPipelineConfig {
  const token = env.SLACK_BOT_TOKEN?.trim()
  const listId = env.SLACK_LEAD_PIPELINE_LIST_ID?.trim()
  if (!token) throw new Error('slack_bot_token_not_configured')
  if (!listId) throw new Error('slack_lead_pipeline_list_not_configured')

  const configuredOwnerMap = parseJsonObject(env.SLACK_OWNER_USER_MAP, 'owner_user_map')
  const ownerUserMap = Object.fromEntries(AD_LEAD_OWNERS.map((owner) => {
    const configured = configuredOwnerMap[owner] ?? configuredOwnerMap[owner.toLowerCase()]
    return [owner, configured]
  }).filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length > 0)) as SlackLeadPipelineConfig['ownerUserMap']

  return {
    token,
    listId,
    columnMap: parseJsonObject(env.SLACK_LIST_COLUMN_MAP, 'list_column_map'),
    statusOptionMap: parseJsonObject(env.SLACK_STATUS_OPTION_MAP, 'status_option_map') as SlackLeadPipelineConfig['statusOptionMap'],
    ownerUserMap,
  }
}

function requireColumn(config: SlackLeadPipelineConfig, key: keyof SlackColumnMap): string {
  const columnId = config.columnMap[key]
  if (!columnId) throw new SlackApiError(`column_${key}_not_configured`)
  return columnId
}

function requireStatusOption(config: SlackLeadPipelineConfig, status: AdLeadStatus): string {
  const optionId = config.statusOptionMap[status]
  if (!optionId) throw new SlackApiError(`status_${status}_not_configured`)
  return optionId
}

function requireOwnerUser(config: SlackLeadPipelineConfig, owner: AdLeadOwner): string {
  const userId = config.ownerUserMap[owner]
  if (!userId) throw new SlackApiError(`owner_${owner}_not_configured`)
  return userId
}

function richText(value: string): SlackField['rich_text'] {
  return [{
    type: 'rich_text',
    elements: [{ type: 'rich_text_section', elements: [{ type: 'text', text: value }] }],
  }]
}

function hongKongDate(value: string | null): string | null {
  if (!value) return null
  const parsed = new Date(value)
  if (!Number.isFinite(parsed.getTime())) return null
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Hong_Kong', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(parsed)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  if (!values.year || !values.month || !values.day) return null
  return `${values.year}-${values.month}-${values.day}`
}

function hongKongDateTime(value: string | null): string | null {
  if (!value) return null
  const parsed = new Date(value)
  if (!Number.isFinite(parsed.getTime())) return null
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Hong_Kong', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(parsed)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  if (!values.year || !values.month || !values.day || !values.hour || !values.minute) return null
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}`
}

function nextStepForLead(lead: CanonicalLeadSnapshot): string {
  switch (lead.status) {
    case '未聯絡': return '首次聯絡客人，了解主要形象問題及合適諮詢時間。'
    case 'WhatsApp 跟進中': return '了解客人主要痛點、目的及場合；提供簡單分析，再邀請預約。'
    case '已預約': {
      const appointment = hongKongDateTime(lead.appointmentAt)
      return appointment ? `已預約：${appointment}` : '已標記為已預約，待補充預約時間。'
    }
    case '已拒絕': return '客人暫不考慮；保留記錄，不再主動跟進。'
  }
}

export function buildSlackLeadFields(lead: CanonicalLeadSnapshot, config: SlackLeadPipelineConfig): SlackField[] {
  const fields: SlackField[] = []
  const addText = (key: keyof SlackColumnMap, value: string | null | undefined) => {
    if (!value) return
    fields.push({ column_id: requireColumn(config, key), rich_text: richText(value) })
  }
  const addDate = (key: keyof SlackColumnMap, value: string | null) => {
    if (!value) return
    fields.push({ column_id: requireColumn(config, key), date: [value] })
  }

  addText('lead', `💬 ${lead.name}｜${lead.source}`)
  fields.push({ column_id: requireColumn(config, 'status'), select: [requireStatusOption(config, lead.status)] })
  fields.push({ column_id: requireColumn(config, 'owner'), user: [requireOwnerUser(config, lead.owner)] })
  fields.push({ column_id: requireColumn(config, 'phone'), phone: [lead.phone] })
  fields.push({
    column_id: requireColumn(config, 'whatsapp'),
    link: [{ original_url: `https://wa.me/${lead.normalizedPhone}`, display_as_url: false, display_name: 'WhatsApp' }],
  })
  addText('sourceForm', lead.source)
  addText('tag', lead.tag)
  addDate('latestSubmittedAt', hongKongDate(lead.submittedAt))
  // Keep the selected slot, not only the calendar date, in Slack.  The
  // mapped column should therefore be a rich-text/text column.
  addText('appointmentAt', hongKongDateTime(lead.appointmentAt))
  addText('nextStep', nextStepForLead(lead))
  return fields
}

async function readSlackResponse(response: Response): Promise<SlackApiResponse> {
  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new SlackApiError(response.ok ? 'invalid_response' : 'service_unavailable')
  }
  if (!isRecord(payload)) throw new SlackApiError('invalid_response')
  if (!response.ok) {
    const retryAfter = Number(response.headers.get('retry-after') ?? '')
    const retryAfterSeconds = Number.isFinite(retryAfter) && retryAfter >= 0 ? retryAfter : undefined
    const code = response.status === 429 ? 'ratelimited' : RETRYABLE_HTTP_CODES.has(response.status) ? 'service_unavailable' : 'http_error'
    throw new SlackApiError(code, retryAfterSeconds)
  }
  if (payload.ok !== true) throw new SlackApiError(typeof payload.error === 'string' ? payload.error : 'api_error')
  return payload as SlackApiResponse
}

export async function callSlackApi(
  method: string,
  payload: Record<string, unknown>,
  options: { token: string; fetcher?: SlackFetcher } = { token: '' },
): Promise<SlackApiResponse> {
  const fetcher = options.fetcher ?? fetch
  if (!options.token) throw new SlackApiError('token_not_configured')
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  let response: Response
  try {
    response = await fetcher(`https://slack.com/api/${method}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${options.token}`, 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
  } catch (error) {
    const code = isRecord(error) && error.name === 'AbortError' ? 'timeout' : 'network_error'
    throw new SlackApiError(code)
  } finally {
    clearTimeout(timeout)
  }
  return readSlackResponse(response)
}

function fieldPhoneMatches(item: unknown, columnId: string, normalizedPhone: string): boolean {
  if (!isRecord(item) || !Array.isArray(item.fields)) return false
  return item.fields.some((field) => {
    if (!isRecord(field) || field.column_id !== columnId) return false
    const candidates: unknown[] = [field.phone, field.value, field.text]
    return candidates.some((candidate) => {
      if (Array.isArray(candidate)) return candidate.some((entry) => typeof entry === 'string' && normalizePhone(entry) === normalizedPhone)
      return typeof candidate === 'string' && normalizePhone(candidate) === normalizedPhone
    })
  })
}

function itemId(value: unknown): string | null {
  return isRecord(value) && typeof value.id === 'string' && value.id ? value.id : null
}

async function findItemByPhone(config: SlackLeadPipelineConfig, normalizedPhone: string, fetcher: SlackFetcher): Promise<string | null> {
  const matches: string[] = []
  let cursor = ''
  for (let page = 0; page < 20; page += 1) {
    const payload: Record<string, unknown> = { list_id: config.listId, limit: 100, archived: false }
    if (cursor) payload.cursor = cursor
    const result = await callSlackApi('slackLists.items.list', payload, { token: config.token, fetcher })
    const items = Array.isArray(result.items) ? result.items : []
    for (const item of items) {
      if (!fieldPhoneMatches(item, requireColumn(config, 'phone'), normalizedPhone)) continue
      const id = itemId(item)
      if (id) matches.push(id)
    }
    const metadata = isRecord(result.response_metadata) ? result.response_metadata : null
    const next = metadata && typeof metadata.next_cursor === 'string' ? metadata.next_cursor : ''
    if (!next) break
    cursor = next
  }
  if (matches.length > 1) throw new SlackApiError('duplicate_phone_match')
  return matches[0] ?? null
}

function isMissingItemError(error: unknown): boolean {
  return error instanceof SlackApiError && ['record_not_found', 'item_not_found', 'invalid_row_id', 'row_not_found'].includes(error.code)
}

export function createSlackLeadPipeline(options: { config: SlackLeadPipelineConfig; fetcher?: SlackFetcher }) {
  const fetcher = options.fetcher ?? fetch
  const { config } = options

  return {
    async upsertLead(lead: CanonicalLeadSnapshot): Promise<string> {
      let existingId = lead.slackListItemId
      if (!existingId) existingId = await findItemByPhone(config, lead.normalizedPhone, fetcher)
      const fields = buildSlackLeadFields(lead, config)

      if (existingId) {
        try {
          await callSlackApi('slackLists.items.update', {
            list_id: config.listId,
            cells: fields.map((field) => ({ ...field, row_id: existingId })),
          }, { token: config.token, fetcher })
          return existingId
        } catch (error) {
          if (!isMissingItemError(error)) throw error
          const recoveredId = await findItemByPhone(config, lead.normalizedPhone, fetcher)
          if (recoveredId) {
            await callSlackApi('slackLists.items.update', {
              list_id: config.listId,
              cells: fields.map((field) => ({ ...field, row_id: recoveredId })),
            }, { token: config.token, fetcher })
            return recoveredId
          }
        }
      }

      const created = await callSlackApi('slackLists.items.create', {
        list_id: config.listId,
        initial_fields: fields,
      }, { token: config.token, fetcher })
      const createdId = itemId(created.item)
      if (!createdId) throw new SlackApiError('missing_created_item_id')
      return createdId
    },
  }
}

export function createConfiguredSlackLeadPipeline(fetcher?: SlackFetcher) {
  return createSlackLeadPipeline({ config: loadSlackLeadPipelineConfig(), fetcher })
}
