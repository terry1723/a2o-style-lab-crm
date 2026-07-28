import { describe, expect, it, vi } from 'vitest'
import { loadAdLeadTracking, trackingBySourceKey, upsertAdLeadTracking } from './adLeadTracking'

describe('advertising lead tracking repository', () => {
  it('retains only valid tracking overlays from Supabase rows', () => {
    expect(trackingBySourceKey([
      { source_key: 'A2O Website:sheet:8', status: '已預約', owner: 'Martin' },
      { source_key: 'broken', status: '已預約', owner: 'Martin' },
      { source_key: 'A2O Website:sheet:9', status: 'invalid', owner: 'Martin' },
    ])).toEqual({
      'A2O Website:sheet:8': { status: '已預約', owner: 'Martin' },
    })
  })

  it('reads and upserts only the ad_lead_tracking table', async () => {
    const select = vi.fn().mockResolvedValue({
      data: [{ source_key: 'A2O Website:sheet:8', status: '已預約', owner: 'Martin' }],
      error: null,
    })
    const upsert = vi.fn().mockResolvedValue({ error: null })
    const from = vi.fn().mockReturnValue({ select, upsert })
    const client = { from }

    await expect(loadAdLeadTracking(client)).resolves.toEqual({
      'A2O Website:sheet:8': { status: '已預約', owner: 'Martin' },
    })
    await expect(upsertAdLeadTracking({
      source_key: 'A2O Website:sheet:8', status: '已預約', owner: 'Martin',
    }, client)).resolves.toBeUndefined()

    expect(from).toHaveBeenCalledWith('ad_lead_tracking')
    expect(select).toHaveBeenCalledWith('source_key, status, owner')
    expect(upsert).toHaveBeenCalledWith({ source_key: 'A2O Website:sheet:8', status: '已預約', owner: 'Martin' })
  })
})
