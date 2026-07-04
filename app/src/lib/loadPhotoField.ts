import { supabase, isSupabaseConfigured } from './supabase'

export async function loadPhotoField(ids: string[]) {
  if (!isSupabaseConfigured() || ids.length === 0) return {}
  const { data, error } = await supabase
    .from('clients')
    .select('id,before_photo')
    .in('id', ids)

  if (error) {
    console.error('loadPhotoField error:', error)
    return {}
  }

  return Object.fromEntries((data || []).map((r: any) => [r.id, r.before_photo || '']))
}
