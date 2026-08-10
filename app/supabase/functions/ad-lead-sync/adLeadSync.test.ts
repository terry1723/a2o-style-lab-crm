import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const functionPath = join(process.cwd(), 'supabase/functions/ad-lead-sync/index.ts')

describe('Supabase ad lead sync function contract', () => {
  it('contains the signed empty-sweep worker path and no Vercel scheduler dependency', () => {
    expect(existsSync(functionPath)).toBe(true)
    const source = readFileSync(functionPath, 'utf8')
    expect(source).toContain('AD_LEAD_INGEST_HMAC_SECRET')
    expect(source).toContain("trigger === 'five_minute'")
    expect(source).toContain('rows.length === 0')
    expect(source).toContain('response_metadata')
    expect(source).toContain('next_cursor')
    expect(source).toContain('APPROVED_SOURCES')
    expect(source).toContain('sourceKey !== `${sourceForm}:${sourceId}`')
    expect(source).toContain('AbortController')
    expect(source).toContain("service_unavailable")
    expect(source).toContain('payload.requestId !== requestId')
    expect(source).not.toContain('CRON_SECRET')
    expect(source).not.toContain('Vercel')
  })
})
