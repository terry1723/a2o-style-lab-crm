import type { VercelRequest, VercelResponse } from '@vercel/node'
import { readAppsScriptAdLeads, type SourceLeadResponse } from '../ad-leads.js'
import {
  claimAdLeadOutboxBatch,
  acquireAdLeadSyncLease,
  completeAdLeadOutbox,
  failAdLeadOutbox,
  importAdLeadSourceRows,
  startAdLeadSyncRun,
  finishAdLeadSyncRun,
  loadCanonicalAdLead,
  releaseAdLeadSyncLease,
  type CanonicalImportSummary,
  type CanonicalLeadSnapshot,
  type OutboxFailureDecision,
  type SlackSyncOutboxRow,
  classifyOutboxFailure,
  type SyncFailure,
} from '../_lib/adLeadCanonical.js'
import { createConfiguredSlackLeadPipeline } from '../_lib/slackLeadPipeline.js'
import type { AdLeadSourceRow } from '../../src/features/ad-leads/adLeadService.js'

type RequestLike = {
  method?: string
  headers?: Record<string, string | string[] | undefined>
}

type ResponseLike = {
  status: (code: number) => ResponseLike
  json: (body: unknown) => unknown
}

type SyncRunSummary = CanonicalImportSummary & {
  unavailableSources: string[]
  status: 'completed' | 'failed'
  errorCode?: string
}

