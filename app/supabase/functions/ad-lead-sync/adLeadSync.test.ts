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
    expect(source.match(/retryAfterSeconds = retryAfter/g) ?? []).toHaveLength(1)
    expect(source).not.toContain('CRON_SECRET')
    expect(source).not.toContain('Vercel')
  })

  it('treats optional Slack columns as optional for the existing pipeline schema', () => {
    const source = readFileSync(functionPath, 'utf8')
    expect(source).toContain('optionalColumn')
    expect(source).toContain("optionalColumn('whatsapp')")
    expect(source).toContain("addOptionalText('tag'")
    expect(source).toContain("optionalColumn('latestSubmittedAt')")
    expect(source).toContain("addOptionalText('appointmentAt'")
    expect(source).toContain('rich_text: richText(value)')
    expect(source).toContain('phone: [slackPhone(lead)]')
    expect(source).not.toContain('value: lead.display_phone')
  })

  it('uses an ASCII transport envelope so Apps Script cannot transcode signed JSON', () => {
    const source = readFileSync(functionPath, 'utf8')
    expect(source).toContain('X-A2O-Body-Encoding')
    expect(source).toContain('decodeBase64Body')
    expect(source).toContain("bodyEncoding === 'base64'")
  })

  it('keeps malformed sheet rows from aborting the whole five-minute sweep', () => {
    const source = readFileSync(functionPath, 'utf8')
    expect(source).toContain('const parsedRows = parseRows(payload.rows)')
    expect(source).toContain('const invalidRows = parsedRows.invalidRows')
    expect(source).toContain('// One malformed sheet row must not block the remaining approved rows.')
    expect(source).toContain('invalidRows, ...drained')
  })
})
