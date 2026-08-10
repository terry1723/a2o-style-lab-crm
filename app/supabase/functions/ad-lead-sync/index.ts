import { createClient } from 'jsr:@supabase/supabase-js@2'

const REPLAY_WINDOW_SECONDS = 300
const MAX_ROWS = 100
const OUTBOX_BATCH_SIZE = 25
const RETRYABLE_CODES = new Set(['ratelimited', 'request_timeout', 'service_unavailable', 'internal_error', 'network_error', 'timeout'])
const APPROVED_SOURCES = new Set([
  'Men New Form|1BGJtbAbJekS_94c6KCVpMTsob8zcZQT0qTO9vPuPUOI|men-new form',
  'Style Lab New Form|1BGJtbAbJekS_94c6KCVpMTsob8zcZQT0qTO9vPuPUOI|style lab new form',
  'A2O Style Lab|1q9pwOqwnkwJpPEsjrSJBjWmtbybiLxP5oMNm2yK90zc|a2o style lab',
  'A2O Website|1Xi_u4DYkkMtpl7ClpaxwOyGjU7VAud6d8_uQGmQRHcY|a2owebsite',
])

type JsonObject = Record<string, unknown>
type IngestRow = {
  sourceKey: string
  sourceForm: string
  sourceId: string
  submittedAt: string
  name: string
  phone: string
  tag?: string
}
type OutboxRow = {
  id: string
  lead_id: string
  target_version: number
  attempt_count: number
  locked_by: string
}
type LeadRow = {
  id: string
  normalized_phone: string
  display_phone: string
  name: string
  current_status: string
  owner: string
  latest_source: string
  latest_source_key: string
  latest_tag: string
  latest_submitted_at: string
  appointment_at: string | null
  slack_list_item_id: string | null
  sync_version: number
}

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })
}

function fail(code: string): never {
  throw new Error(code)
}

function requireText(value: unknown, code: string, maxLength: number): string {
  if (typeof value !== 'string') fail(code)
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > maxLength) fail(code)
  return trimmed
}

