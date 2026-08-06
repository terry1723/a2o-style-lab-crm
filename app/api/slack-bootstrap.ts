import type { VercelRequest, VercelResponse } from '@vercel/node'
import { normalizeAdLeads, submittedAtTime, type AdLeadSourceRow } from '../src/features/ad-leads/adLeadService.js'
import { createSupabaseAdmin } from './_lib/supabaseAdmin.js'
import { postSlackMessage } from './_lib/slack.js'

type ClientRow = {
  id: string
  name?: string | null
  phone?: string | null
  plan?: string | null
  plan_price?: number | string | null
  amount_paid?: number | string | null
  balance_due?: number | string | null
  status?: string | null
}

type TrackingRow = {
  source_key: string
  status: string
  owner: string
  updated_at?: string | null
}

type GithubOidcPayload = {
  iss?: string
  aud?: string | string[]
  exp?: number
  nbf?: number
  repository?: string
  ref?: string
  workflow_ref?: string
}

type GithubOpenIdConfiguration = { jwks_uri?: string }
type GithubJwk = JsonWebKey & { kid?: string }
type GithubJwks = { keys?: GithubJwk[] }

const GITHUB_OIDC_AUDIENCE = 'a2o-slack-sync'
const GITHUB_REPOSITORY = 'terry1723/a2o-style-lab-crm'
const GITHUB_MAIN_REF = 'refs/heads/main'
const BOOTSTRAP_KEY = 'slack:bootstrap:v2'
const STATE_STATUS = '已拒絕'
const STATE_OWNER = 'New'
const DASHBOARD_CHANNEL = process.env.SLACK_DASHBOARD_CHANNEL_ID || 'C0BN9NM39BP'

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function parseNumber(value: unknown): number {
  const parsed = Number(value || 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function leadFingerprint(status: string, owner: string): string {
  return JSON.stringify({ status, owner })
}

function clientFingerprint(client: ClientRow): string {
  return JSON.stringify({
    name: client.name || '',
    phone: client.phone || '',
    plan: client.plan || '',
    plan_price: parseNumber(client.plan_price),
    amount_paid: parseNumber(client.amount_paid),
    balance_due: parseNumber(client.balance_due),
    status: client.status || '',
  })
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
  return authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
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

async function verifyGithubOidc(token: string): Promise<boolean> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false

    const header = decodeJsonPart(parts[0]) as Record<string, unknown>
    const payload = decodeJsonPart(parts[1]) as GithubOidcPayload
    if (header.alg !== 'RS256' || typeof header.kid !== 'string') return false

    const configurationResponse = await fetch(
      'https://token.actions.githubusercontent.com/.well-known/openid-configuration',
      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) },
    )
    if (!configurationResponse.ok) return false
    const configuration = await configurationResponse.json() as GithubOpenIdConfiguration
    if (!configuration.jwks_uri) return false

    const keysResponse = await fetch(configuration.jwks_uri, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    })
    if (!keysResponse.ok) return false
    const keysPayload = await keysResponse.json() as GithubJwks
    const jwk = (keysPayload.keys || []).find((key) => key.kid === header.kid)
    if (!jwk) return false

    const key = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    )
    const verified = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      decodeBase64Url(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    )
    if (!verified) return false

    const now = Math.floor(Date.now() / 1000)
    const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud]
    return payload.iss === 'https://token.actions.githubusercontent.com'
      && audience.includes(GITHUB_OIDC_AUDIENCE)
      && typeof payload.exp === 'number'
      && payload.exp > now
      && (typeof payload.nbf !== 'number' || payload.nbf <= now + 30)
      && payload.repository === GITHUB_REPOSITORY
      && payload.ref === GITHUB_MAIN_REF
      && typeof payload.workflow_ref === 'string'
      && payload.workflow_ref.includes('.github/workflows/slack-sync.yml@refs/heads/main')
  } catch {
    return false
  }
}

async function readLeads(): Promise<AdLeadSourceRow[]> {
  const endpoint = process.env.AD_LEAD_APPS_SCRIPT_URL
  const secret = process.env.AD_LEAD_READ_SECRET
  if (!endpoint || !secret) throw new Error('ad_lead_source_not_configured')

  const url = new URL(endpoint)
  url.searchParams.set('secret', secret)
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(20000),
  })
  if (!response.ok) throw new Error(`ad_lead_source_http_${response.status}`)

  const payload: unknown = await response.json()
  if (!isRecord(payload) || payload.ok !== true || !Array.isArray(payload.leads)) {
    throw new Error('ad_lead_source_invalid')
  }
  return payload.leads as AdLeadSourceRow[]
}

