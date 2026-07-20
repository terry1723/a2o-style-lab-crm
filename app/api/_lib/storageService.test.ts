import { describe, expect, it, vi } from 'vitest'
import { assertUploadedPhoto, createPhotoReadUrl, createPhotoUpload } from './storageService'

function fakeStorage() {
  return {
    createSignedUploadUrl: vi.fn().mockResolvedValue({
      data: { path: 'ignored', token: 'one-time-token' },
      error: null,
    }),
    createSignedUrl: vi.fn().mockResolvedValue({
      data: { signedUrl: 'https://example.supabase.co/signed/photo' },
      error: null,
    }),
    list: vi.fn().mockResolvedValue({
      data: [{
        name: '123e4567-e89b-12d3-a456-426614174000.jpg',
        metadata: { size: 1024, mimetype: 'image/jpeg' },
      }],
      error: null,
    }),
  }
}

describe('assessment photo storage', () => {
  it('creates an anonymous session-scoped object path', async () => {
    const storage = fakeStorage()
    const result = await createPhotoUpload({
      sessionId: 'session-1234567890',
      mimeType: 'image/jpeg',
      extension: 'jpg',
    }, storage, new Date('2026-07-19T00:00:00Z'), () => '123e4567-e89b-12d3-a456-426614174000')

    expect(result).toEqual({
      path: '2026/07/session-1234567890/123e4567-e89b-12d3-a456-426614174000.jpg',
      token: 'one-time-token',
    })
    expect(JSON.stringify(result)).not.toContain('陳先生')
  })

  it.each([
    ['image/gif', 'gif'],
    ['image/jpeg', 'png'],
    ['text/plain', 'jpg'],
  ])('rejects unsupported MIME and extension pair %s/%s', async (mimeType, extension) => {
    await expect(createPhotoUpload({
      sessionId: 'session-1234567890',
      mimeType,
      extension,
    }, fakeStorage())).rejects.toThrow('invalid_photo_type')
  })

  it('maps Supabase upload signing errors without exposing details', async () => {
    const storage = fakeStorage()
    storage.createSignedUploadUrl.mockResolvedValue({ data: null, error: new Error('secret provider detail') })

    await expect(createPhotoUpload({
      sessionId: 'session-1234567890',
      mimeType: 'image/webp',
      extension: 'webp',
    }, storage)).rejects.toThrow('photo_upload_signing_failed')
  })

  it('creates a seven-day private read URL', async () => {
    const storage = fakeStorage()
    const url = await createPhotoReadUrl(
      '2026/07/session-1234567890/123e4567-e89b-12d3-a456-426614174000.jpg',
      604800,
      storage,
    )

    expect(url).toBe('https://example.supabase.co/signed/photo')
    expect(storage.createSignedUrl).toHaveBeenCalledWith(
      '2026/07/session-1234567890/123e4567-e89b-12d3-a456-426614174000.jpg',
      604800,
    )
  })

  it('verifies the uploaded object metadata before issuing a read URL', async () => {
    const storage = fakeStorage()
    const path = '2026/07/session-1234567890/123e4567-e89b-12d3-a456-426614174000.jpg'

    await expect(assertUploadedPhoto(path, 'image/jpeg', 1024, storage)).resolves.toBeUndefined()
    expect(storage.list).toHaveBeenCalledWith('2026/07/session-1234567890', {
      limit: 2,
      search: '123e4567-e89b-12d3-a456-426614174000.jpg',
    })
  })

  it.each([
    [[], 'missing object'],
    [[{ name: '123e4567-e89b-12d3-a456-426614174000.jpg', metadata: { size: 2048, mimetype: 'image/jpeg' } }], 'wrong size'],
    [[{ name: '123e4567-e89b-12d3-a456-426614174000.jpg', metadata: { size: 1024, mimetype: 'image/png' } }], 'wrong MIME'],
  ])('rejects an upload with %s (%s)', async (data) => {
    const storage = fakeStorage()
    storage.list.mockResolvedValue({ data, error: null })

    await expect(assertUploadedPhoto(
      '2026/07/session-1234567890/123e4567-e89b-12d3-a456-426614174000.jpg',
      'image/jpeg',
      1024,
      storage,
    )).rejects.toThrow('uploaded_photo_invalid')
  })
})
