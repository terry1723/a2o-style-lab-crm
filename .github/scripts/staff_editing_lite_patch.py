from pathlib import Path

repo_root = Path(__file__).resolve().parents[2]
path = repo_root / 'app/src/pages/PortalStaff.tsx'
s = path.read_text()

start = s.find('  const copyWelcomeMessage = async (client: ClientData) => {')
end = s.find('  const handlePicChange = async (client: ClientData, pic: string) => {')

if start == -1 or end == -1:
    raise SystemExit('copyWelcomeMessage block not found')

new_block = r'''  const copyWelcomeMessage = async (client: ClientData) => {
    const [services, sessions] = await Promise.all([
      getClientServices(client.id),
      getServiceSessions(client.id),
    ])

    const formatDate = (value?: string) => {
      if (!value) return '待確定'
      const raw = String(value).trim()
      const date = new Date(raw)
      if (!Number.isNaN(date.getTime())) return `${date.getDate()}/${date.getMonth() + 1}`
      const match = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
      if (match) return `${Number(match[3])}/${Number(match[2])}`
      return raw
    }

    const formatTime = (value?: string) => {
      if (!value) return '待確定'
      return String(value).trim() || '待確定'
    }

    const serviceExtra = (name: string) => {
      if (name.includes('髮')) return ' 及顏色測試'
      if (name.includes('穿搭') || name.includes('造型')) return ' 包2套服裝+6套造型建議'
      return ''
    }

    const serviceLocationFallback = (name: string) => {
      if (name.includes('穿搭') || name.includes('造型')) return '荔枝角億利工業中心204'
      if (name.includes('皮膚') || name.includes('護理')) return '荔枝角'
      if (name.includes('髮')) return 'isquare一樓'
      return '待確定'
    }

    const serviceStaffLabel = (name: string) => {
      if (name.includes('髮')) return '髮形師'
      return '負責人'
    }

    const serviceBlocks = services.length
      ? services
          .filter(service => Number(service.count || 0) > 0)
          .map(service => {
            const relatedSessions = sessions.filter(session => session.service_id === service.service_id && session.status !== 'cancelled')
            const firstSession = relatedSessions[0]
            const location = firstSession?.location || serviceLocationFallback(service.name)
            const staff = firstSession?.staff || '待確定'
            const dateText = firstSession ? formatDate(firstSession.date) : '待確定'
            const timeText = firstSession ? formatTime(firstSession.time) : '待確定'
            const countText = Number(service.count || 0) > 0 ? ` x${service.count}` : ''

            if (service.name.includes('攝影') || service.name.includes('化妝')) {
              return `【${service.name}】${countText}\n${firstSession ? `日期：${dateText}\n時間：${timeText}\n地點：${location}` : '待確定'}`
            }

            const staffLine = firstSession?.staff || service.name.includes('髮') ? `\n${serviceStaffLabel(service.name)}：${staff}` : ''

            return `【${service.name}】${countText}${serviceExtra(service.name)}\n日期：${dateText}\n時間：${timeText}\n地點：${location}${staffLine}`
          })
          .join('\n\n')
      : '【服務項目】\n日期：待確定\n時間：待確定\n地點：待確定'

    const deposit = Number(client.amount_paid || 0).toLocaleString()
    const net = Number(client.balance_due || Math.max(0, Number(client.plan_price || 0) - Number(client.amount_paid || 0))).toLocaleString()

    const text = `${client.name}\nA2O Style Lab Confirmed Booking:\n================\n\n${serviceBlocks}\n\n================\n注意事項：\n1. 請【準時】到達約定地點，如遲到造型師有機會需要按原定時間完成造型指導，或於下堂補足時間。\n2. ⁠上穿搭造型指導當日，建議穿一件黑色 或 白色圓領T恤打底。\n\nDeposit: $${deposit}\nNet: $${net}`

    safeCopy(text, client.id + '_welcome')
  }

'''

s = s[:start] + new_block + s[end:]
path.write_text(s)
print('Updated copyWelcomeMessage to use actual bookings')
