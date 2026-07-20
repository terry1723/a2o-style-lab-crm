import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getStorageBucketName } from './_lib/supabaseAdmin.js'
import { createPhotoUpload, type PhotoUploadRequest } from './_lib/storageService.js'
import { createUploadReceipt, getUploadReceiptSecret } from './_lib/uploadReceipt.js'
import { createFixedWindowRateLimiter, getForwardedAddress } from './_lib/requestRateLimit.js'
import { checkAssessmentRateLimit } from './_lib/assessmentRateLimit.js'

const MAX_PHOTO_BYTES = 10 * 1024 * 1024

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
  createPhotoUpload: (input: PhotoUploadRequest) => Promise<{ path: string; token: string }>
  createUploadReceipt: (input: {
    sessionId: string
    bucket: string
    path: string
    mimeType: string
    fileSize: number
  }) => string
  bucket: string | (() => string)
  allowRequest?: (key: string) => boolean | Promise<boolean>
}

function parseBody(body: unknown): Record<string, unknown> {
  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
    } catch {
      return {}
    }
  }
  return body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {}
}

function errorStatus(message: string) {
  if (message.startsWith('invalid_')) return 400
  if (message === 'supabase_server_not_configured') return 503
  return 502
}

export function createUploadUrlHandler(dependencies: Dependencies) {
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

    const body = parseBody(request.body)
    const fileSize = body.fileSize
    if (typeof fileSize !== 'number' || !Number.isFinite(fileSize) || fileSize <= 0 || fileSize > MAX_PHOTO_BYTES) {
      response.status(400).json({ error: 'invalid_photo_size' })
      return
    }

    try {
      const result = await dependencies.createPhotoUpload({
        sessionId: typeof body.sessionId === 'string' ? body.sessionId : '',
        mimeType: typeof body.mimeType === 'string' ? body.mimeType : '',
        extension: typeof body.extension === 'string' ? body.extension : '',
      })
      const bucket = typeof dependencies.bucket === 'function' ? dependencies.bucket() : dependencies.bucket
      if (!bucket) throw new Error('supabase_server_not_configured')
      const uploadReceipt = dependencies.createUploadReceipt({
        sessionId: typeof body.sessionId === 'string' ? body.sessionId : '',
        bucket,
        path: result.path,
        mimeType: typeof body.mimeType === 'string' ? body.mimeType : '',
        fileSize,
      })
      response.setHeader?.('Cache-Control', 'no-store')
      response.status(200).json({ ...result, bucket, uploadReceipt })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'photo_upload_unavailable'
      const status = errorStatus(message)
      response.status(status).json({ error: status === 400 ? message : status === 503 ? 'server_not_configured' : 'photo_upload_unavailable' })
    }
  }
}

const allowUploadRequest = createFixedWindowRateLimiter({ limit: 12, windowMs: 10 * 60 * 1000 })

const handler = createUploadUrlHandler({
  createPhotoUpload,
  createUploadReceipt: (input) => createUploadReceipt(input, getUploadReceiptSecret()),
  bucket: getStorageBucketName,
  allowRequest: async (key) => allowUploadRequest(key) && checkAssessmentRateLimit('photo-upload', key, 12),
})

export default async function assessmentUploadUrl(request: VercelRequest, response: VercelResponse) {
  await handler(request, response)
}
