import { describe, expect, it, vi } from 'vitest'
import { validateAssessmentSubmission } from './_lib/assessmentValidation'
import { createSubmissionHandler } from './assessment-submit'

const validPayload = {
  sessionId: 'session-1234567890',
  name: '陳先生',
  phone: '9123 4567',
  consent: true,
  answers: {
    q1: ['q1_6'],
    q2: ['q2_a'],
    q3: ['q3_a'],
    q4: ['q4_e'],
  },
  photoPath: '2026/07/session-1234567890/123e4567-e89b-12d3-a456-426614174000.jpg',
  attribution: { utmSource: 'instagram' },
}

function responseRecorder() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(body: unknown) {
      this.body = body
      return this
    },
  }
}

function dependencies() {
  return {
    validateAssessmentSubmission,
    createPhotoReadUrl: vi.fn().mockResolvedValue('https://example.supabase.co/signed/photo'),
    appendAssessmentLead: vi.fn().mockResolvedValue({ duplicate: false }),
    now: () => new Date('2026-07-19T01:00:00.000Z'),
  }
}

describe('assessment-submit endpoint', () => {
  it('derives trusted labels and appends one Sheet row', async () => {
    const deps = dependencies()
    const handler = createSubmissionHandler(deps)
    const response = responseRecorder()

    await handler({ method: 'POST', body: validPayload }, response)

    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual({ ok: true, duplicate: false })
    expect(deps.createPhotoReadUrl).toHaveBeenCalledWith(validPayload.photoPath, 604800)
    expect(deps.appendAssessmentLead).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: validPayload.sessionId,
      phone: '+85291234567',
      q1: '6',
      q2: '見客、銷售或傾生意',
      q3: '客戶信任同成交機會',
      q4: '整體專業形象定位',
      resultTitle: '專業存在感落差',
      photoSignedUrl: 'https://example.supabase.co/signed/photo',
      utmSource: 'instagram',
    }))
  })

  it('returns 400 for invalid public input', async () => {
    const deps = dependencies()
    const handler = createSubmissionHandler(deps)
    const response = responseRecorder()

    await handler({ method: 'POST', body: { ...validPayload, phone: '123' } }, response)

    expect(response.statusCode).toBe(400)
    expect(response.body).toEqual({ error: 'invalid_submission' })
    expect(deps.appendAssessmentLead).not.toHaveBeenCalled()
  })

  it('returns 502 without personal data when Sheet writing fails', async () => {
    const deps = dependencies()
    deps.appendAssessmentLead.mockRejectedValue(new Error('sheet_write_failed'))
    const handler = createSubmissionHandler(deps)
    const response = responseRecorder()

    await handler({ method: 'POST', body: validPayload }, response)

    expect(response.statusCode).toBe(502)
    expect(response.body).toEqual({ error: 'submission_unavailable' })
    expect(JSON.stringify(response.body)).not.toContain('陳先生')
    expect(JSON.stringify(response.body)).not.toContain('91234567')
  })

  it('returns 503 for missing server configuration', async () => {
    const deps = dependencies()
    deps.appendAssessmentLead.mockRejectedValue(new Error('sheet_server_not_configured'))
    const handler = createSubmissionHandler(deps)
    const response = responseRecorder()

    await handler({ method: 'POST', body: validPayload }, response)

    expect(response.statusCode).toBe(503)
    expect(response.body).toEqual({ error: 'server_not_configured' })
  })
})
