import type { VercelRequest, VercelResponse } from '@vercel/node'
import { normalizeAdLeads, submittedAtTime, type AdLeadSourceRow } from '../src/features/ad-leads/adLeadService.js'
import { createSupabaseAdmin } from './_lib/supabaseAdmin.js'
import { formatHkd, maskPhone, portalUrl, postSlackMessage } from './_lib/slack.js'
import { syncA2OLeadList } from './_lib/slackLeadList.js'
import { ensureA2OStockList } from './_lib/slackStockList.js'

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

type TrackingRow = {
  source_key: string
  status: string
  owner: string
  updated_at?: string | null
}

type SourceResponse = {
  leads: AdLeadSourceRow[]
  unavailableSources: string[]
}

type GithubOidcPayload = {
  iss?: string
  aud?: string | string[]
  exp?: number
  nbf?: number
  repository?: string
  ref?: string
  workflow_ref?: string
  sub?: string
}

type GithubOpenIdConfiguration = {
  jwks_uri?: string
}

type GithubJwk = JsonWebKey & { kid?: string }

type GithubJwks = {
  keys?: GithubJwk[]
}

const DEFAULT_CHANNELS = {
  leads: 'C0BND5QP3AN',
  clients: 'C0BNF428XQR',
  dashboard: 'C0BN9NM39BP',
}

const GITHUB_OIDC_AUDIENCE = 'a2o-slack-sync'
const GITHUB_REPOSITORY = 'terry1723/a2o-style-lab-crm'
const GITHUB_MAIN_REF = 'refs/heads/main'
const BOOTSTRAP_KEY = 'slack:bootstrap:v2'
const STATE_STATUS = '已拒絕'
const STATE_OWNER = 'New'

let cachedGithubKeys: { expiresAt: number; keys: GithubJwk[] } | null = null

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

function hashText(value: string): string {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    h1 = Math.imul(h1 ^ code, 2654435761)
    h2 = Math.imul(h2 ^ code, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return `${(h2 >>> 0).toString(16).padStart(8, '0')}${(h1 >>> 0).toString(16).padStart(8, '0')}`
}

function eventKey(type: string, ...parts: unknown[]): string {
  return `slack:${type}:${hashText(parts.map((part) => String(part ?? '')).join('|'))}`
}

function requestToken(request: VercelRequest): string {
  const authorization = String(request.headers.authorization || '')
  if (authorization.startsWith('Bearer ')) return authorization.slice(7)
  return String(request.headers['x-a2o-sync-secret'] || '')
}

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const decoded = atob(padded)
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0))
}

function decodeJsonPart(value: string): unknown {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(value)))
}

async function loadGithubKeys(fetcher: typeof fetch = fetch): Promise<GithubJwk[]> {
  if (cachedGithubKeys && cachedGithubKeys.expiresAt > Date.now()) return cachedGithubKeys.keys

  const configurationResponse = await fetcher(
    'https://token.actions.githubusercontent.com/.well-known/openid-configuration',
    { headers: { Accept: 'application/json' } },
  )
  if (!configurationResponse.ok) throw new Error('github_oidc_configuration_unavailable')

  const configuration = await configurationResponse.json() as GithubOpenIdConfiguration
  if (!configuration.jwks_uri) throw new Error('github_oidc_configuration_invalid')

  const keysResponse = await fetcher(configuration.jwks_uri, { headers: { Accept: 'application/json' } })
  if (!keysResponse.ok) throw new Error('github_oidc_keys_unavailable')

  const payload = await keysResponse.json() as GithubJwks
  const keys = Array.isArray(payload.keys) ? payload.keys : []
  if (!keys.length) throw new Error('github_oidc_keys_invalid')

  cachedGithubKeys = { expiresAt: Date.now() + 60 * 60 * 1000, keys }
  return keys
}

async function verifyGithubOidc(token: string, fetcher: typeof fetch = fetch): Promise<boolean> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false

    const header = decodeJsonPart(parts[0]) as Record<string, unknown>
    const payload = decodeJsonPart(parts[1]) as GithubOidcPayload
    if (header.alg !== 'RS256' || typeof header.kid !== 'string') return false

    const keys = await loadGithubKeys(fetcher)
    const jwk = keys.find((key) => key.kid === header.kid)
    if (!jwk) return false

    const key = await globalThis.crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    )

    const verified = await globalThis.crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      decodeBase64Url(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    )
    if (!verified) return false

    const now = Math.floor(Date.now() / 1000)
    const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud]
    const workflowMatches = typeof payload.workflow_ref === 'string'
      && payload.workflow_ref.includes('.github/workflows/slack-sync.yml@refs/heads/main')

    return payload.iss === 'https://token.actions.githubusercontent.com'
      && audience.includes(GITHUB_OIDC_AUDIENCE)
      && typeof payload.exp === 'number'
      && payload.exp > now
      && (typeof payload.nbf !== 'number' || payload.nbf <= now + 30)
      && payload.repository === GITHUB_REPOSITORY
      && payload.ref === GITHUB_MAIN_REF
      && workflowMatches
  } catch {
    return false
  }
}

