import { randomUUID } from 'node:crypto'
import { createAssessmentStorageBucket } from './supabaseAdmin.js'

const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{16,80}$/
const MIME_EXTENSIONS: Record<string, string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
}

type SignedUploadResult = {
  data: { token?: string } | null
  error: unknown
}

type SignedUrlResult = {
  data: { signedUrl?: string } | null
  error: unknown
}

export type AssessmentStorageBucket = {
  createSignedUploadUrl: (path: string) => Promise<SignedUploadResult>
  createSignedUrl: (path: string, expiresIn: number) => Promise<SignedUrlResult>
}

export type PhotoUploadRequest = {
  sessionId: string
  mimeType: string
  extension: string
}

function assertPhotoType(mimeType: string, extension: string) {
  const normalisedExtension = extension.toLowerCase().replace(/^\./, '')
  if (!MIME_EXTENSIONS[mimeType]?.includes(normalisedExtension)) throw new Error('invalid_photo_type')
  return normalisedExtension
}

export async function createPhotoUpload(
  input: PhotoUploadRequest,
  storage: AssessmentStorageBucket = createAssessmentStorageBucket(),
  now = new Date(),
  uuid = randomUUID,
) {
  if (!SESSION_ID_PATTERN.test(input.sessionId)) throw new Error('invalid_session_id')
  const extension = assertPhotoType(input.mimeType, input.extension)
  const year = String(now.getUTCFullYear())
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const path = `${year}/${month}/${input.sessionId}/${uuid()}.${extension}`
  const { data, error } = await storage.createSignedUploadUrl(path)

  if (error || !data?.token) throw new Error('photo_upload_signing_failed')
  return { path, token: data.token }
}

export async function createPhotoReadUrl(
  path: string,
  expiresIn: number,
  storage: AssessmentStorageBucket = createAssessmentStorageBucket(),
) {
  const { data, error } = await storage.createSignedUrl(path, expiresIn)
  if (error || !data?.signedUrl) throw new Error('photo_read_signing_failed')
  return data.signedUrl
}
