import { describe, expect, it } from 'vitest'
import { validateAssessmentSubmission } from './assessmentValidation'

const validPayload = {
  sessionId: 'session-1234567890',
  name: '陳先生',
  phone: '9123 4567',
  heightCm: 175,
  weightKg: 68.5,
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
    expect(parsed.heightCm).toBe(175)
    expect(parsed.weightKg).toBe(68.5)
    expect(parsed.answers.q4).toEqual(['q4_e'])
  })

  it('allows an approved submission without a photo', () => {
    const { photoPath: _photoPath, uploadReceipt: _uploadReceipt, ...withoutPhoto } = validPayload
    const parsed = validateAssessmentSubmission(withoutPhoto)

    expect(parsed).toEqual(expect.objectContaining({
      sessionId: validPayload.sessionId,
      name: '陳先生',
      phone: '+85291234567',
    }))
    expect(parsed.photoPath).toBeUndefined()
    expect(parsed.uploadReceipt).toBeUndefined()
  })

  it.each([
    ['missing height', { heightCm: undefined }, 'invalid_height'],
    ['decimal height', { heightCm: 175.5 }, 'invalid_height'],
    ['low height', { heightCm: 119 }, 'invalid_height'],
    ['high height', { heightCm: 231 }, 'invalid_height'],
    ['missing weight', { weightKg: undefined }, 'invalid_weight'],
    ['too many weight decimals', { weightKg: 68.55 }, 'invalid_weight'],
    ['low weight', { weightKg: 34 }, 'invalid_weight'],
    ['high weight', { weightKg: 201 }, 'invalid_weight'],
  ])('rejects %s', (_label, change, message) => {
    expect(() => validateAssessmentSubmission({ ...validPayload, ...change })).toThrow(message)
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

  it('rejects a partial photo payload', () => {
    expect(() => validateAssessmentSubmission({ ...validPayload, uploadReceipt: undefined }))
      .toThrow('invalid_photo_payload')
  })
})
