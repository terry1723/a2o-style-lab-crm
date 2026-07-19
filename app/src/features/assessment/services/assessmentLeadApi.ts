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

async function postJson<T>(fetchImpl: typeof fetch, url: string, body: unknown): Promise<T> {
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error('assessment_submission_failed')

  const payload = await response.json() as T
  return payload
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

  const signedUpload = await postJson<SignedUpload>(
    dependencies.fetchImpl,
    '/api/assessment-upload-url',
    {
      sessionId: payload.sessionId,
      mimeType: payload.input.photo.type,
      extension,
      fileSize: payload.input.photo.size,
    },
  )

  if (!signedUpload.bucket || !signedUpload.path || !signedUpload.token) {
    throw new Error('photo_upload_unavailable')
  }

  await dependencies.uploadToSignedUrl({ ...signedUpload, file: payload.input.photo })

  return postJson<{ ok: true; duplicate: boolean }>(
    dependencies.fetchImpl,
    '/api/assessment-submit',
    {
      sessionId: payload.sessionId,
      name: payload.input.name,
      phone: payload.input.phone,
      consent: payload.input.consent,
      answers: payload.answers,
      photoPath: signedUpload.path,
      attribution: payload.attribution,
    },
  )
}
