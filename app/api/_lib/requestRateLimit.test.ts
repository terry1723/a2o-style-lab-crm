import { describe, expect, it } from 'vitest'
import { createFixedWindowRateLimiter } from './requestRateLimit'

describe('serverless upload rate limit', () => {
  it('allows a bounded number of requests per key and resets after the window', () => {
    let now = 1_000
    const allow = createFixedWindowRateLimiter({ limit: 2, windowMs: 10_000, now: () => now })

    expect(allow('203.0.113.1')).toBe(true)
    expect(allow('203.0.113.1')).toBe(true)
    expect(allow('203.0.113.1')).toBe(false)
    expect(allow('203.0.113.2')).toBe(true)
    now = 11_001
    expect(allow('203.0.113.1')).toBe(true)
  })
})
