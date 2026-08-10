# A2O Slack Lead Pipeline Production Recovery Specification

> **Status:** Root cause confirmed; specification approved for later execution only.
> This document does not authorize or perform a production deployment.

## 1. Goal

Restore a reliable, one-way synchronization flow from the A2O advertising lead
sources into the CRM/Supabase canonical lead record and then into the existing
Slack **A2O Lead Pipeline** List.

The target service level is:

- A new valid lead appears in Slack within five minutes of appearing in a
  configured Google Sheet source.
- A CRM status, owner or appointment update reaches the same Slack item without
  creating a duplicate.
- One normalized telephone number represents one primary Lead, while every
  submission remains available in submission history.

## 2. Confirmed production diagnosis — 2026-08-10

The synchronization failure is not currently caused by stale Google Sheet data
or the CRM lead reader. It is a production cutover failure across three layers.

### 2.1 The new sync code has not reached GitHub or production

- Local implementation commit: `72e8fc6`.
- Remote `codex/ad-lead-layout-fix` head: `9b4ac5b`.
- Therefore the local sync commit has not been pushed to the remote branch.
- The current Vercel production deployment was created on 2026-08-09 and its
  build contains `api/ad-leads` and `api/ad-lead-tracking`, but does not contain:
  - `api/cron/ad-lead-sync`
  - `api/ad-lead-sync-health`
  - `api/ad-lead-sync-retry`

Production response evidence:

- `GET /api/ad-leads` returns `200 application/json`.
- `GET /api/cron/ad-lead-sync` returns the SPA `index.html`.
- `GET /api/ad-lead-sync-health` returns the SPA `index.html`.

This means Vercel is falling through to the catch-all frontend rewrite because
the new serverless functions do not exist in the deployed build.

### 2.2 The canonical Supabase migration has not been applied

The live Supabase project currently contains the legacy tables
`ad_lead_tracking` and `ad_lead_appointments`, but does not contain:

- `ad_leads`
- `ad_lead_submissions`
- `slack_sync_outbox`
- `ad_lead_sync_runs`
- `ad_lead_sync_leases`
- `ad_lead_review_queue`

Therefore there is currently no canonical Lead store, no Outbox work to claim,
and no database record of completed or failed Slack synchronization.

### 2.3 Production environment variables are incomplete

The production Vercel project has `SLACK_BOT_TOKEN`, the Apps Script source
settings and the existing Supabase server credentials. It does not currently
have the remaining settings required by the sync implementation:

- `AD_LEAD_CANONICAL_MODE`
- `CRON_SECRET`
- `SLACK_LEAD_PIPELINE_LIST_ID`
- `SLACK_LIST_COLUMN_MAP`
- `SLACK_STATUS_OPTION_MAP`
- `SLACK_OWNER_USER_MAP`
- `AD_LEAD_HEALTH_SECRET`
- `AD_LEAD_RETRY_SECRET`

Possessing a Slack token alone cannot select a List, map List columns or start a
scheduled synchronization run.

## 3. Root-cause statement

The CRM website and Slack List differ because they are still two separate live
systems. The CRM reads the legacy Google Apps Script/Supabase path, while the
new canonical database, Outbox worker and Slack adapter exist only in an
unpublished local commit. No active production process currently sends new CRM
lead data to Slack.

## 4. Required architecture

```text
Four Google Sheet tabs
        |
        v
Read-only Apps Script API
        |
        v  every <= 5 minutes
Vercel Cron function
        |
        +--> ad_lead_submissions (all submissions)
        |
        +--> ad_leads (one normalized phone = one Lead)
                         |
                         v
                  slack_sync_outbox
                         |
                         v
                Slack A2O Lead Pipeline

CRM status / owner / appointment update
        |
        v
Canonical Supabase RPC + same Outbox
        |
        v
Update the existing Slack List item
```

Supabase is the only operational source of truth after cutover. Slack is a
one-way working view and must never overwrite CRM/Supabase data.

## 5. Scope and constraints

### In scope

- Release the already implemented canonical Lead and Slack sync code.
- Apply the additive Supabase migration.
- Configure Vercel production secrets and Slack List mappings.
- Backfill existing source submissions.
- Enable five-minute scheduled sync.
- Verify new, duplicate and updated leads end to end.
- Provide protected aggregate health and failed-job retry operations.

### Out of scope

- Two-way Slack-to-CRM synchronization.
- Replacing the four Google Sheet sources.
- Modifying or deleting existing CRM customer records.
- Changing the staff login system or the advertising-leads page password.
- Displaying private sync diagnostics in the browser before proper server-side
  staff authentication exists.

