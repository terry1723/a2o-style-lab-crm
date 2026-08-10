import { describe, expect, it, vi } from 'vitest'
import { createAdLeadSyncHealthHandler } from './ad-lead-sync-health'

function responseRecorder() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    status(code: number) { this.statusCode = code; return this },
    json(body: unknown) { this.body = body; return this },
    setHeader(name: string, value: string) { this.headers[name] = value; return this },
  }
}

describe('ad lead sync health endpoint', () => {
  it('fails closed when no server-side health secret is configured', async () => {
    const loadHealth = vi.fn().mockResolvedValue({
      outbox: { pending: 2, processing: 0, failed: 1, dead_letter: 0 },
      lastRun: { status: 'completed', imported: 4, unavailable_sources: [] },
    })
    const handler = createAdLeadSyncHealthHandler({ loadHealth, healthSecret: () => undefined })
    const response = responseRecorder()

    await handler({ method: 'GET', headers: {} }, response)

    expect(response.statusCode).toBe(401)
    expect(response.headers['Cache-Control']).toBe('no-store')
    expect(response.body).toEqual({ error: 'unauthorized' })
    expect(loadHealth).not.toHaveBeenCalled()
  })

  it('returns aggregate health only with the server-side health secret', async () => {
    const loadHealth = vi.fn().mockResolvedValue({
      outbox: { pending: 2, processing: 0, failed: 1, dead_letter: 0 },
      lastRun: { status: 'completed', imported: 4, unavailable_sources: [] },
    })
    const handler = createAdLeadSyncHealthHandler({ healthSecret: () => 'secret', loadHealth })
    const response = responseRecorder()

    await handler({ method: 'GET', headers: { authorization: 'Bearer secret' } }, response)

    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual({
      ok: true,
      outbox: { pending: 2, processing: 0, failed: 1, dead_letter: 0 },
      lastRun: expect.any(Object),
      lastSlackSyncAt: null,
    })
  })
})
