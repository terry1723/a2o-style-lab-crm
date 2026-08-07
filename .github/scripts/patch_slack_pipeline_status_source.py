from pathlib import Path

lead_list_path = Path('app/api/_lib/slackLeadList.ts')
lead_list = lead_list_path.read_text(encoding='utf-8')

if 'export async function readA2OLeadListStatuses()' not in lead_list:
    marker = '\nexport async function syncA2OLeadList(leads: AdLead[]) {'
    helper = r'''
function stageStatus(column: SlackListColumn | undefined, values: string[]): AdLead['status'] | null {
  const statuses: AdLead['status'][] = ['未聯絡', 'WhatsApp 跟進中', '已預約', '已拒絕']
  const choices = column?.options?.choices || []

  for (const rawValue of values) {
    const choice = choices.find((item) => item.value === rawValue)
    const candidates = [rawValue, choice?.label || '', choice?.value || ''].map(normalizeLabel).filter(Boolean)
    for (const status of statuses) {
      const aliases = stageAliases(status).map(normalizeLabel)
      if (candidates.some((candidate) => aliases.includes(candidate))) return status
    }
  }
  return null
}

export async function readA2OLeadListStatuses(): Promise<Record<string, AdLead['status']>> {
  const listId = process.env.SLACK_LEAD_LIST_ID || DEFAULT_LIST_ID
  const items = await listAllItems(listId)
  const listFile = await loadListFile(listId, items)
  const schema = listFile.list_metadata?.schema || []
  const stageColumn = findColumn(schema, COLUMN_ALIASES.stage) || schema[3]
  const phoneColumn = findColumn(schema, COLUMN_ALIASES.phone) || schema[7]

  if (!stageColumn?.id || !phoneColumn?.id) throw new Error('slack_list_status_columns_missing')

  const statuses: Record<string, AdLead['status']> = {}
  for (const item of items) {
    const phone = normalizePhone(fieldValues(currentField(item, phoneColumn))[0])
    if (!phone) continue
    const status = stageStatus(stageColumn, fieldValues(currentField(item, stageColumn)))
    if (status) statuses[phone] = status
  }
  return statuses
}
'''
    if marker not in lead_list:
        raise SystemExit('syncA2OLeadList marker not found')
    lead_list = lead_list.replace(marker, '\n' + helper + marker, 1)
    lead_list_path.write_text(lead_list, encoding='utf-8')

sync_path = Path('app/api/slack-sync.ts')
sync = sync_path.read_text(encoding='utf-8')

sync = sync.replace(
    "import { syncA2OLeadList } from './_lib/slackLeadList.js'",
    "import { readA2OLeadListStatuses, syncA2OLeadList } from './_lib/slackLeadList.js'",
)

if 'function normalizeLeadPhone(value: unknown): string {' not in sync:
    channel_marker = "function channel(name: keyof typeof DEFAULT_CHANNELS): string {\n  return process.env[`SLACK_${name.toUpperCase()}_CHANNEL_ID`] || DEFAULT_CHANNELS[name]\n}\n"
    phone_helper = r'''
function normalizeLeadPhone(value: unknown): string {
  const digits = String(value || '').replace(/\D/g, '')
  if (digits.length > 8 && digits.startsWith('852')) return digits.slice(-8)
  return digits
}
'''
    if channel_marker not in sync:
        raise SystemExit('channel helper marker not found')
    sync = sync.replace(channel_marker, channel_marker + '\n' + phone_helper, 1)

old_block = """    const leads = normalizeAdLeads(source.leads, tracking)\n    const clients = (clientsResult.data || []) as ClientRow[]\n"""
new_block = """    const sourceLeads = normalizeAdLeads(source.leads, tracking)\n    let leadListStatusReadError = ''\n    let pipelineStatuses: Record<string, (typeof sourceLeads)[number]['status']> = {}\n    try {\n      pipelineStatuses = await readA2OLeadListStatuses()\n    } catch (error) {\n      leadListStatusReadError = error instanceof Error ? error.message : 'slack_list_status_read_failed'\n    }\n\n    const leads = sourceLeads.map((lead) => {\n      const pipelineStatus = pipelineStatuses[normalizeLeadPhone(lead.phone)]\n      return pipelineStatus ? { ...lead, status: pipelineStatus } : lead\n    })\n\n    const pipelineStatusUpdates = leads.filter((lead, index) => lead.status !== sourceLeads[index]?.status)\n    if (pipelineStatusUpdates.length) {\n      const { error } = await supabase.from('ad_lead_tracking').upsert(\n        pipelineStatusUpdates.map((lead) => ({\n          source_key: lead.sourceKey,\n          status: lead.status,\n          owner: lead.owner,\n        })),\n        { onConflict: 'source_key' },\n      )\n      if (error) throw error\n    }\n\n    const clients = (clientsResult.data || []) as ClientRow[]\n"""
if old_block in sync:
    sync = sync.replace(old_block, new_block, 1)
elif 'const sourceLeads = normalizeAdLeads(source.leads, tracking)' not in sync:
    raise SystemExit('lead normalization block not found')

sync = sync.replace(
    "        if (lead.status === '未聯絡'\n          && ageMinutes !== null",
    "        if (!leadListStatusReadError\n          && lead.status === '未聯絡'\n          && ageMinutes !== null",
)
sync = sync.replace(
    "      if (lead.status === '未聯絡'\n        && ageMinutes !== null",
    "      if (!leadListStatusReadError\n        && lead.status === '未聯絡'\n        && ageMinutes !== null",
)

# Surface list-read failures in API diagnostics without changing normal behavior.
if 'leadListStatusReadError,' not in sync:
    sync = sync.replace('        leadListSyncError,\n', '        leadListSyncError,\n        leadListStatusReadError,\n', 1)
    sync = sync.replace('      leadListSyncError,\n      stockBatchSync,', '      leadListSyncError,\n      leadListStatusReadError,\n      stockBatchSync,', 1)

sync_path.write_text(sync, encoding='utf-8')
