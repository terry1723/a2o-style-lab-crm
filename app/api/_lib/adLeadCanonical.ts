import { createHash } from 'node:crypto'
import {
  buildCanonicalLeads,
  normalizePhone,
  sourceMetadata,
  type CanonicalLeadDraft,
  type SubmissionDraft,
} from '../../src/features/ad-leads/adLeadCanonical.js'
import {
  AD_LEAD_OWNERS,
  AD_LEAD_APPOINTMENT_SLOTS,
  AD_LEAD_STATUSES,
  submittedAtTime,
  sourceKey,
  type AdLead,
  type AdLeadAppointment,
  type AdLeadSourceRow,
  type AdLeadTracking,
  type AdLeadOwner,
  type AdLeadStatus,
  type AdLeadAppointmentSlot,
} from '../../src/features/ad-leads/adLeadService.js'
import { createSupabaseAdmin } from './supabaseAdmin.js'

type SupabaseResult = { data: unknown; error: unknown; count?: number }

type SupabaseQuery = {
  select: (columns: string, options?: Record<string, unknown>) => SupabaseQuery
  order: (column: string, options?: Record<string, unknown>) => SupabaseQuery
  eq: (column: string, value: unknown) => SupabaseQuery
  limit: (count: number) => SupabaseQuery
  maybeSingle: () => PromiseLike<SupabaseResult>
  insert: (values: Record<string, unknown>) => SupabaseQuery
  update: (values: Record<string, unknown>) => SupabaseQuery
  then?: unknown
}

export type CanonicalSupabaseClient = {
  from: (table: string) => SupabaseQuery & PromiseLike<SupabaseResult>
  rpc: (functionName: string, args: Record<string, unknown>) => PromiseLike<SupabaseResult>
}

export type CanonicalImportSummary = {
  imported: number
  deduplicated: number
  invalidPhones: number
}

export type CanonicalLeadSnapshot = AdLead & {
  /** Stable Supabase row id used by server-side writes; UI sourceKey remains the public lead key. */
  canonicalId: string
  normalizedPhone: string
  appointmentAt: string | null
  slackListItemId: string | null
  syncVersion: number
}

export type SlackSyncOutboxRow = {
  id: string
  lead_id: string
  target_version: number
  attempt_count: number
  locked_by: string
}

export type SyncFailure = {
  code: string
  retryAfterSeconds?: number
}

export type OutboxFailureDecision = {
  status: 'failed' | 'dead_letter'
  nextAttemptAt: string | null
}

const RETRYABLE_CODES = new Set(['ratelimited', 'request_timeout', 'service_unavailable', 'internal_error', 'network_error', 'timeout'])
const MAX_ATTEMPTS = 8

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function queryResult(value: unknown): PromiseLike<SupabaseResult> {
  return value as PromiseLike<SupabaseResult>
}

function ensureNoError(error: unknown, errorCode: string) {
  if (!error) return
  if (isRecord(error) && error.message === 'stale_outbox_lease') throw new Error('stale_outbox_lease')
  throw new Error(errorCode)
}

function parsedTimestamp(value: unknown): string | null {
  if (typeof value !== 'string' || !value || Number.isNaN(Date.parse(value))) return null
  return value
}

function validStatus(value: unknown): value is AdLeadStatus {
  return typeof value === 'string' && (AD_LEAD_STATUSES as readonly string[]).includes(value)
}

function validOwner(value: unknown): value is AdLeadOwner {
  return typeof value === 'string' && (AD_LEAD_OWNERS as readonly string[]).includes(value)
}

function validAppointmentSlot(value: unknown): value is AdLeadAppointmentSlot {
  return typeof value === 'string' && (AD_LEAD_APPOINTMENT_SLOTS as readonly string[]).includes(value)
}

function isImportableSourceRow(row: AdLeadSourceRow): boolean {
  return [row.source, row.id, row.submittedAt, row.name, row.phone]
    .every((value) => typeof value === 'string' && value.trim().length > 0)
    && submittedAtTime(row.submittedAt) !== null
}

export function computePayloadChecksum(row: AdLeadSourceRow): string {
  const stable = JSON.stringify({
    source: row.source,
    id: row.id,
    submittedAt: row.submittedAt,
    name: row.name,
    phone: row.phone,
    tag: row.tag,
  })
  return createHash('sha256').update(stable).digest('hex')
}

