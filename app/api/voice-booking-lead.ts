import type { VercelRequest, VercelResponse } from '@vercel/node'
import { randomUUID } from 'node:crypto'
import { createSupabaseAdmin } from './_lib/supabaseAdmin.js'
import { createFixedWindowRateLimiter, getForwardedAddress } from './_lib/requestRateLimit.js'

type RequestLike = { method?: string; body?: unknown; headers?: Record<string, string | string[] | undefined> }
type ResponseLike = { status: (code: number) => ResponseLike; json: (body: unknown) => unknown; setHeader?: (name: string, value: string) => unknown }

export type VoiceBookingLead = {
  name: string
  phone: string
  goal: string
  preferredContact: string
  preferredTime: string
  marketingConsent: boolean
}

type Dependencies = {
  saveLead: (lead: VoiceBookingLead) => Promise<void>
  allowRequest?: (key: string) => boolean | Promise<boolean>
}

function parseBody(body: unknown) {
  if (typeof body === 'string') {
    try { return JSON.parse(body) as unknown } catch { return null }
  }
  return body
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maxLength) : ''
}

function normalizePhone(value: unknown) {
  const cleaned = cleanText(value, 40).replace(/[\s()-]/g, '')
  const local = cleaned.replace(/^\+852/, '').replace(/^852/, '')
  return /^\d{8}$/.test(local) ? `+852${local}` : ''
}

function validateLead(value: unknown): VoiceBookingLead {
  if (!value || typeof value !== 'object') throw new Error('invalid_lead')
  const payload = value as Record<string, unknown>
  if (payload.privacyConsent !== true) throw new Error('consent_required')
  const name = cleanText(payload.name, 80)
  const phone = normalizePhone(payload.phone)
  const goal = cleanText(payload.goal, 500)
  const preferredContact = cleanText(payload.preferredContact, 60)
  const preferredTime = cleanText(payload.preferredTime, 120)
  if (!name || !phone || !goal || !preferredContact || !preferredTime) throw new Error('invalid_lead')
  return { name, phone, goal, preferredContact, preferredTime, marketingConsent: payload.marketingConsent === true }
}

export function createVoiceBookingLeadHandler(dependencies: Dependencies) {
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
      const lead = validateLead(parseBody(request.body))
      await dependencies.saveLead(lead)
      response.setHeader?.('Cache-Control', 'no-store')
      response.status(200).json({ ok: true, message: 'booking_request_saved' })
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (message === 'invalid_lead' || message === 'consent_required') {
        response.status(400).json({ error: 'invalid_booking_request' })
        return
      }
      response.status(message === 'supabase_server_not_configured' ? 503 : 502).json({ error: message === 'supabase_server_not_configured' ? 'server_not_configured' : 'booking_request_unavailable' })
    }
  }
}

async function saveLead(lead: VoiceBookingLead) {
  const { error } = await createSupabaseAdmin().from('clients').insert({
    id: randomUUID(),
    name: lead.name,
    phone: lead.phone,
    pain_point: lead.goal,
    purpose: lead.preferredTime,
    lifestyle: `Voice advisor booking request. Preferred contact: ${lead.preferredContact}. Marketing consent: ${lead.marketingConsent ? 'yes' : 'no'}.`,
    plan: 'Voice booking request',
    plan_price: 0,
    amount_paid: 0,
    balance_due: 0,
    status: 'active',
  })
  if (error) throw new Error('voice_lead_save_failed')
}

const allowVoiceBookingRequest = createFixedWindowRateLimiter({ limit: 12, windowMs: 10 * 60 * 1000 })
const handler = createVoiceBookingLeadHandler({ saveLead, allowRequest: allowVoiceBookingRequest })

export default async function voiceBookingLead(request: VercelRequest, response: VercelResponse) {
  await handler(request, response)
}
