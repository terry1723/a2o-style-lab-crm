import { describe, expect, it, vi } from 'vitest'
import { buildSlackLeadFields, createSlackLeadPipeline, loadSlackLeadPipelineConfig } from './slackLeadPipeline'

const config = {
  token: 'xoxb-test',
  listId: 'F123',
  columnMap: {
    lead: 'C_LEAD',
    status: 'C_STATUS',
    owner: 'C_OWNER',
    phone: 'C_PHONE',
    whatsapp: 'C_WHATSAPP',
    sourceForm: 'C_SOURCE',
    tag: 'C_TAG',
    latestSubmittedAt: 'C_SUBMITTED',
    appointmentAt: 'C_APPOINTMENT',
    nextStep: 'C_NEXT',
  },
  statusOptionMap: { 未聯絡: 'OPT_NEW', 'WhatsApp 跟進中': 'OPT_WA', '已預約': 'OPT_BOOKED', '已拒絕': 'OPT_REJECTED' },
  ownerUserMap: { Terry: 'U_TERRY', Ryan: 'U_RYAN', Martin: 'U_MARTIN', Caren: 'U_CAREN', New: 'U_NEW' },
} as const

const lead = {
  source: 'A2O Website', id: 'A2O Website:sheet:12', submittedAt: '2026-08-09T09:00:00+08:00',
  name: 'Canonical Lead', phone: '+85291234567', tag: 'ig', sourceKey: 'A2O Website:sheet:12',
  status: '已預約', owner: 'Ryan', canonicalId: 'CANONICAL-1', normalizedPhone: '85291234567', appointmentAt: '2026-08-10T11:30:00.000Z',
  slackListItemId: null, syncVersion: 1,
} as const

function response(payload: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json' }, ...init })
}

