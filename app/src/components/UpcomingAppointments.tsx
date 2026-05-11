import { useEffect, useState } from 'react'
import { getAllClients, getClientServices, getServiceSessions } from '../lib/clientData'

type UpcomingItem = {
  id: string
  clientName: string
  phone: string
  serviceName: string
  date: string
  time: string
  location: string
  staff: string
}

function parseAppointmentDate(dateText?: string, timeText?: string) {
  if (!dateText) return null
  const normalizedDate = dateText.replace(/\//g, '-')
  const normalizedTime = timeText || '00:00'
  const date = new Date(`${normalizedDate}T${normalizedTime}`)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatAppointmentDate(dateText?: string, timeText?: string) {
  const date = parseAppointmentDate(dateText, timeText)
  if (!date) return [dateText, timeText].filter(Boolean).join(' ') || '-'
  return date.toLocaleString('zh-HK', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export default function UpcomingAppointments() {
  const [items, setItems] = useState<UpcomingItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const clients = await getAllClients()
      const now = new Date()
      now.setHours(0, 0, 0, 0)
      const monthLater = new Date(now)
      monthLater.setDate(monthLater.getDate() + 30)

      const groups = await Promise.all(clients.map(async (client) => {
        const [services, sessions] = await Promise.all([
          getClientServices(client.id),
          getServiceSessions(client.id),
        ])
        const serviceNameById = Object.fromEntries(services.map(service => [service.service_id, service.name]))

        return sessions
          .filter(session => session.status === 'scheduled')
          .map(session => {
            const appointmentDate = parseAppointmentDate(session.date, session.time)
            if (!appointmentDate || appointmentDate < now || appointmentDate > monthLater) return null
            return {
              id: session.id || `${client.id}-${session.service_id}-${session.date}-${session.time}`,
              clientName: client.name,
              phone: client.phone,
              serviceName: serviceNameById[session.service_id] || session.service_id,
              date: session.date,
              time: session.time,
              location: session.location || '-',
              staff: session.staff || client.pic || '待定',
            } as UpcomingItem
          })
          .filter(Boolean) as UpcomingItem[]
      }))

      setItems(groups.flat().sort((a, b) => {
        const dateA = parseAppointmentDate(a.date, a.time)?.getTime() || 0
        const dateB = parseAppointmentDate(b.date, b.time)?.getTime() || 0
        return dateA - dateB
      }))
      setLoading(false)
    }

    load()
  }, [])

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm mb-6">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="font-bold text-a2o-black text-sm sm:text-base">未來 30 日預約</h2>
          <p className="text-xs text-a2o-black/40 mt-0.5">快速查看即將要跟進的客戶工作</p>
        </div>
        <span className="text-xs px-2 py-1 rounded-full bg-a2o-beige text-a2o-black/60">
          {loading ? '載入中' : `${items.length} 個`}
        </span>
      </div>

      {loading ? (
        <div className="rounded-xl border border-dashed border-a2o-warm p-4 text-sm text-a2o-black/40 text-center">
          載入未來預約中...
        </div>
      ) : items.length > 0 ? (
        <div className="space-y-2">
          {items.slice(0, 12).map(item => (
            <div key={item.id} className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr_1fr_0.9fr] gap-1 md:gap-3 rounded-xl border border-a2o-warm/70 bg-a2o-beige/60 px-3 py-2 text-xs sm:text-sm">
              <div>
                <span className="font-semibold text-a2o-black">{item.clientName}</span>
                <span className="text-a2o-black/45 ml-2">{item.phone}</span>
              </div>
              <div className="text-a2o-black/70">{item.serviceName}</div>
              <div className="font-medium text-a2o-pink">{formatAppointmentDate(item.date, item.time)}</div>
              <div className="text-a2o-black/50 truncate">{item.location} · {item.staff}</div>
            </div>
          ))}
          {items.length > 12 && (
            <p className="text-xs text-a2o-black/40 pt-1">尚有 {items.length - 12} 個預約未顯示</p>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-a2o-warm p-4 text-sm text-a2o-black/40 text-center">
          未來 30 日暫無已預約工作
        </div>
      )}
    </div>
  )
}
