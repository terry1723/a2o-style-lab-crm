from pathlib import Path
import re

path = Path('app/api/_lib/slackLeadList.ts')
text = path.read_text()
pattern = re.compile(
    r"  const columns = Object\.fromEntries\(\n"
    r"    Object\.entries\(COLUMN_ALIASES\)\.map\(\(\[key, aliases\]\) => \[key, findColumn\(schema, aliases\)\]\),\n"
    r"  \) as Record<keyof typeof COLUMN_ALIASES, SlackListColumn \| undefined>\n"
)
replacement = """  const namedColumns = Object.fromEntries(
    Object.entries(COLUMN_ALIASES).map(([key, aliases]) => [key, findColumn(schema, aliases)]),
  ) as Record<keyof typeof COLUMN_ALIASES, SlackListColumn | undefined>
  const fallbackIndexes: Record<keyof typeof COLUMN_ALIASES, number> = {
    primary: 0,
    amount: 1,
    priority: 2,
    stage: 3,
    channel: 4,
    nextStep: 5,
    contact: 6,
    phone: 7,
    email: 8,
    owner: 9,
  }
  const columns = Object.fromEntries(
    (Object.keys(COLUMN_ALIASES) as Array<keyof typeof COLUMN_ALIASES>)
      .map((key) => [key, namedColumns[key] || schema[fallbackIndexes[key]]]),
  ) as Record<keyof typeof COLUMN_ALIASES, SlackListColumn | undefined>
"""
updated, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit(f'column mapping anchor count={count}')
path.write_text(updated)
