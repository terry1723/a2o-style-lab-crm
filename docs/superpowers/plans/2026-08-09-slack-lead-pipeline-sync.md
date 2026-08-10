# Slack Lead Pipeline Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Supabase the canonical source for A2O advertising leads and synchronise one deduplicated Lead per normalized phone number to Slack's A2O Lead Pipeline with a five-minute import SLA, immediate CRM-triggered updates, retries, and preserved submission history.

**Architecture:** Keep the existing Google Apps Script read endpoint as the four-source input. A Vercel Cron imports rows into canonical `ad_leads` and append-only `ad_lead_submissions`, then coalesces Slack-facing changes into `slack_sync_outbox`. A server-only worker claims outbox rows and calls Slack Lists create/update APIs; CRM status/owner/appointment writes use the same outbox transaction. Existing tracking and appointment tables remain during migration and are mirrored for compatibility until cutover.

**Tech Stack:** Vite + React + TypeScript, Vercel Functions/Cron, Supabase Postgres via `@supabase/supabase-js`, Slack Web API Lists methods, Vitest.

---

### Task 1: Add tested canonical lead primitives

**Files:**
- Create: `app/src/features/ad-leads/adLeadCanonical.ts`
- Create: `app/src/features/ad-leads/adLeadCanonical.test.ts`

- [ ] **Step 1: Write failing tests for phone normalization and deduplication**

```ts
import { describe, expect, it } from 'vitest'
import { buildCanonicalLeads, normalizePhone, sourceMetadata } from './adLeadCanonical'

describe('canonical advertising leads', () => {
  it('normalizes equivalent Hong Kong phone formats to one key', () => {
    expect(normalizePhone('9869 0911')).toBe('85298690911')
    expect(normalizePhone('+85298690911')).toBe('85298690911')
    expect(normalizePhone('p:+852-9869-0911')).toBe('85298690911')
  })

  it('keeps every submission while returning one latest-first canonical lead per phone', () => {
    const result = buildCanonicalLeads([
      { source: 'A2O Website', id: 'sheet:2', submittedAt: '2026-08-09T09:00:00+08:00', name: 'Old', phone: '98690911', tag: 'old' },
      { source: 'Men New Form', id: 'sheet:8', submittedAt: '2026-08-09T10:00:00+08:00', name: 'New', phone: '+85298690911', tag: 'new' },
      { source: 'Meta', id: 'lead-2', submittedAt: '2026-08-09T11:00:00+08:00', name: 'Other', phone: '91234567', tag: '' },
    ])
    expect(result.leads).toHaveLength(2)
    expect(result.leads[0]).toMatchObject({ normalizedPhone: '85298690911', name: 'New', latestSource: 'Men New Form', latestTag: 'new' })
    expect(result.submissions).toHaveLength(3)
  })

  it('extracts source sheet metadata from an Apps Script row id', () => {
    expect(sourceMetadata('1sheet:style lab new form:42')).toEqual({ spreadsheetId: '1sheet', sheetName: 'style lab new form', rowNumber: 42 })
  })
})
```

- [ ] **Step 2: Run the focused test and verify it fails for missing exports**

Run: `cd app && npm test -- src/features/ad-leads/adLeadCanonical.test.ts`

Expected: FAIL because `adLeadCanonical.ts` does not yet exist.

- [ ] **Step 3: Implement the minimal canonical primitives**

Implement `normalizePhone`, `sourceMetadata`, and `buildCanonicalLeads` with these contracts:

```ts
export function normalizePhone(input: string): string | null
export function sourceMetadata(id: string): { spreadsheetId: string; sheetName: string; rowNumber: number } | null
export function buildCanonicalLeads(rows: AdLeadSourceRow[]): {
  leads: CanonicalLeadDraft[]
  submissions: SubmissionDraft[]
}
```

`normalizePhone` must remove `p:`/`tel:` prefixes, spaces, brackets and hyphens; normalize `+852` and local eight-digit Hong Kong numbers to `852XXXXXXXX`; reject URLs, invalid lengths, and empty values by returning `null`. `buildCanonicalLeads` must sort by parsed submission time, group only valid equal normalized phones, retain all submissions, and choose the latest non-empty name/source/tag without inventing values.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `cd app && npm test -- src/features/ad-leads/adLeadCanonical.test.ts`

Expected: PASS.

