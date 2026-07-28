import type { VercelRequest, VercelResponse } from '@vercel/node'
import { normalizeAdLeads, type AdLeadSourceRow, type AdLeadTracking } from '../src/features/ad-leads/adLeadService.js'
import { loadAdLeadTracking } from './_lib/adLeadTracking.js'

type RequestLike = { method?: string }
type ResponseLike = {
  status: (code: number) => ResponseLike
  json: (body: unknown) => unknown
  setHeader?: (name: string, value: string) => unknown
}

type SourceLeadResponse = {
  leads: AdLeadSourceRow[]
  unavailableSources: string[]
}

type Dependencies = {
  readSourceLeads: () => Promise<SourceLeadResponse>
  loadTracking: () => Promise<Record<string, AdLeadTracking>>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isSourceLeadRow(value: unknown): value is AdLeadSourceRow {
  return isRecord(value) && ['source', 'id', 'submittedAt', 'name', 'phone', 'tag']
    .every((key) => typeof value[key] === 'string')
}

function isSourceResponse(value: unknown): value is SourceLeadResponse {
  return isRecord(value)
    && Array.isArray(value.leads)
    && value.leads.every(isSourceLeadRow)
    && Array.isArray(value.unavailableSources)
    && value.unavailableSources.every((source) => typeof source === 'string')
}

export async function readAppsScriptAdLeads(fetcher: typeof fetch = fetch): Promise<SourceLeadResponse> {
  const endpoint = process.env.AD_LEAD_APPS_SCRIPT_URL
  const secret = process.env.AD_LEAD_READ_SECRET
  if (!endpoint || !secret) throw new Error('ad_lead_source_not_configured')

  const url = new URL(endpoint)
  url.searchParams.set('secret', secret)
  const response = await fetcher(url, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error('ad_lead_source_unavailable')

  const payload: unknown = await response.json()
  if (!isRecord(payload) || payload.ok !== true || !isSourceResponse(payload)) {
    throw new Error('ad_lead_source_unavailable')
  }
  return payload
}

export function createAdLeadsHandler({ readSourceLeads, loadTracking }: Dependencies) {
  return async (request: RequestLike, response: ResponseLike) => {
    response.setHeader?.('Cache-Control', 'no-store')
    if (request.method !== 'GET') {
      response.status(405).json({ error: 'method_not_allowed' })
      return
    }

    try {
      const [source, tracking] = await Promise.all([readSourceLeads(), loadTracking()])
      response.status(200).json({
        leads: normalizeAdLeads(source.leads, tracking),
        unavailableSources: source.unavailableSources,
      })
    } catch {
      response.status(503).json({ error: 'lead_inbox_unavailable' })
    }
  }
}

const handler = createAdLeadsHandler({ readSourceLeads: readAppsScriptAdLeads, loadTracking: loadAdLeadTracking })

export default async function adLeads(request: VercelRequest, response: VercelResponse) {
  await handler(request, response)
}
