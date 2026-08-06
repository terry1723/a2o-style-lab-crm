from pathlib import Path

path = Path('app/api/_lib/slackLeadList.ts')
text = path.read_text()

old_normalize = """function normalizePhone(value: unknown): string {
  const digits = String(value || '').replace(/\\D/g, '')
  if (digits.length > 8 && digits.startsWith('852')) return digits.slice(-8)
  return digits
}
"""
new_normalize = """function normalizePhone(value: unknown): string {
  const digits = String(value || '').replace(/\\D/g, '')
  if (digits.length > 8 && digits.startsWith('852')) return digits.slice(-8)
  return digits
}

function formatPhoneForSlack(value: unknown): string {
  const digits = normalizePhone(value)
  if (!digits) return ''
  if (digits.length === 8) return `+852${digits}`
  return `+${digits}`
}
"""
if old_normalize not in text:
    raise SystemExit('normalize phone anchor not found')
text = text.replace(old_normalize, new_normalize, 1)

old_phone = """function phonePayload(column: SlackListColumn | undefined, value: string): FieldPayload | null {
  if (!column?.id || !value) return null
  return { column_id: column.id, phone: [value] }
}
"""
new_phone = """function phonePayload(column: SlackListColumn | undefined, value: string): FieldPayload | null {
  const formatted = formatPhoneForSlack(value)
  if (!column?.id || !formatted) return null
  return { column_id: column.id, phone: [formatted] }
}
"""
if old_phone not in text:
    raise SystemExit('phone payload anchor not found')
text = text.replace(old_phone, new_phone, 1)

old_sample = """  const sampleRows = items.filter((item) => {
    const title = fieldValues(currentField(item, columns.primary))[0] || ''
    return SAMPLE_TITLES.has(title)
  })
"""
new_sample = """  const sampleRows = items.filter((item) =>
    (item.fields || []).some((field) =>
      fieldValues(field).some((value) => SAMPLE_TITLES.has(value.trim())),
    ),
  )
"""
if old_sample not in text:
    raise SystemExit('sample row anchor not found')
text = text.replace(old_sample, new_sample, 1)

old_counters = """  let created = 0
  let updated = 0
"""
new_counters = """  let created = 0
  let updated = 0
  let createFailures = 0
  let updateFailures = 0
"""
if old_counters not in text:
    raise SystemExit('counter anchor not found')
text = text.replace(old_counters, new_counters, 1)

old_create = """      const result = await slackApi('slackLists.items.create', {
        list_id: listId,
        initial_fields: buildFields(lead, columns, leadsChannelId),
      })
      if (result.item) existingByPhone.set(phone, result.item)
      created += 1
      continue
"""
new_create = """      try {
        const result = await slackApi('slackLists.items.create', {
          list_id: listId,
          initial_fields: buildFields(lead, columns, leadsChannelId),
        })
        if (result.item) existingByPhone.set(phone, result.item)
        created += 1
      } catch {
        createFailures += 1
      }
      continue
"""
if old_create not in text:
    raise SystemExit('create loop anchor not found')
text = text.replace(old_create, new_create, 1)

old_update = """    await slackApi('slackLists.items.update', { list_id: listId, cells })
    updated += 1
"""
new_update = """    try {
      await slackApi('slackLists.items.update', { list_id: listId, cells })
      updated += 1
    } catch {
      updateFailures += 1
    }
"""
if old_update not in text:
    raise SystemExit('update loop anchor not found')
text = text.replace(old_update, new_update, 1)

old_return = """    created,
    updated,
  }
}
"""
new_return = """    created,
    updated,
    createFailures,
    updateFailures,
  }
}
"""
if old_return not in text:
    raise SystemExit('return anchor not found')
text = text.replace(old_return, new_return, 1)

path.write_text(text)
