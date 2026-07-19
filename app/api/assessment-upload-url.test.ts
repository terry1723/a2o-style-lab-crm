import { describe, expect, it, vi } from 'vitest'
import { createUploadUrlHandler } from './assessment-upload-url'

function responseRecorder() {
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(body: unknown) {
      this.body = body
      return this
    },
    setHeader(name: string, value: string) {
      this.headers[name] = value
      return this
    },
  }
  return response
}

describe('assessment-upload-url endpoint', () => {
  it('returns a one-time upload contract for an approved photo', async () => {
    const createPhotoUpload = vi.fn().mockResolvedValue({ path: '2026/07/session/photo.jpg', token: 'token' })
    const createUploadReceipt = vi.fn().mockReturnValue('signed-upload-receipt')
    const handler = createUploadUrlHandler({ createPhotoUpload, createUploadReceipt, bucket: 'assessment-photos' })
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
      uploadReceipt: 'signed-upload-receipt',
    })
    expect(createUploadReceipt).toHaveBeenCalledWith({
      sessionId: 'session-1234567890',
      bucket: 'assessment-photos',
      path: '2026/07/session/photo.jpg',
      mimeType: 'image/jpeg',
      fileSize: 1024,
    })
    expect(response.headers['Cache-Control']).toBe('no-store')
  })

  it.each([0, 10 * 1024 * 1024 + 1])('rejects invalid file size %s', async (fileSize) => {
    const createPhotoUpload = vi.fn()
    const handler = createUploadUrlHandler({ createPhotoUpload, createUploadReceipt: vi.fn(), bucket: 'assessment-photos' })
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
    const handler = createUploadUrlHandler({ createPhotoUpload, createUploadReceipt: vi.fn(), bucket: 'assessment-photos' })
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
    const handler = createUploadUrlHandler({ createPhotoUpload: vi.fn(), createUploadReceipt: vi.fn(), bucket: 'assessment-photos' })
    const response = responseRecorder()

    await handler({ method: 'GET', body: {} }, response)

    expect(response.statusCode).toBe(405)
    expect(response.body).toEqual({ error: 'method_not_allowed' })
  })

  it('rejects an upload request when the server rate limit is exceeded', async () => {
    const createPhotoUpload = vi.fn()
    const allowRequest = vi.fn().mockReturnValue(false)
    const handler = createUploadUrlHandler({
      createPhotoUpload,
      createUploadReceipt: vi.fn(),
      bucket: 'assessment-photos',
      allowRequest,
    })
    const response = responseRecorder()

    await handler({
      method: 'POST',
      headers: { 'x-forwarded-for': '203.0.113.1' },
      body: { sessionId: 'session-1234567890', mimeType: 'image/jpeg', extension: 'jpg', fileSize: 1024 },
    }, response)

    expect(response.statusCode).toBe(429)
    expect(response.body).toEqual({ error: 'too_many_requests' })
    expect(response.headers['Retry-After']).toBe('600')
    expect(createPhotoUpload).not.toHaveBeenCalled()
  })
})
