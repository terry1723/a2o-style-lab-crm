from pathlib import Path

path = Path('app/api/slack-sync.ts')
text = path.read_text()
old = "const OBJECTIVES_LIST_SETUP_KEY = 'slack:objectives-list:2026-08-07-01'"
new = "const OBJECTIVES_LIST_SETUP_KEY = 'slack:objectives-list:simple-dashboard-2026-08-07-01'"
if new not in text:
    if old not in text:
        raise SystemExit('objectives list setup key anchor not found')
    text = text.replace(old, new, 1)
path.write_text(text)