async function isAuthorized(request: VercelRequest): Promise<boolean> {
  const token = requestToken(request)
  if (!token) return false

  const configured = process.env.CRON_SECRET || process.env.SLACK_SYNC_SECRET
  if (configured && token === configured) return true

  return verifyGithubOidc(token)
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

function minutesSince(value: string): number | null {
  const time = submittedAtTime(value)
  return time === null ? null : (Date.now() - time) / 60000
}

function reminderEventKey(sourceKey: string, ageMinutes: number, firstReminder: number, repeatMinutes: number): string {
  const bucket = Math.max(0, Math.floor((ageMinutes - firstReminder) / repeatMinutes))
  return eventKey('lead-reminder', sourceKey, bucket)
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

async function markEvents(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  keys: string[],
): Promise<void> {
  const uniqueKeys = [...new Set(keys)]
  if (!uniqueKeys.length) return

  const { error } = await supabase.from('ad_lead_tracking').upsert(
    uniqueKeys.map((sourceKey) => ({
      source_key: sourceKey,
      status: STATE_STATUS,
      owner: STATE_OWNER,
    })),
    { onConflict: 'source_key' },
  )
  if (error) throw error
}

export default async function slackSync(request: VercelRequest, response: VercelResponse) {
  response.setHeader('Cache-Control', 'no-store')
  if (!['GET', 'POST'].includes(request.method || '')) {
    response.status(405).json({ error: 'method_not_allowed' })
    return
  }

  try {
    if (!await isAuthorized(request)) {
      response.status(401).json({ error: 'unauthorized' })
      return
    }

    const supabase = createSupabaseAdmin()
    const [source, trackingResult, clientsResult] = await Promise.all([
      readSourceLeads(),
      supabase.from('ad_lead_tracking').select('source_key,status,owner,updated_at'),
      supabase.from('clients').select('id,name,phone,plan,plan_price,amount_paid,balance_due,status'),
    ])

    if (trackingResult.error) throw trackingResult.error
    if (clientsResult.error) throw clientsResult.error

    const trackingRows = (trackingResult.data || []) as TrackingRow[]
    const seenEvents = new Set(
      trackingRows
        .map((row) => row.source_key)
        .filter((sourceKey) => sourceKey.startsWith('slack:')),
    )
    const tracking = Object.fromEntries(
      trackingRows
        .filter((row) => !row.source_key.startsWith('slack:'))
        .map((row) => [row.source_key, row]),
    )
    const leads = normalizeAdLeads(source.leads, tracking)
    const clients = (clientsResult.data || []) as ClientRow[]

    let stockListSetup: Awaited<ReturnType<typeof ensureA2OStockList>> | null = null
    let stockListSetupError = ''
    try {
      stockListSetup = await ensureA2OStockList()
    } catch (error) {
      stockListSetupError = error instanceof Error ? error.message : 'slack_stock_list_setup_failed'
    }

    let leadListSync: Awaited<ReturnType<typeof syncA2OLeadList>> | null = null
    let leadListSyncError = ''
    try {
      leadListSync = await syncA2OLeadList(leads)
    } catch (error) {
      leadListSyncError = error instanceof Error ? error.message : 'slack_list_sync_failed'
    }

    const reminderMinutes = Math.max(5, Number(process.env.SLACK_FOLLOWUP_MINUTES || 15))
    const reminderRepeatMinutes = Math.max(60, Number(process.env.SLACK_REMINDER_REPEAT_HOURS || 2) * 60)
    const reminderMaxMinutes = Math.max(reminderMinutes, Number(process.env.SLACK_FOLLOWUP_MAX_HOURS || 72) * 60)

    if (!seenEvents.has(BOOTSTRAP_KEY)) {
      const initialKeys = [BOOTSTRAP_KEY]

      for (const lead of leads) {
        initialKeys.push(eventKey('lead-new', lead.sourceKey))
        initialKeys.push(eventKey('lead-state', lead.sourceKey, leadFingerprint(lead.status, lead.owner)))

        const ageMinutes = minutesSince(lead.submittedAt)
        if (lead.status === '未聯絡'
          && ageMinutes !== null
          && ageMinutes >= reminderMinutes
          && ageMinutes <= reminderMaxMinutes) {
          initialKeys.push(reminderEventKey(lead.sourceKey, ageMinutes, reminderMinutes, reminderRepeatMinutes))
        }
      }

      for (const client of clients) {
        const clientId = String(client.id || '')
        if (!clientId) continue
        initialKeys.push(eventKey('client-new', clientId))
        initialKeys.push(eventKey('client-state', clientId, clientFingerprint(client)))
        if (parseNumber(client.amount_paid) > 0) initialKeys.push(eventKey('client-paid', clientId))
      }

      await postSlackMessage({
        channel: channel('dashboard'),
        text: [
          '✅ *A2O Slack 自動同步已啟動*',
          `現有 Leads：${leads.length}`,
          `現有客戶：${clients.length}`,
          '之後會自動通知：新 Lead、未跟進、成交及客戶狀態更新。',
        ].join('\n'),
      })
      await markEvents(supabase, initialKeys)

      response.status(200).json({
        ok: true,
        bootstrapped: true,
        leads: leads.length,
        clients: clients.length,
        leadListSync,
        leadListSyncError,
        stockListSetup,
        stockListSetupError,
      })
      return
    }

    const maxEvents = Math.max(1, Number(process.env.SLACK_MAX_EVENTS_PER_RUN || 8))
    let sent = 0
    const errors: string[] = []

    const send = async (targetChannel: string, text: string, stateKeys: string[]) => {
      if (sent >= maxEvents) return false
      try {
        await postSlackMessage({ channel: targetChannel, text })
        await markEvents(supabase, stateKeys)
        stateKeys.forEach((key) => seenEvents.add(key))
        sent += 1
        if (sent < maxEvents) await pause(1050)
        return true
      } catch (error) {
        errors.push(error instanceof Error ? error.message : 'slack_send_failed')
        return false
      }
    }

    for (const lead of leads) {
      if (sent >= maxEvents) break

      const createdKey = eventKey('lead-new', lead.sourceKey)
      const stateKey = eventKey('lead-state', lead.sourceKey, leadFingerprint(lead.status, lead.owner))

      if (!seenEvents.has(createdKey)) {
        await send(channel('leads'), leadMessage(lead), [createdKey, stateKey])
      } else if (!seenEvents.has(stateKey)) {
        await send(channel('leads'), leadUpdateMessage(lead), [stateKey])
      }

      if (sent >= maxEvents) break

      const ageMinutes = minutesSince(lead.submittedAt)
      if (lead.status === '未聯絡'
        && ageMinutes !== null
        && ageMinutes >= reminderMinutes
        && ageMinutes <= reminderMaxMinutes) {
        const reminderKey = reminderEventKey(lead.sourceKey, ageMinutes, reminderMinutes, reminderRepeatMinutes)
        if (!seenEvents.has(reminderKey)) {
          await send(channel('leads'), overdueMessage(lead, ageMinutes), [reminderKey])
        }
      }
    }

    for (const client of clients) {
      if (sent >= maxEvents) break

      const clientId = String(client.id || '')
      if (!clientId) continue

      const createdKey = eventKey('client-new', clientId)
      const stateKey = eventKey('client-state', clientId, clientFingerprint(client))
      const paidKey = eventKey('client-paid', clientId)
      const paid = parseNumber(client.amount_paid)
      const planPrice = parseNumber(client.plan_price)
      const relevant = paid > 0 || planPrice > 0 || Boolean(client.plan)

      if (!seenEvents.has(createdKey)) {
        if (relevant) {
          await send(
            channel('clients'),
            clientMessage(client, paid > 0),
            [createdKey, stateKey, ...(paid > 0 ? [paidKey] : [])],
          )
        } else {
          await markEvents(supabase, [createdKey, stateKey])
          seenEvents.add(createdKey)
          seenEvents.add(stateKey)
        }
      } else if (paid > 0 && !seenEvents.has(paidKey)) {
        await send(channel('clients'), clientMessage(client, true), [paidKey, stateKey])
      } else if (!seenEvents.has(stateKey)) {
        await send(channel('clients'), clientUpdateMessage(client), [stateKey])
      }
    }

    response.status(errors.length ? 207 : 200).json({
      ok: errors.length === 0,
      sent,
      leads: leads.length,
      clients: clients.length,
      leadListSync,
      leadListSyncError,
      stockListSetup,
      stockListSetupError,
      unavailableSources: source.unavailableSources,
      errors,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'slack_sync_failed'
    response.status(message.includes('not_configured') ? 503 : 500).json({ error: message })
  }
}
