from pathlib import Path

path = Path('app/api/slack-sync.ts')
text = path.read_text()
old = "const OBJECTIVES_LIST_SETUP_KEY = 'slack:objectives-list:simple-dashboard-2026-08-07-01'"
new = "const OBJECTIVES_LIST_SETUP_KEY = 'slack:objectives-list:august-weekly-dashboard-and-kpi-2026-08-06-01'"
if old not in text:
    raise SystemExit('objectives setup key not found')
path.write_text(text.replace(old, new, 1))