export function buildSubmissionRpcArgs(row: AdLeadSourceRow): Record<string, unknown> {
  const metadata = sourceMetadata(row.id)
  const submittedAt = submittedAtTime(row.submittedAt)
  return {
    p_source_key: sourceKey(row.source, row.id),
    p_source_form: row.source.trim(),
    p_source_tag: row.tag.trim(),
    p_source_spreadsheet_id: metadata?.spreadsheetId ?? null,
    p_source_sheet_name: metadata?.sheetName ?? null,
    p_source_row_number: metadata?.rowNumber ?? null,
    p_submitted_name: row.name.trim(),
    p_submitted_phone: row.phone.trim(),
    p_normalized_phone: normalizePhone(row.phone),
    // Apps Script returns locale-formatted strings such as「2026/7/28 上午 1:30:31」;
    // send an unambiguous ISO value to the timestamptz RPC parameter.
    p_submitted_at: submittedAt === null ? row.submittedAt : new Date(submittedAt).toISOString(),
    p_payload_checksum: computePayloadChecksum(row),
    p_raw_payload: row,
  }
}

export function classifyOutboxFailure(
  failure: SyncFailure,
  attemptCount: number,
  now = new Date(),
): OutboxFailureDecision {
  if (!RETRYABLE_CODES.has(failure.code) || attemptCount >= MAX_ATTEMPTS) {
    return { status: 'dead_letter', nextAttemptAt: null }
  }
  const scheduledDelay = attemptCount <= 1
    ? 60
    : attemptCount === 2
      ? 5 * 60
      : attemptCount === 3
        ? 15 * 60
        : Math.min(6 * 60 * 60, 60 * 60 * 2 ** Math.max(0, attemptCount - 4))
  const delaySeconds = failure.retryAfterSeconds ?? scheduledDelay
  return {
    status: 'failed',
    nextAttemptAt: new Date(now.getTime() + delaySeconds * 1000).toISOString(),
  }
}

function canonicalLeadFromRow(row: unknown): CanonicalLeadSnapshot | null {
  if (!isRecord(row)) return null
  const canonicalId = typeof row.id === 'string' ? row.id : ''
  const normalized = typeof row.normalized_phone === 'string' ? row.normalized_phone : ''
  const submittedAt = parsedTimestamp(row.latest_submitted_at)
  const source = typeof row.latest_source === 'string' ? row.latest_source : ''
  const sourceKey = typeof row.latest_source_key === 'string' ? row.latest_source_key : ''
  const name = typeof row.name === 'string' ? row.name : ''
  const phone = typeof row.display_phone === 'string' ? row.display_phone : ''
  const tag = typeof row.latest_tag === 'string' ? row.latest_tag : ''
  const syncVersion = typeof row.sync_version === 'number' ? row.sync_version : Number(row.sync_version ?? 1)
  if (!canonicalId || !normalized || !submittedAt || !sourceKey || !name || !phone || !validStatus(row.current_status) || !validOwner(row.owner)) return null
  return {
    source,
    id: sourceKey,
    submittedAt,
    name,
    phone,
    tag,
    sourceKey,
    canonicalId,
    status: row.current_status,
    owner: row.owner,
    normalizedPhone: normalized,
    appointmentAt: typeof row.appointment_at === 'string' ? row.appointment_at : null,
    slackListItemId: typeof row.slack_list_item_id === 'string' ? row.slack_list_item_id : null,
    syncVersion: Number.isFinite(syncVersion) && syncVersion > 0 ? syncVersion : 1,
  }
}

function canonicalAppointmentForLead(lead: CanonicalLeadSnapshot): AdLeadAppointment | null {
  if (!lead.appointmentAt) return null
  const parsed = new Date(lead.appointmentAt)
  if (!Number.isFinite(parsed.getTime())) return null
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(parsed)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  const date = values.year && values.month && values.day
    ? `${values.year}-${values.month}-${values.day}`
    : null
  const time = values.hour && values.minute ? `${values.hour}:${values.minute}` : null
  if (!date || !time || !validAppointmentSlot(time)) return null
  return { sourceKey: lead.sourceKey, appointmentDate: date, appointmentTime: time }
}

