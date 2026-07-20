import { createHmac } from 'node:crypto'
import { createSupabaseAdmin } from './supabaseAdmin.js'
import { getUploadReceiptSecret } from './uploadReceipt.js'

type RateLimitClient = {
  rpc: (functionName: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>
}

type RateLimitOptions = {
  client?: RateLimitClient
  secret?: string
}

function hashedKey(scope: string, address: string, secret: string) {
  return createHmac('sha256', secret)
    .update(`a2o-assessment-rate-limit-v1:${scope}:${address}`)
    .digest('hex')
}

export async function checkAssessmentRateLimit(
  scope: 'photo-upload' | 'lead-submit',
  address: string,
  limit: number,
  options: RateLimitOptions = {},
) {
  const client = options.client ?? createSupabaseAdmin() as unknown as RateLimitClient
  const secret = options.secret ?? getUploadReceiptSecret()

  try {
    const { data, error } = await client.rpc('check_assessment_rate_limit', {
      p_key_hash: hashedKey(scope, address, secret),
      p_limit: limit,
      p_window_seconds: 600,
    })
    if (error || typeof data !== 'boolean') throw new Error('assessment_rate_limit_unavailable')
    return data
  } catch {
    throw new Error('assessment_rate_limit_unavailable')
  }
}
