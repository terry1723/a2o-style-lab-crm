import { assessmentConfig } from '../../src/features/assessment/config/assessmentConfig.js'
import type { AssessmentAnswerMap, Attribution } from '../../src/features/assessment/types/assessment.js'

const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{16,80}$/
const PHOTO_PATH_PATTERN = /^(20\d{2})\/(0[1-9]|1[0-2])\/([A-Za-z0-9_-]{16,80})\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.(jpe?g|png|webp)$/i

export type AssessmentSubmissionPayload = {
  sessionId: string
  name: string
  phone: string
  heightCm: number
  weightKg: number
  consent: true
  answers: AssessmentAnswerMap
  photoPath?: string
  uploadReceipt?: string
  attribution: Attribution
}

export function normaliseHongKongPhone(phone: string) {
  const clean = phone.replace(/[\s-]/g, '')
  if (/^\+852\d{8}$/.test(clean)) return clean
  if (/^852\d{8}$/.test(clean)) return `+${clean}`
  if (/^\d{8}$/.test(clean)) return `+852${clean}`
  throw new Error('invalid_phone')
}

function parseHeight(value: unknown) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 120 || value > 230) {
    throw new Error('invalid_height')
  }
  return value
}

function parseWeight(value: unknown) {
  if (
    typeof value !== 'number'
    || !Number.isFinite(value)
    || value < 35
    || value > 200
    || Number(value.toFixed(1)) !== value
  ) {
    throw new Error('invalid_weight')
  }
  return value
}

function parseAnswers(value: unknown): AssessmentAnswerMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_answers')
  const answers = value as Record<string, unknown>

  for (const scene of assessmentConfig.scenes.filter((item) => item.enabled)) {
    const selected = answers[scene.question.id]
    if (!Array.isArray(selected) || selected.length !== 1 || typeof selected[0] !== 'string') {
      throw new Error('invalid_answers')
    }
    if (!scene.question.options.some((option) => option.id === selected[0])) {
      throw new Error('invalid_answers')
    }
  }

  return Object.fromEntries(
    assessmentConfig.scenes
      .filter((item) => item.enabled)
      .map((scene) => [scene.question.id, [...(answers[scene.question.id] as string[])]]),
  )
}

function parseAttribution(value: unknown): Attribution {
  const attribution = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
  const optional = (key: string) => typeof attribution[key] === 'string'
    ? String(attribution[key]).slice(0, 500)
    : undefined

  return {
    sourceUrl: optional('sourceUrl') ?? '',
    referrer: optional('referrer') ?? '',
    utmSource: optional('utmSource'),
    utmMedium: optional('utmMedium'),
    utmCampaign: optional('utmCampaign'),
    utmContent: optional('utmContent'),
    utmTerm: optional('utmTerm'),
  }
}

export function validateAssessmentSubmission(value: unknown): AssessmentSubmissionPayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_payload')
  const input = value as Record<string, unknown>
  const sessionId = typeof input.sessionId === 'string' ? input.sessionId : ''
  if (!SESSION_ID_PATTERN.test(sessionId)) throw new Error('invalid_session_id')

  const name = typeof input.name === 'string' ? input.name.trim() : ''
  if (!name || name.length > 80) throw new Error('invalid_name')
  if (input.consent !== true) throw new Error('consent_required')

  const hasPhotoPath = input.photoPath !== undefined
  const hasUploadReceipt = input.uploadReceipt !== undefined
  if (hasPhotoPath !== hasUploadReceipt) throw new Error('invalid_photo_payload')

  let photoPath: string | undefined
  let uploadReceipt: string | undefined
  if (hasPhotoPath && hasUploadReceipt) {
    photoPath = typeof input.photoPath === 'string' ? input.photoPath : ''
    const photoMatch = PHOTO_PATH_PATTERN.exec(photoPath)
    if (!photoMatch || photoMatch[3] !== sessionId) throw new Error('invalid_photo_path')

    uploadReceipt = typeof input.uploadReceipt === 'string' ? input.uploadReceipt : ''
    if (!uploadReceipt || uploadReceipt.length > 4096) throw new Error('invalid_upload_receipt')
  }

  return {
    sessionId,
    name,
    phone: normaliseHongKongPhone(typeof input.phone === 'string' ? input.phone : ''),
    heightCm: parseHeight(input.heightCm),
    weightKg: parseWeight(input.weightKg),
    consent: true,
    answers: parseAnswers(input.answers),
    ...(photoPath && uploadReceipt ? { photoPath, uploadReceipt } : {}),
    attribution: parseAttribution(input.attribution),
  }
}
