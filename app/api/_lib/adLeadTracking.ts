import {
  AD_LEAD_OWNERS,
  AD_LEAD_STATUSES,
  type AdLeadOwner,
  type AdLeadStatus,
  type AdLeadTracking,
} from '../../src/features/ad-leads/adLeadService.js'
import { createSupabaseAdmin } from './supabaseAdmin.js'

export type AdLeadTrackingUpdate = {
  source_key: string
  status: AdLeadStatus
  owner: AdLeadOwner
}

type TrackingClient = {
  from: (table: 'ad_lead_tracking') => {
    select: (columns: string) => PromiseLike<{ data: unknown; error: unknown }>
    upsert: (update: AdLeadTrackingUpdate) => PromiseLike<{ error: unknown }>
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function isAdLeadStatus(value: unknown): value is AdLeadStatus {
  return typeof value === 'string' && (AD_LEAD_STATUSES as readonly string[]).includes(value)
}

export function isAdLeadOwner(value: unknown): value is AdLeadOwner {
  return typeof value === 'string' && (AD_LEAD_OWNERS as readonly string[]).includes(value)
}

export function isSourceKey(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 500) return false
  const separator = value.indexOf(':')
  return separator > 0 && separator < value.length - 1 && value.trim() === value
}

export function trackingBySourceKey(rows: unknown): Record<string, AdLeadTracking> {
  if (!Array.isArray(rows)) return {}

  return rows.reduce<Record<string, AdLeadTracking>>((tracking, row) => {
    if (!isRecord(row) || !isSourceKey(row.source_key) || !isAdLeadStatus(row.status) || !isAdLeadOwner(row.owner)) {
      return tracking
    }
    tracking[row.source_key] = { status: row.status, owner: row.owner }
    return tracking
  }, {})
}

export async function loadAdLeadTracking(client: TrackingClient = createSupabaseAdmin() as unknown as TrackingClient) {
  const { data, error } = await client.from('ad_lead_tracking').select('source_key, status, owner')
  if (error) throw new Error('ad_lead_tracking_unavailable')
  return trackingBySourceKey(data)
}

export async function upsertAdLeadTracking(
  update: AdLeadTrackingUpdate,
  client: TrackingClient = createSupabaseAdmin() as unknown as TrackingClient,
) {
  const { error } = await client.from('ad_lead_tracking').upsert(update)
  if (error) throw new Error('ad_lead_tracking_unavailable')
}
