import {
  AD_LEAD_APPOINTMENT_SLOTS,
  type AdLeadAppointment,
  type AdLeadAppointmentSlot,
} from '../../src/features/ad-leads/adLeadService.js'
import { isSourceKey } from './adLeadTracking.js'
import { createSupabaseAdmin } from './supabaseAdmin.js'

export type AdLeadAppointmentUpdate = {
  source_key: string
  appointment_date: string
  appointment_time: AdLeadAppointmentSlot
}

export type AdLeadAppointmentBooking = AdLeadAppointmentUpdate & {
  owner: 'Terry' | 'Ryan' | 'Martin' | 'Caren' | 'New'
}

type AppointmentClient = {
  from: (table: 'ad_lead_appointments') => {
    select: (columns: string) => PromiseLike<{ data: unknown; error: unknown }>
    upsert: (update: AdLeadAppointmentUpdate) => PromiseLike<{ error: unknown }>
  }
  rpc: (fn: 'book_ad_lead_appointment', args: {
    p_source_key: string
    p_owner: string
    p_appointment_date: string
    p_appointment_time: string
  }) => PromiseLike<{ error: unknown }>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function isAdLeadAppointmentDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export function isAdLeadAppointmentSlot(value: unknown): value is AdLeadAppointmentSlot {
  return typeof value === 'string' && (AD_LEAD_APPOINTMENT_SLOTS as readonly string[]).includes(value)
}

function appointmentsFromRows(rows: unknown): AdLeadAppointment[] {
  if (!Array.isArray(rows)) return []

  return rows.flatMap((row) => {
    if (!isRecord(row)
      || !isSourceKey(row.source_key)
      || !isAdLeadAppointmentDate(row.appointment_date)
      || !isAdLeadAppointmentSlot(row.appointment_time)) return []

    return [{
      sourceKey: row.source_key,
      appointmentDate: row.appointment_date,
      appointmentTime: row.appointment_time,
    }]
  })
}

export async function loadAdLeadAppointments(
  client: AppointmentClient = createSupabaseAdmin() as unknown as AppointmentClient,
): Promise<AdLeadAppointment[]> {
  const { data, error } = await client.from('ad_lead_appointments').select('source_key, appointment_date, appointment_time')
  if (error) {
    throw new Error('ad_lead_appointments_unavailable')
  }
  return appointmentsFromRows(data)
}

export async function upsertAdLeadAppointment(
  appointment: AdLeadAppointmentUpdate,
  client: AppointmentClient = createSupabaseAdmin() as unknown as AppointmentClient,
) {
  const { error } = await client.from('ad_lead_appointments').upsert(appointment)
  if (isRecord(error) && error.code === '23505') throw new Error('appointment_slot_taken')
  if (error) throw new Error('ad_lead_appointments_unavailable')
}

export async function bookAdLeadAppointment(
  appointment: AdLeadAppointmentBooking,
  client: AppointmentClient = createSupabaseAdmin() as unknown as AppointmentClient,
) {
  const { error } = await client.rpc('book_ad_lead_appointment', {
    p_source_key: appointment.source_key,
    p_owner: appointment.owner,
    p_appointment_date: appointment.appointment_date,
    p_appointment_time: appointment.appointment_time,
  })
  if (isRecord(error) && error.code === '23505') throw new Error('appointment_slot_taken')
  if (error) throw new Error('ad_lead_appointments_unavailable')
}
