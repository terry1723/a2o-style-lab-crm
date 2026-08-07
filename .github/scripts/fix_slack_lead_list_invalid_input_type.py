from pathlib import Path

path = Path('app/api/_lib/slackLeadList.ts')
text = path.read_text(encoding='utf-8')

# The legacy "電子郵件地址" Slack List column is an email-type column.
# Writing a WhatsApp URL to it as rich_text makes the whole create/update request
# fail with Slack's invalid_input_type. We already provide the WhatsApp deep link
# in the contact rich-text column, so omit this legacy email column entirely.
text = text.replace(
    "    linkPayload(columns.email, '開啟 WhatsApp', whatsAppUrl(lead)),\n",
    "",
    1,
)
text = text.replace(
    "    || !sameText(item, columns.email, whatsAppUrl(lead))\n",
    "",
    1,
)

path.write_text(text, encoding='utf-8')
