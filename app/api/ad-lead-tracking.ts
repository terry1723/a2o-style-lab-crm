import type { VercelRequest, VercelResponse } from '@vercel/node'
import { isAdLeadOwner, isAdLeadStatus, isSourceKey, upsertAdLeadTracking, type AdLeadTrackingUpdate } from './_lib/adLeadTracking.js'
import {
  bookAdLeadAppointment,
  isAdLeadAppointmentDate,
  isAdLeadAppointmentSlot,
  type AdLeadAppointmentBooking,
} from './_lib/adLeadAppointments.js'

type RequestLike = { method?: string; body?: unknown }
type ResponseLike = {
  status: (code: number) => ResponseLike
  json: (body: unknown) => unknown
  setHeader?: (name: string, value: string) => unknown
}

type Dependencies = {
  upsertTracking: (update: AdLeadTrackingUpdate) => Promise<void>
  bookAppointment?: (booking: AdLeadAppointmentBooking) => Promise<void>
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

export function createAdLeadTrackingHandler({ upsertTracking, bookAppointment }: Dependencies) {
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
      if (includesAppointment) {
        if (!bookAppointment) throw new Error('ad_lead_appointments_unavailable')
        await bookAppointment({
          source_key: sourceKey,
          owner,
          appointment_date: appointmentDate as string,
          appointment_time: appointmentTime as AdLeadAppointmentBooking['appointment_time'],
        })
        response.status(200).json({ sourceKey, status: '已預約', owner, appointmentDate, appointmentTime })
        return
      }

      await upsertTracking({ source_key: sourceKey, status, owner })
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

const handler = createAdLeadTrackingHandler({ upsertTracking: upsertAdLeadTracking, bookAppointment: bookAdLeadAppointment })

export default async function adLeadTracking(request: VercelRequest, response: VercelResponse) {
  await handler(request, response)
}
