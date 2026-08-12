# A2O Lead Sync Row Validation and Cursor Recovery Specification

**Date:** 2026-08-12

**Status:** Design approved; implementation is explicitly out of scope for this task

**Affected flow:** Google Sheets → Google Apps Script → Supabase Edge Function → canonical Lead/Outbox → Slack List

## 1. Purpose

Repair a production lead-sync defect that silently rejects valid Google Sheet rows and then advances the source cursor past them. The repair must recover all affected submissions, prevent partial batch acceptance from causing future data loss, and add enough source-level health information to detect the same class of failure.

This specification is intended to be handed to a separate implementation model. It does not authorize production deployment, cursor changes, backfill execution, Slack writes, or database mutations during the specification task.

## 2. Verified production findings

The following findings were verified on 2026-08-12 using read-only checks against the approved Google Sheets, Supabase project, deployed Edge Function, and Slack Lead Pipeline export:

1. The approved `A2O Style Lab` source is configured and historically synchronized successfully.
2. Its canonical submission history stops at source row 99 even though the Sheet contains valid eligible rows after row 99.
3. Valid rows 100–109 are absent from `ad_lead_submissions`, `ad_leads`, the Slack Outbox, and the Slack List.
4. Valid rows 10–19 are also absent, showing that the defect is a row-number boundary bug rather than a recent connection outage.
5. The other approved sources also have no imported rows numbered 10–19, so recovery must audit all four sources rather than only the latest reported records.
6. The five-minute Apps Script trigger and deployed Supabase Edge Function continue to run. Recent requests return HTTP 200 with `row_count = 0`, `imported = 0`, and `heartbeat = true` because the source cursor has already moved past the rejected rows.
7. The Slack Outbox currently contains completed work only. The reported missing leads never reached the Outbox, proving that Slack is not the failing boundary.
8. The deployed `ad-lead-sync` Edge Function is version 25 and contains the defective row-number validation described below.

No customer names, phone numbers, or raw submissions should be copied into tests, logs, fixtures, or future design documents. Use synthetic data only.

## 3. Root cause

### 3.1 Incorrect source-row validation

The deployed Edge Function validates `sourceId` with this pattern:

```ts
/^([^:]+):([^:]+):([2-9]\d*)$/
```

The intended rule is “the row number must be an integer greater than or equal to 2.” The implemented rule is “the decimal representation must begin with a digit from 2 through 9.”

Consequences:

| Row number | Current result | Correct result |
|---:|---|---|
| 2 | accepted | accepted |
| 9 | accepted | accepted |
| 10–19 | rejected | accepted |
| 20–99 | accepted | accepted |
| 100–199 | rejected | accepted |
| 200–999 | accepted | accepted |
| 1000–1999 | rejected | accepted |

The pattern repeats at every decimal range beginning with `1`.

### 3.2 Partial success is treated as complete success

`parseRows()` catches individual validation errors and increments `invalidRows`, while the overall request still returns `ok: true`. Google Apps Script checks only the HTTP status and `payload.ok`, then advances the source cursor to `increment.nextCursor`.

The combined failure mode is:

1. Apps Script sends a batch containing an affected row number.
2. Edge Function silently excludes that row and returns `ok: true` with `invalidRows > 0`.
3. Apps Script treats the whole batch as accepted.
4. Apps Script advances the cursor beyond the rejected row.
5. Later five-minute runs report no new rows, so the rejected submission is never retried.

### 3.3 Test gap

Existing Edge Function tests inspect source text and broad contract markers but do not execute behavioral boundary tests for row numbers. Existing Apps Script tests do not assert that partial acceptance blocks cursor advancement.

## 4. Goals

1. Accept every approved source row whose canonical row number is a safe integer `>= 2`.
2. Reject malformed, forged, or unapproved source identifiers.
3. Make structural batch validation atomic: a structurally invalid row must prevent cursor advancement for the batch.
4. Preserve idempotent replay through the existing stable `source_key`.
5. Recover every eligible historical submission skipped by the defect across all four approved sources.
6. Preserve existing CRM status, owner, appointment, Slack item mapping, and submission history.
7. Add source-level health information that exposes cursor progress, rejected rows, and stalled sources without exposing customer data.
8. Keep the current architecture and five-minute service objective.

