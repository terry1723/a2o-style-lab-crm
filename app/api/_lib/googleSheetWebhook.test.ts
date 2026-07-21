import { afterEach, describe, expect, it, vi } from 'vitest'
import { appendAssessmentLead, type AssessmentSheetRow } from './googleSheetWebhook'

const validRow: AssessmentSheetRow = {
  submittedAt: '2026-07-19T01:00:00.000Z',
  sessionId: 'session-1234567890',
  name: '陳先生',
  phone: '+85291234567',
  heightCm: 175,
  weightKg: 68.5,
  q1: '6',
  q2: '見客、銷售或傾生意',
  q3: '客戶信任同成交機會',
  q4: '整體專業形象定位',
  resultTitle: '專業存在感落差',
  photoPath: '2026/07/session-1234567890/photo.jpg',
  photoSignedUrl: 'https://example.supabase.co/signed/photo',
  utmSource: 'instagram',
}

afterEach(() => vi.unstubAllEnvs())

describe('appendAssessmentLead', () => {
  it('accepts a duplicate Session ID as an idempotent success', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(Response.json({ ok: true, duplicate: true }))

    await expect(appendAssessmentLead(validRow, {
      webhookUrl: 'https://script.google.com/macros/s/deployment/exec',
      sharedSecret: 'server-secret',
      fetchImpl,
    })).resolves.toEqual({ duplicate: true })

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://script.google.com/macros/s/deployment/exec',
      expect.objectContaining({ method: 'POST', redirect: 'follow' }),
    )
    const body = JSON.parse(String(fetchImpl.mock.calls[0][1]?.body))
    expect(body).toEqual(expect.objectContaining({
      sessionId: validRow.sessionId,
      heightCm: 175,
      weightKg: 68.5,
      secret: 'server-secret',
    }))
  })

  it('rejects an Apps Script write failure without provider details', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(Response.json({ ok: false, error: 'private provider detail' }))

    await expect(appendAssessmentLead(validRow, {
      webhookUrl: 'https://script.google.com/macros/s/deployment/exec',
      sharedSecret: 'server-secret',
      fetchImpl,
    })).rejects.toThrow('sheet_write_failed')
  })

  it('requires server-only configuration', async () => {
    vi.stubEnv('APPS_SCRIPT_WEBHOOK_URL', '')
    vi.stubEnv('APPS_SCRIPT_SHARED_SECRET', '')

    await expect(appendAssessmentLead(validRow)).rejects.toThrow('sheet_server_not_configured')
  })
})
