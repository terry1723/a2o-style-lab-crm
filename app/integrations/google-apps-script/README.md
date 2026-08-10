# A2O Google Apps Scripts

This folder stores the reviewed Apps Script sources for the customer assessment
writer and advertising-lead synchronizer. `AdLeadInbox.gs` remains a read-only
source reader. `AdLeadSync.gs` sends normalized rows to the Supabase Edge
Function and never writes to Slack or directly to Supabase tables.

Load `AdLeadInbox.gs` and `AdLeadSync.gs` in the same Apps Script project so
the sync coordinator can reuse the approved source configuration and
normalizer.

## Assessment writer

- Spreadsheet ID: `1Xi_u4DYkkMtpl7ClpaxwOyGjU7VAud6d8_uQGmQRHcY`
- Sheet: `工作表1`
- Expected columns: `A:O`
- New append-only fields: `N = 身高（cm）`, `O = 體重（kg）`
- Script Property: `SHARED_SECRET` (only for the existing website assessment
  writer in `Code.gs`)

Generate this secret outside source control and keep it in the server variable
used by the existing website webhook.

## Advertising lead sync properties

Add these two properties under Project Settings → Script Properties:

- `AD_LEAD_EDGE_FUNCTION_URL` — the Supabase Function URL ending in
  `/functions/v1/ad-lead-sync`.
- `AD_LEAD_INGEST_HMAC_SECRET` — a random secret shared only with the Supabase
  Function Secret of the same name.

Do not store `SLACK_BOT_TOKEN`, a Supabase service-role/secret key, customer
payloads or the Slack List mapping in Apps Script.

## Deployment and trigger installation

1. Open the approved Sheet and choose Extensions → Apps Script.
2. Keep the existing `Code.gs` assessment writer and read-only
   `AdLeadInbox.gs`.
3. Add `AdLeadSync.gs` to the same project.
4. Add the three properties above (`SHARED_SECRET`, Edge Function URL and HMAC
   secret).
5. Run `installA2OTriggers()` once while signed in as the stable A2O owner
   account and approve spreadsheet access.
6. Confirm Apps Script Executions shows one `runFiveMinuteSync` time trigger and
   one form-submit trigger per approved spreadsheet. The installer removes only
   prior triggers owned by these two handlers.
7. Deploy the existing writer as a Web App only if the assessment website uses
   `Code.gs`; the advertising sync uses installable triggers and does not need
   a public read/write web app.

The form-submit trigger provides a fast path for Google Form submissions. The
five-minute trigger is mandatory because Meta/API/script appends may not fire a
form-submit trigger. It also sends an empty batch when no Sheet row is new so
CRM status, owner and appointment changes can drain from Supabase Outbox.

## Cursor recovery

Each approved spreadsheet/tab has a `CURSOR_*` Script Property. A rejected or
timed-out Edge Function response does not advance the cursor; the next run
replays the same rows. The coordinator rereads a ten-row overlap when a source
advances, while Supabase `source_key` keeps the replay idempotent.

To perform a controlled backfill after an outage, reset only the intended
source cursor property to `0`, run `runFiveMinuteSync()` manually, and inspect
the aggregate Edge Function response before moving to the next source.

Never commit either secret, deployment URL, customer data, cursor exports or
authorization tokens.