## 5. Non-goals

- Do not redesign the CRM UI.
- Do not change Google Forms or source Sheet column layouts.
- Do not replace Google Apps Script as the scheduler.
- Do not move cursor authority into Supabase in this repair.
- Do not change phone deduplication, Slack column mapping, status options, owner mapping, or appointment rules.
- Do not delete or merge existing Slack items automatically.
- Do not introduce a public health endpoint or rely on the current client-side page password as server authentication.
- Do not refactor unrelated homepage, assessment, product, CRM, or media code.

## 6. Selected design

Retain the existing pipeline:

```text
Approved Google Sheet tabs
        |
        v
Google Apps Script incremental scanner
        |
        | signed batch + source context
        v
Supabase ad-lead-sync Edge Function
        |
        +--> canonical submission / lead / review state
        +--> Slack Outbox
                    |
                    v
             Slack Lead Pipeline
```

The repair has four coordinated parts:

1. Replace regex-based row validation with a parsed source-identity validator.
2. Replace partial structural acceptance with an all-or-nothing batch acknowledgment contract.
3. Gate Apps Script cursor advancement on a complete acknowledgment.
4. Perform a controlled, idempotent reconciliation of all approved sources and record source-level health.

## 7. Source identity validation

### 7.1 Required parser

Create one pure parser/validator used by the Edge Function instead of embedding row semantics in a single regex.

Conceptual result:

```ts
type ParsedSourceIdentity = {
  sourceForm: ApprovedSourceForm
  spreadsheetId: string
  sheetName: string
  rowNumber: number
  sourceId: string
  sourceKey: string
}
```

Validation order:

1. Require `sourceForm`, `sourceId`, and `sourceKey` to be non-empty strings within their existing length limits.
2. Split `sourceId` into spreadsheet ID, sheet name, and the final row-number segment. The sheet-name portion may contain spaces and punctuation; the final colon-delimited segment is the row number.
3. Require the row-number text to be canonical unsigned decimal syntax with no sign, fraction, exponent, whitespace, or trailing data.
4. Convert it to a number and require `Number.isSafeInteger(rowNumber)`.
5. Require `rowNumber >= 2`.
6. Match `sourceForm + spreadsheetId + sheetName` against the existing `APPROVED_SOURCES` allowlist.
7. Require `sourceKey === `${sourceForm}:${sourceId}``.

Do not use a regex whose first digit encodes the numeric minimum.

### 7.2 Boundary behavior

The validator must accept at least:

```text
2, 9, 10, 19, 20, 99, 100, 199, 200, 999, 1000, 1999, 2000
```

It must reject at least:

```text
empty, 0, 1, -2, +2, 01, 1.5, 2e3, NaN, Infinity, 2abc
```

It must also reject unknown spreadsheet IDs, unknown sheet names, mismatched source forms, extra suffixes, and a `sourceKey` that does not exactly correspond to the validated identity.

## 8. Atomic batch acknowledgment contract

### 8.1 Structural validation phase

The Edge Function must validate every row in the request before calling any import RPC.

Structural failures include:

- invalid or unapproved source identity;
- malformed source key;
- invalid submission timestamp syntax;
- missing or over-limit required text fields;
- unsupported batch shape or batch size.

If any row has a structural failure:

- import zero rows from that request;
- enqueue zero Slack Outbox records from that request;
- return HTTP 422;
- return `ok: false` and `error: "batch_rejected"`;
- include only sanitized row metadata and error codes;
- never return a name, phone number, tag, or raw row.

Example failure response:

```json
{
  "ok": false,
  "error": "batch_rejected",
  "requestId": "uuid",
  "sentRows": 11,
  "acceptedRows": 0,
  "rejectedRows": 1,
  "rejections": [
    {
      "sourceForm": "A2O Style Lab",
      "rowNumber": 100,
      "errorCode": "invalid_source_row"
    }
  ]
}
```

