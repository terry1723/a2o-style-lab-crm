import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createSupabaseAdmin } from './_lib/supabaseAdmin.js'
import { createFixedWindowRateLimiter, getForwardedAddress } from './_lib/requestRateLimit.js'

type StaffProfile = {
  name: string
  role: string
}

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
  verifyPin: (pin: string) => Promise<StaffProfile | null>
  allowRequest?: (key: string) => boolean | Promise<boolean>
}

function parseBody(body: unknown): Record<string, unknown> {
  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
    } catch {
      return {}
    }
  }
  return body && typeof body === 'object' && !Array.isArray(body)
    ? body as Record<string, unknown>
    : {}
}

export function createStaffLoginHandler({ verifyPin, allowRequest }: Dependencies) {
  return async (request: RequestLike, response: ResponseLike) => {
    response.setHeader?.('Cache-Control', 'no-store')

    if (request.method !== 'POST') {
      response.status(405).json({ authenticated: false, error: 'method_not_allowed' })
      return
    }

    if (allowRequest && !await allowRequest(getForwardedAddress(request.headers))) {
      response.setHeader?.('Retry-After', '900')
      response.status(429).json({ authenticated: false, error: 'too_many_requests' })
      return
    }

    const body = parseBody(request.body)
    const pin = typeof body.pin === 'string' ? body.pin : ''
    if (!pin.trim() || pin.length > 128) {
      response.status(400).json({ authenticated: false, error: 'invalid_request' })
      return
    }

    try {
      const staff = await verifyPin(pin)
      if (!staff) {
        response.status(401).json({ authenticated: false, error: 'invalid_credentials' })
        return
      }

      response.status(200).json({ authenticated: true, staff })
    } catch {
      response.status(503).json({ authenticated: false, error: 'server_unavailable' })
    }
  }
}

async function verifyStaffPin(pin: string): Promise<StaffProfile | null> {
  const { data, error } = await createSupabaseAdmin()
    .from('staff_profiles')
    .select('name, role')
    .eq('pin', pin)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return { name: data.name, role: data.role }
}

const allowStaffLogin = createFixedWindowRateLimiter({ limit: 8, windowMs: 15 * 60 * 1000 })
const handler = createStaffLoginHandler({ verifyPin: verifyStaffPin, allowRequest: allowStaffLogin })

export default async function staffLogin(request: VercelRequest, response: VercelResponse) {
  await handler(request, response)
}
