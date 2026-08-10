import { describe, expect, it, vi } from 'vitest'
import { createAdLeadSyncRetryHandler } from './ad-lead-sync-retry'

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

describe('ad lead sync retry endpoint', () => {
  it('requires a server-side retry secret', async () => {
    const response = responseRecorder()
    const requeue = vi.fn()
    await createAdLeadSyncRetryHandler({ retrySecret: () => undefined, requeue })({ method: 'POST', headers: {} }, response)
    expect(response.statusCode).toBe(401)
    expect(requeue).not.toHaveBeenCalled()
  })

  it('requeues all failed work or one validated outbox id', async () => {
    const requeue = vi.fn().mockResolvedValueOnce(3).mockResolvedValueOnce(1)
    const handler = createAdLeadSyncRetryHandler({ retrySecret: () => 'secret', requeue })
    const first = responseRecorder()
    const second = responseRecorder()

    await handler({ method: 'POST', headers: { authorization: 'Bearer secret' }, body: {} }, first)
    await handler({ method: 'POST', headers: { authorization: 'Bearer secret' }, body: { outboxId: '11111111-1111-4111-8111-111111111111' } }, second)

    expect(first.body).toEqual({ ok: true, requeued: 3 })
    expect(second.body).toEqual({ ok: true, requeued: 1 })
    expect(requeue).toHaveBeenNthCalledWith(1, undefined)
    expect(requeue).toHaveBeenNthCalledWith(2, '11111111-1111-4111-8111-111111111111')
  })
})
