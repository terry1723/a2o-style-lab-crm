from pathlib import Path

path = Path('app/api/_lib/slackLeadList.ts')
text = path.read_text()
old = "  if (!payload.ok) throw new Error(`slack_api_${payload.error || 'unknown_error'}`)\n"
new = "  if (!payload.ok) throw new Error(`slack_api_${method}_${payload.error || 'unknown_error'}`)\n"
if old not in text:
    raise SystemExit('Slack API error anchor not found')
path.write_text(text.replace(old, new, 1))
