export const SYNC_REPLAY_WINDOW_SECONDS = 300

export function isFreshSyncTimestamp(
  timestampSeconds: number,
  nowSeconds: number = Math.floor(Date.now() / 1000),
  windowSeconds = SYNC_REPLAY_WINDOW_SECONDS,
): boolean {
  return Number.isFinite(timestampSeconds)
    && Number.isFinite(nowSeconds)
    && Math.abs(nowSeconds - timestampSeconds) <= windowSeconds
}

function hexEncode(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function buildSyncSignature(
  secret: string,
  timestamp: string,
  requestId: string,
  rawBody: string,
): Promise<string> {
  if (!secret || !timestamp || !requestId) throw new Error('sync_signature_input_invalid')
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const message = `${timestamp}\n${requestId}\n${rawBody}`
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return `sha256=${hexEncode(signature)}`
}
