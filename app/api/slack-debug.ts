import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createSupabaseAdmin } from './_lib/supabaseAdmin.js'

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
const DASHBOARD_CHANNEL = 'C0BN9NM39BP'

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function safeError(error: unknown) {
  if (error instanceof Error) return { name: error.name, message: error.message }
  if (isRecord(error)) {
    return {
      message: typeof error.message === 'string' ? error.message : 'unknown_error',
      code: typeof error.code === 'string' ? error.code : undefined,
      details: typeof error.details === 'string' ? error.details : undefined,
      hint: typeof error.hint === 'string' ? error.hint : undefined,
    }
  }
  return { message: String(error || 'unknown_error') }
}

function requestToken(request: VercelRequest): string {
  const authorization = String(request.headers.authorization || '')
  if (authorization.startsWith('Bearer ')) return authorization.slice(7)
  return ''
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

export default async function slackDebug(request: VercelRequest, response: VercelResponse) {
  response.setHeader('Cache-Control', 'no-store')
  if (!await verifyGithubOidc(requestToken(request))) {
    response.status(401).json({ error: 'unauthorized' })
    return
  }

  const diagnostics: Record<string, unknown> = {
    env: {
      slack: Boolean(process.env.SLACK_BOT_TOKEN),
      supabaseUrl: Boolean(process.env.SUPABASE_URL),
      supabaseServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      leadEndpoint: Boolean(process.env.AD_LEAD_APPS_SCRIPT_URL),
      leadSecret: Boolean(process.env.AD_LEAD_READ_SECRET),
    },
  }

  let allOk = true

  try {
    const supabase = createSupabaseAdmin()
    const tracking = await supabase.from('ad_lead_tracking').select('source_key').limit(1)
    diagnostics.tracking = tracking.error ? { ok: false, error: safeError(tracking.error) } : { ok: true }
    if (tracking.error) allOk = false

    const clients = await supabase.from('clients').select('id').limit(1)
    diagnostics.clients = clients.error ? { ok: false, error: safeError(clients.error) } : { ok: true }
    if (clients.error) allOk = false
  } catch (error) {
    diagnostics.supabase = { ok: false, error: safeError(error) }
    allOk = false
  }

  try {
    const endpoint = process.env.AD_LEAD_APPS_SCRIPT_URL
    const secret = process.env.AD_LEAD_READ_SECRET
    if (!endpoint || !secret) throw new Error('ad_lead_source_not_configured')
    const url = new URL(endpoint)
    url.searchParams.set('secret', secret)
    const leadResponse = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    })
    const leadPayload = await leadResponse.json() as Record<string, unknown>
    const leadCount = Array.isArray(leadPayload.leads) ? leadPayload.leads.length : null
    diagnostics.leads = { ok: leadResponse.ok && leadPayload.ok === true, status: leadResponse.status, count: leadCount }
    if (!leadResponse.ok || leadPayload.ok !== true) allOk = false
  } catch (error) {
    diagnostics.leads = { ok: false, error: safeError(error) }
    allOk = false
  }

  try {
    const token = process.env.SLACK_BOT_TOKEN
    if (!token) throw new Error('slack_not_configured')

    const authResponse = await fetch('https://slack.com/api/auth.test', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    })
    const authPayload = await authResponse.json() as Record<string, unknown>
    diagnostics.slackAuth = { ok: authPayload.ok === true, error: authPayload.error || null }
    if (authPayload.ok !== true) allOk = false

    const postResponse = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        channel: DASHBOARD_CHANNEL,
        text: '🧪 A2O CRM Bot 設定測試：Slack 連線及頻道權限正常。',
        unfurl_links: false,
      }),
      signal: AbortSignal.timeout(10000),
    })
    const postPayload = await postResponse.json() as Record<string, unknown>
    diagnostics.slackPost = { ok: postPayload.ok === true, error: postPayload.error || null }
    if (postPayload.ok !== true) allOk = false
  } catch (error) {
    diagnostics.slack = { ok: false, error: safeError(error) }
    allOk = false
  }

  response.status(allOk ? 200 : 500).json({ ok: allOk, diagnostics })
}
