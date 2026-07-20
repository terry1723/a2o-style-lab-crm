import { createHmac, timingSafeEqual } from 'node:crypto'

const RECEIPT_TTL_MS = 15 * 60 * 1000
const RECEIPT_CONTEXT = 'a2o-assessment-upload-receipt-v1'

export type UploadReceiptPayload = {
  version: 1
  sessionId: string
  bucket: string
  path: string
  mimeType: string
  fileSize: number
  expiresAt: string
}

type UploadReceiptInput = Omit<UploadReceiptPayload, 'version' | 'expiresAt'>

function receiptKey(secret: string) {
  if (!secret) throw new Error('supabase_server_not_configured')
  return createHmac('sha256', secret).update(RECEIPT_CONTEXT).digest()
}

function signature(encodedPayload: string, secret: string) {
  return createHmac('sha256', receiptKey(secret)).update(encodedPayload).digest('base64url')
}

export function getUploadReceiptSecret() {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new Error('supabase_server_not_configured')
  return secret
}

export function createUploadReceipt(input: UploadReceiptInput, secret: string, now = new Date()) {
  const payload: UploadReceiptPayload = {
    version: 1,
    ...input,
    expiresAt: new Date(now.getTime() + RECEIPT_TTL_MS).toISOString(),
  }
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${encodedPayload}.${signature(encodedPayload, secret)}`
}

export function verifyUploadReceipt(receipt: string, secret: string, now = new Date()): UploadReceiptPayload {
  try {
    const [encodedPayload, providedSignature, extra] = receipt.split('.')
    if (!encodedPayload || !providedSignature || extra) throw new Error('invalid_upload_receipt')

    const expectedSignature = signature(encodedPayload, secret)
    const providedBuffer = Buffer.from(providedSignature)
    const expectedBuffer = Buffer.from(expectedSignature)
    if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) {
      throw new Error('invalid_upload_receipt')
    }

    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as Partial<UploadReceiptPayload>
    if (
      payload.version !== 1
      || typeof payload.sessionId !== 'string'
      || typeof payload.bucket !== 'string'
      || typeof payload.path !== 'string'
      || typeof payload.mimeType !== 'string'
      || typeof payload.fileSize !== 'number'
      || typeof payload.expiresAt !== 'string'
      || !Number.isFinite(payload.fileSize)
      || payload.fileSize <= 0
      || new Date(payload.expiresAt).getTime() <= now.getTime()
    ) throw new Error('invalid_upload_receipt')

    return payload as UploadReceiptPayload
  } catch (error) {
    if (error instanceof Error && error.message === 'supabase_server_not_configured') throw error
    throw new Error('invalid_upload_receipt')
  }
}
