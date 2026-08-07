from pathlib import Path

path = Path('app/api/_lib/slackLeadList.ts')
text = path.read_text(encoding='utf-8')

old = """export async function readA2OLeadListStatuses(): Promise<Record<string, AdLead['status']>> {
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
"""

new = """export async function readA2OLeadListStatuses(): Promise<Record<string, AdLead['status']>> {
  const listId = process.env.SLACK_LEAD_LIST_ID || DEFAULT_LIST_ID
  const items = await listAllItems(listId)
  const listFile = await loadListFile(listId, items)
  const schema = listFile.list_metadata?.schema || []
  const primaryColumn = findColumn(schema, COLUMN_ALIASES.primary) || schema[0]
  const stageColumn = findColumn(schema, COLUMN_ALIASES.stage) || schema[3]
  const phoneColumn = findColumn(schema, COLUMN_ALIASES.phone) || schema[7]

  if (!primaryColumn?.id || !stageColumn?.id || !phoneColumn?.id) {
    throw new Error('slack_list_status_columns_missing')
  }

  // Legacy rows created before the phone mapping fix can have no phone number.
  // Preserve a manually progressed status from those rows by matching the exact
  // Lead title (name + source) when the newer phone-backed row is still 未聯絡.
  const progressedStatusByTitle = new Map<string, AdLead['status']>()
  for (const item of items) {
    const title = normalizeLabel(fieldValues(currentField(item, primaryColumn))[0])
    const status = stageStatus(stageColumn, fieldValues(currentField(item, stageColumn)))
    if (!title || !status || status === '未聯絡') continue
    if (!progressedStatusByTitle.has(title)) progressedStatusByTitle.set(title, status)
  }

  const statuses: Record<string, AdLead['status']> = {}
  for (const item of items) {
    const phone = normalizePhone(fieldValues(currentField(item, phoneColumn))[0])
    if (!phone) continue
    const ownStatus = stageStatus(stageColumn, fieldValues(currentField(item, stageColumn)))
    if (!ownStatus) continue
    const title = normalizeLabel(fieldValues(currentField(item, primaryColumn))[0])
    const legacyProgressedStatus = title ? progressedStatusByTitle.get(title) : undefined
    statuses[phone] = ownStatus === '未聯絡' && legacyProgressedStatus
      ? legacyProgressedStatus
      : ownStatus
  }
  return statuses
}
"""

if old not in text:
    raise SystemExit('readA2OLeadListStatuses block not found')
text = text.replace(old, new, 1)

marker = """  if (sampleRows.length) items = items.filter((item) => !sampleRows.includes(item))

  const existingByPhone = new Map<string, SlackListItem>()
"""
replacement = """  if (sampleRows.length) items = items.filter((item) => !sampleRows.includes(item))

  // Remove legacy duplicate rows that have the same exact Lead title as a
  // phone-backed row but no phone themselves. This only targets the old broken
  // rows and will not merge two real Leads that both have phone numbers.
  const phoneBackedTitles = new Set(
    items
      .filter((item) => normalizePhone(fieldValues(currentField(item, columns.phone))[0]))
      .map((item) => normalizeLabel(fieldValues(currentField(item, columns.primary))[0]))
      .filter(Boolean),
  )
  const legacyDuplicateRows = items.filter((item) => {
    const phone = normalizePhone(fieldValues(currentField(item, columns.phone))[0])
    if (phone) return false
    const title = normalizeLabel(fieldValues(currentField(item, columns.primary))[0])
    return Boolean(title) && phoneBackedTitles.has(title)
  })
  for (const item of legacyDuplicateRows) {
    if (item.id) await slackApi('slackLists.items.delete', { list_id: listId, id: item.id })
  }
  if (legacyDuplicateRows.length) {
    items = items.filter((item) => !legacyDuplicateRows.includes(item))
  }

  const existingByPhone = new Map<string, SlackListItem>()
"""

if marker not in text:
    raise SystemExit('legacy duplicate insertion marker not found')
text = text.replace(marker, replacement, 1)

# Include cleanup count in diagnostics.
text = text.replace(
"""    sampleRowsRemoved: sampleRows.length,
    created,
""",
"""    sampleRowsRemoved: sampleRows.length,
    legacyDuplicateRowsRemoved: legacyDuplicateRows.length,
    created,
""",
1,
)

path.write_text(text, encoding='utf-8')
