import type { VercelRequest, VercelResponse } from '@vercel/node'
import { assessmentConfig } from '../src/features/assessment/config/assessmentConfig.js'
import { calculateAssessmentResult, getSelectedLabels } from '../src/features/assessment/services/scoring.js'
import type { AssessmentSubmissionPayload } from './_lib/assessmentValidation.js'
import { validateAssessmentSubmission } from './_lib/assessmentValidation.js'
import { appendAssessmentLead, type AssessmentSheetRow } from './_lib/googleSheetWebhook.js'
import { createPhotoReadUrl } from './_lib/storageService.js'

type RequestLike = {
  method?: string
  body?: unknown
}

type ResponseLike = {
  status: (code: number) => ResponseLike
  json: (body: unknown) => unknown
}

type Dependencies = {
  validateAssessmentSubmission: (value: unknown) => AssessmentSubmissionPayload
  createPhotoReadUrl: (path: string, expiresIn: number) => Promise<string>
  appendAssessmentLead: (row: AssessmentSheetRow) => Promise<{ duplicate: boolean }>
  now: () => Date
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
  if (message.startsWith('invalid_') || message === 'consent_required') {
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
      const payload = dependencies.validateAssessmentSubmission(parseBody(request.body))
      const labels = getSelectedLabels(assessmentConfig, payload.answers)
      const result = calculateAssessmentResult(assessmentConfig, payload.answers)
      const photoSignedUrl = await dependencies.createPhotoReadUrl(payload.photoPath, 7 * 24 * 60 * 60)
      const appendResult = await dependencies.appendAssessmentLead({
        submittedAt: dependencies.now().toISOString(),
        sessionId: payload.sessionId,
        name: payload.name,
        phone: payload.phone,
        q1: labels.q1?.[0] ?? '',
        q2: labels.q2?.[0] ?? '',
        q3: labels.q3?.[0] ?? '',
        q4: labels.q4?.[0] ?? '',
        resultTitle: result.title,
        photoPath: payload.photoPath,
        photoSignedUrl,
        utmSource: payload.attribution.utmSource ?? '',
      })

      response.status(200).json({ ok: true, duplicate: appendResult.duplicate })
    } catch (error) {
      const mapped = publicError(error)
      response.status(mapped.status).json({ error: mapped.error })
    }
  }
}

const handler = createSubmissionHandler({
  validateAssessmentSubmission,
  createPhotoReadUrl,
  appendAssessmentLead,
  now: () => new Date(),
})

export default async function assessmentSubmit(request: VercelRequest, response: VercelResponse) {
  await handler(request, response)
}
