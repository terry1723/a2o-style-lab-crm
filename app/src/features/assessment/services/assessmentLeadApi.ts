import { supabase } from '../../../lib/supabase'
import type {
  AssessmentAnswerMap,
  AssessmentLeadInput,
  Attribution,
} from '../types/assessment'

type PipelineInput = {
  input: AssessmentLeadInput
  sessionId: string
  answers: AssessmentAnswerMap
  attribution: Attribution
}

type SignedUpload = {
  bucket: string
  path: string
  token: string
  uploadReceipt: string
}

type Dependencies = {
  fetchImpl: typeof fetch
  uploadToSignedUrl: (input: SignedUpload & { file: File }) => Promise<void>
}

const PHOTO_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

const UPLOAD_CACHE_TTL_MS = 12 * 60 * 1000
const completedUploads = new Map<string, { photo: File; upload: SignedUpload; cachedAt: number }>()

async function postJson(fetchImpl: typeof fetch, url: string, body: unknown): Promise<unknown> {
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error('assessment_submission_failed')

  return response.json() as Promise<unknown>
}

function parseSignedUpload(value: unknown): SignedUpload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('photo_upload_unavailable')
  const payload = value as Record<string, unknown>
  if (
    typeof payload.bucket !== 'string' || !payload.bucket
    || typeof payload.path !== 'string' || !payload.path
    || typeof payload.token !== 'string' || !payload.token
    || typeof payload.uploadReceipt !== 'string' || !payload.uploadReceipt
  ) throw new Error('photo_upload_unavailable')
  return payload as SignedUpload
}

function parseSubmissionResult(value: unknown): { ok: true; duplicate: boolean } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('assessment_submission_failed')
  const payload = value as Record<string, unknown>
  if (payload.ok !== true || typeof payload.duplicate !== 'boolean') throw new Error('assessment_submission_failed')
  return { ok: true, duplicate: payload.duplicate }
}

async function uploadToSupabase(input: SignedUpload & { file: File }) {
  const { error } = await supabase.storage
    .from(input.bucket)
    .uploadToSignedUrl(input.path, input.token, input.file, { contentType: input.file.type })

  if (error) throw new Error('photo_upload_failed')
}

const defaultDependencies: Dependencies = {
  fetchImpl: fetch,
  uploadToSignedUrl: uploadToSupabase,
}

export async function submitAssessmentLeadToPipeline(
  payload: PipelineInput,
  dependencies: Dependencies = defaultDependencies,
) {
  const extension = PHOTO_EXTENSIONS[payload.input.photo.type]
  if (!extension) throw new Error('invalid_photo_type')

  const cached = completedUploads.get(payload.sessionId)
  let signedUpload: SignedUpload
  if (
    cached
    && cached.photo === payload.input.photo
    && Date.now() - cached.cachedAt < UPLOAD_CACHE_TTL_MS
  ) {
    signedUpload = cached.upload
  } else {
    completedUploads.delete(payload.sessionId)
    signedUpload = parseSignedUpload(await postJson(
      dependencies.fetchImpl,
      '/api/assessment-upload-url',
      {
        sessionId: payload.sessionId,
        mimeType: payload.input.photo.type,
        extension,
        fileSize: payload.input.photo.size,
      },
    ))

    await dependencies.uploadToSignedUrl({ ...signedUpload, file: payload.input.photo })
    completedUploads.set(payload.sessionId, {
      photo: payload.input.photo,
      upload: signedUpload,
      cachedAt: Date.now(),
    })
  }

  const result = parseSubmissionResult(await postJson(
    dependencies.fetchImpl,
    '/api/assessment-submit',
    {
      sessionId: payload.sessionId,
      name: payload.input.name,
      phone: payload.input.phone,
      heightCm: payload.input.heightCm,
      weightKg: payload.input.weightKg,
      consent: payload.input.consent,
      answers: payload.answers,
      photoPath: signedUpload.path,
      uploadReceipt: signedUpload.uploadReceipt,
      attribution: payload.attribution,
    },
  ))
  completedUploads.delete(payload.sessionId)
  return result
}