## 6. Production recovery sequence

The order below is mandatory. Do not enable canonical CRM reads before the
database migration and initial backfill have passed validation.

### Phase A — release integrity

1. Push commit `72e8fc6` or a reviewed descendant to the intended GitHub branch.
2. Confirm the remote commit contains these production files:
   - `app/api/cron/ad-lead-sync.ts`
   - `app/api/ad-lead-sync-health.ts`
   - `app/api/ad-lead-sync-retry.ts`
   - `app/api/_lib/adLeadCanonical.ts`
   - `app/api/_lib/slackLeadPipeline.ts`
   - `app/supabase/migrations/20260809_create_ad_lead_canonical_sync.sql`
   - `app/vercel.json`
3. Preserve unrelated CRM, report-generator and product-asset changes; they must
   not be included accidentally in this release.

**Release gate:** GitHub remote SHA must equal the SHA selected for the Vercel
deployment.

### Phase B — Supabase migration

1. Review and apply
   `app/supabase/migrations/20260809_create_ad_lead_canonical_sync.sql` to project
   `gxobscepkunpusatrzaf`.
2. Confirm all six new tables exist and have RLS enabled.
3. Confirm the service role, and only the service role, can execute the internal
   import, Outbox, lease, tracking and retry RPCs.
4. Confirm the extended appointment RPC still writes the existing
   `ad_lead_tracking` and `ad_lead_appointments` records.
5. Run Supabase security and performance advisors after applying the migration.

Validation query:

```sql
select
  to_regclass('public.ad_leads') as ad_leads,
  to_regclass('public.ad_lead_submissions') as ad_lead_submissions,
  to_regclass('public.slack_sync_outbox') as slack_sync_outbox,
  to_regclass('public.ad_lead_sync_runs') as ad_lead_sync_runs,
  to_regclass('public.ad_lead_sync_leases') as ad_lead_sync_leases,
  to_regclass('public.ad_lead_review_queue') as ad_lead_review_queue;
```

Every returned value must be non-null.

### Phase C — Vercel and Slack configuration

Set the following as server-only Production variables. Do not use a `VITE_`
prefix and do not commit their values.

```text
AD_LEAD_CANONICAL_MODE=legacy
SUPABASE_URL=<existing production project URL>
SUPABASE_SERVICE_ROLE_KEY=<existing server-only key>
AD_LEAD_APPS_SCRIPT_URL=<existing read-only Apps Script URL>
AD_LEAD_READ_SECRET=<existing read secret>
CRON_SECRET=<random value, at least 16 characters>
SLACK_BOT_TOKEN=<existing bot token>
SLACK_LEAD_PIPELINE_LIST_ID=<target List ID>
SLACK_LIST_COLUMN_MAP=<JSON column mapping>
SLACK_STATUS_OPTION_MAP=<JSON status option mapping>
SLACK_OWNER_USER_MAP=<JSON Slack user mapping>
AD_LEAD_HEALTH_SECRET=<random server-only value>
AD_LEAD_RETRY_SECRET=<different random server-only value>
```

Required logical column mapping:

```json
{
  "lead": "<column-id>",
  "status": "<column-id>",
  "owner": "<column-id>",
  "phone": "<column-id>",
  "whatsapp": "<column-id>",
  "sourceForm": "<column-id>",
  "tag": "<column-id>",
  "latestSubmittedAt": "<column-id>",
  "appointmentAt": "<column-id>",
  "nextStep": "<column-id>"
}
```

