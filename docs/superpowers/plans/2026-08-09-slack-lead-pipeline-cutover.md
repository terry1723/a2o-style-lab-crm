# A2O Lead Pipeline production cutover checklist

The code and tests for the CRM/Supabase → Slack one-way pipeline are kept in
the implementation branch. Production will not start syncing until the
following external steps are completed deliberately.

## 1. Supabase

Run [20260809_create_ad_lead_canonical_sync.sql](../../../app/supabase/migrations/20260809_create_ad_lead_canonical_sync.sql)
once in the A2O Supabase SQL editor. Confirm that the new tables and RPCs are
present before enabling canonical mode. The migration is additive: it keeps
the existing tracking, appointment, CRM and login tables intact.

## 2. Vercel server variables

Set these as server-side variables for the production deployment. Never place
the values in the repository or any `VITE_`/`NEXT_PUBLIC_` variable.

```text
AD_LEAD_CANONICAL_MODE=canonical
SUPABASE_URL=<existing project URL>
SUPABASE_SERVICE_ROLE_KEY=<server-only key>
AD_LEAD_APPS_SCRIPT_URL=<read-only Apps Script web-app URL>
AD_LEAD_READ_SECRET=<Apps Script read secret>
CRON_SECRET=<Vercel Cron bearer secret>
SLACK_BOT_TOKEN=<Slack bot token with lists:read and lists:write>
SLACK_LEAD_PIPELINE_LIST_ID=<A2O Lead Pipeline List ID>
SLACK_LIST_COLUMN_MAP=<JSON mapping of configured column IDs>
SLACK_STATUS_OPTION_MAP=<JSON mapping of the four status option IDs>
SLACK_OWNER_USER_MAP=<JSON mapping of Terry/Ryan/Martin/Caren/New Slack user IDs>
AD_LEAD_HEALTH_SECRET=<server-only health secret>
AD_LEAD_RETRY_SECRET=<server-only retry secret>
```

`SLACK_OWNER_USER_MAP` accepts either the display-name keys (`Ryan`) or the
lowercase keys (`ryan`) used in the original spec. The appointment column must
be a Slack text/rich-text column because it includes both date and time.

## 3. Deploy and smoke test

The app's `vercel.json` schedules `/api/cron/ad-lead-sync` every five minutes.
After deploying the branch:

1. Call the Cron endpoint with `Authorization: Bearer <CRON_SECRET>` and
   confirm it reports `imported`, `claimed`, and `synced` counts.
2. Add one synthetic row to each configured source sheet. Confirm the CRM
   page and Slack List each receive one item within one Cron interval.
3. Submit an equivalent phone format again. Confirm the existing Slack item is
   updated rather than a second item being created.
4. Change status, owner and appointment in CRM. Confirm the same Slack item is
   updated, including the appointment time.
5. Query the protected health endpoint with `AD_LEAD_HEALTH_SECRET`; inspect
   only aggregate counts and timestamps.
6. If a worker failure creates a failed/dead-letter row, requeue it through the
   protected retry endpoint with `AD_LEAD_RETRY_SECRET` and rerun Cron.

## Rollback

Set `AD_LEAD_CANONICAL_MODE=legacy` and disable the Cron schedule if the
preview smoke test fails. Keep the canonical tables and outbox rows for
diagnosis; do not delete or truncate existing CRM data.
