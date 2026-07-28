import { describe, expect, it, vi } from 'vitest'
import { createAdLeadsHandler } from './ad-leads'
import { createAdLeadTrackingHandler } from './ad-lead-tracking'

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
    const handler = createAdLeadsHandler({ readSourceLeads, loadTracking })
    const response = responseRecorder()

    await handler({ method: 'GET' }, response)

    expect(response.statusCode).toBe(200)
    expect(response.headers['Cache-Control']).toBe('no-store')
    expect(response.body).toEqual({
      leads: [expect.objectContaining({ sourceKey: 'A2O Website:sheet:8', status: '已預約', owner: 'Martin' })],
      unavailableSources: ['Men New Form'],
    })
  })

  it('accepts GET only for the source lead inbox', async () => {
    const handler = createAdLeadsHandler({ readSourceLeads: vi.fn(), loadTracking: vi.fn() })
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

  it('rejects malformed tracking updates before persistence', async () => {
    const upsert = vi.fn()
    const trackingHandler = createAdLeadTrackingHandler({ upsertTracking: upsert })
    const response = responseRecorder()

    await trackingHandler({ method: 'PATCH', body: { sourceKey: 'not-a-source-key', status: 'unknown', owner: 'Nobody' } }, response)

    expect(response.statusCode).toBe(400)
    expect(response.body).toEqual({ error: 'invalid_request' })
    expect(upsert).not.toHaveBeenCalled()
  })
})