The appointment column must accept rich text because it contains both Hong Kong
date and time. The Slack app must have `lists:read` and `lists:write`, and the
token must be able to access the selected List. Slack documents these scopes for
[`slackLists.items.list`](https://docs.slack.dev/reference/methods/slackLists.items.list/),
[`slackLists.items.create`](https://docs.slack.dev/reference/methods/slackLists.items.create/)
and [`slackLists.items.update`](https://docs.slack.dev/reference/methods/slackLists.items.update/).

**Configuration gate:** a read-only `slackLists.items.list` call must succeed
before the production backfill is allowed to create or update any List item.

### Phase D — deploy with legacy CRM reads

1. Deploy the exact reviewed Git commit to Vercel Production while
   `AD_LEAD_CANONICAL_MODE=legacy`.
2. Inspect the Vercel deployment and confirm the three new functions appear in
   the Build list.
3. Confirm the following response contracts:

```text
GET  /api/cron/ad-lead-sync       without secret -> 401 JSON
GET  /api/ad-lead-sync-health     without secret -> 401 JSON
GET  /api/ad-lead-sync-retry      -> 405 JSON
POST /api/ad-lead-sync-retry      without secret -> 401 JSON
```

Any `200 text/html` response means the function is still absent and the SPA
rewrite is handling the request; cutover must stop.

4. Confirm the Cron job is visible in Vercel Project Settings.
5. Confirm the Vercel team is on Pro or Enterprise before using
   `*/5 * * * *`. Current Vercel limits permit once-per-minute schedules on
   Pro/Enterprise, while Hobby is limited to once per day. See
   [Vercel Cron usage and pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing)
   and [Cron security](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

### Phase E — controlled backfill

1. Invoke the Cron endpoint once with `Authorization: Bearer <CRON_SECRET>`.
2. Verify the response reports source/import/claim/sync counts and does not
   return customer rows.
3. Verify all four configured source forms report available.
4. Inspect only aggregate database counts:
   - canonical Leads
   - submissions
   - pending/processing/completed/failed/dead-letter Outbox rows
5. Verify a sample of existing normalized telephone numbers creates one Slack
   item each.
6. Invoke Cron a second time without source changes. It must not create duplicate
   submissions or duplicate Slack items.

**Backfill gate:** no failed/dead-letter jobs, no duplicate phone matches and no
unavailable source may remain unexplained before canonical mode is enabled.

### Phase F — canonical CRM cutover

1. Change `AD_LEAD_CANONICAL_MODE` from `legacy` to `canonical`.
2. Redeploy Production so the CRM lead reader and tracking writer use the same
   canonical Lead records as Slack.
3. Confirm `/api/ad-leads` still returns the same visible Lead population and
   appointment information.
4. Change one synthetic Lead through each supported CRM action:
   - status
   - owner
   - appointment date and time
5. Confirm each action updates the same Slack item.

## 7. End-to-end acceptance tests

The work is complete only when every test below passes in Production.

1. **New lead:** add a synthetic valid lead to one configured Google Sheet tab.
   It appears in Supabase, CRM and Slack within five minutes.
2. **All sources:** repeat with one synthetic row from each of the four configured
   source tabs.
3. **Telephone deduplication:** submit the same telephone number in a different
   display format. Submission history increases, but primary Lead and Slack item
   counts do not.
4. **Newest data wins:** submit a newer name/source/tag for the same normalized
   phone. The existing Slack item is updated.
5. **CRM status:** change `未聯絡` to `WhatsApp 跟進中`; Slack reflects it on the
   same record.
6. **CRM owner:** change the owner among Terry, Ryan, Martin, Caren and New;
   Slack assignee updates correctly.
7. **Appointment:** book a slot; Slack shows both Hong Kong date and time.
8. **Retry:** force one retryable Slack failure, restore access and verify the
   next Cron run completes the same Outbox item.
9. **Permanent failure:** use an invalid test mapping and verify the job becomes
   failed/dead-letter with a sanitized error and can be requeued through the
   protected endpoint.
10. **Privacy:** Vercel and Supabase logs contain no full telephone number,
    customer payload or Slack token.

## 8. Operational health requirements

The protected health endpoint must expose aggregate operational evidence only:

- last completed run timestamp
- last run status
- per-source availability
- pending, processing, failed and dead-letter counts
- oldest pending age

It must never expose names, telephone numbers, raw sheet rows, tokens or List
column identifiers. Vercel Cron does not automatically retry failed
invocations, so retry durability must remain in the Supabase Outbox and be
processed by the next scheduled invocation.

## 9. Rollback

If canonical CRM reads fail after cutover:

1. Set `AD_LEAD_CANONICAL_MODE=legacy`.
2. Redeploy the previously verified application build.
3. Disable the Vercel Cron job only if Slack writes are unsafe or mappings are
   incorrect.
4. Keep canonical tables, submissions and Outbox rows for diagnosis.
5. Do not truncate, delete or rewrite legacy CRM tables.

Rollback is complete when the existing CRM advertising-lead page and tracking
actions work through the legacy path again. Slack synchronization may be paused,
but no customer data may be removed.

## 10. Definition of done

The feature must not be described as complete merely because local tests pass
or a Vercel deployment is marked Ready. It is complete only when:

- GitHub, Vercel and the reviewed commit SHA match.
- The new Vercel functions return API responses rather than `index.html`.
- The Supabase canonical and Outbox tables exist with RLS enabled.
- Required Vercel variables are present and Slack preflight succeeds.
- The five-minute Cron is active.
- All ten production acceptance tests pass.
- CRM, Supabase and Slack show the same latest synthetic Lead state.
