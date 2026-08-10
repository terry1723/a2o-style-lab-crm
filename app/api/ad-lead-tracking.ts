import type { VercelRequest, VercelResponse } from '@vercel/node'
import { isAdLeadOwner, isAdLeadStatus, isSourceKey, upsertAdLeadTracking, type AdLeadTrackingUpdate } from './_lib/adLeadTracking.js'
import {
  bookAdLeadAppointment,
  isAdLeadAppointmentDate,
  isAdLeadAppointmentSlot,
  type AdLeadAppointmentBooking,
} from './_lib/adLeadAppointments.js'
import {
  claimAdLeadOutboxForLead,
  bookCanonicalAdLeadAppointment,
  classifyOutboxFailure,
  completeAdLeadOutbox,
  failAdLeadOutbox,
  loadCanonicalAdLeadBySourceKey,
  type CanonicalLeadSnapshot,
  type OutboxFailureDecision,
  type SlackSyncOutboxRow,
  type SyncFailure,
  updateCanonicalAdLeadTracking,
} from './_lib/adLeadCanonical.js'
import { createConfiguredSlackLeadPipeline } from './_lib/slackLeadPipeline.js'

type RequestLike = { method?: string; body?: unknown }
type ResponseLike = {
  status: (code: number) => ResponseLike
  json: (body: unknown) => unknown
  setHeader?: (name: string, value: string) => unknown
}

type Dependencies = {
  upsertTracking: (update: AdLeadTrackingUpdate) => Promise<void>
  bookAppointment?: (booking: AdLeadAppointmentBooking) => Promise<void>
  upsertCanonicalTracking?: (update: AdLeadTrackingUpdate) => Promise<void>
  bookCanonicalAppointment?: (booking: AdLeadAppointmentBooking) => Promise<void>
  syncCanonicalLead?: (sourceKey: string) => Promise<void>
  canonicalEnabled?: () => boolean
}

type CanonicalSlackSyncDependencies = {
  loadLeadBySourceKey?: (sourceKey: string) => Promise<CanonicalLeadSnapshot | null>
  claimOutbox?: (leadId: string, workerId: string) => Promise<SlackSyncOutboxRow | null>
  syncLead?: (lead: CanonicalLeadSnapshot) => Promise<string>
  completeOutbox?: (row: SlackSyncOutboxRow, itemId: string, workerId: string, syncedVersion: number) => Promise<void>
  failOutbox?: (row: SlackSyncOutboxRow, decision: OutboxFailureDecision, failure: SyncFailure, workerId: string) => Promise<void>
  workerId?: () => string
}

function parseBody(body: unknown): Record<string, unknown> {
  if (typeof body === 'string') {
    try {
      return parseBody(JSON.parse(body))
    } catch {
      return {}
    }
  }
  return body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {}
}