### 8.2 Successful acknowledgment

A structurally valid batch may proceed to the existing idempotent import RPC and Outbox drain.

Example success response:

```json
{
  "ok": true,
  "requestId": "uuid",
  "sentRows": 11,
  "acceptedRows": 11,
  "rejectedRows": 0,
  "imported": 11,
  "deduplicated": 0,
  "invalidPhones": 0,
  "claimed": 1,
  "synced": 1,
  "failed": 0,
  "deadLettered": 0
}
```

During rollout, existing aggregate response fields may remain for compatibility, but `sentRows`, `acceptedRows`, and `rejectedRows` are authoritative for cursor advancement.

### 8.3 Data-quality failures are not structural failures

An otherwise valid submission with a phone number that cannot be normalized must not disappear or block all later rows. Preserve the submission using the existing invalid-phone/review behavior, increment `invalidPhones`, and ensure the canonical review state remains available for manual handling.

Do not treat an invalid phone as an accepted canonical primary Lead suitable for Slack creation.

### 8.4 Runtime and database failures

If any import RPC fails after validation:

- return a non-2xx response with a sanitized error code;
- do not claim that the batch was accepted;
- do not advance the Apps Script cursor;
- allow idempotent replay of any rows that may have committed before the failure.

An implementation may use a database transaction/RPC for stronger whole-batch atomicity, but cursor safety must not depend on that enhancement. Stable `source_key` replay remains mandatory.

## 9. Google Apps Script cursor safety

### 9.1 Cursor advancement gate

`callSyncFunction()` must treat a batch as fully acknowledged only when all conditions hold:

```text
HTTP status is 2xx
payload.ok === true
payload.requestId matches the sent request ID
payload.sentRows === batch.length
payload.acceptedRows === batch.length
payload.rejectedRows === 0
```

Any missing, malformed, contradictory, partial, or legacy response must fail closed and must not advance the cursor.

### 9.2 Source-level advancement

- Keep the existing per-source cursor.
- Advance a source cursor only after every batch for that source succeeds.
- If batch 1 succeeds and batch 2 fails, do not advance the source cursor. The next run may resend batch 1; the existing `source_key` makes that safe.
- Continue using the overlap window.
- Continue using `LockService` to avoid concurrent source runs.
- Continue sending an empty heartbeat when there are no new rows, but require a valid zero-row acknowledgment.

### 9.3 Error state

For each source, retain/update Script Properties for:

```text
CURSOR_<source>
CURSOR_<source>_LAST_SUCCESS_AT
CURSOR_<source>_LAST_REQUEST_ID
CURSOR_<source>_LAST_ERROR
CURSOR_<source>_LAST_REJECTED_ROW
```

`LAST_ERROR` stores a stable error code only. `LAST_REJECTED_ROW` stores a row number only. Do not store names, phone numbers, tags, raw payloads, or secrets.

### 9.4 Local normalization results

Intentional non-lead/internal rows may continue to be excluded according to the reviewed source normalizer. Eligible advertising submissions must not be silently dropped by a local catch-all.

Refactor normalization to return an explicit result for an eligible row:

```ts
{ ok: true, rowNumber, lead }
```

or a sanitized classification:

```ts
{ ok: false, rowNumber, disposition: "intentional_skip" | "source_error", errorCode }
```

A `source_error` at or after the cursor must block cursor advancement and appear in source health. An `intentional_skip` must be covered by a specific test and documented rule; do not use it as a generic escape hatch.

## 10. Source-level health and observability

### 10.1 Source context in signed requests

Each non-heartbeat batch must include signed, non-customer source context:

```json
{
  "sourceContext": {
    "sourceForm": "A2O Style Lab",
    "spreadsheetId": "approved-id",
    "sheetName": "a2o style lab",
    "cursorBefore": 99,
    "candidateMaxRow": 109,
    "batchStartRow": 90,
    "batchEndRow": 109
  }
}
```

The Edge Function must derive approval from its own allowlist and validated rows. Source context is observability metadata, not authorization.

