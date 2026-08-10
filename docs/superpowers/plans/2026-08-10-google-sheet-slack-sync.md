# A2O Google Sheet → Supabase → Slack Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the four approved Google Sheet sources and CRM changes converge on one Supabase canonical Lead and one Slack List item, with immediate form-submit processing plus a reliable five-minute reconciliation trigger.

**Architecture:** Google Apps Script owns the two triggers, per-source cursor and HMAC-signed batch request. A Supabase Edge Function validates the request, imports rows through the existing canonical RPCs, and drains the same leased Supabase Outbox worker. Vercel continues serving the website and CRM APIs but no longer schedules or directly writes Slack.

**Tech Stack:** TypeScript/Vitest, Google Apps Script, Supabase Postgres migrations/RPCs, Supabase Edge Functions (Deno), Slack Lists API.

---

### Task 1: Establish the signed sync protocol

**Files:**
- Create: `app/api/_lib/adLeadSyncProtocol.ts`
- Test: `app/api/_lib/adLeadSyncProtocol.test.ts`

- [x] **Step 1: Write failing tests for canonical signing and replay validation**

Test that the same raw body produces the same HMAC, a changed body produces a different signature, and timestamps older than five minutes are rejected.

```ts
import { describe, expect, it } from 'vitest'
import { buildSyncSignature, isFreshSyncTimestamp } from './adLeadSyncProtocol'

describe('ad lead sync protocol', () => {
  it('signs timestamp, request id and raw body deterministically', async () => {
    const first = await buildSyncSignature('secret', '1700000000', 'req-1', '{"rows":[]}')
    const second = await buildSyncSignature('secret', '1700000000', 'req-1', '{"rows":[]}')
    const changed = await buildSyncSignature('secret', '1700000000', 'req-1', '{"rows":[1]}')
    expect(first).toBe(second)
    expect(first).not.toBe(changed)
    expect(first).toMatch(/^sha256=[0-9a-f]{64}$/)
  })

  it('accepts only timestamps within the configured replay window', () => {
    expect(isFreshSyncTimestamp(1_000, 1_000 + 299)).toBe(true)
    expect(isFreshSyncTimestamp(1_000, 1_000 + 301)).toBe(false)
    expect(isFreshSyncTimestamp(1_000, 1_000 - 301)).toBe(false)
  })
})
```

- [x] **Step 2: Run the focused test and verify it fails because the protocol module is missing**

Run: `npm test -- --run api/_lib/adLeadSyncProtocol.test.ts` from `app/`.
Expected: FAIL with a module-not-found error for `adLeadSyncProtocol`.

- [x] **Step 3: Implement the Web Crypto protocol helper**

Use `crypto.subtle` with HMAC-SHA256 and encode the exact message `${timestamp}\n${requestId}\n${rawBody}`. Export the five-minute freshness predicate and a constant replay window. Do not use Node-only `createHmac`, so the helper can be copied into the Deno Edge Function.

- [x] **Step 4: Run the focused test and verify it passes**

Run: `npm test -- --run api/_lib/adLeadSyncProtocol.test.ts`.
Expected: 2 tests pass.

- [x] **Step 5: Commit the protocol unit**

```bash
git add app/api/_lib/adLeadSyncProtocol.ts app/api/_lib/adLeadSyncProtocol.test.ts
git commit -m "feat: add signed ad lead sync protocol"
```

### Task 2: Add Apps Script incremental ingestion and triggers

**Files:**
- Create: `app/integrations/google-apps-script/AdLeadSync.gs`
- Create: `app/integrations/google-apps-script/AdLeadSync.test.ts`
- Modify: `app/integrations/google-apps-script/README.md`

- [x] **Step 1: Write failing contract tests for source cursors, overlap and HMAC requests**

The VM test must provide fake `PropertiesService`, `UrlFetchApp`, `LockService` and `SpreadsheetApp` globals. Assert that a failed Edge response does not advance the source cursor, a successful batch advances it, and an empty five-minute run still calls the Edge Function with `rows: []`.

```ts
it('does not advance a source cursor when the Edge Function rejects the batch', () => {
  // execute syncSources() with UrlFetchApp.fetch returning {getResponseCode: () => 503}
  // assert PropertiesService.setProperty was not called for the cursor key
})
```

- [x] **Step 2: Run the focused Apps Script test and verify the contract fails**

Run: `npm test -- --run integrations/google-apps-script/AdLeadSync.test.ts` from `app/`.
Expected: FAIL because `AdLeadSync.gs` does not exist.

- [x] **Step 3: Implement the Apps Script sync coordinator**

Implement:

- `SOURCE_CONFIG` referencing the four existing approved tabs from `AdLeadInbox.gs`.
- `syncSources(trigger)` using `LockService.getScriptLock()`.
- Per-source cursor properties and a ten-row overlap window.
- Batch limit 100 rows and a run time budget before cursor persistence.
- `Utilities.computeHmacSha256Signature` over the exact signed message and hex encoding.
- `UrlFetchApp.fetch` to `AD_LEAD_EDGE_FUNCTION_URL` with `X-A2O-Request-Id`, `X-A2O-Timestamp`, `X-A2O-Signature` and JSON body.
- Cursor advancement only after HTTP 2xx plus `{ok:true}` response.
- `installA2OTriggers()` that removes only this script's prior sync triggers, installs supported form-submit triggers for available forms, and installs exactly one `ScriptApp.newTrigger('runFiveMinuteSync').timeBased().everyMinutes(5).create()` trigger.
- `runFiveMinuteSync()` calling `syncSources('five_minute')` even when no new rows exist.
- No Slack token or Supabase secret in Script Properties; only Edge Function URL and HMAC secret.

Reuse the normalization functions from `AdLeadInbox.gs` by keeping the file self-contained when pasted into Apps Script; do not call the existing read-only `doGet` endpoint over HTTP.

- [x] **Step 4: Run the focused test and verify it passes**

Run: `npm test -- --run integrations/google-apps-script/AdLeadSync.test.ts integrations/google-apps-script/AdLeadInbox.test.ts`.
Expected: all Apps Script contracts pass.

- [x] **Step 5: Document trigger installation and secret ownership**

Update the README with the two Script Properties, the stable owner account, trigger installation order, cursor recovery procedure and the rule that failed requests leave cursors unchanged.

- [x] **Step 6: Commit the Apps Script coordinator**

```bash
git add app/integrations/google-apps-script/AdLeadSync.gs app/integrations/google-apps-script/AdLeadSync.test.ts app/integrations/google-apps-script/README.md
git commit -m "feat: reconcile ad lead sheets every five minutes"
```

### Task 3: Harden canonical database leases and migration compatibility

**Files:**
- Create: `app/supabase/migrations/20260810_harden_ad_lead_sync.sql`
- Test: `app/api/_lib/adLeadCanonical.test.ts`

- [x] **Step 1: Add a failing repository test for current-version completion and stale lease rejection**

Extend the repository test fake RPC recorder to assert `mark_ad_lead_slack_synced` receives the worker token and the version from the latest loaded snapshot. Add a failure case where the RPC returns `stale_outbox_lease` and the repository surfaces it without retrying.

- [x] **Step 2: Run the focused test and verify it fails against the old completion contract**

Run: `npm test -- --run api/_lib/adLeadCanonical.test.ts`.
Expected: FAIL on the new assertion.

- [x] **Step 3: Add the additive hardening migration**

The migration must:

- Preserve the existing appointment RPC as `SECURITY DEFINER` with `set search_path = public` and explicit service-role execute grant.
- Revoke internal RPC execute from `public`, `anon` and `authenticated`, then grant only `service_role`.
- Make outbox completion/failure conditional on `outbox_id`, `lead_id` where applicable, `status='processing'`, `locked_by`, and target/version conditions.
- Keep the current-version requeue behavior when a Lead changes while Slack is processing.
- Add a uniqueness constraint/index for one active Outbox row per Lead and a request/run idempotency table if the Edge Function needs it.
- Preserve invalid phone submissions in `ad_lead_review_queue`.
- Ensure canonical appointment projection uses the latest source key without creating a second appointment for the same normalized phone.

- [x] **Step 4: Run the focused tests and SQL static checks**

Run: `npm test -- --run api/_lib/adLeadCanonical.test.ts` and `git diff --check`.
Expected: tests pass and the migration has no whitespace errors. Production SQL execution is a separate deployment gate and is not performed locally.

- [x] **Step 5: Commit the migration hardening**

```bash
git add app/supabase/migrations/20260810_harden_ad_lead_sync.sql app/api/_lib/adLeadCanonical.test.ts
git commit -m "fix: harden canonical ad lead outbox leases"
```

### Task 4: Move Slack draining behind a Supabase Edge Function

**Files:**
- Create: `app/supabase/config.toml`
- Create: `app/supabase/functions/ad-lead-sync/index.ts`
- Create: `app/supabase/functions/ad-lead-sync/README.md`
- Test: `app/api/_lib/adLeadSyncProtocol.test.ts`

- [x] **Step 1: Add failing protocol/handler tests for unauthorized, replay and empty-sweep behavior**

Use the pure protocol helpers to test HMAC rejection and a handler contract fixture that sends `{trigger:'five_minute', rows:[]}` and expects the worker path to run. The Edge Function source must not be able to return customer rows or log secrets.

- [x] **Step 2: Run the focused tests and verify the new contract fails**

Run: `npm test -- --run api/_lib/adLeadSyncProtocol.test.ts`.
Expected: FAIL on the empty-sweep/Edge Function contract until the source exists.

- [x] **Step 3: Implement the Edge Function**

Implement a Deno `Deno.serve` handler that:

- Sets `verify_jwt = false` in `config.toml` and validates the HMAC signature, timestamp, request ID and replay table itself.
- Validates source keys, row count (max 100), field lengths and trigger values.
- Uses the server-only Supabase secret client to call `import_ad_lead_submission` for each normalized row, record an aggregate run, claim `slack_sync_outbox` rows and process a bounded batch.
- Uses Slack `slackLists.items.list`, `.create` and `.update` with the configured token and List ID; pagination reads `response_metadata.next_cursor` until empty.
- Finds an existing item by normalized phone before creating; a duplicate phone match is a dead-letter error, not a second create.
- Completes/fails the same Outbox row with its `locked_by` token and actual snapshot version.
- Returns only `{ok, requestId, imported, deduplicated, invalidPhones, claimed, synced, failed, deadLettered}`.
- Redacts PII and secrets from all logs; use error codes only.