### Task 2: Create the additive Supabase canonical/outbox migration

**Files:**
- Create: `app/supabase/migrations/20260809_create_ad_lead_canonical_sync.sql`

- [ ] **Step 1: Add the migration SQL**

Create additive tables with RLS enabled and no public grants:

```sql
create table if not exists public.ad_leads (... normalized_phone text unique not null, ...);
create table if not exists public.ad_lead_submissions (... source_key text unique not null, lead_id uuid not null references public.ad_leads(id));
create table if not exists public.slack_sync_outbox (... lead_id uuid not null references public.ad_leads(id), ...);
```

The concrete migration must include the four statuses and five owners as checks, `sync_version`, `slack_list_item_id`, submission provenance/checksum, outbox status/attempt/lease fields, indexes for pending work, and a partial unique index allowing at most one pending/processing `lead_upsert` per lead. Enable RLS and revoke `anon`/`authenticated` access; grant only `service_role` table access. Do not alter or drop `ad_lead_tracking`, `ad_lead_appointments`, CRM tables, or auth tables.

- [ ] **Step 2: Validate SQL statically**

Run: `rg -n "drop table|truncate|grant .*anon|grant .*authenticated|security definer|ad_lead_tracking|ad_lead_appointments" app/supabase/migrations/20260809_create_ad_lead_canonical_sync.sql`

Expected: no destructive statements, no public data grants, and only non-destructive references to legacy tables.

### Task 3: Implement canonical Supabase repository and outbox coalescing

**Files:**
- Create: `app/api/_lib/adLeadCanonical.ts`
- Create: `app/api/_lib/adLeadCanonical.test.ts`
- Modify: `app/api/_lib/adLeadTracking.ts`
- Modify: `app/api/_lib/adLeadAppointments.ts`

- [ ] **Step 1: Write failing repository tests**

Test that a duplicate source row uses `source_key` idempotently, a second phone-equivalent row updates latest fields without changing existing status/owner/appointment, and a CRM update creates one coalesced outbox row with the latest `target_version`.

```ts
it('coalesces a lead outbox row to the newest canonical version', async () => {
  const repository = createCanonicalLeadRepository(fakeSupabaseClient())
  await repository.enqueueSlackSync({ leadId: 'lead-1', targetVersion: 2 })
  await repository.enqueueSlackSync({ leadId: 'lead-1', targetVersion: 3 })
  expect(repository.pendingWrites()).toEqual([{ lead_id: 'lead-1', target_version: 3 }])
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `cd app && npm test -- api/_lib/adLeadCanonical.test.ts`

Expected: FAIL because the repository and coalescing implementation do not exist.

- [ ] **Step 3: Implement canonical repository methods**

Expose tested server-only functions:

```ts
loadCanonicalAdLeads(): Promise<{ leads: AdLead[]; appointments: AdLeadAppointment[] }>
importSourceRows(rows: AdLeadSourceRow[]): Promise<ImportSummary>
updateCanonicalTracking(update: AdLeadTrackingUpdate): Promise<void>
bookCanonicalAppointment(booking: AdLeadAppointmentBooking): Promise<void>
claimOutboxBatch(limit: number, workerId: string): Promise<OutboxRow[]>
completeOutbox(id: string, leadId: string, syncedVersion: number): Promise<void>
failOutbox(id: string, error: SyncError): Promise<void>
```

Use server `createSupabaseAdmin`, parameterized `.upsert(..., { onConflict: ... })`, and database transactions/RPCs where multiple writes must be atomic. Keep legacy tracking/appointment writes mirrored until cutover; canonical rows remain the source returned by the lead API when canonical mode is enabled.

- [ ] **Step 4: Update status and appointment repositories**

Change `upsertAdLeadTracking` and booking flow to update canonical Lead plus outbox in one server operation, while preserving current legacy table writes for compatibility. Keep existing request validation and `appointment_slot_taken` behavior.

- [ ] **Step 5: Run repository and existing ad-lead tests**

Run: `cd app && npm test -- api/_lib/adLeadCanonical.test.ts api/_lib/adLeadTracking.test.ts api/_lib/adLeadAppointments.test.ts api/ad-leads.test.ts`

Expected: PASS.

### Task 4: Build the Slack Lists adapter with typed payload mapping

**Files:**
- Create: `app/api/_lib/slackLeadPipeline.ts`
- Create: `app/api/_lib/slackLeadPipeline.test.ts`

- [ ] **Step 1: Write failing payload and retry tests**

```ts
it('builds one Slack cell per configured column without exposing secrets', () => {
  const payload = buildSlackLeadFields(sampleLead, testConfig)
  expect(payload).toEqual(expect.arrayContaining([
    expect.objectContaining({ column_id: 'title-col', rich_text: expect.any(Array) }),
    expect.objectContaining({ column_id: 'status-col', select: ['status-whatsapp'] }),
    expect.objectContaining({ column_id: 'owner-col', user: ['U_RYAN'] }),
  ]))
  expect(JSON.stringify(payload)).not.toContain('xoxb-')
})

