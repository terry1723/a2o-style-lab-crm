import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Prevent runtime crash in local/dev when env vars are missing.
// We still expose `isSupabaseConfigured()` so callers can gate DB-only behavior.
const fallbackUrl = 'https://placeholder.supabase.co'
const fallbackAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder.placeholder'

const effectiveUrl = supabaseUrl || fallbackUrl
const effectiveAnonKey = supabaseAnonKey || fallbackAnonKey

export const supabase = createClient(effectiveUrl, effectiveAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

// Check if Supabase is configured
export const isSupabaseConfigured = () => {
  return !!supabaseUrl && !!supabaseAnonKey && supabaseUrl !== 'https://your-project.supabase.co'
}
