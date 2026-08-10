import type { VercelRequest, VercelResponse } from '@vercel/node'
import { loadAdLeadSyncHealth } from './_lib/adLeadCanonical.js'

type RequestLike = { method?: string; headers?: Record<string, string | string[] | undefined> }
type ResponseLike = {
  status: (code: number) => ResponseLike
  json: (body: unknown) => unknown
  setHeader?: (name: string, value: string) => unknown
}
type Dependencies = {
  loadHealth: () => Promise<unknown>
  healthSecret?: () => string | undefined
}

function headerValue(headers: RequestLike['headers'], key: string): string | undefined {
  const value = headers?.[key] ?? headers?.[key.toLowerCase()]
  return Array.isArray(value) ? value[0] : value
}

function safeLastRun(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const run = value as Record<string, unknown>
  return {
    id: typeof run.id === 'string' ? run.id : undefined,
    started_at: typeof run.started_at === 'string' ? run.started_at : undefined,
    finished_at: typeof run.finished_at === 'string' ? run.finished_at : null,
    status: typeof run.status === 'string' ? run.status : 'unknown',
    imported: Number(run.imported ?? 0),
    deduplicated: Number(run.deduplicated ?? 0),
    invalid_phones: Number(run.invalid_phones ?? 0),
    unavailable_sources: Array.isArray(run.unavailable_sources) ? run.unavailable_sources.filter((source): source is string => typeof source === 'string') : [],
    error_code: typeof run.error_code === 'string' ? run.error_code : null,
  }
}

function safeTimestamp(value: unknown): string | null {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : null
}

export function createAdLeadSyncHealthHandler({ loadHealth, healthSecret = () => process.env.AD_LEAD_HEALTH_SECRET }: Dependencies) {
  return async (request: RequestLike, response: ResponseLike) => {
    response.setHeader?.('Cache-Control', 'no-store')
    if (request.method !== 'GET') {
      response.status(405).json({ error: 'method_not_allowed' })
      return
    }
    const secret = healthSecret()
    if (!secret || headerValue(request.headers, 'authorization') !== `Bearer ${secret}`) {
      response.status(401).json({ error: 'unauthorized' })
      return
    }
    try {
      const health = await loadHealth()
      const value = health && typeof health === 'object' && !Array.isArray(health) ? health as Record<string, unknown> : {}
      response.status(200).json({
        ok: true,
        outbox: value.outbox ?? {},
        lastRun: safeLastRun(value.lastRun),
        lastSlackSyncAt: safeTimestamp(value.lastSlackSyncAt),
      })
    } catch {
      response.status(503).json({ error: 'lead_sync_health_unavailable' })
    }
  }
}

const handler = createAdLeadSyncHealthHandler({ loadHealth: loadAdLeadSyncHealth })

export default async function adLeadSyncHealth(request: VercelRequest, response: VercelResponse) {
  await handler(request, response)
}
