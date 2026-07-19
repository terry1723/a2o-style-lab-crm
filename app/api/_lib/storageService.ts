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

type ListResult = {
  data: Array<{ name: string; metadata?: Record<string, unknown> | null }> | null
  error: unknown
}

export type AssessmentStorageBucket = {
  createSignedUploadUrl: (path: string) => Promise<SignedUploadResult>
  createSignedUrl: (path: string, expiresIn: number) => Promise<SignedUrlResult>
  list: (path: string, options: { limit: number; search: string }) => Promise<ListResult>
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

export async function assertUploadedPhoto(
  path: string,
  expectedMimeType: string,
  expectedFileSize: number,
  storage: AssessmentStorageBucket = createAssessmentStorageBucket(),
) {
  const separator = path.lastIndexOf('/')
  if (separator <= 0 || separator === path.length - 1) throw new Error('uploaded_photo_invalid')
  const folder = path.slice(0, separator)
  const filename = path.slice(separator + 1)
  const { data, error } = await storage.list(folder, { limit: 2, search: filename })
  const object = data?.find((item) => item.name === filename)
  const size = object?.metadata?.size
  const mimeType = object?.metadata?.mimetype ?? object?.metadata?.contentType

  if (
    error
    || !object
    || typeof size !== 'number'
    || size !== expectedFileSize
    || mimeType !== expectedMimeType
  ) throw new Error('uploaded_photo_invalid')
}
