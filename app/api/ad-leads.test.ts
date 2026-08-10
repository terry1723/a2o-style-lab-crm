import { describe, expect, it, vi } from 'vitest'
import { createAdLeadsHandler } from './ad-leads'
import { createAdLeadTrackingHandler, createCanonicalLeadSlackSync } from './ad-lead-tracking'

function responseRecorder() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(body: unknown) {
      this.body = body
      return this
    },
    setHeader(name: string, value: string) {
      this.headers[name] = value
      return this
    },
  }
}

describe('advertising lead endpoints', () => {
  it('merges validated source rows with CRM-only tracking and disables caching', async () => {
    const readSourceLeads = vi.fn().mockResolvedValue({
      leads: [
        { source: 'A2O Website', id: 'sheet:8', submittedAt: '2026-07-28T09:00:00+08:00', name: 'Chan Tai Man', phone: '91234567', tag: 'Meta' },
        { source: 'A2O Website', id: 'bad', submittedAt: 'not-a-date', name: 'Invalid', phone: '92345678', tag: 'Meta' },
      ],
      unavailableSources: ['Men New Form'],
    })
    const loadTracking = vi.fn().mockResolvedValue({
      'A2O Website:sheet:8': { status: '已預約', owner: 'Martin' },
    })
    const loadAppointments = vi.fn().mockResolvedValue([
      { sourceKey: 'A2O Website:sheet:8', appointmentDate: '2026-08-01', appointmentTime: '12:00' },
    ])
    const handler = createAdLeadsHandler({ readSourceLeads, loadTracking, loadAppointments })
    const response = responseRecorder()

    await handler({ method: 'GET' }, response)

    expect(response.statusCode).toBe(200)
    expect(response.headers['Cache-Control']).toBe('no-store')
    expect(response.body).toEqual({
      leads: [expect.objectContaining({ sourceKey: 'A2O Website:sheet:8', status: '已預約', owner: 'Martin' })],
      appointments: [{ sourceKey: 'A2O Website:sheet:8', appointmentDate: '2026-08-01', appointmentTime: '12:00' }],
      unavailableSources: ['Men New Form'],
    })
  })

  it('uses the canonical Supabase source when cutover mode is enabled', async () => {
    const readSourceLeads = vi.fn()
    const loadTracking = vi.fn()
    const loadAppointments = vi.fn()
    const loadCanonical = vi.fn().mockResolvedValue({
      leads: [{
        source: 'A2O Website', id: 'A2O Website:sheet:9', submittedAt: '2026-08-09T09:00:00+08:00',
        name: 'Canonical Lead', phone: '+85291234567', tag: 'ig', sourceKey: 'A2O Website:sheet:9',
        status: '未聯絡', owner: 'Ryan',
      }],
      appointments: [],
    })
    const handler = createAdLeadsHandler({
      readSourceLeads, loadTracking, loadAppointments, loadCanonical,
      canonicalEnabled: () => true,
    })
    const response = responseRecorder()

    await handler({ method: 'GET' }, response)

    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual({
      leads: [expect.objectContaining({ sourceKey: 'A2O Website:sheet:9', name: 'Canonical Lead' })],
      appointments: [],
      unavailableSources: [],
    })
    expect(loadCanonical).toHaveBeenCalledOnce()
    expect(readSourceLeads).not.toHaveBeenCalled()
    expect(loadTracking).not.toHaveBeenCalled()
    expect(loadAppointments).not.toHaveBeenCalled()
  })

  it('accepts GET only for the source lead inbox', async () => {
    const handler = createAdLeadsHandler({ readSourceLeads: vi.fn(), loadTracking: vi.fn(), loadAppointments: vi.fn() })
    const response = responseRecorder()

    await handler({ method: 'POST' }, response)

    expect(response.statusCode).toBe(405)
    expect(response.body).toEqual({ error: 'method_not_allowed' })
  })

  it('updates only the tracking overlay for valid status and owner values', async () => {
    const upsert = vi.fn().mockResolvedValue(undefined)
    const trackingHandler = createAdLeadTrackingHandler({ upsertTracking: upsert })
    const response = responseRecorder()

    await trackingHandler({ method: 'PATCH', body: { sourceKey: 'a2owebsite:s1', status: '已預約', owner: 'Martin' } }, response)

    expect(response.statusCode).toBe(200)
    expect(response.headers['Cache-Control']).toBe('no-store')
    expect(upsert).toHaveBeenCalledWith({ source_key: 'a2owebsite:s1', status: '已預約', owner: 'Martin' })
  })

  it('writes canonical tracking in cutover mode without dropping the legacy mirror', async () => {
    const legacyUpsert = vi.fn()
    const canonicalUpsert = vi.fn().mockResolvedValue(undefined)
    const trackingHandler = createAdLeadTrackingHandler({
      upsertTracking: legacyUpsert,
      upsertCanonicalTracking: canonicalUpsert,
      canonicalEnabled: () => true,
    })
    const response = responseRecorder()

    await trackingHandler({ method: 'PATCH', body: { sourceKey: 'a2owebsite:s1', status: 'WhatsApp 跟進中', owner: 'Ryan' } }, response)

    expect(response.statusCode).toBe(200)
    expect(canonicalUpsert).toHaveBeenCalledWith({ source_key: 'a2owebsite:s1', status: 'WhatsApp 跟進中', owner: 'Ryan' })
    expect(legacyUpsert).not.toHaveBeenCalled()
  })

  it('best-effort syncs a canonical CRM update immediately after the outbox write', async () => {
    const canonicalUpsert = vi.fn().mockResolvedValue(undefined)
    const syncCanonicalLead = vi.fn().mockResolvedValue(undefined)
    const trackingHandler = createAdLeadTrackingHandler({
      upsertTracking: vi.fn(),
      upsertCanonicalTracking: canonicalUpsert,
      syncCanonicalLead,
      canonicalEnabled: () => true,
    })
    const response = responseRecorder()

    await trackingHandler({ method: 'PATCH', body: { sourceKey: 'a2owebsite:s1', status: 'WhatsApp 跟進中', owner: 'Ryan' } }, response)

    expect(response.statusCode).toBe(200)
    expect(canonicalUpsert.mock.invocationCallOrder[0]).toBeLessThan(syncCanonicalLead.mock.invocationCallOrder[0])
    expect(syncCanonicalLead).toHaveBeenCalledWith('a2owebsite:s1')
  })

  it('claims the canonical outbox row before an immediate Slack upsert', async () => {
    const lead = {
      source: 'A2O Website', id: 'A2O Website:sheet:1', submittedAt: '2026-08-09T09:00:00+08:00',
      name: 'Synthetic Lead', phone: '+85291234567', tag: 'ig', sourceKey: 'A2O Website:sheet:1',
      status: 'WhatsApp 跟進中' as const, owner: 'Ryan' as const, canonicalId: 'LEAD-1',
      normalizedPhone: '85291234567', appointmentAt: null, slackListItemId: null, syncVersion: 3,
    }
    const row = { id: 'OUTBOX-1', lead_id: 'LEAD-1', target_version: 3, attempt_count: 1, locked_by: 'crm-worker' }
    const loadLeadBySourceKey = vi.fn().mockResolvedValue(lead)
    const claimOutbox = vi.fn().mockResolvedValue(row)
    const syncLead = vi.fn().mockResolvedValue('REC-1')
    const completeOutbox = vi.fn().mockResolvedValue(undefined)
    const failOutbox = vi.fn()
    const sync = createCanonicalLeadSlackSync({
      loadLeadBySourceKey, claimOutbox, syncLead, completeOutbox, failOutbox,
      workerId: () => 'crm-worker',
    })

    await sync('A2O Website:sheet:1')

    expect(claimOutbox).toHaveBeenCalledWith('LEAD-1', 'crm-worker')
    expect(syncLead).toHaveBeenCalledWith(lead)
    expect(completeOutbox).toHaveBeenCalledWith(row, 'REC-1', 'crm-worker', 3)
    expect(failOutbox).not.toHaveBeenCalled()
  })

  it('rejects malformed tracking updates before persistence', async () => {
    const upsert = vi.fn()
    const trackingHandler = createAdLeadTrackingHandler({ upsertTracking: upsert })
    const response = responseRecorder()

    await trackingHandler({ method: 'PATCH', body: { sourceKey: 'not-a-source-key', status: 'unknown', owner: 'Nobody' } }, response)

    expect(response.statusCode).toBe(400)
    expect(response.body).toEqual({ error: 'invalid_request' })
    expect(upsert).not.toHaveBeenCalled()
  })

  it('books a valid slot and marks the customer as booked in one operation', async () => {
    const upsert = vi.fn()
    const book = vi.fn().mockResolvedValue(undefined)
    const trackingHandler = createAdLeadTrackingHandler({ upsertTracking: upsert, bookAppointment: book })
    const response = responseRecorder()

    await trackingHandler({
      method: 'PATCH',
      body: {
        sourceKey: 'a2owebsite:s1', status: '未聯絡', owner: 'Martin',
        appointmentDate: '2026-08-01', appointmentTime: '12:00',
      },
    }, response)

    expect(response.statusCode).toBe(200)
    expect(book).toHaveBeenCalledWith({
      source_key: 'a2owebsite:s1', owner: 'Martin',
      appointment_date: '2026-08-01', appointment_time: '12:00',
    })
    expect(upsert).not.toHaveBeenCalled()
  })

  it('returns a conflict without changing tracking when an appointment slot is already taken', async () => {
    const upsert = vi.fn()
    const book = vi.fn().mockRejectedValue(new Error('appointment_slot_taken'))
    const trackingHandler = createAdLeadTrackingHandler({ upsertTracking: upsert, bookAppointment: book })
    const response = responseRecorder()

    await trackingHandler({
      method: 'PATCH',
      body: {
        sourceKey: 'a2owebsite:s1', status: '已預約', owner: 'Martin',
        appointmentDate: '2026-08-01', appointmentTime: '12:00',
      },
    }, response)

    expect(response.statusCode).toBe(409)
    expect(response.body).toEqual({ error: 'appointment_slot_taken' })
    expect(upsert).not.toHaveBeenCalled()
  })
})