export function createAdLeadTrackingHandler({
  upsertTracking,
  bookAppointment,
  upsertCanonicalTracking,
  bookCanonicalAppointment,
  syncCanonicalLead,
  canonicalEnabled = () => false,
}: Dependencies) {
  return async (request: RequestLike, response: ResponseLike) => {
    response.setHeader?.('Cache-Control', 'no-store')
    if (request.method !== 'PATCH') {
      response.status(405).json({ error: 'method_not_allowed' })
      return
    }

    const { sourceKey, status, owner, appointmentDate, appointmentTime } = parseBody(request.body)
    const includesAppointment = appointmentDate !== undefined || appointmentTime !== undefined
    if (!isSourceKey(sourceKey) || !isAdLeadStatus(status) || !isAdLeadOwner(owner)
      || (includesAppointment && (!isAdLeadAppointmentDate(appointmentDate) || !isAdLeadAppointmentSlot(appointmentTime)))) {
      response.status(400).json({ error: 'invalid_request' })
      return
    }

    try {
      const useCanonical = canonicalEnabled()
      if (includesAppointment) {
        const book = useCanonical ? bookCanonicalAppointment : bookAppointment
        if (!book) throw new Error('ad_lead_appointments_unavailable')
        await book({
          source_key: sourceKey,
          owner,
          appointment_date: appointmentDate as string,
          appointment_time: appointmentTime as AdLeadAppointmentBooking['appointment_time'],
        })
        if (useCanonical && syncCanonicalLead) await syncCanonicalLead(sourceKey).catch(() => undefined)
        response.status(200).json({ sourceKey, status: '已預約', owner, appointmentDate, appointmentTime })
        return
      }

      const upsert = useCanonical ? upsertCanonicalTracking : upsertTracking
      if (!upsert) throw new Error('ad_lead_tracking_unavailable')
      await upsert({ source_key: sourceKey, status, owner })
      if (useCanonical && syncCanonicalLead) await syncCanonicalLead(sourceKey).catch(() => undefined)
      response.status(200).json({ sourceKey, status, owner })
    } catch (error) {
      if (error instanceof Error && error.message === 'appointment_slot_taken') {
        response.status(409).json({ error: 'appointment_slot_taken' })
        return
      }
      response.status(503).json({ error: 'tracking_unavailable' })
    }
  }
}

function errorCode(error: unknown): string {
  return error && typeof error === 'object' && !Array.isArray(error) && typeof (error as Record<string, unknown>).code === 'string'
    ? (error as Record<string, string>).code
    : error instanceof Error ? error.message : 'network_error'
}

function syncFailure(error: unknown): SyncFailure {
  return {
    code: errorCode(error),
    ...(error && typeof error === 'object' && !Array.isArray(error) && typeof (error as Record<string, unknown>).retryAfterSeconds === 'number'
      ? { retryAfterSeconds: (error as Record<string, number>).retryAfterSeconds }
      : {}),
  }
}

export function createCanonicalLeadSlackSync(dependencies: CanonicalSlackSyncDependencies = {}) {
  const loadLeadBySourceKey = dependencies.loadLeadBySourceKey ?? loadCanonicalAdLeadBySourceKey
  const claimOutbox = dependencies.claimOutbox ?? claimAdLeadOutboxForLead
  const completeOutbox = dependencies.completeOutbox ?? completeAdLeadOutbox
  const failOutbox = dependencies.failOutbox ?? failAdLeadOutbox
  const workerIdFactory = dependencies.workerId ?? (() => `crm-sync-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
  let slackPipeline: ReturnType<typeof createConfiguredSlackLeadPipeline> | null = null
  const syncLead = dependencies.syncLead ?? (async (lead: CanonicalLeadSnapshot) => {
    slackPipeline ??= createConfiguredSlackLeadPipeline()
    return slackPipeline.upsertLead(lead)
  })

  return async (sourceKey: string) => {
    const workerId = workerIdFactory()
    const lead = await loadLeadBySourceKey(sourceKey)
    if (!lead) return
    const row = await claimOutbox(lead.canonicalId, workerId)
    if (!row) return
    try {
      const itemId = await syncLead(lead)
      await completeOutbox(row, itemId, workerId, lead.syncVersion)
    } catch (error) {
      const failure = syncFailure(error)
      const decision = classifyOutboxFailure(failure, row.attempt_count)
      await failOutbox(row, decision, failure, workerId)
    }
  }
}

const syncCanonicalLead = createCanonicalLeadSlackSync()

const handler = createAdLeadTrackingHandler({
  upsertTracking: upsertAdLeadTracking,
  bookAppointment: bookAdLeadAppointment,
  upsertCanonicalTracking: updateCanonicalAdLeadTracking,
  bookCanonicalAppointment: bookCanonicalAdLeadAppointment,
  syncCanonicalLead,
  canonicalEnabled: () => process.env.AD_LEAD_CANONICAL_MODE === 'canonical',
})

export default async function adLeadTracking(request: VercelRequest, response: VercelResponse) {
  await handler(request, response)
}
