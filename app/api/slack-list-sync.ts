import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  normalizeAdLeads,
  type AdLeadOwner,
  type AdLeadSourceRow,
  type AdLeadStatus,
  type AdLeadTracking,
} from '../src/features/ad-leads/adLeadService.js'
import { createSupabaseAdmin } from './_lib/supabaseAdmin.js'
import { syncA2OLeadList } from './_lib/slackLeadList.js'

type TrackingRow = {
  source_key: string
  status: AdLeadStatus
  owner: AdLeadOwner
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
}

type GithubOpenIdConfiguration = {
  jwks_uri?: string
}

type GithubJwk = JsonWebKey & { kid?: string }

type GithubJwks = {
  keys?: GithubJwk[]
}

const GITHUB_OIDC_AUDIENCE = 'a2o-slack-sync'
const GITHUB_REPOSITORY = 'terry1723/a2o-style-lab-crm'
const GITHUB_MAIN_REF = 'refs/heads/main'

let cachedGithubKeys: { expiresAt: number; keys: GithubJwk[] } | null = null

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
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

function toArrayBuffer(value: Uint8Array): ArrayBuffer {
  return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer
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
      toArrayBuffer(decodeBase64Url(parts[2])),
      toArrayBuffer(new TextEncoder().encode(`${parts[0]}.${parts[1]}`)),
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
  const sourceResponse = await fetcher(url, { headers: { Accept: 'application/json' } })
  if (!sourceResponse.ok) throw new Error('ad_lead_source_unavailable')

  const payload: unknown = await sourceResponse.json()
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

function isPermissionSetupError(message: string): boolean {
  return [
    'slack_api_missing_scope',
    'slack_api_no_permission',
    'slack_api_permission_denied',
    'slack_api_not_allowed_token_type',
    'slack_api_list_not_found',
  ].some((value) => message.includes(value))
}

export default async function slackListSync(request: VercelRequest, response: VercelResponse) {
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
    const [source, trackingResult] = await Promise.all([
      readSourceLeads(),
      supabase.from('ad_lead_tracking').select('source_key,status,owner,updated_at'),
    ])

    if (trackingResult.error) throw trackingResult.error

    const trackingRows = (trackingResult.data || []) as TrackingRow[]
    const tracking: Record<string, AdLeadTracking> = Object.fromEntries(
      trackingRows
        .filter((row) => !row.source_key.startsWith('slack:'))
        .map((row) => [row.source_key, { status: row.status, owner: row.owner }]),
    )
    const leads = normalizeAdLeads(source.leads, tracking)
    const result = await syncA2OLeadList(leads)

    response.status(200).json({
      ok: true,
      ...result,
      unavailableSources: source.unavailableSources,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'slack_list_sync_failed'
    if (isPermissionSetupError(message)) {
      response.status(200).json({
        ok: false,
        skipped: true,
        error: message,
        actionRequired: 'Add lists:read, lists:write and files:read scopes, reinstall A2O CRM Bot, and keep the bot in #a2o-leads.',
      })
      return
    }
    response.status(message.includes('not_configured') ? 503 : 500).json({ error: message })
  }
}
