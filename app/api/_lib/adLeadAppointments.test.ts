import { describe, expect, it, vi } from 'vitest'
import { loadAdLeadAppointments, upsertAdLeadAppointment } from './adLeadAppointments'

function appointmentClient(options: {
  selectResult?: { data: unknown; error: unknown }
  upsertResult?: { error: unknown }
}) {
  const select = vi.fn().mockResolvedValue(options.selectResult ?? { data: [], error: null })
  const upsert = vi.fn().mockResolvedValue(options.upsertResult ?? { error: null })
  const rpc = vi.fn().mockResolvedValue({ error: null })
  const from = vi.fn().mockReturnValue({ select, upsert })
  return { client: { from, rpc }, select, upsert, rpc }
}

describe('adLeadAppointments', () => {
  it('loads only valid booking rows for the inbox calendar', async () => {
    const { client, select } = appointmentClient({
      selectResult: {
        data: [
          { source_key: 'Meta:lead-1', appointment_date: '2026-08-01', appointment_time: '12:00' },
          { source_key: 'invalid', appointment_date: '2026-08-01', appointment_time: '10:00' },
        ],
        error: null,
      },
    })

    await expect(loadAdLeadAppointments(client)).resolves.toEqual([
      { sourceKey: 'Meta:lead-1', appointmentDate: '2026-08-01', appointmentTime: '12:00' },
    ])
    expect(select).toHaveBeenCalledWith('source_key, appointment_date, appointment_time')
  })

  it('writes a booking for one advertising lead', async () => {
    const { client, upsert } = appointmentClient({})

    await upsertAdLeadAppointment({
      source_key: 'Meta:lead-1', appointment_date: '2026-08-01', appointment_time: '12:00',
    }, client)

    expect(upsert).toHaveBeenCalledWith({
      source_key: 'Meta:lead-1', appointment_date: '2026-08-01', appointment_time: '12:00',
    })
  })

  it('reports a taken slot when Supabase rejects the unique date and time', async () => {
    const { client } = appointmentClient({ upsertResult: { error: { code: '23505' } } })

    await expect(upsertAdLeadAppointment({
      source_key: 'Meta:lead-1', appointment_date: '2026-08-01', appointment_time: '12:00',
    }, client)).rejects.toThrow('appointment_slot_taken')
  })
})
