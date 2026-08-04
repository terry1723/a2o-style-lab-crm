import { describe, expect, it, vi } from 'vitest'
import { createVoiceSessionHandler } from './voice-session'

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

describe('voice session endpoint', () => {
  it('mints a short-lived browser client secret without exposing the server key', async () => {
    const createClientSecret = vi.fn().mockResolvedValue({ value: 'ephemeral-secret', expires_at: 123 })
    const handler = createVoiceSessionHandler({ createClientSecret })
    const response = responseRecorder()

    await handler({ method: 'POST', body: { conversationId: 'a'.repeat(32) } }, response)

    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual({ value: 'ephemeral-secret', expires_at: 123 })
    expect(createClientSecret).toHaveBeenCalledWith('a'.repeat(32))
    expect(response.headers['Cache-Control']).toBe('no-store')
  })

  it('rejects malformed conversation identifiers', async () => {
    const createClientSecret = vi.fn()
    const response = responseRecorder()
    await createVoiceSessionHandler({ createClientSecret })({ method: 'POST', body: { conversationId: 'short' } }, response)

    expect(response.statusCode).toBe(400)
    expect(response.body).toEqual({ error: 'invalid_request' })
    expect(createClientSecret).not.toHaveBeenCalled()
  })

  it('does not issue client secrets after the rate limit', async () => {
    const createClientSecret = vi.fn()
    const response = responseRecorder()
    await createVoiceSessionHandler({ createClientSecret, allowRequest: () => false })({ method: 'POST', headers: { 'x-forwarded-for': '203.0.113.8' }, body: { conversationId: 'a'.repeat(32) } }, response)

    expect(response.statusCode).toBe(429)
    expect(response.headers['Retry-After']).toBe('600')
    expect(createClientSecret).not.toHaveBeenCalled()
  })
})
