from pathlib import Path

path = Path('app/api/slack-sync.ts')
text = path.read_text()

old_import = "import { formatHkd, maskPhone, portalUrl, postSlackMessage } from './_lib/slack.js'\n"
new_import = old_import + "import { syncA2OLeadList } from './_lib/slackLeadList.js'\n"
if "syncA2OLeadList" not in text:
    if old_import not in text:
        raise SystemExit('Slack import anchor not found')
    text = text.replace(old_import, new_import, 1)

old_anchor = "    const clients = (clientsResult.data || []) as ClientRow[]\n\n    const reminderMinutes = Math.max(5, Number(process.env.SLACK_FOLLOWUP_MINUTES || 15))"
new_anchor = """    const clients = (clientsResult.data || []) as ClientRow[]

    let leadListSync: Awaited<ReturnType<typeof syncA2OLeadList>> | null = null
    let leadListSyncError = ''
    try {
      leadListSync = await syncA2OLeadList(leads)
    } catch (error) {
      leadListSyncError = error instanceof Error ? error.message : 'slack_list_sync_failed'
    }

    const reminderMinutes = Math.max(5, Number(process.env.SLACK_FOLLOWUP_MINUTES || 15))"""
if "let leadListSync:" not in text:
    if old_anchor not in text:
        raise SystemExit('Lead List insertion anchor not found')
    text = text.replace(old_anchor, new_anchor, 1)

old_bootstrap = "      response.status(200).json({ ok: true, bootstrapped: true, leads: leads.length, clients: clients.length })"
new_bootstrap = """      response.status(200).json({
        ok: true,
        bootstrapped: true,
        leads: leads.length,
        clients: clients.length,
        leadListSync,
        leadListSyncError,
      })"""
if old_bootstrap in text:
    text = text.replace(old_bootstrap, new_bootstrap, 1)

old_final = """      clients: clients.length,
      unavailableSources: source.unavailableSources,"""
new_final = """      clients: clients.length,
      leadListSync,
      leadListSyncError,
      unavailableSources: source.unavailableSources,"""
if "      leadListSync,\n      leadListSyncError,\n      unavailableSources" not in text:
    if old_final not in text:
        raise SystemExit('Final response anchor not found')
    text = text.replace(old_final, new_final, 1)

path.write_text(text)
