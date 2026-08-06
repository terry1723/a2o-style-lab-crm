from pathlib import Path
import re

path = Path('app/api/_lib/slackLeadList.ts')
text = path.read_text(encoding='utf-8')

replacement = """function nextStepText(lead: AdLead): string {
  if (lead.status === '未聯絡') {
    return [
      '你好 ,',
      '',
      '收到你既形象提升申請 👍🏻',
      '想同你約番個時間 做返個諮詢先。',
      '主要睇睇你嘅需要同埋你嘅五官身形等等。',
      '',
      '請問你呢個星期六或日有半小時時間嗎？',
      'https://www.instagram.com/a2o.stylelab?igsh=NXZhc3pzNWdnYndt&utm_source=qr',
      '',
      '地址：香港九龍長沙灣長沙灣道883號億利工業中心204室',
      '（鄰近荔枝角港鐵站D2出口）',
    ].join('\\n')
  }
"""

pattern = re.compile(
    r"function nextStepText\(lead: AdLead\): string \{\n"
    r"  if \(lead\.status === '未聯絡'\) \{\n"
    r".*?"
    r"  \}\n"
    r"(?=  if \(lead\.status === 'WhatsApp 跟進中'\))",
    re.S,
)

updated, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit('Could not locate the 未聯絡 nextStepText template')

path.write_text(updated, encoding='utf-8')