### 10.2 Persisted source state

Add an additive, service-role-only table such as `ad_lead_source_sync_state` with one row per approved source:

| Field | Purpose |
|---|---|
| `source_key` | stable non-customer source identifier |
| `source_form` | approved display source |
| `spreadsheet_id` | approved spreadsheet ID |
| `sheet_name` | approved tab |
| `cursor_reported` | latest cursor reported by Apps Script |
| `candidate_max_row` | latest eligible maximum row observed |
| `last_accepted_row` | highest fully acknowledged row |
| `last_attempt_at` | latest signed attempt |
| `last_success_at` | latest complete acknowledgment |
| `last_request_id` | diagnostic correlation ID |
| `last_error_code` | sanitized error code |
| `last_rejected_row` | row number only |
| `last_sent_rows` | batch count |
| `last_accepted_rows` | acknowledged count |
| `last_rejected_rows` | rejected count |

Enable RLS and revoke access from `anon` and `authenticated`. Only the service role and explicitly protected administrative tooling may read or write this state.

### 10.3 Health conditions

Protected health output must flag at least:

- no successful five-minute run for more than 15 minutes;
- any source with `last_rejected_rows > 0`;
- any source with a non-null `last_error_code`;
- a reported cursor greater than the last fully accepted row;
- an observed candidate row greater than the last fully accepted row for more than two successful trigger intervals;
- pending/failed/dead-letter Outbox counts and oldest pending age.

Do not add this information to the current browser-only password page until the project has real server-side staff authentication. Supabase Dashboard, protected health API, or approved admin tooling is sufficient for this repair.

Logs must remain aggregate and sanitized.

## 11. Historical recovery and backfill

### 11.1 Scope

Audit and reconcile all four approved sources:

| Source | Spreadsheet | Tab |
|---|---|---|
| Men New Form | approved existing ID | `men-new form` |
| Style Lab New Form | approved existing ID | `style lab new form` |
| A2O Style Lab | approved existing ID | `a2o style lab` |
| A2O Website | approved existing ID | `a2owebsite` |

Do not backfill only the two recently noticed records. The defect affects every eligible row whose decimal row number starts with `1`, including historical rows 10–19 and future ranges such as 1000–1999.

### 11.2 Recovery sequence

1. Deploy and verify the corrected Edge Function first. The old Apps Script will not advance on an HTTP 422 response, making this order fail-safe.
2. Deploy the acknowledgment-aware Apps Script.
3. Confirm synthetic boundary tests against a non-production/test source or signed test harness.
4. Export/snapshot the four existing cursor and source-status Script Properties without exposing secrets.
5. Reconcile one source at a time using the existing controlled manual reconcile path.
6. Reset only the selected source cursor to the documented beginning value (`0` or the existing full-reconcile equivalent).
7. Run the full source through the same signed ingestion and Outbox path used by normal synchronization.
8. Stop immediately if any batch is rejected or not fully acknowledged. Do not manually jump the cursor over a rejected row.
9. Verify source submission counts, canonical Lead counts, review counts, Outbox status, and Slack deduplication before moving to the next source.
10. After all four sources succeed, allow at least two normal five-minute runs and verify stable zero-row heartbeats.

### 11.3 Idempotency and preservation

- Existing `source_key` uniqueness must prevent duplicate submissions.
- Existing normalized-phone uniqueness must prevent duplicate canonical Leads.
- Re-importing an old submission must not overwrite a manually changed status, owner, or appointment.
- Existing `slack_list_item_id` values must be reused.
- If a canonical Lead lacks an item ID, search the complete Slack List by normalized phone before creating a new item.
- Do not delete, archive, or merge Slack items automatically during recovery.
- Do not truncate canonical, submission, Outbox, tracking, or appointment tables.

### 11.4 Reconciliation report

Produce an aggregate report per source containing:

- eligible source rows scanned;
- structurally accepted rows;
- intentional skips by documented reason;
- source errors/rejections;
- new submissions created;
- idempotent submissions replayed;
- invalid-phone/review submissions;
- canonical Leads created or updated;
- Slack items created, updated, failed, or dead-lettered;
- final cursor and final accepted row.

