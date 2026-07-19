import { describe, expect, it } from 'vitest'
import { createUploadReceipt, verifyUploadReceipt } from './uploadReceipt'

const secret = 'server-only-test-secret'
const input = {
  sessionId: 'session-1234567890',
  bucket: 'assessment-photos',
  path: '2026/07/session-1234567890/123e4567-e89b-12d3-a456-426614174000.jpg',
  mimeType: 'image/jpeg',
  fileSize: 1024,
}

describe('private upload receipt', () => {
  it('round-trips a server-authenticated upload contract', () => {
    const receipt = createUploadReceipt(input, secret, new Date('2026-07-19T00:00:00Z'))

    expect(verifyUploadReceipt(receipt, secret, new Date('2026-07-19T00:10:00Z'))).toEqual({
      version: 1,
      ...input,
      expiresAt: '2026-07-19T00:15:00.000Z',
    })
  })

  it('rejects a tampered receipt', () => {
    const receipt = createUploadReceipt(input, secret, new Date('2026-07-19T00:00:00Z'))
    const [payload, signature] = receipt.split('.')
    const tampered = `${payload.slice(0, -1)}A.${signature}`

    expect(() => verifyUploadReceipt(tampered, secret, new Date('2026-07-19T00:01:00Z')))
      .toThrow('invalid_upload_receipt')
  })

  it('rejects an expired receipt', () => {
    const receipt = createUploadReceipt(input, secret, new Date('2026-07-19T00:00:00Z'))

    expect(() => verifyUploadReceipt(receipt, secret, new Date('2026-07-19T00:15:01Z')))
      .toThrow('invalid_upload_receipt')
  })
})
