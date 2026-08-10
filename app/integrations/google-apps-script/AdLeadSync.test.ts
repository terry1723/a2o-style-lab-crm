import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Script, createContext } from 'node:vm'
import { describe, expect, it } from 'vitest'

const scriptPath = join(process.cwd(), 'integrations/google-apps-script/AdLeadSync.gs')

type SyncContext = {
  properties: Record<string, string>
  requests: Array<{ body: { requestId: string; trigger: string; rows: unknown[] }; headers: Record<string, string> }>
  responseCode: number
  syncSources: (trigger: string) => unknown
}

function createSyncContext(options: { responseCode?: number; rows?: unknown[]; sourceRows?: Record<string, unknown[]>; readFailures?: string[] } = {}): SyncContext {
  const properties: Record<string, string> = {
    AD_LEAD_EDGE_FUNCTION_URL: 'https://project.supabase.co/functions/v1/ad-lead-sync',
    AD_LEAD_INGEST_HMAC_SECRET: 'test-secret',
  }
  const requests: SyncContext['requests'] = []
  const context = createContext({
    SOURCE_CONFIG: [
      { source: 'A2O Website', spreadsheetId: 'sheet-1', sheetName: 'a2owebsite' },
      { source: 'Men New Form', spreadsheetId: 'sheet-2', sheetName: 'men-new form' },
    ],
    PropertiesService: { getScriptProperties: () => ({
      getProperty: (key: string) => properties[key] ?? null,
      setProperty: (key: string, value: string) => { properties[key] = value },
    }) },
    LockService: { getScriptLock: () => ({
      waitLock: () => undefined,
      hasLock: () => true,
      releaseLock: () => undefined,
    }) },
    Utilities: {
      getUuid: () => 'request-1',
      computeHmacSha256Signature: () => [1, 2, 3],
    },
    UrlFetchApp: {
      fetch: (_url: string, request: { payload: string; headers: Record<string, string> }) => {
        const body = JSON.parse(request.payload) as SyncContext['requests'][number]['body']
        requests.push({ body, headers: request.headers })
        return {
          getResponseCode: () => options.responseCode ?? 200,
          getContentText: () => JSON.stringify({ ok: (options.responseCode ?? 200) >= 200 && (options.responseCode ?? 200) < 300 }),
        }
      },
    },
    readSource: (source: { source: string }) => {
      if ((options.readFailures ?? []).includes(source.source)) throw new Error('sheet_unavailable')
      return options.sourceRows?.[source.source] ?? options.rows ?? []
    },
    Date,
  })
  const source = readFileSync(scriptPath, 'utf8')
  new Script(`${source}\n;globalThis.__sync = { syncSources };`).runInContext(context)
  return { properties, requests, responseCode: options.responseCode ?? 200, syncSources: (context as { __sync: { syncSources: (trigger: string) => unknown } }).__sync.syncSources }
}

describe('advertising lead Apps Script sync coordinator', () => {
  it('does not advance a source cursor when the Edge Function rejects the batch', () => {
    const ctx = createSyncContext({
      responseCode: 503,
      rows: [{ source: 'A2O Website', id: 'sheet-1:a2owebsite:2', submittedAt: '2026-08-10T01:00:00Z', name: 'Synthetic', phone: '91234567', tag: 'test' }],
    })

    expect(() => ctx.syncSources('five_minute')).toThrow('edge_sync_failed')
    expect(ctx.properties['CURSOR_sheet_1_a2owebsite']).toBeUndefined()
  })

  it('advances a source cursor only after the batch is accepted', () => {
    const ctx = createSyncContext({
      rows: [{ source: 'A2O Website', id: 'sheet-1:a2owebsite:2', submittedAt: '2026-08-10T01:00:00Z', name: 'Synthetic', phone: '91234567', tag: 'test' }],
    })

    ctx.syncSources('form_submit')

    expect(ctx.properties['CURSOR_sheet_1_a2owebsite']).toBe('2')
    expect(ctx.requests[0].body.trigger).toBe('form_submit')
    expect(ctx.requests[0].body.rows[0]).toMatchObject({
      sourceKey: 'A2O Website:sheet-1:a2owebsite:2',
      sourceId: 'sheet-1:a2owebsite:2',
      submittedAt: '2026-08-10T01:00:00.000Z',
    })
    expect(ctx.requests[0].headers['X-A2O-Signature']).toMatch(/^sha256=/)
  })

  it('calls the Edge Function with an empty batch when no new rows exist', () => {
    const ctx = createSyncContext({ rows: [] })

    ctx.syncSources('five_minute')

    expect(ctx.requests).toHaveLength(1)
    expect(ctx.requests[0].body.rows).toEqual([])
  })

  it('continues with healthy sources and still sends a heartbeat when one sheet is unavailable', () => {
    const ctx = createSyncContext({
      readFailures: ['A2O Website'],
      sourceRows: { 'Men New Form': [{ source: 'Men New Form', id: 'sheet-2:men-new form:2', submittedAt: '2026-08-10T01:00:00Z', name: 'Synthetic', phone: '91234567', tag: 'test' }] },
    })

    ctx.syncSources('five_minute')

    expect(ctx.requests).toHaveLength(1)
    expect(ctx.requests[0].body.rows[0]).toMatchObject({ sourceForm: 'Men New Form' })
    expect(ctx.properties['CURSOR_sheet_2_men_new_form']).toBe('2')
  })

  it('sends a drain heartbeat when every source read is temporarily unavailable', () => {
    const ctx = createSyncContext({ readFailures: ['A2O Website', 'Men New Form'] })

    const result = ctx.syncSources('five_minute') as { requests: number; unavailableSources: string[] }

    expect(result.requests).toBe(1)
    expect(result.unavailableSources).toEqual(['A2O Website', 'Men New Form'])
    expect(ctx.requests[0].body.rows).toEqual([])
  })
})
