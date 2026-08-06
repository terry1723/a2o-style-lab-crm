from pathlib import Path

path = Path('app/api/_lib/slackLeadList.ts')
text = path.read_text(encoding='utf-8')

old = """  if (lead.status === '未聯絡') {
    return [
      `Hi ${lead.name}，你好呀，我係 A2O Style Lab 嘅 ${lead.owner} 👋🏻`,
      '見到你啱啱完成咗我哋嘅男士形象評估。',
      '',
      '想先了解多少少，你今次最想改善嘅係：髮型、穿搭、身形比例，定係整體形象方向呢？',
      '我可以先按你嘅情況，簡單同你分析一下。',
    ].join('\\n')
  }
"""

new = """  if (lead.status === '未聯絡') {
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

if old not in text:
    raise SystemExit('old lead follow-up template not found')

path.write_text(text.replace(old, new, 1), encoding='utf-8')