function minutesSince(value: string): number | null {
  const time = submittedAtTime(value)
  return time === null ? null : (Date.now() - time) / 60000
}

function reminderEventKey(sourceKey: string, ageMinutes: number, firstReminder: number, repeatMinutes: number): string {
  const bucket = Math.max(0, Math.floor((ageMinutes - firstReminder) / repeatMinutes))
  return eventKey('lead-reminder', sourceKey, bucket)
}

async function markEvents(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  keys: string[],
): Promise<number> {
  const uniqueKeys = [...new Set(keys)]
  const chunkSize = 50

  for (let index = 0; index < uniqueKeys.length; index += chunkSize) {
    const chunk = uniqueKeys.slice(index, index + chunkSize)
    const { error } = await supabase.from('ad_lead_tracking').upsert(
      chunk.map((sourceKey) => ({
        source_key: sourceKey,
        status: STATE_STATUS,
        owner: STATE_OWNER,
      })),
      { onConflict: 'source_key' },
    )
    if (error) throw new Error(`bootstrap_state:${error.message}`)
  }

  return uniqueKeys.length
}

export default async function slackBootstrap(request: VercelRequest, response: VercelResponse) {
  response.setHeader('Cache-Control', 'no-store')
  if (!await verifyGithubOidc(requestToken(request))) {
    response.status(401).json({ error: 'unauthorized' })
    return
  }

  try {
    const supabase = createSupabaseAdmin()
    const [sourceRows, trackingResult, clientsResult] = await Promise.all([
      readLeads(),
      supabase.from('ad_lead_tracking').select('source_key,status,owner,updated_at'),
      supabase.from('clients').select('id,name,phone,plan,plan_price,amount_paid,balance_due,status'),
    ])

    if (trackingResult.error) throw new Error(`tracking:${trackingResult.error.message}`)
    if (clientsResult.error) throw new Error(`clients:${clientsResult.error.message}`)

    const trackingRows = (trackingResult.data || []) as TrackingRow[]
    const tracking = Object.fromEntries(
      trackingRows
        .filter((row) => !row.source_key.startsWith('slack:'))
        .map((row) => [row.source_key, row]),
    )
    const leads = normalizeAdLeads(sourceRows, tracking)
    const clients = (clientsResult.data || []) as ClientRow[]

    const reminderMinutes = Math.max(5, Number(process.env.SLACK_FOLLOWUP_MINUTES || 15))
    const repeatMinutes = Math.max(60, Number(process.env.SLACK_REMINDER_REPEAT_HOURS || 2) * 60)
    const maxMinutes = Math.max(reminderMinutes, Number(process.env.SLACK_FOLLOWUP_MAX_HOURS || 72) * 60)
    const keys = [BOOTSTRAP_KEY]

    for (const lead of leads) {
      keys.push(eventKey('lead-new', lead.sourceKey))
      keys.push(eventKey('lead-state', lead.sourceKey, leadFingerprint(lead.status, lead.owner)))
      const ageMinutes = minutesSince(lead.submittedAt)
      if (lead.status === '未聯絡'
        && ageMinutes !== null
        && ageMinutes >= reminderMinutes
        && ageMinutes <= maxMinutes) {
        keys.push(reminderEventKey(lead.sourceKey, ageMinutes, reminderMinutes, repeatMinutes))
      }
    }

    for (const client of clients) {
      const clientId = String(client.id || '')
      if (!clientId) continue
      keys.push(eventKey('client-new', clientId))
      keys.push(eventKey('client-state', clientId, clientFingerprint(client)))
      if (parseNumber(client.amount_paid) > 0) keys.push(eventKey('client-paid', clientId))
    }

    const stateCount = await markEvents(supabase, keys)
    await postSlackMessage({
      channel: DASHBOARD_CHANNEL,
      text: [
        '✅ *A2O Slack 自動同步已啟動*',
        `現有 Leads：${leads.length}`,
        `現有客戶：${clients.length}`,
        '之後會自動通知：新 Lead、未跟進、成交及客戶狀態更新。',
      ].join('\n'),
    })

    response.status(200).json({
      ok: true,
      bootstrapped: true,
      leads: leads.length,
      clients: clients.length,
      stateCount,
    })
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : 'slack_bootstrap_failed',
    })
  }
}
