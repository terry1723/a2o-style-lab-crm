import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createSupabaseAdmin } from './_lib/supabaseAdmin.js'
import { formatHkd, maskPhone, portalUrl, postSlackMessage } from './_lib/slack.js'

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
}

type TrackingRow = {
  source_key: string
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

type GithubOpenIdConfiguration = {
  jwks_uri?: string
}

type GithubJwk = JsonWebKey & { kid?: string }

type GithubJwks = {
  keys?: GithubJwk[]
}

const DEFAULT_CLIENTS_CHANNEL_ID = 'C0BNF428XQR'
const GITHUB_OIDC_AUDIENCE = 'a2o-client-backfill'
const GITHUB_REPOSITORY = 'terry1723/a2o-style-lab-crm'
const GITHUB_MAIN_REF = 'refs/heads/main'
const BACKFILL_PREFIX = 'slack:client-backfill:v1:'
const BATCH_SIZE = 5
const STATE_STATUS = '已拒絕'
const STATE_OWNER = 'New'

let cachedGithubKeys: { expiresAt: number; keys: GithubJwk[] } | null = null

function parseNumber(value: unknown): number {
  const parsed = Number(value || 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function isRelevantClient(client: ClientRow): boolean {
  return parseNumber(client.amount_paid) > 0
    || parseNumber(client.plan_price) > 0
    || Boolean(String(client.plan || '').trim())
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
      && payload.workflow_ref.includes('.github/workflows/client-backfill.yml@refs/heads/main')

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

function backfillMessage(client: ClientRow): string {
  const paid = parseNumber(client.amount_paid)
  const planPrice = parseNumber(client.plan_price)
  return [
    '👤 *Package 客戶同步*',
    `客戶：${client.name || '未命名'}`,
    `電話：${maskPhone(client.phone)}`,
    `Plan：${client.plan || '未設定'}｜${formatHkd(planPrice)}`,
    `已收：${formatHkd(paid)}｜餘額：${formatHkd(client.balance_due)}`,
    `狀態：${client.status || '未設定'}`,
    `<${portalUrl()}|查看 CRM 客戶資料>`,
  ].join('\n')
}

async function markBackfilled(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  key: string,
): Promise<void> {
  const { error } = await supabase.from('ad_lead_tracking').upsert({
    source_key: key,
    status: STATE_STATUS,
    owner: STATE_OWNER,
  }, { onConflict: 'source_key' })
  if (error) throw error
}

async function pause(milliseconds: number) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds))
}

export default async function clientBackfill(request: VercelRequest, response: VercelResponse) {
  response.setHeader('Cache-Control', 'no-store')
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'method_not_allowed' })
    return
  }

  try {
    if (!await isAuthorized(request)) {
      response.status(401).json({ error: 'unauthorized' })
      return
    }

    const supabase = createSupabaseAdmin()
    const [clientsResult, trackingResult] = await Promise.all([
      supabase
        .from('clients')
        .select('id,name,phone,plan,plan_price,amount_paid,balance_due,status,created_at')
        .order('created_at', { ascending: true }),
      supabase.from('ad_lead_tracking').select('source_key'),
    ])

    if (clientsResult.error) throw clientsResult.error
    if (trackingResult.error) throw trackingResult.error

    const clients = ((clientsResult.data || []) as ClientRow[]).filter(isRelevantClient)
    const seen = new Set(
      ((trackingResult.data || []) as TrackingRow[])
        .map((row) => row.source_key)
        .filter((key) => key.startsWith(BACKFILL_PREFIX)),
    )

    const pending = clients.filter((client) => !seen.has(`${BACKFILL_PREFIX}${client.id}`))
    const batch = pending.slice(0, BATCH_SIZE)
    const channel = process.env.SLACK_CLIENTS_CHANNEL_ID || DEFAULT_CLIENTS_CHANNEL_ID
    let posted = 0

    for (const client of batch) {
      const key = `${BACKFILL_PREFIX}${client.id}`
      await postSlackMessage({ channel, text: backfillMessage(client) })
      await markBackfilled(supabase, key)
      posted += 1
      if (posted < batch.length) await pause(1050)
    }

    response.status(200).json({
      ok: true,
      totalPackageClients: clients.length,
      alreadyBackfilled: clients.length - pending.length,
      posted,
      remaining: Math.max(0, pending.length - posted),
    })
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : 'client_backfill_failed',
    })
  }
}
