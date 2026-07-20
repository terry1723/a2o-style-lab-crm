import { describe, expect, it } from 'vitest'
import { validateAssessmentSubmission } from './assessmentValidation'

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
  uploadReceipt: 'signed-upload-receipt',
  attribution: { utmSource: 'instagram' },
}

describe('validateAssessmentSubmission', () => {
  it('normalises and validates an approved submission', () => {
    const parsed = validateAssessmentSubmission(validPayload)

    expect(parsed.name).toBe('陳先生')
    expect(parsed.phone).toBe('+85291234567')
    expect(parsed.answers.q4).toEqual(['q4_e'])
  })

  it.each([
    ['invalid phone', { phone: '123' }, 'invalid_phone'],
    ['missing consent', { consent: false }, 'consent_required'],
    ['unsafe session id', { sessionId: '../client-name' }, 'invalid_session_id'],
    ['photo outside session prefix', { photoPath: '2026/07/another-session/photo.jpg' }, 'invalid_photo_path'],
  ])('rejects %s', (_label, change, message) => {
    expect(() => validateAssessmentSubmission({ ...validPayload, ...change })).toThrow(message)
  })

  it('rejects an option id outside the approved config', () => {
    expect(() => validateAssessmentSubmission({
      ...validPayload,
      answers: { ...validPayload.answers, q2: ['q2_unknown'] },
    })).toThrow('invalid_answers')
  })

  it('requires exactly one answer for every enabled question', () => {
    expect(() => validateAssessmentSubmission({
      ...validPayload,
      answers: { ...validPayload.answers, q3: [] },
    })).toThrow('invalid_answers')
  })

  it('requires the server-issued upload receipt', () => {
    expect(() => validateAssessmentSubmission({ ...validPayload, uploadReceipt: '' }))
      .toThrow('invalid_upload_receipt')
  })
})
