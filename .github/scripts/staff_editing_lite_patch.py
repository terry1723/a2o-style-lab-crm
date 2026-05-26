from pathlib import Path

repo_root = Path(__file__).resolve().parents[2]
path = repo_root / 'app/src/pages/PortalStaff.tsx'
s = path.read_text()

start = s.find('  const copyWelcomeMessage = async (client: ClientData) => {')
end = s.find('  const handlePicChange = async (client: ClientData, pic: string) => {')

if start == -1 or end == -1:
    raise SystemExit('copyWelcomeMessage block not found')

new_block = r'''  const copyWelcomeMessage = async (client: ClientData) => {
    const text = `A2O Style Lab Confirmed Booking:\n================\n\n【專屬髮型設計】 x 2 及顏色測試\n日期：5/6 待確定\n時間：待定\n地點：isquare一樓\n髮形師：Jerry\n\n【穿搭教學】 包2套服裝+6套造型建議\n日期：待確定\n時間：待確定\n地點：荔枝角億利工業中心204\n\n【皮膚護理】 x1\n日期：待定\n時間：待定\n地點：荔枝角\n\n攝影：\n待確定\n\n================\n注意事項：\n1. 請【準時】到達約定地點，如遲到造型師有機會需要按原定時間完成造型指導，或於下堂補足時間。\n2. ⁠上穿搭造型指導當日，建議穿一件黑色 或 白色圓領T恤打底。`

    safeCopy(text, client.id + '_welcome')
  }

'''

s = s[:start] + new_block + s[end:]
path.write_text(s)
print('Updated copyWelcomeMessage confirmed booking format')