describe('Slack lead pipeline adapter', () => {
  it('accepts the lowercase owner mapping format used by the deployment spec', () => {
    const loaded = loadSlackLeadPipelineConfig({
      SLACK_BOT_TOKEN: 'xoxb-test',
      SLACK_LEAD_PIPELINE_LIST_ID: 'F123',
      SLACK_LIST_COLUMN_MAP: JSON.stringify({ lead: 'C_LEAD', status: 'C_STATUS', owner: 'C_OWNER', phone: 'C_PHONE', whatsapp: 'C_WHATSAPP' }),
      SLACK_STATUS_OPTION_MAP: JSON.stringify({ 未聯絡: 'OPT_NEW', 'WhatsApp 跟進中': 'OPT_WA', '已預約': 'OPT_BOOKED', '已拒絕': 'OPT_REJECTED' }),
      SLACK_OWNER_USER_MAP: JSON.stringify({ terry: 'U_TERRY', ryan: 'U_RYAN', martin: 'U_MARTIN', caren: 'U_CAREN', new: 'U_NEW' }),
    })

    expect(loaded.ownerUserMap).toEqual({ Terry: 'U_TERRY', Ryan: 'U_RYAN', Martin: 'U_MARTIN', Caren: 'U_CAREN', New: 'U_NEW' })
  })

  it('builds typed Slack Lists fields without sending sensitive unused fields', () => {
    const fields = buildSlackLeadFields(lead, config)
    expect(fields).toEqual(expect.arrayContaining([
      { column_id: 'C_STATUS', select: ['OPT_BOOKED'] },
      { column_id: 'C_OWNER', user: ['U_RYAN'] },
      { column_id: 'C_PHONE', phone: ['+85291234567'] },
      { column_id: 'C_WHATSAPP', link: [{ original_url: 'https://wa.me/85291234567', display_as_url: false, display_name: 'WhatsApp' }] },
      { column_id: 'C_APPOINTMENT', rich_text: expect.any(Array) },
    ]))
    expect(fields.find((field) => field.column_id === 'C_LEAD')).toMatchObject({ column_id: 'C_LEAD', rich_text: expect.any(Array) })
    expect(JSON.stringify(fields.find((field) => field.column_id === 'C_NEXT'))).toContain('已預約：2026-08-10 19:30')
    expect(JSON.stringify(fields.find((field) => field.column_id === 'C_APPOINTMENT'))).toContain('2026-08-10 19:30')
    expect(fields.some((field) => field.column_id === 'C_EMAIL' || field.column_id === 'C_AMOUNT')).toBe(false)
  })

  it('updates an existing row by exact phone match instead of creating a duplicate', async () => {
    const calls: Array<{ method: string; body: Record<string, unknown> }> = []
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = String(input).split('/').pop()!
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>
      calls.push({ method, body })
      if (method === 'slackLists.items.list') {
        return response({ ok: true, items: [{ id: 'REC_EXISTING', fields: [{ column_id: 'C_PHONE', phone: ['+85291234567'] }] }], response_metadata: { next_cursor: '' } })
      }
      return response({ ok: true })
    })
    const pipeline = createSlackLeadPipeline({ config, fetcher })

    const itemId = await pipeline.upsertLead(lead)

    expect(itemId).toBe('REC_EXISTING')
    expect(calls.map((call) => call.method)).toEqual(['slackLists.items.list', 'slackLists.items.update'])
    expect(calls[1].body.cells).toEqual(expect.arrayContaining([expect.objectContaining({ row_id: 'REC_EXISTING', column_id: 'C_STATUS', select: ['OPT_BOOKED'] })]))
  })

  it('creates a row only when no exact phone match exists', async () => {
    const calls: string[] = []
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = String(input).split('/').pop()!
      calls.push(method)
      if (method === 'slackLists.items.list') return response({ ok: true, items: [], response_metadata: { next_cursor: '' } })
      return response({ ok: true, item: { id: 'REC_CREATED' } })
    })
    const pipeline = createSlackLeadPipeline({ config, fetcher })

    await expect(pipeline.upsertLead(lead)).resolves.toBe('REC_CREATED')
    expect(calls).toEqual(['slackLists.items.list', 'slackLists.items.create'])
  })

  it('follows Slack response_metadata pagination before deciding to create', async () => {
    const calls: Array<{ method: string; body: Record<string, unknown> }> = []
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = String(input).split('/').pop()!
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>
      calls.push({ method, body })
      if (method !== 'slackLists.items.list') return response({ ok: true })
      if (!body.cursor) return response({ ok: true, items: [], response_metadata: { next_cursor: 'PAGE-2' } })
      return response({
        ok: true,
        items: [{ id: 'REC_PAGE_2', fields: [{ column_id: 'C_PHONE', phone: ['+85291234567'] }] }],
        response_metadata: { next_cursor: '' },
      })
    })
    const pipeline = createSlackLeadPipeline({ config, fetcher })

    await expect(pipeline.upsertLead(lead)).resolves.toBe('REC_PAGE_2')
    expect(calls.map((call) => call.method)).toEqual(['slackLists.items.list', 'slackLists.items.list', 'slackLists.items.update'])
    expect(calls[1].body.cursor).toBe('PAGE-2')
  })

  it('preserves Slack rate-limit metadata for outbox retry classification', async () => {
    const fetcher = vi.fn(async () => response({ ok: false, error: 'ratelimited' }, { status: 429, headers: { 'retry-after': '17' } }))
    const pipeline = createSlackLeadPipeline({ config, fetcher })

    await expect(pipeline.upsertLead({ ...lead, slackListItemId: 'REC_EXISTING' })).rejects.toMatchObject({
      code: 'ratelimited', retryAfterSeconds: 17,
    })
  })

  it('classifies an aborted Slack request as a retryable timeout', async () => {
    const fetcher = vi.fn(async () => { throw Object.assign(new Error('aborted'), { name: 'AbortError' }) })
    const pipeline = createSlackLeadPipeline({ config, fetcher })

    await expect(pipeline.upsertLead({ ...lead, slackListItemId: 'REC_EXISTING' })).rejects.toMatchObject({ code: 'timeout' })
  })
})