it('uses Retry-After for Slack 429 errors', async () => {
  const wait = vi.fn().mockResolvedValue(undefined)
  const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ ok: false, error: 'ratelimited' }), { status: 429, headers: { 'Retry-After': '7' } }))
  await expect(callSlackApi('slackLists.items.list', {}, { fetcher, wait, token: 'test' })).rejects.toMatchObject({ code: 'ratelimited', retryAfterSeconds: 7 })
  expect(wait).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `cd app && npm test -- api/_lib/slackLeadPipeline.test.ts`

Expected: FAIL because the adapter does not exist.

- [ ] **Step 3: Implement the Slack API adapter**

Use `POST https://slack.com/api/slackLists.items.list`, `.create`, and `.update` with `Authorization: Bearer ${SLACK_BOT_TOKEN}` and JSON bodies. Parse Slack `{ ok: false, error }` as typed errors. Read config only from environment:

```ts
type SlackLeadPipelineConfig = {
  listId: string
  columns: Record<string, string>
  statusOptions: Record<AdLeadStatus, string>
  ownerUserIds: Record<AdLeadOwner, string>
}
```

Support rich text, select, user, date, phone, and link cells. Use the canonical lead snapshot for every upsert. List existing items with pagination when an item ID is missing; match a hidden canonical identifier if the configured title/text convention provides one, otherwise do not guess based only on a duplicate name.

- [ ] **Step 4: Implement create/update and typed retry classification**

Create with `slackLists.items.create` and `initial_fields`; update with `slackLists.items.update` and `cells` containing `row_id`. Treat timeouts/5xx/429 as retryable, and auth/scope/list/column/option errors as permanent. Never log the token or full phone.

- [ ] **Step 5: Run the focused adapter test**

Run: `cd app && npm test -- api/_lib/slackLeadPipeline.test.ts`

Expected: PASS.

### Task 5: Add import Cron and outbox worker endpoints

**Files:**
- Create: `app/api/cron/ad-lead-sync.ts`
- Create: `app/api/cron/ad-lead-sync.test.ts`
- Create: `app/api/ad-lead-sync-health.ts`
- Modify: `app/vercel.json`

- [ ] **Step 1: Write failing Cron handler tests**

Cover unauthorized requests, source import summary, partial source failure, outbox processing, retryable Slack failure, and idempotent repeated invocation.

