import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requeueAdLeadOutbox } from './_lib/adLeadCanonical.js'

type RequestLike = { method?: string; headers?: Record<string, string | string[] | undefined>; body?: unknown }
type ResponseLike = {
  status: (code: number) => ResponseLike
  json: (body: unknown) => unknown
  setHeader?: (name: string, value: string) => unknown
}
type Dependencies = {
  retrySecret?: () => string | undefined
  requeue?: (outboxId?: string) => Promise<number>
}

function headerValue(headers: RequestLike['headers'], key: string): string | undefined {
  const value = headers?.[key] ?? headers?.[key.toLowerCase()]
  return Array.isArray(value) ? value[0] : value
}

function parsedOutboxId(body: unknown): string | undefined {
  const value = typeof body === 'string'
    ? (() => { try { return JSON.parse(body) } catch { return null } })()
    : body
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const outboxId = (value as Record<string, unknown>).outboxId
  return typeof outboxId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(outboxId)
    ? outboxId
    : undefined
}

export function createAdLeadSyncRetryHandler({
  retrySecret = () => process.env.AD_LEAD_RETRY_SECRET ?? process.env.AD_LEAD_HEALTH_SECRET,
  requeue = requeueAdLeadOutbox,
}: Dependencies = {}) {
  return async (request: RequestLike, response: ResponseLike) => {
    response.setHeader?.('Cache-Control', 'no-store')
    if (request.method !== 'POST') {
      response.status(405).json({ error: 'method_not_allowed' })
      return
    }
    const secret = retrySecret()
    if (!secret || headerValue(request.headers, 'authorization') !== `Bearer ${secret}`) {
      response.status(401).json({ error: 'unauthorized' })
      return
    }
    try {
      const requeued = await requeue(parsedOutboxId(request.body))
      response.status(200).json({ ok: true, requeued })
    } catch {
      response.status(503).json({ error: 'lead_sync_retry_unavailable' })
    }
  }
}

const handler = createAdLeadSyncRetryHandler()

export default async function adLeadSyncRetry(request: VercelRequest, response: VercelResponse) {
  await handler(request, response)
}
