import { createClient } from '@supabase/supabase-js'

export function getStorageBucketName() {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET
  if (!bucket) throw new Error('supabase_server_not_configured')
  return bucket
}

export function createSupabaseAdmin() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('supabase_server_not_configured')

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export function createAssessmentStorageBucket() {
  return createSupabaseAdmin().storage.from(getStorageBucketName())
}
