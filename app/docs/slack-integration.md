# A2O Slack Integration

This integration polls the existing A2O lead source and Supabase CRM every five minutes, then posts operational notifications to Slack.

## Automatic notifications

- New lead → `#a2o-leads`
- Lead status or owner changed → `#a2o-leads`
- Lead still marked `未聯絡` after 15 minutes → `#a2o-leads`
- New paid client / conversion → private `#a2o-clients`
- Client plan, payment, balance or status changed → private `#a2o-clients`
- First-time sync summary → `#a2o-dashboard`

Phone numbers are masked in Slack. Full client details remain in the Staff Portal.

## Slack channels

Default channel IDs are already configured in code:

- Dashboard: `C0BN9NM39BP`
- Leads: `C0BND5QP3AN`
- Clients: `C0BNF428XQR`

They can be overridden with environment variables.

## 1. Create the Slack app

Use `slack-app-manifest.yml` to create an app named `A2O CRM Bot` in the A2O workspace.

Install the app to the workspace and copy the Bot User OAuth Token beginning with `xoxb-`.

Invite the bot into each channel, especially the private client channel:

```text
/invite @A2O CRM Bot
```

## 2. Vercel environment variables

Only one new secret is required:

```text
SLACK_BOT_TOKEN=xoxb-...
```

The integration reuses the existing variables already used by the A2O CRM:

```text
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
AD_LEAD_APPS_SCRIPT_URL=...
AD_LEAD_READ_SECRET=...
```

Recommended settings:

```text
A2O_PORTAL_URL=https://a2o-style-lab.vercel.app/#/portal/staff
SLACK_LEADS_CHANNEL_ID=C0BND5QP3AN
SLACK_CLIENTS_CHANNEL_ID=C0BNF428XQR
SLACK_DASHBOARD_CHANNEL_ID=C0BN9NM39BP
SLACK_FOLLOWUP_MINUTES=15
SLACK_REMINDER_REPEAT_HOURS=2
SLACK_FOLLOWUP_MAX_HOURS=72
SLACK_MAX_EVENTS_PER_RUN=8
```

No extra Supabase migration is required. Notification deduplication markers are stored as reserved `slack:` keys inside the existing `ad_lead_tracking` table and do not appear as customer leads.

## 3. Scheduler and authentication

The workflow `.github/workflows/slack-sync.yml` runs every five minutes.

It requests a short-lived GitHub Actions OIDC token and calls `/api/slack-sync`. The endpoint verifies:

- GitHub token issuer and signature
- Repository `terry1723/a2o-style-lab-crm`
- Main branch
- Exact Slack sync workflow

No cron secret or paid Vercel cron plan is required.

An optional `SLACK_SYNC_SECRET` or `CRON_SECRET` can still be added for manual API testing.

## 4. First run

The first successful run is a safe bootstrap. It records current leads and clients without flooding Slack, then sends one activation summary to `#a2o-dashboard`.

After bootstrap, only new records, changes and overdue follow-ups generate notifications.

## Manual test

Use the GitHub Actions page and run the `A2O Slack sync` workflow with `workflow_dispatch`.

A successful response includes `ok`, `sent`, `leads` and `clients`.

## Operating rule

Slack is the action and notification layer. Supabase / the Staff Portal remains the source of truth.

- Staff acknowledge and discuss each alert in the Slack thread.
- Staff update owner and status in the Staff Portal.
- The next sync detects the change and updates Slack automatically.
