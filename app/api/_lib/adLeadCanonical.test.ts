import { describe, expect, it } from 'vitest'
import { buildSubmissionRpcArgs, classifyOutboxFailure, computePayloadChecksum, createCanonicalLeadRepository } from './adLeadCanonical'

describe('canonical advertising lead repository helpers', () => {
  const row = {
    source: 'A2O Website',
    id: 'spreadsheet:sheet:42',
    submittedAt: '2026-08-09T09:00:00+08:00',
    name: 'Synthetic Lead',
    phone: '+85298690911',
    tag: 'test',
  }

  it('builds a stable submission checksum and RPC payload', () => {
    const first = buildSubmissionRpcArgs(row)
    const second = buildSubmissionRpcArgs({ ...row })
    expect(first.p_source_key).toBe('A2O Website:spreadsheet:sheet:42')
    expect(first.p_payload_checksum).toBe(computePayloadChecksum(row))
    expect(first.p_submitted_at).toBe('2026-08-09T01:00:00.000Z')
    expect(second.p_payload_checksum).toBe(first.p_payload_checksum)
  })

  it('converts Google Sheets Chinese display timestamps before the timestamptz RPC', () => {
    expect(buildSubmissionRpcArgs({ ...row, submittedAt: '2026/8/9 上午 9:00:00' }).p_submitted_at)
      .toBe('2026-08-09T01:00:00.000Z')
  })

  it('classifies retryable Slack errors with bounded exponential delay', () => {
    expect(classifyOutboxFailure({ code: 'ratelimited', retryAfterSeconds: 7 }, 1, new Date('2026-08-09T00:00:00Z')))
      .toEqual({ status: 'failed', nextAttemptAt: '2026-08-09T00:00:07.000Z' })
    expect(classifyOutboxFailure({ code: 'timeout' }, 1, new Date('2026-08-09T00:00:00Z')))
      .toEqual({ status: 'failed', nextAttemptAt: '2026-08-09T00:01:00.000Z' })
    expect(classifyOutboxFailure({ code: 'timeout' }, 4, new Date('2026-08-09T00:00:00Z')))
      .toEqual({ status: 'failed', nextAttemptAt: '2026-08-09T01:00:00.000Z' })
    expect(classifyOutboxFailure({ code: 'invalid_auth' }, 8, new Date('2026-08-09T00:00:00Z')).status)
      .toBe('dead_letter')
  })

  it('keys canonical appointments to the latest submission key', async () => {
    const row = {
      id: 'CANONICAL-1', normalized_phone: '85291234567', display_phone: '+85291234567',
      name: 'Synthetic Lead', current_status: '已預約', owner: 'Ryan', latest_source: 'A2O Website',
      latest_source_key: 'A2O Website:latest', latest_tag: 'ig', latest_submitted_at: '2026-08-09T01:00:00.000Z',
      appointment_at: '2026-08-01T10:00:00.000Z', slack_list_item_id: null, sync_version: 2,
    }
    const result = Promise.resolve({ data: [row], error: null })
    const query = {
      select: () => query,
      order: () => query,
      eq: () => query,
      limit: () => query,
      maybeSingle: () => result,
      then: result.then.bind(result),
    }
    const client = {
      from: () => query,
      rpc: async () => ({ data: null, error: null }),
    }

    const loaded = await createCanonicalLeadRepository(client as never).loadCanonicalAdLeads()

    expect(loaded.appointments).toEqual([{
      sourceKey: 'A2O Website:latest', appointmentDate: '2026-08-01', appointmentTime: '18:00',
    }])
  })

  it('passes the claimed target version when completing and failing an outbox row', async () => {
    const calls: Array<{ name: string; args: Record<string, unknown> }> = []
    const client = {
      from: () => ({}) as never,
      rpc: async (name: string, args: Record<string, unknown>) => {
        calls.push({ name, args })
        return { data: null, error: null }
      },
    }
    const repository = createCanonicalLeadRepository(client as never)
    const row = { id: 'OUTBOX-1', lead_id: 'LEAD-1', target_version: 7, attempt_count: 1, locked_by: 'worker-1' }

    await repository.completeOutbox(row, 'SLACK-1', 'worker-1', 8)
    await repository.failOutbox(row, { status: 'failed', nextAttemptAt: '2026-08-10T01:00:00.000Z' }, { code: 'ratelimited' }, 'worker-1')

    expect(calls).toEqual([
      { name: 'mark_ad_lead_slack_synced', args: expect.objectContaining({ p_target_version: 7, p_synced_version: 8, p_worker_id: 'worker-1' }) },
      { name: 'fail_ad_lead_slack_outbox', args: expect.objectContaining({ p_target_version: 7, p_worker_id: 'worker-1' }) },
    ])
  })
})