Add deployment notes for Function Secrets `SLACK_BOT_TOKEN`, List ID/maps, `AD_LEAD_INGEST_HMAC_SECRET` and the server-only Supabase key.

- [x] **Step 4: Run local protocol tests, TypeScript build and inspect the Edge Function source**

Run: `npm test -- --run api/_lib/adLeadSyncProtocol.test.ts` and `npm run build` from `app/`.
Expected: tests pass, build exits 0, and `rg` confirms no Vercel env or customer payload logging in the Edge Function.

- [x] **Step 5: Commit the Edge Function**

```bash
git add app/supabase/config.toml app/supabase/functions/ad-lead-sync app/api/_lib/adLeadSyncProtocol.test.ts
git commit -m "feat: add Supabase edge ad lead sync worker"
```

### Task 5: Remove Vercel scheduling and direct Slack bypass

**Files:**
- Modify: `app/vercel.json`
- Modify: `app/api/ad-lead-tracking.ts`
- Modify: `app/api/ad-leads.ts` only if canonical read wiring needs a safe compatibility change
- Modify: `app/api/cron/ad-lead-sync.ts` tests or mark the endpoint retired
- Test: `app/api/ad-leads.test.ts`, `app/api/ad-lead-tracking.test.ts`

- [x] **Step 1: Write failing tests proving CRM writes enqueue but do not call Slack directly**

Provide a canonical tracking dependency with a spy that records calls and assert the handler returns 200 while no direct `syncCanonicalLead` callback is invoked. Add the same assertion for appointment booking.

- [x] **Step 2: Run the focused tests and verify the old direct-sync behavior fails the new assertion**

Run: `npm test -- --run api/ad-lead-tracking.test.ts api/ad-leads.test.ts`.
Expected: FAIL because the current canonical handler calls `syncCanonicalLead`.

- [x] **Step 3: Remove the direct Slack callback and Vercel Cron declaration**

Keep canonical RPC writes intact; remove only the direct `syncCanonicalLead` calls and dependency. Delete the `crons` block from `app/vercel.json`, retaining the SPA rewrite. Mark the Vercel cron handler retired or keep it unreachable only if its tests remain useful; no production configuration may call it.

- [x] **Step 4: Run focused CRM tests and verify empty-sweep semantics are covered**

Run: `npm test -- --run api/ad-lead-tracking.test.ts api/ad-leads.test.ts app/api/cron/ad-lead-sync.test.ts` from `app/`.
Expected: CRM writes remain successful, no direct Slack call occurs, and existing canonical read tests pass.

- [x] **Step 5: Commit the cutover boundary**

```bash
git add app/vercel.json app/api/ad-lead-tracking.ts app/api/ad-leads.ts app/api/cron/ad-lead-sync.ts app/api/ad-lead-tracking.test.ts app/api/ad-leads.test.ts app/api/cron/ad-lead-sync.test.ts
git commit -m "fix: route CRM lead changes through the Supabase outbox"
```

### Task 6: Full verification and deployment handoff

**Files:**
- Modify: `docs/superpowers/specs/2026-08-10-slack-lead-pipeline-production-recovery-spec.md` only to record verified implementation status
- Create: `docs/runbooks/ad-lead-slack-sync.md`

- [x] **Step 1: Run the complete verification suite**

Run from `app/`:

```bash
npm test
npm run build
npm run lint
git diff --check
```

Record exact failures; do not hide pre-existing lint warnings.

- [x] **Step 2: Add a runbook for the production operator**

Document migration order, Supabase Function deployment, Apps Script trigger installation, secret locations, synthetic test flow, cursor reset/reconcile procedure, Slack preflight, retry/dead-letter operation and rollback. Do not include real keys, customer names or phone numbers.

- [x] **Step 3: Perform repository-level acceptance checks**

Verify:

- `app/vercel.json` has no five-minute Cron.
- Apps Script contains exactly one five-minute trigger installer and no Slack token.
- Edge Function owns Slack token usage and HMAC verification.
- Slack pagination uses `response_metadata.next_cursor`.
- CRM tracking/appointment handlers do not call Slack directly.
- Existing CRM tests and login behavior remain unchanged.

- [x] **Step 4: Commit documentation and handoff**

```bash
git add docs/superpowers/specs/2026-08-10-slack-lead-pipeline-production-recovery-spec.md docs/runbooks/ad-lead-slack-sync.md
git commit -m "docs: add ad lead Slack sync deployment runbook"
```

Production migration, Supabase Function deployment, Apps Script authorization and Slack preflight require the user's authenticated dashboards and are separate from local code verification. Do not claim production synchronization is live until those gates are executed and the 15 acceptance tests in the specification pass.