```ts
it('rejects a cron call without the Vercel bearer secret', async () => {
  const response = responseRecorder()
  await createAdLeadSyncHandler(dependencies)({ method: 'GET', headers: {} }, response)
  expect(response.statusCode).toBe(401)
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `cd app && npm test -- api/cron/ad-lead-sync.test.ts`

Expected: FAIL because the handler does not exist.

- [ ] **Step 3: Implement authenticated import and worker orchestration**

Verify `Authorization === Bearer ${CRON_SECRET}`. Import Google Apps Script rows, write canonical submissions/leads, claim a bounded outbox batch, sync Slack, and complete/fail each row. Return counts only: `imported`, `deduplicated`, `pending`, `completed`, `failed`, `sources`. Never return lead rows.

- [ ] **Step 4: Add Vercel Cron configuration**

Preserve SPA rewrites and add:

```json
"crons": [{ "path": "/api/cron/ad-lead-sync", "schedule": "*/5 * * * *" }]
```

The endpoint must be placed under `app/api/cron/` so Vercel detects it as a Function. The schedule is interpreted in UTC by Vercel.

- [ ] **Step 5: Add protected sync health handler**

Return the spec's counts/timestamps and per-source status only to the existing authenticated CRM staff session or an internal server secret. Do not return names, phones, raw payloads, or Slack tokens.

- [ ] **Step 6: Run Cron tests**

Run: `cd app && npm test -- api/cron/ad-lead-sync.test.ts`

Expected: PASS.

### Task 6: Switch the ad-leads API to canonical data with safe migration fallback

**Files:**
- Modify: `app/api/ad-leads.ts`
- Modify: `app/api/ad-leads.test.ts`

- [ ] **Step 1: Write a failing canonical-read test**

Assert that canonical mode returns one Lead per normalized phone and preserves appointments, without calling Apps Script for normal reads.

- [ ] **Step 2: Run the test and verify it fails**

Run: `cd app && npm test -- api/ad-leads.test.ts`

Expected: FAIL because the handler always reads Apps Script.

- [ ] **Step 3: Implement canonical reader selection**

Add a dependency-injected `loadCanonical` function. When `AD_LEAD_CANONICAL_MODE=canonical`, read Supabase canonical data. Keep `legacy` mode as a rollback switch until backfill/cutover verification is complete. Do not silently fall back from canonical to Google Sheets on a canonical database error; return `503` so missing migration cannot hide data loss.

- [ ] **Step 4: Run all ad-lead API tests**

Run: `cd app && npm test -- api/ad-leads.test.ts api/_lib/adLeadTracking.test.ts api/_lib/adLeadAppointments.test.ts`

Expected: PASS.

### Task 7: Add frontend sync status without changing CRM navigation/auth

**Security decision:** The existing CRM login is a client-side navigation flag,
not a server-authenticated session. Do not call the server-secret health or
retry endpoints from this page with that flag or with the separate ad-leads
page password. The server endpoints remain available for an authenticated
operator/runbook; a UI panel can be added only after a real staff session or
protected proxy is introduced.

**Files:**
- Modify: `app/src/pages/PortalAdLeads.tsx`
- Modify: `app/src/pages/PortalAdLeads.test.tsx`

- [x] **Step 1: Add the security regression test**

Test that the lead page keeps rendering lead data without making an
unauthenticated health request. Health and retry behavior is covered by their
server endpoint tests.

- [x] **Step 2: Run focused UI tests**

Run: `cd app && npm test -- src/pages/PortalAdLeads.test.tsx`

Expected: PASS.

- [x] **Step 3: Keep the existing lead table secure; defer status panel until server staff auth exists**

Do not pass the client-only page password to the server. Preserve existing
password/session behavior, navigation, lead table, calendar and pagination.

- [x] **Step 4: Run UI tests**

Run: `cd app && npm test -- src/pages/PortalAdLeads.test.tsx`

Expected: PASS.

### Task 8: Validate, review and prepare external cutover

**Files:**
- Modify only files already listed above; no customer data or secrets.

- [x] **Step 1: Run focused test suite**

Run: `cd app && npm test -- src/features/ad-leads api/_lib/adLead api/ad-leads.test.ts api/cron/ad-lead-sync.test.ts src/pages/PortalAdLeads.test.tsx`

Expected: PASS. The fresh full suite completed with 37 files and 232 tests passing.

- [x] **Step 2: Run typecheck, lint and production build**

Run: `cd app && npm run lint && npm run build`

Expected: exit 0 with no new lint or TypeScript errors. Existing unrelated lint
warnings remain; no new errors were introduced.

- [x] **Step 3: Review security and diff**

Run: `rg -n "xoxb-|xapp-|service_role|CRON_SECRET=|SLACK_BOT_TOKEN=|phone.*console|console.*phone" app --glob '!node_modules/**' --glob '!dist/**'` and `git diff --check`.

Expected: no secret values or full-phone logging; no whitespace errors.

- [x] **Step 4: Document external cutover values**

Provide the user a checklist for applying the migration in Supabase and setting Vercel variables. The production cutover runbook is at `docs/superpowers/plans/2026-08-09-slack-lead-pipeline-cutover.md`; no secret values are invented or committed.

- [x] **Step 5: Commit implementation only after verification**

Stage only the implementation files and migration; do not stage existing unrelated dirty files/assets. Use a focused commit such as:

```bash
git add app/api app/src/features/ad-leads app/src/pages/PortalAdLeads.tsx app/supabase/migrations/20260809_create_ad_lead_canonical_sync.sql app/vercel.json
git commit -m "feat: sync canonical ad leads to Slack pipeline"
```
