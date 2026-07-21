import type { VercelRequest, VercelResponse } from '@vercel/node'
import { assessmentConfig } from '../src/features/assessment/config/assessmentConfig.js'
import { calculateAssessmentResult, getSelectedLabels } from '../src/features/assessment/services/scoring.js'
import type { AssessmentSubmissionPayload } from './_lib/assessmentValidation.js'
import { validateAssessmentSubmission } from './_lib/assessmentValidation.js'
import { appendAssessmentLead, type AssessmentSheetRow } from './_lib/googleSheetWebhook.js'
import { assertUploadedPhoto, createPhotoReadUrl } from './_lib/storageService.js'
import { getStorageBucketName } from './_lib/supabaseAdmin.js'
import { getUploadReceiptSecret, verifyUploadReceipt, type UploadReceiptPayload } from './_lib/uploadReceipt.js'
import { createFixedWindowRateLimiter, getForwardedAddress } from './_lib/requestRateLimit.js'
import { checkAssessmentRateLimit } from './_lib/assessmentRateLimit.js'

type RequestLike = {
  method?: string
  body?: unknown
  headers?: Record<string, string | string[] | undefined>
}

type ResponseLike = {
  status: (code: number) => ResponseLike
  json: (body: unknown) => unknown
  setHeader?: (name: string, value: string) => unknown
}

type Dependencies = {
  validateAssessmentSubmission: (value: unknown) => AssessmentSubmissionPayload
  verifyUploadReceipt: (receipt: string) => UploadReceiptPayload
  bucket: string | (() => string)
  assertUploadedPhoto: (path: string, mimeType: string, fileSize: number) => Promise<void>
  createPhotoReadUrl: (path: string, expiresIn: number) => Promise<string>
  appendAssessmentLead: (row: AssessmentSheetRow) => Promise<{ duplicate: boolean }>
  now: () => Date
  allowRequest?: (key: string) => boolean | Promise<boolean>
}

function parseBody(body: unknown) {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as unknown
    } catch {
      return null
    }
  }
  return body
}

function publicError(error: unknown) {
  const message = error instanceof Error ? error.message : 'submission_unavailable'
  if (message.startsWith('invalid_') || message === 'consent_required' || message === 'uploaded_photo_invalid') {
    return { status: 400, error: 'invalid_submission' }
  }
  if (message === 'sheet_server_not_configured' || message === 'supabase_server_not_configured') {
    return { status: 503, error: 'server_not_configured' }
  }
  return { status: 502, error: 'submission_unavailable' }
}

export function createSubmissionHandler(dependencies: Dependencies) {
  return async (request: RequestLike, response: ResponseLike) => {
    if (request.method !== 'POST') {
      response.status(405).json({ error: 'method_not_allowed' })
      return
    }

    try {
      if (dependencies.allowRequest && !await dependencies.allowRequest(getForwardedAddress(request.headers))) {
        response.setHeader?.('Retry-After', '600')
        response.status(429).json({ error: 'too_many_requests' })
        return
      }
    } catch {
      response.status(503).json({ error: 'server_unavailable' })
      return
    }

    try {
      const payload = dependencies.validateAssessmentSubmission(parseBody(request.body))
      const receipt = dependencies.verifyUploadReceipt(payload.uploadReceipt)
      const bucket = typeof dependencies.bucket === 'function' ? dependencies.bucket() : dependencies.bucket
      if (
        receipt.sessionId !== payload.sessionId
        || receipt.path !== payload.photoPath
        || receipt.bucket !== bucket
      ) throw new Error('invalid_upload_receipt')

      await dependencies.assertUploadedPhoto(payload.photoPath, receipt.mimeType, receipt.fileSize)
      const labels = getSelectedLabels(assessmentConfig, payload.answers)
      const result = calculateAssessmentResult(assessmentConfig, payload.answers)
      const photoSignedUrl = await dependencies.createPhotoReadUrl(payload.photoPath, 7 * 24 * 60 * 60)
      const appendResult = await dependencies.appendAssessmentLead({
        submittedAt: dependencies.now().toISOString(),
        sessionId: payload.sessionId,
        name: payload.name,
        phone: payload.phone,
        heightCm: payload.heightCm,
        weightKg: payload.weightKg,
        q1: labels.q1?.[0] ?? '',
        q2: labels.q2?.[0] ?? '',
        q3: labels.q3?.[0] ?? '',
        q4: labels.q4?.[0] ?? '',
        resultTitle: result.title,
        photoPath: payload.photoPath,
        photoSignedUrl,
        utmSource: payload.attribution.utmSource ?? '',
      })

      response.setHeader?.('Cache-Control', 'no-store')
      response.status(200).json({ ok: true, duplicate: appendResult.duplicate })
    } catch (error) {
      const mapped = publicError(error)
      response.status(mapped.status).json({ error: mapped.error })
    }
  }
}

const allowSubmissionRequest = createFixedWindowRateLimiter({ limit: 24, windowMs: 10 * 60 * 1000 })

const handler = createSubmissionHandler({
  validateAssessmentSubmission,
  verifyUploadReceipt: (receipt) => verifyUploadReceipt(receipt, getUploadReceiptSecret()),
  bucket: getStorageBucketName,
  assertUploadedPhoto,
  createPhotoReadUrl,
  appendAssessmentLead,
  now: () => new Date(),
  allowRequest: async (key) => allowSubmissionRequest(key) && checkAssessmentRateLimit('lead-submit', key, 24),
})

export default async function assessmentSubmit(request: VercelRequest, response: VercelResponse) {
  await handler(request, response)
}
