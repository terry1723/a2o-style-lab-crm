import { describe, expect, it, vi } from 'vitest'
import { createAdLeadSyncCronHandler } from './ad-lead-sync'

function responseRecorder() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this },
    json(body: unknown) { this.body = body; return this },
  }
}

const lead = {
  source: 'A2O Website', id: 'A2O Website:sheet:12', submittedAt: '2026-08-09T09:00:00+08:00',
  name: 'Canonical Lead', phone: '+85291234567', tag: 'ig', sourceKey: 'A2O Website:sheet:12',
  status: '未聯絡', owner: 'Ryan', canonicalId: 'CANONICAL-1', normalizedPhone: '85291234567', appointmentAt: null,
  slackListItemId: null, syncVersion: 1,
} as const

describe('ad lead sync cron', () => {
  it('rejects requests without the configured cron secret', async () => {
    const handler = createAdLeadSyncCronHandler({ cronSecret: () => 'secret' })
    const response = responseRecorder()

    await handler({ method: 'GET', headers: {} }, response)

    expect(response.statusCode).toBe(401)
    expect(response.body).toEqual({ error: 'unauthorized' })
  })

  it('skips an overlapping Cron delivery while another worker holds the lease', async () => {
    const startRun = vi.fn()
    const response = responseRecorder()
    const handler = createAdLeadSyncCronHandler({
      cronSecret: () => 'secret',
      acquireLease: vi.fn().mockResolvedValue(false),
      startRun,
    })

    await handler({ method: 'GET', headers: { authorization: 'Bearer secret' } }, response)

    expect(response.statusCode).toBe(202)
    expect(response.body).toEqual({ ok: true, skipped: 'lease_held' })
    expect(startRun).not.toHaveBeenCalled()
  })

  it('imports source rows, syncs claimed outbox items, and records a successful run', async () => {
    const outbox = { id: 'OUTBOX-1', lead_id: 'LEAD-1', target_version: 1, attempt_count: 1, locked_by: 'vercel-cron-test' }
    const deps = {
      cronSecret: () => 'secret',
      readSourceLeads: vi.fn().mockResolvedValue({ leads: [{ source: 'A2O Website', id: 'sheet:12', submittedAt: '2026-08-09T09:00:00+08:00', name: 'Canonical Lead', phone: '+85291234567', tag: 'ig' }], unavailableSources: ['Men New Form'] }),
      importRows: vi.fn().mockResolvedValue({ imported: 1, deduplicated: 0, invalidPhones: 0 }),
      acquireLease: vi.fn().mockResolvedValue(true),
      releaseLease: vi.fn().mockResolvedValue(undefined),
      startRun: vi.fn().mockResolvedValue('RUN-1'),
      finishRun: vi.fn().mockResolvedValue(undefined),
      claimOutboxBatch: vi.fn().mockResolvedValue([outbox]),
      loadLead: vi.fn().mockResolvedValue(lead),
      syncLead: vi.fn().mockResolvedValue('REC-1'),
      setSlackItemId: vi.fn().mockResolvedValue(undefined),
      completeOutbox: vi.fn().mockResolvedValue(undefined),
      failOutbox: vi.fn(),
    }
    const handler = createAdLeadSyncCronHandler(deps)
    const response = responseRecorder()

    await handler({ method: 'GET', headers: { authorization: 'Bearer secret' } }, response)

    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual({
      ok: true, imported: 1, deduplicated: 0, invalidPhones: 0,
      unavailableSources: ['Men New Form'], claimed: 1, synced: 1, failed: 0, deadLettered: 0,
    })
    expect(deps.completeOutbox).toHaveBeenCalledWith(outbox, 'REC-1', expect.stringMatching(/^vercel-cron-/), 1)
    expect(deps.finishRun).toHaveBeenCalledWith('RUN-1', expect.objectContaining({ status: 'completed', unavailableSources: ['Men New Form'] }))
    expect(deps.failOutbox).not.toHaveBeenCalled()
  })

  it('returns a service error when the sync run ledger cannot be opened', async () => {
    const handler = createAdLeadSyncCronHandler({
      cronSecret: () => 'secret',
      acquireLease: vi.fn().mockResolvedValue(true),
      releaseLease: vi.fn().mockResolvedValue(undefined),
      startRun: vi.fn().mockRejectedValue(new Error('database_down')),
    })
    const response = responseRecorder()

    await handler({ method: 'GET', headers: { authorization: 'Bearer secret' } }, response)

    expect(response.statusCode).toBe(503)
    expect(response.body).toEqual({ error: 'lead_sync_unavailable', errorCode: 'ad_lead_sync_runs_unavailable' })
  })

  it('marks retryable Slack failures as failed with a next attempt', async () => {
    const outbox = { id: 'OUTBOX-2', lead_id: 'LEAD-2', target_version: 2, attempt_count: 1, locked_by: 'vercel-cron-test' }
    const deps = {
      cronSecret: () => 'secret',
      readSourceLeads: vi.fn().mockResolvedValue({ leads: [], unavailableSources: [] }),
      importRows: vi.fn().mockResolvedValue({ imported: 0, deduplicated: 0, invalidPhones: 0 }),
      acquireLease: vi.fn().mockResolvedValue(true),
      releaseLease: vi.fn().mockResolvedValue(undefined),
      startRun: vi.fn().mockResolvedValue('RUN-2'),
      finishRun: vi.fn().mockResolvedValue(undefined),
      claimOutboxBatch: vi.fn().mockResolvedValue([outbox]),
      loadLead: vi.fn().mockResolvedValue(lead),
      syncLead: vi.fn().mockRejectedValue({ code: 'ratelimited', retryAfterSeconds: 11 }),
      completeOutbox: vi.fn(),
      failOutbox: vi.fn().mockResolvedValue(undefined),
    }
    const handler = createAdLeadSyncCronHandler(deps)
    const response = responseRecorder()

    await handler({ method: 'GET', headers: { authorization: 'Bearer secret' } }, response)

    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual(expect.objectContaining({ ok: true, claimed: 1, synced: 0, failed: 1, deadLettered: 0 }))
    expect(deps.failOutbox).toHaveBeenCalledWith(outbox, expect.objectContaining({ status: 'failed' }), { code: 'ratelimited', retryAfterSeconds: 11 }, expect.stringMatching(/^vercel-cron-/))
    expect(deps.completeOutbox).not.toHaveBeenCalled()
  })
})
