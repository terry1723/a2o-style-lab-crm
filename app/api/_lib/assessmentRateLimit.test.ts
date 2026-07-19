import { describe, expect, it, vi } from 'vitest'
import { checkAssessmentRateLimit } from './assessmentRateLimit'

describe('durable assessment rate limit', () => {
  it('stores only a scoped irreversible address hash and returns the database decision', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null })

    await expect(checkAssessmentRateLimit('photo-upload', '203.0.113.1', 12, {
      client: { rpc },
      secret: 'server-only-secret',
    })).resolves.toBe(true)

    expect(rpc).toHaveBeenCalledWith('check_assessment_rate_limit', {
      p_key_hash: expect.stringMatching(/^[0-9a-f]{64}$/),
      p_limit: 12,
      p_window_seconds: 600,
    })
    expect(JSON.stringify(rpc.mock.calls)).not.toContain('203.0.113.1')
  })

  it('fails closed when the shared limiter is unavailable', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: new Error('private database detail') })

    await expect(checkAssessmentRateLimit('lead-submit', '203.0.113.1', 24, {
      client: { rpc },
      secret: 'server-only-secret',
    })).rejects.toThrow('assessment_rate_limit_unavailable')
  })
})