type Dependencies = {
  cronSecret?: () => string | undefined
  readSourceLeads?: () => Promise<SourceLeadResponse>
  importRows?: (rows: AdLeadSourceRow[]) => Promise<CanonicalImportSummary>
  startRun?: () => Promise<string>
  finishRun?: (runId: string, summary: SyncRunSummary) => Promise<void>
  claimOutboxBatch?: (limit: number, workerId: string) => Promise<SlackSyncOutboxRow[]>
  acquireLease?: (workerId: string, leaseSeconds?: number) => Promise<boolean>
  releaseLease?: (workerId: string) => Promise<void>
  loadLead?: (leadId: string) => Promise<CanonicalLeadSnapshot | null>
  syncLead?: (lead: CanonicalLeadSnapshot) => Promise<string>
  completeOutbox?: (row: SlackSyncOutboxRow, itemId: string, workerId: string, syncedVersion: number) => Promise<void>
  failOutbox?: (row: SlackSyncOutboxRow, decision: OutboxFailureDecision, failure: SyncFailure, workerId: string) => Promise<void>
  batchSize?: () => number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function headerValue(headers: RequestLike['headers'], key: string): string | undefined {
  const value = headers?.[key] ?? headers?.[key.toLowerCase()]
  return Array.isArray(value) ? value[0] : value
}

function errorCode(error: unknown): string {
  return isRecord(error) && typeof error.code === 'string' ? error.code : error instanceof Error ? error.message : 'network_error'
}

function syncFailure(error: unknown): SyncFailure {
  const code = errorCode(error)
  return {
    code: code || 'network_error',
    ...(isRecord(error) && typeof error.retryAfterSeconds === 'number' ? { retryAfterSeconds: error.retryAfterSeconds } : {}),
  }
}

function defaultBatchSize(): number {
  const configured = Number(process.env.AD_LEAD_SYNC_BATCH_SIZE ?? 25)
  return Number.isFinite(configured) ? Math.max(1, Math.min(50, configured)) : 25
}

export function createAdLeadSyncCronHandler(dependencies: Dependencies = {}) {
  const cronSecret = dependencies.cronSecret ?? (() => process.env.CRON_SECRET)
  const readSourceLeads = dependencies.readSourceLeads ?? readAppsScriptAdLeads
  const importRows = dependencies.importRows ?? importAdLeadSourceRows
  const claimOutboxBatch = dependencies.claimOutboxBatch ?? claimAdLeadOutboxBatch
  const acquireLease = dependencies.acquireLease ?? acquireAdLeadSyncLease
  const releaseLease = dependencies.releaseLease ?? releaseAdLeadSyncLease
  const loadLead = dependencies.loadLead ?? loadCanonicalAdLead
  let slackPipeline: ReturnType<typeof createConfiguredSlackLeadPipeline> | null = null
  const syncLead = dependencies.syncLead ?? (async (lead: CanonicalLeadSnapshot) => {
    slackPipeline ??= createConfiguredSlackLeadPipeline()
    return slackPipeline.upsertLead(lead)
  })
  const completeOutbox = dependencies.completeOutbox ?? completeAdLeadOutbox
  const failOutbox = dependencies.failOutbox ?? failAdLeadOutbox

  return async (request: RequestLike, response: ResponseLike) => {
    if (request.method !== 'GET') {
      response.status(405).json({ error: 'method_not_allowed' })
      return
    }
    const expectedSecret = cronSecret()
    const authorization = headerValue(request.headers, 'authorization')
    if (!expectedSecret || authorization !== `Bearer ${expectedSecret}`) {
      response.status(401).json({ error: 'unauthorized' })
      return
    }

    const workerId = `vercel-cron-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    let leaseAcquired = false
    try {
      leaseAcquired = await acquireLease(workerId, 300)
    } catch {
      response.status(503).json({ error: 'lead_sync_unavailable', errorCode: 'ad_lead_sync_lease_unavailable' })
      return
    }
    if (!leaseAcquired) {
      response.status(202).json({ ok: true, skipped: 'lease_held' })
      return
    }

    try {
      const startRun = dependencies.startRun ?? startAdLeadSyncRun
      const finishRun = dependencies.finishRun ?? finishAdLeadSyncRun
      let runId: string
      try {
        runId = await startRun()
      } catch {
        response.status(503).json({ error: 'lead_sync_unavailable', errorCode: 'ad_lead_sync_runs_unavailable' })
        return
      }
      let source: SourceLeadResponse = { leads: [], unavailableSources: [] }
      let imported: CanonicalImportSummary = { imported: 0, deduplicated: 0, invalidPhones: 0 }
      let sourceError: string | undefined

      try {
        source = await readSourceLeads()
        imported = await importRows(source.leads)
      } catch (error) {
        sourceError = errorCode(error)
      }

      let claimed: SlackSyncOutboxRow[] = []
      let claimError: string | undefined
      try {
        claimed = await claimOutboxBatch(dependencies.batchSize?.() ?? defaultBatchSize(), workerId)
      } catch (error) {
        claimError = errorCode(error)
      }

      let synced = 0
      let failed = 0
      let deadLettered = 0
      const recordFailure = async (row: SlackSyncOutboxRow, decision: OutboxFailureDecision, failure: SyncFailure) => {
        try {
          await failOutbox(row, decision, failure, workerId)
          return true
        } catch (error) {
          // A stale worker must not overwrite the reclaimed worker's result.
          if (errorCode(error) === 'slack_sync_outbox_unavailable' || errorCode(error) === 'stale_outbox_lease') return false
          throw error
        }
      }
      for (const row of claimed) {
        try {
          const lead = await loadLead(row.lead_id)
          if (!lead) {
            const failure = { code: 'lead_not_found' }
            const decision = classifyOutboxFailure(failure, row.attempt_count)
            if (await recordFailure(row, decision, failure)) {
              if (decision.status === 'dead_letter') deadLettered += 1
              else failed += 1
            }
            continue
          }
          const itemId = await syncLead(lead)
          // Completion atomically records the item id and only succeeds for
          // the worker that holds this row's lease.
          await completeOutbox(row, itemId, workerId, lead.syncVersion)
          synced += 1
        } catch (error) {
          const failure = syncFailure(error)
          const decision = classifyOutboxFailure(failure, row.attempt_count)
          if (await recordFailure(row, decision, failure)) {
            if (decision.status === 'dead_letter') deadLettered += 1
            else failed += 1
          }
        }
      }

      const summary: SyncRunSummary = {
        ...imported,
        unavailableSources: source.unavailableSources,
        status: sourceError || claimError ? 'failed' : 'completed',
        ...(sourceError || claimError ? { errorCode: sourceError ?? claimError } : {}),
      }
      await finishRun(runId, summary)

      if (sourceError || claimError) {
        response.status(503).json({ error: 'lead_sync_unavailable', ...summary, claimed: claimed.length, synced, failed, deadLettered })
        return
      }
      response.status(200).json({
        ok: true,
        ...imported,
        unavailableSources: source.unavailableSources,
        claimed: claimed.length,
        synced,
        failed,
        deadLettered,
      })
    } finally {
      await releaseLease(workerId).catch(() => undefined)
    }
  }
}

const handler = createAdLeadSyncCronHandler()

export default async function adLeadSyncCron(request: VercelRequest, response: VercelResponse) {
  await handler(request, response)
}
