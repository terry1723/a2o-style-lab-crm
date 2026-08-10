import type { VercelRequest, VercelResponse } from '@vercel/node'
import { isAdLeadOwner, isAdLeadStatus, isSourceKey, upsertAdLeadTracking, type AdLeadTrackingUpdate } from './_lib/adLeadTracking.js'
import {
  bookAdLeadAppointment,
  isAdLeadAppointmentDate,
  isAdLeadAppointmentSlot,
  type AdLeadAppointmentBooking,
} from './_lib/adLeadAppointments.js'
import {
  bookCanonicalAdLeadAppointment,
  updateCanonicalAdLeadTracking,
} from './_lib/adLeadCanonical.js'

type RequestLike = { method?: string; body?: unknown }
type ResponseLike = {
  status: (code: number) => ResponseLike
  json: (body: unknown) => unknown
  setHeader?: (name: string, value: string) => unknown
}

type Dependencies = {
  upsertTracking: (update: AdLeadTrackingUpdate) => Promise<void>
  bookAppointment?: (booking: AdLeadAppointmentBooking) => Promise<void>
  upsertCanonicalTracking?: (update: AdLeadTrackingUpdate) => Promise<void>
  bookCanonicalAppointment?: (booking: AdLeadAppointmentBooking) => Promise<void>
  canonicalEnabled?: () => boolean
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

export function createAdLeadTrackingHandler({
  upsertTracking,
  bookAppointment,
  upsertCanonicalTracking,
  bookCanonicalAppointment,
  canonicalEnabled = () => false,
}: Dependencies) {
  return async (request: RequestLike, response: ResponseLike) => {
    response.setHeader?.('Cache-Control', 'no-store')
    if (request.method !== 'PATCH') {
      response.status(405).json({ error: 'method_not_allowed' })
      return
    }

    const { sourceKey, status, owner, appointmentDate, appointmentTime } = parseBody(request.body)
    const includesAppointment = appointmentDate !== undefined || appointmentTime !== undefined
    if (!isSourceKey(sourceKey) || !isAdLeadStatus(status) || !isAdLeadOwner(owner)
      || (includesAppointment && (!isAdLeadAppointmentDate(appointmentDate) || !isAdLeadAppointmentSlot(appointmentTime)))) {
      response.status(400).json({ error: 'invalid_request' })
      return
    }

    try {
      const useCanonical = canonicalEnabled()
      if (includesAppointment) {
        const book = useCanonical ? bookCanonicalAppointment : bookAppointment
        if (!book) throw new Error('ad_lead_appointments_unavailable')
        await book({
          source_key: sourceKey,
          owner,
          appointment_date: appointmentDate as string,
          appointment_time: appointmentTime as AdLeadAppointmentBooking['appointment_time'],
        })
        response.status(200).json({ sourceKey, status: '已預約', owner, appointmentDate, appointmentTime })
        return
      }

      const upsert = useCanonical ? upsertCanonicalTracking : upsertTracking
      if (!upsert) throw new Error('ad_lead_tracking_unavailable')
      await upsert({ source_key: sourceKey, status, owner })
      response.status(200).json({ sourceKey, status, owner })
    } catch (error) {
      if (error instanceof Error && error.message === 'appointment_slot_taken') {
        response.status(409).json({ error: 'appointment_slot_taken' })
        return
      }
      response.status(503).json({ error: 'tracking_unavailable' })
    }
  }
}

const handler = createAdLeadTrackingHandler({
  upsertTracking: upsertAdLeadTracking,
  bookAppointment: bookAdLeadAppointment,
  upsertCanonicalTracking: updateCanonicalAdLeadTracking,
  bookCanonicalAppointment: bookCanonicalAdLeadAppointment,
  canonicalEnabled: () => process.env.AD_LEAD_CANONICAL_MODE === 'canonical',
})

export default async function adLeadTracking(request: VercelRequest, response: VercelResponse) {
  await handler(request, response)
}