The report must not contain customer names, full phone numbers, raw payloads, secrets, or Slack column IDs.

## 12. Required code areas

The implementation model must begin from the latest reviewed branch/commit that contains the production synchronization files. At investigation time, the latest locally reviewed implementation was commit `9d937dc` on `codex/homepage-expansion-preview` / the equivalent local audit worktree. The implementation model must fetch and compare the remote state before coding, then use that commit or a verified descendant. Do not implement this repair from a branch where the synchronization files are absent.

Inspect and modify only as required:

```text
app/supabase/functions/ad-lead-sync/index.ts
app/supabase/functions/ad-lead-sync/adLeadSync.test.ts
app/integrations/google-apps-script/AdLeadSync.gs
app/integrations/google-apps-script/AdLeadSync.test.ts
app/integrations/google-apps-script/AdLeadInbox.gs
app/integrations/google-apps-script/AdLeadInbox.test.ts
app/api/_lib/adLeadCanonical.ts
app/api/ad-lead-sync-health.ts
app/supabase/migrations/
docs/runbooks/ad-lead-slack-sync.md
```

Prefer extracting source-identity parsing into a small pure module that can be tested behaviorally. If the Edge deployment process requires a single bundle, keep the module within the function directory and include it in the deployment manifest.

Do not modify unrelated application files.

## 13. Database and security requirements

- Any new source-health table or RPC must be added through an additive migration.
- Enable RLS on new tables in the exposed `public` schema.
- Revoke table and function access from `PUBLIC`, `anon`, and `authenticated` unless explicitly required.
- Grant only the minimum service-role access used by the Edge Function.
- Do not expose the service-role/secret key to Apps Script or the browser.
- Keep `verify_jwt = false` only because the existing function performs HMAC authentication for the external Apps Script caller.
- Preserve timestamp freshness, request replay protection, HMAC verification, source allowlisting, and maximum batch size.
- Never log the signed body, HMAC secret, customer payload, name, or full phone number.

