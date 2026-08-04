import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createFixedWindowRateLimiter, getForwardedAddress } from './_lib/requestRateLimit.js'

type RequestLike = {
  method?: string
  body?: unknown
  headers?: Record<string, string | string[] | undefined>
}

type ResponseLike = {
  status: (code: number) => ResponseLike
  json: (body: unknown) => unknown
  setHeader?: (name: string, value: string) => unknown
}

type Dependencies = {
  createEphemeralToken: (conversationId: string) => Promise<{ token: string; expiresAt: string }>
  allowRequest?: (key: string) => boolean | Promise<boolean>
}

function parseBody(body: unknown) {
  if (typeof body === 'string') {
    try { return JSON.parse(body) as unknown } catch { return null }
  }
  return body
}

function getConversationId(body: unknown) {
  if (!body || typeof body !== 'object') return ''
  const value = (body as { conversationId?: unknown }).conversationId
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{16,128}$/.test(value) ? value : ''
}

export function createVoiceSessionHandler(dependencies: Dependencies) {
  return async (request: RequestLike, response: ResponseLike) => {
    if (request.method !== 'POST') {
      response.status(405).json({ error: 'method_not_allowed' })
      return
    }

    try {
      if (dependencies.allowRequest && !await dependencies.allowRequest(getForwardedAddress(request.headers))) {
        response.setHeader?.('Retry-After', '600')
        response.status(429).json({ error: 'too_many_requests' })
        return
      }
    } catch {
      response.status(503).json({ error: 'voice_unavailable' })
      return
    }

    const conversationId = getConversationId(parseBody(request.body))
    if (!conversationId) {
      response.status(400).json({ error: 'invalid_request' })
      return
    }

    try {
      const token = await dependencies.createEphemeralToken(conversationId)
      response.setHeader?.('Cache-Control', 'no-store')
      response.status(200).json(token)
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      response.status(message === 'voice_not_configured' ? 503 : 502).json({ error: message === 'voice_not_configured' ? 'voice_not_configured' : 'voice_unavailable' })
    }
  }
}

async function createEphemeralToken(_conversationId: string) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('voice_not_configured')

  const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString()
  const newSessionExpiresAt = new Date(Date.now() + 60 * 1000).toISOString()
  const upstream = await fetch(`https://generativelanguage.googleapis.com/v1alpha/auth_tokens?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uses: 1,
      expireTime: expiresAt,
      newSessionExpireTime: newSessionExpiresAt,
    }),
  })
  if (!upstream.ok) throw new Error('gemini_token_unavailable')
  const payload = await upstream.json() as { name?: unknown; expireTime?: unknown }
  if (typeof payload.name !== 'string' || !payload.name) throw new Error('gemini_token_unavailable')
  return { token: payload.name, expiresAt: typeof payload.expireTime === 'string' ? payload.expireTime : expiresAt }
}

const allowVoiceSessionRequest = createFixedWindowRateLimiter({ limit: 6, windowMs: 10 * 60 * 1000 })
const handler = createVoiceSessionHandler({ createEphemeralToken, allowRequest: allowVoiceSessionRequest })

export default async function voiceSession(request: VercelRequest, response: VercelResponse) {
  await handler(request, response)
}
