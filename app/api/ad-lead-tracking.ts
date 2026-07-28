import type { VercelRequest, VercelResponse } from '@vercel/node'
import { isAdLeadOwner, isAdLeadStatus, isSourceKey, upsertAdLeadTracking, type AdLeadTrackingUpdate } from './_lib/adLeadTracking.js'

type RequestLike = { method?: string; body?: unknown }
type ResponseLike = {
  status: (code: number) => ResponseLike
  json: (body: unknown) => unknown
  setHeader?: (name: string, value: string) => unknown
}

type Dependencies = {
  upsertTracking: (update: AdLeadTrackingUpdate) => Promise<void>
}

function parseBody(body: unknown): Record<string, unknown> {
  if (typeof body === 'string') {
    try {
      return parseBody(JSON.parse(body))
    } catch {
      return {}
    }
  }
  return body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {}
}

export function createAdLeadTrackingHandler({ upsertTracking }: Dependencies) {
  return async (request: RequestLike, response: ResponseLike) => {
    response.setHeader?.('Cache-Control', 'no-store')
    if (request.method !== 'PATCH') {
      response.status(405).json({ error: 'method_not_allowed' })
      return
    }

    const { sourceKey, status, owner } = parseBody(request.body)
    if (!isSourceKey(sourceKey) || !isAdLeadStatus(status) || !isAdLeadOwner(owner)) {
      response.status(400).json({ error: 'invalid_request' })
      return
    }

    try {
      await upsertTracking({ source_key: sourceKey, status, owner })
      response.status(200).json({ sourceKey, status, owner })
    } catch {
      response.status(503).json({ error: 'tracking_unavailable' })
    }
  }
}

const handler = createAdLeadTrackingHandler({ upsertTracking: upsertAdLeadTracking })

export default async function adLeadTracking(request: VercelRequest, response: VercelResponse) {
  await handler(request, response)
}