export function createCanonicalLeadRepository(
  client: CanonicalSupabaseClient = createSupabaseAdmin() as unknown as CanonicalSupabaseClient,
) {
  return {
    async loadCanonicalAdLeads(): Promise<{ leads: AdLead[]; appointments: AdLeadAppointment[] }> {
      const query = client.from('ad_leads').select('id, normalized_phone, display_phone, name, current_status, owner, latest_source, latest_source_key, latest_tag, latest_submitted_at, appointment_at, slack_list_item_id, sync_version').order('latest_submitted_at', { ascending: false })
      const { data, error } = await queryResult(query)
      ensureNoError(error, 'ad_leads_unavailable')
      const leads = Array.isArray(data)
        ? data.map(canonicalLeadFromRow).filter((lead): lead is CanonicalLeadSnapshot => Boolean(lead))
        : []
      // The canonical row owns the appointment.  Do not key the calendar off
      // the historical submission key: a later submission with the same phone
      // must still display and reserve the existing appointment.
      const appointments = leads.flatMap((lead) => {
        const appointment = canonicalAppointmentForLead(lead)
        return appointment ? [appointment] : []
      })
      return { leads, appointments }
    },

    async importSourceRows(rows: AdLeadSourceRow[]): Promise<CanonicalImportSummary> {
      const built = buildCanonicalLeads(rows)
      const importableRows = rows.filter(isImportableSourceRow)
      let imported = 0
      for (const row of importableRows) {
        const { error } = await client.rpc('import_ad_lead_submission', buildSubmissionRpcArgs(row))
        ensureNoError(error, 'ad_lead_import_failed')
        imported += 1
      }
      const validPhoneSubmissions = built.submissions.filter((submission) => Boolean(submission.normalizedPhone)).length
      return {
        imported,
        deduplicated: Math.max(0, validPhoneSubmissions - built.leads.length),
        invalidPhones: built.submissions.filter((submission) => !submission.normalizedPhone).length,
      }
    },

    async updateCanonicalTracking(update: { source_key: string; status: AdLeadStatus; owner: AdLeadOwner }) {
      const { error } = await client.rpc('update_ad_lead_tracking', {
        p_source_key: update.source_key,
        p_status: update.status,
        p_owner: update.owner,
      })
      ensureNoError(error, 'ad_lead_tracking_unavailable')
    },

    async bookCanonicalAppointment(booking: { source_key: string; owner: AdLeadOwner; appointment_date: string; appointment_time: AdLeadAppointmentSlot }) {
      const { error } = await client.rpc('book_ad_lead_appointment', {
        p_source_key: booking.source_key,
        p_owner: booking.owner,
        p_appointment_date: booking.appointment_date,
        p_appointment_time: booking.appointment_time,
      })
      if (isRecord(error) && error.code === '23505') throw new Error('appointment_slot_taken')
      ensureNoError(error, 'ad_lead_appointments_unavailable')
    },

    async loadCanonicalLead(leadId: string): Promise<CanonicalLeadSnapshot | null> {
      const query = client.from('ad_leads').select('id, normalized_phone, display_phone, name, current_status, owner, latest_source, latest_source_key, latest_tag, latest_submitted_at, appointment_at, slack_list_item_id, sync_version').eq('id', leadId).maybeSingle()
      const { data, error } = await queryResult(query)
      ensureNoError(error, 'ad_leads_unavailable')
      return canonicalLeadFromRow(data)
    },

    async loadCanonicalLeadBySourceKey(sourceKeyValue: string): Promise<CanonicalLeadSnapshot | null> {
      const query = client.from('ad_lead_submissions').select('lead_id').eq('source_key', sourceKeyValue).maybeSingle()
      const { data, error } = await queryResult(query)
      ensureNoError(error, 'ad_lead_submissions_unavailable')
      if (!isRecord(data) || typeof data.lead_id !== 'string' || !data.lead_id) return null
      return this.loadCanonicalLead(data.lead_id)
    },

    async setSlackListItemId(leadId: string, itemId: string) {
      const query = client.from('ad_leads').update({ slack_list_item_id: itemId }).eq('id', leadId)
      const { error } = await queryResult(query)
      ensureNoError(error, 'ad_leads_unavailable')
    },

    async startSyncRun(): Promise<string> {
      const query = client.from('ad_lead_sync_runs')
        .insert({ status: 'running' })
        .select('id')
        .maybeSingle()
      const { data, error } = await queryResult(query)
      ensureNoError(error, 'ad_lead_sync_runs_unavailable')
      if (!isRecord(data) || typeof data.id !== 'string' || !data.id) throw new Error('ad_lead_sync_runs_unavailable')
      return data.id
    },

    async finishSyncRun(runId: string, summary: {
      status: 'completed' | 'failed'
      imported: number
      deduplicated: number
      invalidPhones: number
      unavailableSources: string[]
      errorCode?: string
    }) {
      const query = client.from('ad_lead_sync_runs').update({
        status: summary.status,
        finished_at: new Date().toISOString(),
        imported: summary.imported,
        deduplicated: summary.deduplicated,
        invalid_phones: summary.invalidPhones,
        unavailable_sources: summary.unavailableSources,
        error_code: summary.errorCode ?? null,
      }).eq('id', runId)
      const { error } = await queryResult(query)
      ensureNoError(error, 'ad_lead_sync_runs_unavailable')
    },

    async claimOutboxBatch(limit: number, workerId: string): Promise<SlackSyncOutboxRow[]> {
      const { data, error } = await client.rpc('claim_ad_lead_slack_outbox', {
        p_limit: Math.max(1, Math.min(limit, 50)),
        p_worker_id: workerId,
      })
      ensureNoError(error, 'slack_sync_outbox_unavailable')
      if (!Array.isArray(data)) return []
      return data.filter((row): row is SlackSyncOutboxRow => isRecord(row)
        && typeof row.id === 'string' && typeof row.lead_id === 'string'
        && Number.isFinite(Number(row.target_version)) && Number.isFinite(Number(row.attempt_count))
        && typeof row.locked_by === 'string')
        .map((row) => ({ id: row.id, lead_id: row.lead_id, target_version: Number(row.target_version), attempt_count: Number(row.attempt_count), locked_by: row.locked_by }))
    },

    async claimOutboxForLead(leadId: string, workerId: string): Promise<SlackSyncOutboxRow | null> {
      const { data, error } = await client.rpc('claim_ad_lead_slack_outbox_for_lead', {
        p_lead_id: leadId,
        p_worker_id: workerId,
      })
      ensureNoError(error, 'slack_sync_outbox_unavailable')
      if (!Array.isArray(data)) return null
      const row = data.find((candidate): candidate is Record<string, unknown> => isRecord(candidate))
      if (!row || typeof row.id !== 'string' || typeof row.lead_id !== 'string'
        || !Number.isFinite(Number(row.target_version)) || !Number.isFinite(Number(row.attempt_count))
        || typeof row.locked_by !== 'string') return null
      return {
        id: row.id,
        lead_id: row.lead_id,
        target_version: Number(row.target_version),
        attempt_count: Number(row.attempt_count),
        locked_by: row.locked_by,
      }
    },

    async completeOutbox(row: SlackSyncOutboxRow, itemId: string, workerId: string, syncedVersion: number) {
      const { error } = await client.rpc('mark_ad_lead_slack_synced', {
        p_outbox_id: row.id,
        p_lead_id: row.lead_id,
        p_worker_id: workerId,
        p_synced_version: syncedVersion,
        p_slack_list_item_id: itemId,
      })
      ensureNoError(error, 'slack_sync_outbox_unavailable')
    },

    async failOutbox(row: SlackSyncOutboxRow, decision: OutboxFailureDecision, failure: SyncFailure, workerId: string) {
      const { error } = await client.rpc('fail_ad_lead_slack_outbox', {
        p_outbox_id: row.id,
        p_worker_id: workerId,
        p_status: decision.status,
        p_next_attempt_at: decision.nextAttemptAt,
        p_error_code: failure.code,
        p_error_message: failure.code,
      })
      ensureNoError(error, 'slack_sync_outbox_unavailable')
    },

    async acquireSyncLease(workerId: string, leaseSeconds = 300): Promise<boolean> {
      const { data, error } = await client.rpc('acquire_ad_lead_sync_lease', {
        p_name: 'ad-lead-sync',
        p_worker_id: workerId,
        p_lease_seconds: leaseSeconds,
      })
      ensureNoError(error, 'ad_lead_sync_lease_unavailable')
      return data === true || (Array.isArray(data) && data[0] === true)
    },

    async releaseSyncLease(workerId: string): Promise<void> {
      const { error } = await client.rpc('release_ad_lead_sync_lease', {
        p_name: 'ad-lead-sync',
        p_worker_id: workerId,
      })
      ensureNoError(error, 'ad_lead_sync_lease_unavailable')
    },

    async requeueOutbox(outboxId?: string): Promise<number> {
      const { data, error } = await client.rpc('requeue_ad_lead_slack_outbox', {
        p_outbox_id: outboxId ?? null,
      })
      ensureNoError(error, 'slack_sync_outbox_unavailable')
      if (typeof data === 'number') return data
      if (Array.isArray(data) && typeof data[0] === 'number') return data[0]
      if (isRecord(data) && typeof data.count === 'number') return data.count
      return 0
    },

    async loadSyncHealth() {
      const statuses = ['pending', 'processing', 'failed', 'dead_letter'] as const
      const counts = await Promise.all(statuses.map(async (status) => {
        const query = client.from('slack_sync_outbox').select('id', { count: 'exact', head: true }).eq('status', status)
        const result = await queryResult(query)
        ensureNoError(result.error, 'slack_sync_outbox_unavailable')
        return [status, Number((result as { count?: number }).count ?? 0)] as const
      }))
      const latestQuery = client.from('ad_lead_sync_runs')
        .select('id, started_at, finished_at, status, imported, deduplicated, invalid_phones, unavailable_sources, error_code')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      const latestResult = await queryResult(latestQuery)
      ensureNoError(latestResult.error, 'ad_lead_sync_runs_unavailable')
      const latestSlackQuery = client.from('ad_leads')
        .select('slack_last_synced_at')
        .order('slack_last_synced_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      const latestSlackResult = await queryResult(latestSlackQuery)
      ensureNoError(latestSlackResult.error, 'ad_leads_unavailable')
      return {
        outbox: Object.fromEntries(counts),
        lastRun: isRecord(latestResult.data) ? latestResult.data : null,
        lastSlackSyncAt: isRecord(latestSlackResult.data) && typeof latestSlackResult.data.slack_last_synced_at === 'string'
          ? latestSlackResult.data.slack_last_synced_at
          : null,
      }
    },
  }
}

function getCanonicalLeadRepository() {
  return createCanonicalLeadRepository()
}

export async function loadCanonicalAdLeads() {
  return getCanonicalLeadRepository().loadCanonicalAdLeads()
}

export async function importAdLeadSourceRows(rows: AdLeadSourceRow[]) {
  return getCanonicalLeadRepository().importSourceRows(rows)
}

export async function updateCanonicalAdLeadTracking(update: { source_key: string; status: AdLeadStatus; owner: AdLeadOwner }) {
  return getCanonicalLeadRepository().updateCanonicalTracking(update)
}

export async function bookCanonicalAdLeadAppointment(booking: { source_key: string; owner: AdLeadOwner; appointment_date: string; appointment_time: AdLeadAppointmentSlot }) {
  return getCanonicalLeadRepository().bookCanonicalAppointment(booking)
}

export async function claimAdLeadOutboxBatch(limit: number, workerId: string) {
  return getCanonicalLeadRepository().claimOutboxBatch(limit, workerId)
}

export async function claimAdLeadOutboxForLead(leadId: string, workerId: string) {
  return getCanonicalLeadRepository().claimOutboxForLead(leadId, workerId)
}

export async function loadCanonicalAdLead(leadId: string) {
  return getCanonicalLeadRepository().loadCanonicalLead(leadId)
}

export async function loadCanonicalAdLeadBySourceKey(sourceKeyValue: string) {
  return getCanonicalLeadRepository().loadCanonicalLeadBySourceKey(sourceKeyValue)
}

export async function completeAdLeadOutbox(row: SlackSyncOutboxRow, itemId: string, workerId: string, syncedVersion: number) {
  return getCanonicalLeadRepository().completeOutbox(row, itemId, workerId, syncedVersion)
}

export async function failAdLeadOutbox(row: SlackSyncOutboxRow, decision: OutboxFailureDecision, failure: SyncFailure, workerId: string) {
  return getCanonicalLeadRepository().failOutbox(row, decision, failure, workerId)
}

export async function acquireAdLeadSyncLease(workerId: string, leaseSeconds = 300) {
  return getCanonicalLeadRepository().acquireSyncLease(workerId, leaseSeconds)
}

export async function releaseAdLeadSyncLease(workerId: string) {
  return getCanonicalLeadRepository().releaseSyncLease(workerId)
}

export async function requeueAdLeadOutbox(outboxId?: string) {
  return getCanonicalLeadRepository().requeueOutbox(outboxId)
}

export async function setAdLeadSlackListItemId(leadId: string, itemId: string) {
  return getCanonicalLeadRepository().setSlackListItemId(leadId, itemId)
}

export async function startAdLeadSyncRun() {
  return getCanonicalLeadRepository().startSyncRun()
}

export async function finishAdLeadSyncRun(runId: string, summary: {
  status: 'completed' | 'failed'
  imported: number
  deduplicated: number
  invalidPhones: number
  unavailableSources: string[]
  errorCode?: string
}) {
  return getCanonicalLeadRepository().finishSyncRun(runId, summary)
}

export async function loadAdLeadSyncHealth() {
  return getCanonicalLeadRepository().loadSyncHealth()
}
