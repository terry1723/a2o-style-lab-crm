import { describe, expect, it } from 'vitest'
import { buildSyncSignature, isFreshSyncTimestamp } from './adLeadSyncProtocol'

describe('ad lead sync protocol', () => {
  it('signs timestamp, request id and raw body deterministically', async () => {
    const first = await buildSyncSignature('secret', '1700000000', 'req-1', '{"rows":[]}')
    const second = await buildSyncSignature('secret', '1700000000', 'req-1', '{"rows":[]}')
    const changed = await buildSyncSignature('secret', '1700000000', 'req-1', '{"rows":[1]}')

    expect(first).toBe(second)
    expect(first).not.toBe(changed)
    expect(first).toMatch(/^sha256=[0-9a-f]{64}$/)
  })

  it('accepts only timestamps within the configured replay window', () => {
    expect(isFreshSyncTimestamp(1_000, 1_000 + 299)).toBe(true)
    expect(isFreshSyncTimestamp(1_000, 1_000 + 301)).toBe(false)
    expect(isFreshSyncTimestamp(1_000, 1_000 - 301)).toBe(false)
  })
})