No relevant item found in the current [Supabase Edge Functions changelog](https://supabase.com/changelog?tags=edge+functions) requires an architectural alteration to this repair; nevertheless, the implementation model must verify the active Edge Function runtime and current deployment guidance before deployment.

## 14. Testing requirements

### 14.1 Source parser unit tests

Use executable behavioral tests, not string-presence assertions.

Test every accepted and rejected boundary listed in section 7.2 for each approved source identity. Include mismatched source form, spreadsheet, tab, source key, and malformed suffix cases.

Add a regression assertion proving rows 10, 19, 100, 109, 1000, and 1999 are accepted.

### 14.2 Edge batch tests

1. All-valid batch returns complete acknowledgment.
2. One valid plus one structurally invalid row returns HTTP 422 and imports zero rows.
3. A valid row with an invalid phone is preserved for review and does not become a Slack-ready Lead.
4. Import RPC failure returns non-2xx and no complete acknowledgment.
5. Request replay returns the previous response without duplicate import.
6. Unknown source and mismatched source key are rejected.
7. Responses and logs contain no customer data.

### 14.3 Apps Script cursor tests

1. Complete acknowledgment advances the cursor.
2. HTTP 422 does not advance the cursor.
3. HTTP 200 with `rejectedRows > 0` does not advance the cursor.
4. Missing acknowledgment fields do not advance the cursor.
5. Request ID mismatch does not advance the cursor.
6. Network timeout or invalid JSON does not advance the cursor.
7. In a multi-batch source, failure of a later batch leaves the source cursor unchanged.
8. Replaying earlier accepted batches remains idempotent.
9. A zero-row heartbeat requires a valid zero-row acknowledgment.
10. Source errors are recorded without customer data.

### 14.4 Database and Outbox tests

- Full-source replay does not duplicate `ad_lead_submissions`.
- Same normalized phone does not duplicate `ad_leads`.
- Historical replay does not overwrite current status, owner, or appointment.
- A recovered eligible submission enqueues or coalesces the correct Outbox work.
- Existing Slack item mappings remain stable.
- Source-health tables are inaccessible to browser roles.

### 14.5 End-to-end tests

Use synthetic records only.

1. Submit synthetic rows at boundary numbers 10 and 100 through the signed path.
2. Confirm both reach submission history, canonical state, Outbox, and the test Slack List.
3. Re-run the same source and confirm no duplicate submission, Lead, or Slack item.
4. Exercise all four approved source mappings.
5. Simulate one structural rejection and confirm the source cursor remains behind the rejected row until the issue is fixed.
6. Confirm two subsequent normal five-minute runs complete successfully.

## 15. Deployment sequence

1. Confirm the implementation base includes the currently deployed synchronization logic and all later production fixes.
2. Add failing behavioral tests for row 10 and row 100.
3. Implement the parsed source validator and atomic structural validation.
4. Add the source-health migration/RPC and protected health projection.
5. Deploy the migration and review Supabase security/performance advisors.
6. Deploy the corrected Edge Function before changing Apps Script.
7. Verify bad signature, replay, unknown source, row 10, row 100, and zero-row heartbeat behavior.
8. Deploy the acknowledgment-aware Apps Script.
9. Verify one normal five-minute run without resetting any cursor.
10. Execute the controlled per-source recovery in section 11.
11. Verify Slack and canonical reconciliation.
12. Observe at least two additional five-minute runs and confirm no rejected rows, cursor drift, pending failures, or duplicates.

Do not combine this release with homepage or unrelated CRM deployment work.

## 16. Rollback

If the repaired ingestion or recovery behaves unexpectedly:

1. Pause the Apps Script form-submit and five-minute triggers.
2. Do not revert to cursor advancement on partial success.
3. Preserve the cursor snapshot, source-health records, canonical data, submissions, Outbox, and logs for diagnosis.
4. Do not delete recovered records or Slack items automatically.
5. Roll back the Edge Function only to a version that rejects affected batches without returning false success; otherwise keep triggers paused.
6. Correct the defect in a test environment, replay synthetic boundary cases, and resume one source at a time.

The additive source-health table may remain in place during rollback. It must not be dropped as an emergency measure.

## 17. Acceptance criteria

The repair is complete only when all of the following are true:

- Row-number validation correctly accepts every tested safe integer `>= 2`, including decimal ranges beginning with `1`.
- A structurally invalid row cannot produce `ok: true` for its batch.
- Apps Script cannot advance a cursor without a complete batch acknowledgment.
- The four approved sources have been fully reconciled through the production ingestion path.
- Previously skipped eligible ranges, including rows 10–19 and the reported post-99 range, exist in canonical submission history or have an explicit documented review disposition.
- The latest accepted row for `A2O Style Lab` is at least the latest eligible source row observed during recovery.
- Reconciliation creates no duplicate canonical phone records and no duplicate Slack items.
- Existing CRM status, owner, appointment, and Slack mapping data remain intact.
- Outbox processing returns to zero pending/failed/dead-letter items after recovery, except for explicitly documented pre-existing review cases.
- Source health shows a recent successful run, zero rejected rows, and no cursor-ahead-of-acceptance condition for all four sources.
- Behavioral parser, Edge batch, Apps Script cursor, database, and end-to-end tests pass.
- Logs, health output, test fixtures, and reconciliation reports contain no customer-identifying data or secrets.
- The runbook documents diagnosis, recovery, verification, and rollback steps.

## 18. Definition of done for the implementation model

The implementation model may claim completion only after it provides:

1. The exact code and migration diff.
2. Failing-before/passing-after evidence for row 10 and row 100 tests.
3. Full relevant test, typecheck, and build results.
4. Edge Function deployment version and verification evidence.
5. Apps Script deployment/trigger verification without exposing secrets.
6. Aggregate four-source reconciliation results.
7. Canonical/Outbox/Slack deduplication evidence.
8. Source-health evidence from two subsequent normal trigger runs.
9. A statement of anything not deployed or not verified.

Until those items exist, the change is implemented or partially deployed, not complete.
