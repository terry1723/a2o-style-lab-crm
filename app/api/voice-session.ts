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
  createClientSecret: (conversationId: string) => Promise<unknown>
  allowRequest?: (key: string) => boolean | Promise<boolean>
}

const A2O_VOICE_INSTRUCTIONS = `You are the A2O AI image consultant for a Hong Kong men's image-improvement and styling business.

Speak in natural Cantonese written and spoken style by default. Switch to Mandarin or English only when the visitor asks. Be warm, concise, practical and never judgmental.

Your role is to answer only these topics: the A2O image assessment, general image and styling consultation, how to make a booking request, and what happens after someone leaves a request. Explain that the assessment helps identify priorities, while the A2O team confirms the exact service scope, price and availability. Do not invent pricing, stock, dates, guarantees, medical advice, or any service details not stated here.

At the start, introduce yourself briefly as the A2O AI image consultant. You may help visitors think through goals such as daily presentation, work image, wardrobe direction, fit or grooming. Do not diagnose body, health, or mental-health issues.

If a visitor wants to book, first collect only their name, WhatsApp phone number, main goal, preferred contact method and preferred time. Before using the booking tool, clearly obtain an explicit, current confirmation that A2O may use those details to contact them about this request. Never call the tool without that confirmation. The visitor has already seen the voice-consent notice, but their booking permission must still be stated in the conversation. Explain that this creates a booking request, not a confirmed time slot; the A2O team will follow up.

If someone asks about data, say A2O does not save recordings or a full voice transcript through this feature. A2O only saves booking information the visitor explicitly authorizes for follow-up. Marketing messages are separate and optional.`

const BOOKING_TOOL = {
  type: 'function',
  name: 'create_booking_request',
  description: 'Save an explicitly authorized A2O booking request after the visitor has confirmed A2O may use their contact details to follow up.',
  parameters: {
    type: 'object',
    additionalProperties: false,
    properties: {
      name: { type: 'string', description: 'Visitor name' },
      phone: { type: 'string', description: 'Hong Kong WhatsApp phone number' },
      goal: { type: 'string', description: 'Main image or styling goal' },
      preferred_contact: { type: 'string', description: 'Preferred contact method, normally WhatsApp' },
      preferred_time: { type: 'string', description: 'Preferred date or time for a follow-up' },
      marketing_consent: { type: 'boolean', description: 'True only if the visitor separately opted in to marketing information' },
    },
    required: ['name', 'phone', 'goal', 'preferred_contact', 'preferred_time', 'marketing_consent'],
  },
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
      const clientSecret = await dependencies.createClientSecret(conversationId)
      response.setHeader?.('Cache-Control', 'no-store')
      response.status(200).json(clientSecret)
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      response.status(message === 'voice_not_configured' ? 503 : 502).json({ error: message === 'voice_not_configured' ? 'voice_not_configured' : 'voice_unavailable' })
    }
  }
}

async function createClientSecret(conversationId: string) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('voice_not_configured')

  const upstream = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Safety-Identifier': `a2o-voice-${conversationId}`,
    },
    body: JSON.stringify({
      session: {
        type: 'realtime',
        model: 'gpt-realtime-2.1',
        output_modalities: ['audio'],
        audio: {
          input: { turn_detection: { type: 'semantic_vad' } },
          output: { voice: 'marin' },
        },
        instructions: A2O_VOICE_INSTRUCTIONS,
        tools: [BOOKING_TOOL],
        tool_choice: 'auto',
      },
    }),
  })

  if (!upstream.ok) throw new Error('voice_upstream_unavailable')
  return await upstream.json()
}

const allowVoiceSessionRequest = createFixedWindowRateLimiter({ limit: 6, windowMs: 10 * 60 * 1000 })
const handler = createVoiceSessionHandler({ createClientSecret, allowRequest: allowVoiceSessionRequest })

export default async function voiceSession(request: VercelRequest, response: VercelResponse) {
  await handler(request, response)
}
