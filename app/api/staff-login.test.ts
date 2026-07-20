import { describe, expect, it, vi } from 'vitest'
import { createStaffLoginHandler } from './staff-login'

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

describe('staff-login endpoint', () => {
  it('authenticates a PIN through the server-side verifier', async () => {
    const verifyPin = vi.fn().mockResolvedValue({ name: 'Admin', role: 'admin' })
    const handler = createStaffLoginHandler({ verifyPin })
    const response = responseRecorder()

    await handler({ method: 'POST', body: { pin: 'rotated-pin' } }, response)

    expect(verifyPin).toHaveBeenCalledWith('rotated-pin')
    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual({
      authenticated: true,
      staff: { name: 'Admin', role: 'admin' },
    })
    expect(response.headers['Cache-Control']).toBe('no-store')
  })

  it('rejects an incorrect PIN without exposing staff data', async () => {
    const verifyPin = vi.fn().mockResolvedValue(null)
    const handler = createStaffLoginHandler({ verifyPin })
    const response = responseRecorder()

    await handler({ method: 'POST', body: { pin: 'incorrect-pin' } }, response)

    expect(response.statusCode).toBe(401)
    expect(response.body).toEqual({ authenticated: false, error: 'invalid_credentials' })
  })

  it('rate limits repeated login attempts before verifying the PIN', async () => {
    const verifyPin = vi.fn()
    const handler = createStaffLoginHandler({ verifyPin, allowRequest: () => false })
    const response = responseRecorder()

    await handler({
      method: 'POST',
      headers: { 'x-forwarded-for': '203.0.113.20' },
      body: { pin: 'any-pin' },
    }, response)

    expect(response.statusCode).toBe(429)
    expect(response.body).toEqual({ authenticated: false, error: 'too_many_requests' })
    expect(response.headers['Retry-After']).toBe('900')
    expect(verifyPin).not.toHaveBeenCalled()
  })

  it('allows POST only', async () => {
    const handler = createStaffLoginHandler({ verifyPin: vi.fn() })
    const response = responseRecorder()

    await handler({ method: 'GET', body: {} }, response)

    expect(response.statusCode).toBe(405)
    expect(response.body).toEqual({ authenticated: false, error: 'method_not_allowed' })
  })
})
