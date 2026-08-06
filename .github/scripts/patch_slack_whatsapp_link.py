from pathlib import Path

path = Path('app/api/_lib/slackLeadList.ts')
text = path.read_text()

text = text.replace(
"  email: ['電子郵件地址', 'Email', '電郵'],",
"  email: ['WhatsApp 連結', 'WhatsApp', '電子郵件地址', 'Email', '電郵'],",
)

needle = """function richText(value: string) {
  return [
    {
      type: 'rich_text',
      elements: [
        {
          type: 'rich_text_section',
          elements: [{ type: 'text', text: value }],
        },
      ],
    },
  ]
}
"""
replacement = needle + """
function richTextLink(label: string, url: string) {
  return [
    {
      type: 'rich_text',
      elements: [
        {
          type: 'rich_text_section',
          elements: [{ type: 'link', text: label, url }],
        },
      ],
    },
  ]
}
"""
if 'function richTextLink(' not in text:
    text = text.replace(needle, replacement)

needle = """function textPayload(column: SlackListColumn | undefined, value: string): FieldPayload | null {
  if (!column?.id || !value) return null
  return { column_id: column.id, rich_text: richText(value) }
}
"""
replacement = needle + """
function linkPayload(column: SlackListColumn | undefined, label: string, url: string): FieldPayload | null {
  if (!column?.id || !url) return null
  return { column_id: column.id, rich_text: richTextLink(label, url) }
}
"""
if 'function linkPayload(' not in text:
    text = text.replace(needle, replacement)

needle = """function priorityRating(lead: AdLead): number {
"""
insert = """function whatsAppUrl(lead: AdLead): string {
  const digits = String(lead.phone || '').replace(/\\D/g, '')
  const internationalPhone = digits.length === 8 ? `852${digits}` : digits
  return `https://wa.me/${internationalPhone}?text=${encodeURIComponent(nextStepText(lead))}`
}

"""
if 'function whatsAppUrl(' not in text:
    text = text.replace(needle, insert + needle)

text = text.replace(
"""    phonePayload(columns.phone, lead.phone),
    userPayload(columns.owner, OWNER_USER_IDS[lead.owner]),
""",
"""    phonePayload(columns.phone, lead.phone),
    linkPayload(columns.email, '開啟 WhatsApp', whatsAppUrl(lead)),
    userPayload(columns.owner, OWNER_USER_IDS[lead.owner]),
""",
)

text = text.replace(
"""    || !sameText(item, columns.nextStep, nextStepText(lead).slice(0, 35))
""",
"""    || !sameText(item, columns.nextStep, nextStepText(lead).slice(0, 35))
    || !sameText(item, columns.email, whatsAppUrl(lead))
""",
)

path.write_text(text)
