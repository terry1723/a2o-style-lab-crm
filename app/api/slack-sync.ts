import type { VercelRequest, VercelResponse } from '@vercel/node'
import { normalizeAdLeads, submittedAtTime, type AdLeadSourceRow } from '../src/features/ad-leads/adLeadService.js'
import { createSupabaseAdmin } from './_lib/supabaseAdmin.js'
import { formatHkd, maskPhone, portalUrl, postSlackMessage } from './_lib/slack.js'

type SyncState = {
  entity_type: string
  entity_key: string
  fingerprint: string
  first_seen_at?: string
  last_seen_at?: string
  last_notified_at?: string | null
  last_reminded_at?: string | null
  reminder_count?: number
  metadata?: Record<string, unknown> | null
}

type ClientRow = {
  id: string
  name?: string | null
  phone?: string | null
  plan?: string | null
  plan_price?: number | string | null
  amount_paid?: number | string | null
  balance_due?: number | string | null
  status?: string | null
  created_at?: string | null
  updated_at?: string | null
}

type SourceResponse = {
  leads: AdLeadSourceRow[]
  unavailableSources: string[]
}

const DEFAULT_CHANNELS = {
  leads: 'C0BND5QP3AN',
  clients: 'C0BNF428XQR',
  dashboard: 'C0BN9NM39BP',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function parseNumber(value: unknown): number {
  const parsed = Number(value || 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function channel(name: keyof typeof DEFAULT_CHANNELS): string {
  return process.env[`SLACK_${name.toUpperCase()}_CHANNEL_ID`] || DEFAULT_CHANNELS[name]
}

function stateId(entityType: string, entityKey: string): string {
  return `${entityType}:${entityKey}`
}

function leadFingerprint(status: string, owner: string): string {
  return JSON.stringify({ status, owner })
}

function clientSnapshot(client: ClientRow): Record<string, unknown> {
  return {
    name: client.name || '',
    phone: client.phone || '',
    plan: client.plan || '',
    plan_price: parseNumber(client.plan_price),
    amount_paid: parseNumber(client.amount_paid),
    balance_due: parseNumber(client.balance_due),
    status: client.status || '',
  }
}

function clientFingerprint(client: ClientRow): string {
  return JSON.stringify(clientSnapshot(client))
}

function requestSecret(request: VercelRequest): string {
  const authorization = String(request.headers.authorization || '')
  if (authorization.startsWith('Bearer ')) return authorization.slice(7)
  return String(request.headers['x-a2o-sync-secret'] || '')
}

function isAuthorized(request: VercelRequest): boolean {
  const configured = process.env.CRON_SECRET || process.env.SLACK_SYNC_SECRET
  if (!configured) throw new Error('slack_sync_secret_not_configured')
  return requestSecret(request) === configured
}

async function readSourceLeads(fetcher: typeof fetch = fetch): Promise<SourceResponse> {
  const endpoint = process.env.AD_LEAD_APPS_SCRIPT_URL
  const secret = process.env.AD_LEAD_READ_SECRET
  if (!endpoint || !secret) throw new Error('ad_lead_source_not_configured')

  const url = new URL(endpoint)
  url.searchParams.set('secret', secret)
  const response = await fetcher(url, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error('ad_lead_source_unavailable')

  const payload: unknown = await response.json()
  if (!isRecord(payload) || payload.ok !== true || !Array.isArray(payload.leads)) {
    throw new Error('ad_lead_source_unavailable')
  }

  return {
    leads: payload.leads as AdLeadSourceRow[],
    unavailableSources: Array.isArray(payload.unavailableSources)
      ? payload.unavailableSources.filter((item): item is string => typeof item === 'string')
      : [],
  }
}

function nowIso(): string {
  return new Date().toISOString()
}

function minutesSince(value: string): number | null {
  const time = submittedAtTime(value)
  return time === null ? null : (Date.now() - time) / 60000
}

function hoursSince(value?: string | null): number {
  if (!value) return Number.POSITIVE_INFINITY
  const time = Date.parse(value)
  return Number.isFinite(time) ? (Date.now() - time) / 3600000 : Number.POSITIVE_INFINITY
}

function leadMessage(lead: ReturnType<typeof normalizeAdLeads>[number]): string {
  return [
    '🆕 *新 Lead*',
    `姓名：${lead.name}`,
    `電話：${maskPhone(lead.phone)}`,
    `來源：${lead.source}${lead.tag ? `｜${lead.tag}` : ''}`,
    `負責人：${lead.owner}`,
    `狀態：${lead.status}`,
    `<${portalUrl()}|開啟 A2O Staff Portal>`,
  ].join('\n')
}

function leadUpdateMessage(lead: ReturnType<typeof normalizeAdLeads>[number]): string {
  const icon = lead.status === '已預約' ? '📅' : lead.status === '已拒絕' ? '⛔' : '🔄'
  return [
    `${icon} *Lead 狀態更新*`,
    `姓名：${lead.name}`,
    `電話：${maskPhone(lead.phone)}`,
    `負責人：${lead.owner}`,
    `最新狀態：${lead.status}`,
    `<${portalUrl()}|開啟 A2O Staff Portal>`,
  ].join('\n')
}

function overdueMessage(lead: ReturnType<typeof normalizeAdLeads>[number], minutes: number): string {
  return [
    '⚠️ *Lead 尚未跟進*',
    `姓名：${lead.name}`,
    `電話：${maskPhone(lead.phone)}`,
    `已等待：約 ${Math.floor(minutes)} 分鐘`,
    `負責人：${lead.owner}`,
    '請更新為「WhatsApp 跟進中」或重新分配負責人。',
    `<${portalUrl()}|立即跟進>`,
  ].join('\n')
}

function clientMessage(client: ClientRow, isConversion: boolean): string {
  const paid = parseNumber(client.amount_paid)
  const planPrice = parseNumber(client.plan_price)
  return [
    isConversion ? '💰 *新成交／已收款*' : '👤 *新客戶／Package 已建立*',
    `客戶：${client.name || '未命名'}`,
    `電話：${maskPhone(client.phone)}`,
    `Plan：${client.plan || '未設定'}｜${formatHkd(planPrice)}`,
    `已收：${formatHkd(paid)}｜餘額：${formatHkd(client.balance_due)}`,
    `狀態：${client.status || '未設定'}`,
    `<${portalUrl()}|查看客戶資料>`,
  ].join('\n')
}

function clientUpdateMessage(client: ClientRow): string {
  return [
    '🔄 *客戶狀態更新*',
    `客戶：${client.name || '未命名'}`,
    `Plan：${client.plan || '未設定'}`,
    `已收：${formatHkd(client.amount_paid)}｜餘額：${formatHkd(client.balance_due)}`,
    `最新狀態：${client.status || '未設定'}`,
    `<${portalUrl()}|查看客戶資料>`,
  ].join('\n')
}

async function pause(milliseconds: number) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds))
}

export default async function slackSync(request: VercelRequest, response: VercelResponse) {
  response.setHeader('Cache-Control', 'no-store')
  if (!['GET', 'POST'].includes(request.method || '')) {
    response.status(405).json({ error: 'method_not_allowed' })
    return
  }

  try {
    if (!isAuthorized(request)) {
      response.status(401).json({ error: 'unauthorized' })
      return
    }

    const supabase = createSupabaseAdmin()
    const [source, trackingResult, clientsResult, statesResult] = await Promise.all([
      readSourceLeads(),
      supabase.from('ad_lead_tracking').select('source_key,status,owner,updated_at'),
      supabase.from('clients').select('*').order('created_at', { ascending: false }),
      supabase.from('slack_sync_state').select('*'),
    ])

    if (trackingResult.error) throw trackingResult.error
    if (clientsResult.error) throw clientsResult.error
    if (statesResult.error) throw statesResult.error

    const tracking = Object.fromEntries((trackingResult.data || []).map((row) => [row.source_key, row]))
    const leads = normalizeAdLeads(source.leads, tracking)
    const clients = (clientsResult.data || []) as ClientRow[]
    const states = (statesResult.data || []) as SyncState[]
    const stateMap = new Map(states.map((row) => [stateId(row.entity_type, row.entity_key), row]))
    const bootstrapped = stateMap.has(stateId('system', 'bootstrap'))

    if (!bootstrapped) {
      const timestamp = nowIso()
      const initialStates: SyncState[] = [
        {
          entity_type: 'system',
          entity_key: 'bootstrap',
          fingerprint: timestamp,
          first_seen_at: timestamp,
          last_seen_at: timestamp,
          last_notified_at: timestamp,
          metadata: { lead_count: leads.length, client_count: clients.length },
        },
        ...leads.map((lead) => ({
          entity_type: 'lead',
          entity_key: lead.sourceKey,
          fingerprint: leadFingerprint(lead.status, lead.owner),
          first_seen_at: timestamp,
          last_seen_at: timestamp,
          last_reminded_at: lead.status === '未聯絡' ? timestamp : null,
          metadata: { status: lead.status, owner: lead.owner, submittedAt: lead.submittedAt },
        })),
        ...clients.map((client) => ({
          entity_type: 'client',
          entity_key: String(client.id),
          fingerprint: clientFingerprint(client),
          first_seen_at: timestamp,
          last_seen_at: timestamp,
          metadata: clientSnapshot(client),
        })),
      ]

      const { error } = await supabase.from('slack_sync_state').upsert(initialStates, {
        onConflict: 'entity_type,entity_key',
      })
      if (error) throw error

      await postSlackMessage({
        channel: channel('dashboard'),
        text: [
          '✅ *A2O Slack 自動同步已啟動*',
          `現有 Leads：${leads.length}`,
          `現有客戶：${clients.length}`,
          '之後會自動通知：新 Lead、未跟進、成交及客戶狀態更新。',
        ].join('\n'),
      })

      response.status(200).json({ ok: true, bootstrapped: true, leads: leads.length, clients: clients.length })
      return
    }

    const maxEvents = Math.max(1, Number(process.env.SLACK_MAX_EVENTS_PER_RUN || 8))
    const reminderMinutes = Math.max(5, Number(process.env.SLACK_FOLLOWUP_MINUTES || 15))
    const reminderRepeatHours = Math.max(1, Number(process.env.SLACK_REMINDER_REPEAT_HOURS || 2))
    const maxReminders = Math.max(1, Number(process.env.SLACK_MAX_REMINDERS || 3))
    let sent = 0
    const errors: string[] = []

    const send = async (targetChannel: string, text: string) => {
      if (sent >= maxEvents) return false
      try {
        await postSlackMessage({ channel: targetChannel, text })
        sent += 1
        if (sent < maxEvents) await pause(1050)
        return true
      } catch (error) {
        errors.push(error instanceof Error ? error.message : 'slack_send_failed')
        return false
      }
    }

    for (const lead of leads) {
      const key = stateId('lead', lead.sourceKey)
      const existing = stateMap.get(key)
      const fingerprint = leadFingerprint(lead.status, lead.owner)
      const timestamp = nowIso()
      let nextState: SyncState = existing || {
        entity_type: 'lead',
        entity_key: lead.sourceKey,
        fingerprint,
        first_seen_at: timestamp,
        reminder_count: 0,
        metadata: {},
      }

      if (!existing) {
        const delivered = await send(channel('leads'), leadMessage(lead))
        if (!delivered) continue
        nextState = { ...nextState, last_notified_at: timestamp }
      } else if (existing.fingerprint !== fingerprint) {
        const delivered = await send(channel('leads'), leadUpdateMessage(lead))
        if (!delivered) continue
        nextState = { ...nextState, last_notified_at: timestamp }
      }

      const ageMinutes = minutesSince(lead.submittedAt)
      const reminderCount = Number(nextState.reminder_count || 0)
      const reminderDue = lead.status === '未聯絡'
        && ageMinutes !== null
        && ageMinutes >= reminderMinutes
        && reminderCount < maxReminders
        && hoursSince(nextState.last_reminded_at) >= reminderRepeatHours
        && Boolean(existing)

      if (reminderDue && sent < maxEvents) {
        const delivered = await send(channel('leads'), overdueMessage(lead, ageMinutes!))
        if (delivered) {
          nextState = {
            ...nextState,
            last_reminded_at: timestamp,
            reminder_count: reminderCount + 1,
          }
        }
      }

      const { error } = await supabase.from('slack_sync_state').upsert({
        ...nextState,
        fingerprint,
        last_seen_at: timestamp,
        metadata: { status: lead.status, owner: lead.owner, submittedAt: lead.submittedAt },
      }, { onConflict: 'entity_type,entity_key' })
      if (error) errors.push(`lead_state:${error.message}`)
    }

    for (const client of clients) {
      const clientId = String(client.id || '')
      if (!clientId) continue

      const key = stateId('client', clientId)
      const existing = stateMap.get(key)
      const fingerprint = clientFingerprint(client)
      const snapshot = clientSnapshot(client)
      const timestamp = nowIso()
      const paid = parseNumber(client.amount_paid)
      const planPrice = parseNumber(client.plan_price)

      let shouldNotify = false
      let conversion = false
      let message = clientUpdateMessage(client)

      if (!existing) {
        shouldNotify = paid > 0 || planPrice > 0 || Boolean(client.plan)
        conversion = paid > 0
        message = clientMessage(client, conversion)
      } else if (existing.fingerprint !== fingerprint) {
        const previousPaid = parseNumber(existing.metadata?.amount_paid)
        conversion = previousPaid <= 0 && paid > 0
        shouldNotify = true
        message = conversion ? clientMessage(client, true) : clientUpdateMessage(client)
      }

      let lastNotifiedAt = existing?.last_notified_at || null
      if (shouldNotify) {
        const delivered = await send(channel('clients'), message)
        if (!delivered) continue
        lastNotifiedAt = timestamp
      }

      const { error } = await supabase.from('slack_sync_state').upsert({
        entity_type: 'client',
        entity_key: clientId,
        fingerprint,
        first_seen_at: existing?.first_seen_at || timestamp,
        last_seen_at: timestamp,
        last_notified_at: lastNotifiedAt,
        last_reminded_at: existing?.last_reminded_at || null,
        reminder_count: Number(existing?.reminder_count || 0),
        metadata: snapshot,
      }, { onConflict: 'entity_type,entity_key' })
      if (error) errors.push(`client_state:${error.message}`)
    }

    response.status(errors.length ? 207 : 200).json({
      ok: errors.length === 0,
      sent,
      leads: leads.length,
      clients: clients.length,
      unavailableSources: source.unavailableSources,
      errors,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'slack_sync_failed'
    response.status(message.includes('not_configured') ? 503 : 500).json({ error: message })
  }
}
