from pathlib import Path

path = Path('app/api/_lib/slackLeadList.ts')
text = path.read_text(encoding='utf-8')

if 'function whatsappUrl(lead: AdLead)' in text:
    print('WhatsApp prefill patch already applied')
    raise SystemExit(0)

old = """function formatPhoneForSlack(value: unknown): string {
  const digits = normalizePhone(value)
  if (!digits) return ''
  if (digits.length === 8) return `+852${digits}`
  return `+${digits}`
}

function richText(value: string) {
"""
new = """function formatPhoneForSlack(value: unknown): string {
  const digits = normalizePhone(value)
  if (!digits) return ''
  if (digits.length === 8) return `+852${digits}`
  return `+${digits}`
}

function formatPhoneForWhatsApp(value: unknown): string {
  let digits = String(value || '').replace(/\\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.length === 8) digits = `852${digits}`
  if (digits.length < 8 || digits.length > 15) return ''
  return digits
}

function richText(value: string) {
"""
assert old in text, 'formatPhoneForSlack insertion point not found'
text = text.replace(old, new, 1)

old = """function richText(value: string) {
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

function normalizeLabel(value: unknown): string {
"""
new = """function richText(value: string) {
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

function richTextLink(text: string, url: string) {
  return [
    {
      type: 'rich_text',
      elements: [
        {
          type: 'rich_text_section',
          elements: [{ type: 'link', url, text }],
        },
      ],
    },
  ]
}

function normalizeLabel(value: unknown): string {
"""
assert old in text, 'richText insertion point not found'
text = text.replace(old, new, 1)

old = """  return '記錄未成交原因；有需要時轉入舊 Lead Reactivation。'
}

function priorityRating(lead: AdLead): number {
"""
new = """  return '記錄未成交原因；有需要時轉入舊 Lead Reactivation。'
}

function whatsappUrl(lead: AdLead): string {
  const phone = formatPhoneForWhatsApp(lead.phone)
  if (!phone) return ''
  const message = lead.status === '未聯絡' ? nextStepText(lead) : ''
  return `https://wa.me/${phone}${message ? `?text=${encodeURIComponent(message)}` : ''}`
}

function priorityRating(lead: AdLead): number {
"""
assert old in text, 'nextStepText insertion point not found'
text = text.replace(old, new, 1)

old = """function textPayload(column: SlackListColumn | undefined, value: string): FieldPayload | null {
  if (!column?.id || !value) return null
  return { column_id: column.id, rich_text: richText(value) }
}

function phonePayload(column: SlackListColumn | undefined, value: string): FieldPayload | null {
"""
new = """function textPayload(column: SlackListColumn | undefined, value: string): FieldPayload | null {
  if (!column?.id || !value) return null
  return { column_id: column.id, rich_text: richText(value) }
}

function whatsappPayload(column: SlackListColumn | undefined, lead: AdLead): FieldPayload | null {
  if (!column?.id) return null
  const url = whatsappUrl(lead)
  if (!url) return textPayload(column, lead.name)
  return {
    column_id: column.id,
    rich_text: richTextLink(`💬 WhatsApp｜${lead.name}`, url),
  }
}

function phonePayload(column: SlackListColumn | undefined, value: string): FieldPayload | null {
"""
assert old in text, 'textPayload insertion point not found'
text = text.replace(old, new, 1)

old = """    textPayload(columns.nextStep, nextStepText(lead)),
    textPayload(columns.contact, lead.name),
    phonePayload(columns.phone, lead.phone),
"""
new = """    textPayload(columns.nextStep, nextStepText(lead)),
    whatsappPayload(columns.contact, lead),
    phonePayload(columns.phone, lead.phone),
"""
assert old in text, 'buildFields contact payload not found'
text = text.replace(old, new, 1)

old = """    || !sameSelect(item, columns.stage, findStageChoice(columns.stage, lead.status))
    || !sameText(item, columns.nextStep, nextStepText(lead).slice(0, 35))
}
"""
new = """    || !sameSelect(item, columns.stage, findStageChoice(columns.stage, lead.status))
    || !sameText(item, columns.nextStep, nextStepText(lead).slice(0, 35))
    || !sameText(item, columns.contact, whatsappUrl(lead) || lead.name)
}
"""
assert old in text, 'rowNeedsUpdate block not found'
text = text.replace(old, new, 1)

old = "A2O 新 Lead 自動同步｜未聯絡 → WhatsApp 跟進中 → 已預約 → 已拒絕。新 Lead 每 5 分鐘自動新增；「後續步驟」可直接複製去 WhatsApp／IG DM。"
new = "A2O 新 Lead 自動同步｜未聯絡 → WhatsApp 跟進中 → 已預約 → 已拒絕。電話旁邊可一鍵開啟 WhatsApp；未聯絡 Lead 會自動預填「後續步驟」訊息。"
assert old in text, 'list description not found'
text = text.replace(old, new, 1)

path.write_text(text, encoding='utf-8')
print('Applied WhatsApp prefill link patch')