function normalizePhone(input: string): string | null {
  let value = input.trim().toLowerCase().replace(/^(p:|tel:)/, '')
  if (!value || /https?:\/\//.test(value) || /[a-z]/.test(value)) return null
  const digits = value.replace(/[\s()\-.]/g, '')
  if (!/^\+?\d+$/.test(digits)) return null
  let normalized = digits.startsWith('+') ? digits.slice(1) : digits
  if (normalized.startsWith('00852')) normalized = normalized.slice(2)
  if (normalized.length === 8) normalized = `852${normalized}`
  return /^\d{8,15}$/.test(normalized) ? normalized : null
}

function isFreshTimestamp(timestamp: string, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
  const parsed = Number(timestamp)
  return Number.isFinite(parsed) && Math.abs(nowSeconds - parsed) <= REPLAY_WINDOW_SECONDS
}

function hexEncode(value: ArrayBuffer): string {
  return Array.from(new Uint8Array(value), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function decodeBase64Body(value: string): string {
  const binary = atob(value)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

async function signature(secret: string, timestamp: string, requestId: string, rawBody: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const message = `${timestamp}\n${requestId}\n${rawBody}`
  return `sha256=${hexEncode(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)))}`
}

function secureEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false
  let difference = 0
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index)
  return difference === 0
}

function sourceMetadata(sourceId: string | undefined): { spreadsheetId: string | null; sheetName: string | null; rowNumber: number | null } {
  const match = typeof sourceId === 'string' ? sourceId.match(/^([^:]+):(.+):(\d+)$/) : null
  return match ? { spreadsheetId: match[1], sheetName: match[2], rowNumber: Number(match[3]) } : { spreadsheetId: null, sheetName: null, rowNumber: null }
}

function approvedSource(sourceForm: string, sourceId: string): boolean {
  const match = sourceId.match(/^([^:]+):([^:]+):([2-9]\d*)$/)
  return Boolean(match && APPROVED_SOURCES.has(`${sourceForm}|${match[1]}|${match[2]}`))
}

function parseRows(value: unknown): { rows: IngestRow[]; invalidRows: number } {
  if (!Array.isArray(value) || value.length > MAX_ROWS) fail('invalid_rows')
  const rows: IngestRow[] = []
  let invalidRows = 0
  for (const candidate of value) {
    try {
      if (!isObject(candidate)) fail('invalid_row')
      const sourceForm = requireText(candidate.sourceForm ?? candidate.source, 'invalid_source_form', 120)
      const sourceId = requireText(candidate.sourceId, 'invalid_source_id', 240)
      const sourceKey = requireText(candidate.sourceKey, 'invalid_source_key', 300)
      if (!approvedSource(sourceForm, sourceId) || sourceKey !== `${sourceForm}:${sourceId}`) fail('invalid_source')
      const submittedAt = requireText(candidate.submittedAt, 'invalid_submitted_at', 80)
      if (!Number.isFinite(Date.parse(submittedAt))) fail('invalid_submitted_at')
      rows.push({
        sourceKey,
        sourceForm,
        sourceId,
        submittedAt,
        name: requireText(candidate.name, 'invalid_name', 120),
        phone: requireText(candidate.phone, 'invalid_phone', 40),
        tag: typeof candidate.tag === 'string' ? candidate.tag.trim().slice(0, 200) : '',
      })
    } catch {
      // One malformed sheet row must not block the remaining approved rows.
      // Keep the response aggregate-only so names and phone numbers never leak.
      invalidRows += 1
    }
  }
  return { rows, invalidRows }
}

function retryDecision(code: string, attemptCount: number, retryAfterSeconds?: number): { status: 'failed' | 'dead_letter'; nextAttemptAt: string | null } {
  if (!RETRYABLE_CODES.has(code) || attemptCount >= 8) return { status: 'dead_letter', nextAttemptAt: null }
  const delay = retryAfterSeconds ?? (attemptCount <= 1 ? 60 : attemptCount === 2 ? 300 : attemptCount === 3 ? 900 : Math.min(21_600, 7_200 * 2 ** Math.max(0, attemptCount - 4)))
  return { status: 'failed', nextAttemptAt: new Date(Date.now() + delay * 1000).toISOString() }
}

function slackConfig() {
  const parseMap = (key: string): Record<string, string> => {
    const raw = Deno.env.get(key)
    if (!raw) fail(`slack_${key.toLowerCase()}_not_configured`)
    try {
      const parsed = JSON.parse(raw)
      if (!isObject(parsed) || Object.entries(parsed).some(([mapKey, mapValue]) => typeof mapKey !== 'string' || typeof mapValue !== 'string' || !mapValue)) fail(`slack_${key.toLowerCase()}_invalid`)
      return parsed as Record<string, string>
    } catch {
      fail(`slack_${key.toLowerCase()}_invalid`)
    }
  }
  const token = Deno.env.get('SLACK_BOT_TOKEN')
  const listId = Deno.env.get('SLACK_LEAD_PIPELINE_LIST_ID')
  if (!token || !listId) fail('slack_not_configured')
  const columns = parseMap('SLACK_LIST_COLUMN_MAP')
  if (!columns.phone) fail('slack_phone_column_not_configured')
  return { token, listId, columns, status: parseMap('SLACK_STATUS_OPTION_MAP'), owner: parseMap('SLACK_OWNER_USER_MAP') }
}

async function slackApi(config: ReturnType<typeof slackConfig>, method: string, body: JsonObject): Promise<JsonObject> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  let response: Response
  try {
    response = await fetch(`https://slack.com/api/${method}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${config.token}`, 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (error) {
    fail(isObject(error) && error.name === 'AbortError' ? 'timeout' : 'network_error')
  } finally {
    clearTimeout(timeout)
  }
  if (!response.ok) {
    const retryAfter = Number(response.headers.get('retry-after') ?? '')
    const code = response.status === 429 ? 'ratelimited' : response.status >= 500 ? 'service_unavailable' : 'api_http_error'
    const error = new Error(code) as Error & { retryAfterSeconds?: number; slackMethod?: string }
    error.slackMethod = method
    if (Number.isFinite(retryAfter)) error.retryAfterSeconds = retryAfter
    throw error
  }
  let payload: unknown
  try { payload = await response.json() } catch { fail('invalid_response') }
  if (!isObject(payload) || payload.ok !== true) {
    const code = isObject(payload) && typeof payload.error === 'string' ? payload.error : 'api_error'
    const metadata = isObject(payload) && isObject(payload.response_metadata) ? payload.response_metadata : null
    const detail = metadata && Array.isArray(metadata.messages)
      ? metadata.messages.filter((message): message is string => typeof message === 'string').join('|').slice(0, 240)
      : ''
    const error = new Error(code) as Error & { slackMethod?: string; slackDetail?: string }
    error.slackMethod = method
    error.slackDetail = detail
    throw error
  }
  return payload
}

function richText(text: string) {
  return [{ type: 'rich_text', elements: [{ type: 'rich_text_section', elements: [{ type: 'text', text }] }] }]
}

const resolvedColumnCache = new Map<string, { primary: string; columns: Record<string, string> }>()

async function resolveSlackColumnIds(config: ReturnType<typeof slackConfig>): Promise<{ primary: string; columns: Record<string, string> }> {
  const cached = resolvedColumnCache.get(config.listId)
  if (cached) return cached
  const configuredColumnIds = Object.values(config.columns)
  if (config.columns.lead && configuredColumnIds.every((columnId) => /^Col[A-Z0-9]{2,}$/.test(columnId))) {
    const resolved = { primary: config.columns.lead, columns: config.columns }
    resolvedColumnCache.set(config.listId, resolved)
    return resolved
  }

  // Slack's List API exposes the primary text column ID through the list
  // metadata returned by items.info. The UI calls this column `name`, but
  // that is only a semantic key; API writes still require the generated Col…
  // identifier. Discover it once per list so existing configurations that use
  // `"lead":"name"` remain compatible.
  const listed = await slackApi(config, 'slackLists.items.list', { list_id: config.listId, limit: 1, archived: false })
  const items = Array.isArray(listed.items) ? listed.items : []
  const first = items[0]
  if (!isObject(first) || typeof first.id !== 'string') fail('slack_primary_column_not_discoverable')
  const info = await slackApi(config, 'slackLists.items.info', { list_id: config.listId, id: first.id })
  const list = isObject(info.list) ? info.list : null
  const metadata = list && isObject(list.list_metadata) ? list.list_metadata : null
  const schema = metadata && Array.isArray(metadata.schema) ? metadata.schema : []
  const schemaIds = new Set(schema.flatMap((column) => isObject(column) && typeof column.id === 'string' ? [column.id] : []))
  const schemaByKey = new Map(schema.flatMap((column) => isObject(column) && typeof column.key === 'string' && typeof column.id === 'string' ? [[column.key, column.id] as const] : []))
  const resolvedColumns: Record<string, string> = {}
  const invalidConfiguredColumns: string[] = []
  for (const [key, configuredColumn] of Object.entries(config.columns)) {
    if (schemaIds.has(configuredColumn)) resolvedColumns[key] = configuredColumn
    else if (schemaByKey.has(configuredColumn)) resolvedColumns[key] = schemaByKey.get(configuredColumn) as string
    else invalidConfiguredColumns.push(`${key}=${configuredColumn}`)
  }
  if (invalidConfiguredColumns.length > 0) {
    const error = new Error('slack_schema_column_mismatch') as Error & { slackMethod?: string; slackDetail?: string }
    error.slackMethod = 'slackLists.items.info'
    const schemaSummary = schema.map((column) => isObject(column)
      ? `${typeof column.id === 'string' ? column.id : '?'}:${typeof column.key === 'string' ? column.key : '?'}:${typeof column.name === 'string' ? column.name : '?'}:${typeof column.type === 'string' ? column.type : '?'}`
      : '?').join('|')
    error.slackDetail = `invalid=${invalidConfiguredColumns.join(',')};schema=${schemaSummary}`.slice(0, 500)
    throw error
  }
  const primary = schema.find((column) => isObject(column) && column.is_primary_column === true && typeof column.id === 'string')
  if (!primary || !isObject(primary) || typeof primary.id !== 'string') fail('slack_primary_column_not_discoverable')
  const resolved = { primary: primary.id, columns: resolvedColumns }
  resolvedColumnCache.set(config.listId, resolved)
  return resolved
}

function hongKongDateTime(value: string | null): string {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Hong_Kong', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value))
}

function slackPhone(lead: Pick<LeadRow, 'normalized_phone' | 'display_phone'>): string {
  // Google Sheets submissions may contain prefixes such as `p:` or omit the
  // Hong Kong country code. Slack's phone cell rejects those display forms;
  // always send the canonical E.164 value when normalization succeeded.
  return lead.normalized_phone ? `+${lead.normalized_phone}` : lead.display_phone
}

function leadFields(lead: LeadRow, config: ReturnType<typeof slackConfig>, primaryColumnId: string) {
  const fields: Array<JsonObject> = []
  const requireColumn = (key: string): string => {
    const columnId = config.columns[key]
    if (!columnId) fail(`slack_column_${key}_not_configured`)
    return columnId
  }
  const optionalColumn = (key: string): string | null => config.columns[key] || null
  const addText = (key: string, value: string, columnOverride?: string) => {
    // Slack Lists expects typed field keys only. `value` is a response field,
    // not a writable request field, and including it makes create/update return
    // invalid_arguments for otherwise valid rich-text cells.
    if (value) fields.push({ column_id: columnOverride ?? requireColumn(key), rich_text: richText(value) })
  }
  const addOptionalText = (key: string, value: string) => {
    const columnId = optionalColumn(key)
    if (columnId && value) fields.push({ column_id: columnId, rich_text: richText(value) })
  }
  addText('lead', `💬 ${lead.name}｜${lead.latest_source}`, primaryColumnId)
  const statusOption = config.status[lead.current_status]
  if (!statusOption) fail(`slack_status_${lead.current_status}_not_configured`)
  fields.push({ column_id: requireColumn('status'), select: [statusOption] })
  const ownerUser = config.owner[lead.owner]
  if (!ownerUser) fail(`slack_owner_${lead.owner}_not_configured`)
  fields.push({ column_id: requireColumn('owner'), user: [ownerUser] })
  fields.push({ column_id: requireColumn('phone'), phone: [slackPhone(lead)] })
  const whatsappColumn = optionalColumn('whatsapp')
  if (whatsappColumn) {
    const whatsappUrl = `https://wa.me/${lead.normalized_phone}`
    fields.push({ column_id: whatsappColumn, link: [{ original_url: whatsappUrl, display_as_url: false, display_name: 'WhatsApp' }] })
  }
  // `sourceForm` maps to the existing Slack channel column. It is intentionally
  // not written here because Slack rejects channel cells in this workspace's
  // bot-created rows; the exact source form is already included in the lead
  // title and remains canonical in Supabase.
  addOptionalText('tag', lead.latest_tag)
  const submittedDate = hongKongDateTime(lead.latest_submitted_at).slice(0, 10)
  const submittedAtColumn = optionalColumn('latestSubmittedAt')
  if (submittedAtColumn && submittedDate) fields.push({ column_id: submittedAtColumn, date: [submittedDate] })
  addOptionalText('appointmentAt', hongKongDateTime(lead.appointment_at))
  addOptionalText('nextStep', lead.current_status === '已預約' ? `已預約：${hongKongDateTime(lead.appointment_at)}` : lead.current_status)
  return fields
}

function phoneMatches(item: unknown, phoneColumn: string, normalizedPhone: string): boolean {
  if (!isObject(item) || !Array.isArray(item.fields)) return false
  return item.fields.some((field) => {
    if (!isObject(field) || field.column_id !== phoneColumn) return false
    const values = [field.phone, field.value, field.text]
    return values.some((value) => Array.isArray(value) ? value.some((entry) => typeof entry === 'string' && normalizePhone(entry) === normalizedPhone) : typeof value === 'string' && normalizePhone(value) === normalizedPhone)
  })
}

async function findSlackItem(config: ReturnType<typeof slackConfig>, normalizedPhone: string): Promise<string | null> {
  let cursor = ''
  const matches: string[] = []
  for (let page = 0; page < 20; page += 1) {
    const payload: JsonObject = { list_id: config.listId, limit: 100, archived: false }
    if (cursor) payload.cursor = cursor
    const result = await slackApi(config, 'slackLists.items.list', payload)
    const items = Array.isArray(result.items) ? result.items : []
    items.forEach((item) => { if (phoneMatches(item, config.columns.phone ?? '', normalizedPhone) && isObject(item) && typeof item.id === 'string') matches.push(item.id) })
    const metadata = isObject(result.response_metadata) ? result.response_metadata : null
    const next = metadata && typeof metadata.next_cursor === 'string' ? metadata.next_cursor : ''
    if (!next) break
    cursor = next
  }
  if (matches.length > 1) fail('duplicate_phone_match')
  return matches[0] ?? null
}

async function upsertSlackLead(config: ReturnType<typeof slackConfig>, lead: LeadRow): Promise<string> {
  const resolved = await resolveSlackColumnIds(config)
  const effectiveConfig = { ...config, columns: resolved.columns }
  const fields = leadFields(lead, effectiveConfig, resolved.primary)
  let existing = lead.slack_list_item_id || await findSlackItem(effectiveConfig, lead.normalized_phone)
  if (existing) {
    try {
      await slackApi(config, 'slackLists.items.update', { list_id: config.listId, cells: fields.map((field) => ({ ...field, row_id: existing })) })
      return existing
    } catch (error) {
      if (!(error instanceof Error) || !['record_not_found', 'item_not_found', 'invalid_row_id', 'row_not_found'].includes(error.message)) throw error
      existing = await findSlackItem(effectiveConfig, lead.normalized_phone)
      if (existing) {
        await slackApi(config, 'slackLists.items.update', { list_id: config.listId, cells: fields.map((field) => ({ ...field, row_id: existing })) })
        return existing
      }
    }
  }
  const created = await slackApi(config, 'slackLists.items.create', { list_id: config.listId, initial_fields: fields })
  if (!isObject(created.item) || typeof created.item.id !== 'string') fail('missing_created_item_id')
  return created.item.id
}

async function claimAndDrain(supabase: ReturnType<typeof createClient>, workerId: string): Promise<{ claimed: number; synced: number; failed: number; deadLettered: number }> {
  const { data, error } = await supabase.rpc('claim_ad_lead_slack_outbox', { p_limit: OUTBOX_BATCH_SIZE, p_worker_id: workerId })
  if (error) fail('outbox_claim_failed')
  const rows = Array.isArray(data) ? data as OutboxRow[] : []
  const config = slackConfig()
  let synced = 0
  let failed = 0
  let deadLettered = 0
  for (const row of rows) {
    try {
      const result = await supabase.from('ad_leads').select('id, normalized_phone, display_phone, name, current_status, owner, latest_source, latest_source_key, latest_tag, latest_submitted_at, appointment_at, slack_list_item_id, sync_version').eq('id', row.lead_id).maybeSingle()
      if (result.error || !result.data) fail('lead_not_found')
      const itemId = await upsertSlackLead(config, result.data as LeadRow)
      const complete = await supabase.rpc('mark_ad_lead_slack_synced', { p_outbox_id: row.id, p_lead_id: row.lead_id, p_worker_id: workerId, p_target_version: row.target_version, p_synced_version: Number((result.data as LeadRow).sync_version), p_slack_list_item_id: itemId })
      if (complete.error) fail('stale_outbox_lease')
      synced += 1
    } catch (error) {
      const code = error instanceof Error ? error.message : 'network_error'
      const slackMethod = error instanceof Error && typeof (error as Error & { slackMethod?: string }).slackMethod === 'string'
        ? (error as Error & { slackMethod: string }).slackMethod
        : 'internal'
      const slackDetail = error instanceof Error && typeof (error as Error & { slackDetail?: string }).slackDetail === 'string'
        ? (error as Error & { slackDetail: string }).slackDetail
        : ''
      const retryAfterSeconds = isObject(error) && typeof error.retryAfterSeconds === 'number' ? error.retryAfterSeconds : undefined
      const decision = retryDecision(code, row.attempt_count, retryAfterSeconds)
      const failedResult = await supabase.rpc('fail_ad_lead_slack_outbox', { p_outbox_id: row.id, p_worker_id: workerId, p_target_version: row.target_version, p_status: decision.status, p_next_attempt_at: decision.nextAttemptAt, p_error_code: code, p_error_message: `${slackMethod}:${code}${slackDetail ? `:${slackDetail}` : ''}` })
      if (!failedResult.error) {
        if (decision.status === 'dead_letter') deadLettered += 1
        else failed += 1
      }
    }
  }
  return { claimed: rows.length, synced, failed, deadLettered }
}

async function handle(request: Request): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  const transportBody = await request.text()
  const bodyEncoding = request.headers.get('X-A2O-Body-Encoding') ?? ''
  const requestId = request.headers.get('X-A2O-Request-Id') ?? ''
  const timestamp = request.headers.get('X-A2O-Timestamp') ?? ''
  const suppliedSignature = request.headers.get('X-A2O-Signature') ?? ''
  const secret = Deno.env.get('AD_LEAD_INGEST_HMAC_SECRET') ?? ''
  if (!secret || !requestId || requestId.length > 100 || !isFreshTimestamp(timestamp)) {
    console.error(`auth_failure=header timestamp=${timestamp} now=${Math.floor(Date.now() / 1000)} requestId=${requestId}`)
    return json({ error: 'unauthorized' }, 401)
  }
  const expectedSignature = await signature(secret, timestamp, requestId, transportBody)
  if (!secureEqual(expectedSignature, suppliedSignature)) {
    console.error(`auth_failure=signature timestamp=${timestamp} requestId=${requestId} body_length=${transportBody.length}`)
    return json({ error: 'unauthorized' }, 401)
  }

  let rawBody: string
  try {
    rawBody = bodyEncoding === 'base64' ? decodeBase64Body(transportBody) : transportBody
  } catch {
    return json({ error: 'invalid_body_encoding' }, 400)
  }
  let payload: unknown
  try { payload = JSON.parse(rawBody) } catch { return json({ error: 'invalid_json' }, 400) }
  if (!isObject(payload)) return json({ error: 'invalid_payload' }, 400)
  if (payload.requestId !== requestId) return json({ error: 'invalid_request_id' }, 400)
  if (typeof payload.sentAt !== 'string' || !Number.isFinite(Date.parse(payload.sentAt))) return json({ error: 'invalid_sent_at' }, 400)
  if (Math.abs(Date.now() - Date.parse(payload.sentAt)) > REPLAY_WINDOW_SECONDS * 1000) return json({ error: 'stale_sent_at' }, 401)
  const trigger = requireText(payload.trigger, 'invalid_trigger', 40)
  if (!['form_submit', 'five_minute', 'manual_reconcile'].includes(trigger)) return json({ error: 'invalid_trigger' }, 400)
  const parsedRows = parseRows(payload.rows)
  const rows = parsedRows.rows
  const invalidRows = parsedRows.invalidRows
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'supabase_not_configured' }, 503)
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const replay = await supabase.from('ad_lead_sync_requests').insert({ request_id: requestId, trigger, row_count: Array.isArray(payload.rows) ? payload.rows.length : 0 }).select('request_id').maybeSingle()
  if (replay.error) {
    const previous = await supabase.from('ad_lead_sync_requests').select('response, completed_at').eq('request_id', requestId).maybeSingle()
    if (!previous.error && previous.data && isObject(previous.data.response)) {
      return json(previous.data.response, previous.data.response.ok === true ? 200 : 503)
    }
    return json({ error: 'request_replay' }, 409)
  }

  const run = await supabase.from('ad_lead_sync_runs').insert({ status: 'running', imported: 0, deduplicated: 0, invalid_phones: 0 }).select('id').maybeSingle()
  const workerId = `apps-script-${requestId}`
  let imported = 0
  let invalidPhones = 0
  let deduplicated = 0
  try {
    const seenPhones = new Set<string>()
    for (const row of rows) {
      const metadata = sourceMetadata(row.sourceId)
      const normalized = normalizePhone(row.phone)
      if (!normalized) invalidPhones += 1
      if (normalized && seenPhones.has(normalized)) deduplicated += 1
      if (normalized) seenPhones.add(normalized)
      const importedRow = await supabase.rpc('import_ad_lead_submission', {
        p_source_key: row.sourceKey,
        p_source_form: row.sourceForm,
        p_source_tag: row.tag ?? '',
        p_source_spreadsheet_id: metadata.spreadsheetId,
        p_source_sheet_name: metadata.sheetName,
        p_source_row_number: metadata.rowNumber,
        p_submitted_name: row.name,
        p_submitted_phone: row.phone,
        p_normalized_phone: normalized,
        p_submitted_at: row.submittedAt,
        p_payload_checksum: await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(row))).then(hexEncode),
        p_raw_payload: row,
      })
      if (importedRow.error) fail('ad_lead_import_failed')
      imported += 1
    }

    const lease = await supabase.rpc('acquire_ad_lead_sync_lease', { p_name: 'ad-lead-sync', p_worker_id: workerId, p_lease_seconds: 240 })
    if (lease.error) fail('sync_lease_failed')
    const leaseAcquired = lease.data === true || (Array.isArray(lease.data) && lease.data[0] === true)
    let drained = { claimed: 0, synced: 0, failed: 0, deadLettered: 0 }
    try {
      drained = leaseAcquired ? await claimAndDrain(supabase, workerId) : drained
    } finally {
      if (leaseAcquired) await supabase.rpc('release_ad_lead_sync_lease', { p_name: 'ad-lead-sync', p_worker_id: workerId })
    }
    const response = { ok: true, requestId, imported, deduplicated, invalidPhones, invalidRows, ...drained, ...(trigger === 'five_minute' && rows.length === 0 ? { heartbeat: true } : {}) }
    if (run.data && isObject(run.data) && typeof run.data.id === 'string') await supabase.from('ad_lead_sync_runs').update({ status: 'completed', finished_at: new Date().toISOString(), imported, deduplicated, invalid_phones: invalidPhones }).eq('id', run.data.id)
    await supabase.from('ad_lead_sync_requests').update({ completed_at: new Date().toISOString(), response }).eq('request_id', requestId)
    return json(response, leaseAcquired ? 200 : 202)
  } catch (error) {
    const errorCode = error instanceof Error ? error.message : 'sync_failed'
    if (run.data && isObject(run.data) && typeof run.data.id === 'string') await supabase.from('ad_lead_sync_runs').update({ status: 'failed', finished_at: new Date().toISOString(), imported, deduplicated, invalid_phones: invalidPhones, error_code: errorCode }).eq('id', run.data.id)
    const response = { error: 'sync_failed', requestId, errorCode }
    await supabase.from('ad_lead_sync_requests').update({ completed_at: new Date().toISOString(), response }).eq('request_id', requestId)
    return json(response, 503)
  }
}

Deno.serve(handle)
