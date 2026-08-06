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
  it('mints a short-lived Gemini token without exposing the server key', async () => {
    const createEphemeralToken = vi.fn().mockResolvedValue({ token: 'ephemeral-token', expiresAt: '2026-08-04T12:00:00.000Z' })
    const handler = createVoiceSessionHandler({ createEphemeralToken })
    const response = responseRecorder()

    await handler({ method: 'POST', body: { conversationId: 'a'.repeat(32) } }, response)

    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual({ token: 'ephemeral-token', expiresAt: '2026-08-04T12:00:00.000Z' })
    expect(createEphemeralToken).toHaveBeenCalledWith('a'.repeat(32))
    expect(response.headers['Cache-Control']).toBe('no-store')
  })

  it('rejects malformed conversation identifiers', async () => {
    const createEphemeralToken = vi.fn()
    const response = responseRecorder()
    await createVoiceSessionHandler({ createEphemeralToken })({ method: 'POST', body: { conversationId: 'short' } }, response)

    expect(response.statusCode).toBe(400)
    expect(response.body).toEqual({ error: 'invalid_request' })
    expect(createEphemeralToken).not.toHaveBeenCalled()
  })

  it('does not issue client secrets after the rate limit', async () => {
    const createEphemeralToken = vi.fn()
    const response = responseRecorder()
    await createVoiceSessionHandler({ createEphemeralToken, allowRequest: () => false })({ method: 'POST', headers: { 'x-forwarded-for': '203.0.113.8' }, body: { conversationId: 'a'.repeat(32) } }, response)

    expect(response.statusCode).toBe(429)
    expect(response.headers['Retry-After']).toBe('600')
    expect(createEphemeralToken).not.toHaveBeenCalled()
  })
})
