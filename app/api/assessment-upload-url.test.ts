import { describe, expect, it, vi } from 'vitest'
import { createUploadUrlHandler } from './assessment-upload-url'

function responseRecorder() {
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(body: unknown) {
      this.body = body
      return this
    },
  }
  return response
}

describe('assessment-upload-url endpoint', () => {
  it('returns a one-time upload contract for an approved photo', async () => {
    const createPhotoUpload = vi.fn().mockResolvedValue({ path: '2026/07/session/photo.jpg', token: 'token' })
    const handler = createUploadUrlHandler({ createPhotoUpload, bucket: 'assessment-photos' })
    const response = responseRecorder()

    await handler({
      method: 'POST',
      body: {
        sessionId: 'session-1234567890',
        mimeType: 'image/jpeg',
        extension: 'jpg',
        fileSize: 1024,
      },
    }, response)

    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual({
      path: '2026/07/session/photo.jpg',
      token: 'token',
      bucket: 'assessment-photos',
    })
  })

  it.each([0, 10 * 1024 * 1024 + 1])('rejects invalid file size %s', async (fileSize) => {
    const createPhotoUpload = vi.fn()
    const handler = createUploadUrlHandler({ createPhotoUpload, bucket: 'assessment-photos' })
    const response = responseRecorder()

    await handler({
      method: 'POST',
      body: { sessionId: 'session-1234567890', mimeType: 'image/jpeg', extension: 'jpg', fileSize },
    }, response)

    expect(response.statusCode).toBe(400)
    expect(response.body).toEqual({ error: 'invalid_photo_size' })
    expect(createPhotoUpload).not.toHaveBeenCalled()
  })

  it('does not expose upstream signing errors', async () => {
    const createPhotoUpload = vi.fn().mockRejectedValue(new Error('photo_upload_signing_failed'))
    const handler = createUploadUrlHandler({ createPhotoUpload, bucket: 'assessment-photos' })
    const response = responseRecorder()

    await handler({
      method: 'POST',
      body: {
        sessionId: 'session-1234567890',
        mimeType: 'image/jpeg',
        extension: 'jpg',
        fileSize: 1024,
      },
    }, response)

    expect(response.statusCode).toBe(502)
    expect(response.body).toEqual({ error: 'photo_upload_unavailable' })
  })

  it('allows POST only', async () => {
    const handler = createUploadUrlHandler({ createPhotoUpload: vi.fn(), bucket: 'assessment-photos' })
    const response = responseRecorder()

    await handler({ method: 'GET', body: {} }, response)

    expect(response.statusCode).toBe(405)
    expect(response.body).toEqual({ error: 'method_not_allowed' })
  })
})
