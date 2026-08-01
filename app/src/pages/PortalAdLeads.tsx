import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import {
  AD_LEAD_APPOINTMENT_SLOTS,
  AD_LEAD_OWNERS,
  AD_LEAD_STATUSES,
  type AdLead,
  type AdLeadAppointment,
  type AdLeadAppointmentSlot,
  type AdLeadOwner,
  type AdLeadStatus,
  monthHalfDates,
} from '../features/ad-leads/adLeadService'

type AdLeadsResponse = {
  leads?: AdLead[]
  appointments?: AdLeadAppointment[]
  unavailableSources?: string[]
}

const LEADS_PER_PAGE = 20
const AD_LEADS_PASSWORD = '8964'
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function formatSubmittedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-HK', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

function localDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function calendarCells(year: number, monthIndex: number, half: 'first' | 'second') {
  const dates = monthHalfDates(year, monthIndex, half)
  const firstDay = new Date(`${dates[0]}T00:00:00`).getDay()
  const cells: Array<string | null> = [...Array.from({ length: firstDay }, () => null), ...dates]
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function formatAppointmentOption(date: string, time: string) {
  const parsed = new Date(`${date}T00:00:00`)
  return `${parsed.getMonth() + 1}/${parsed.getDate()}（${WEEKDAYS[parsed.getDay()]}）${time}`
}

export default function PortalAdLeads() {
  const navigate = useNavigate()
  const [leads, setLeads] = useState<AdLead[]>([])
  const [appointments, setAppointments] = useState<AdLeadAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [password, setPassword] = useState('')
  const [hasAccess, setHasAccess] = useState(() => sessionStorage.getItem('a2o_ad_leads_access') === 'true')
  const [passwordError, setPasswordError] = useState('')
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })
  const [calendarHalf, setCalendarHalf] = useState<'first' | 'second'>(() => new Date().getDate() <= 15 ? 'first' : 'second')

  const pageCount = Math.max(1, Math.ceil(leads.length / LEADS_PER_PAGE))
  const visibleLeads = useMemo(
    () => leads.slice((page - 1) * LEADS_PER_PAGE, page * LEADS_PER_PAGE),
    [leads, page],
  )
  const appointmentBySourceKey = useMemo(
    () => new Map(appointments.map((appointment) => [appointment.sourceKey, appointment])),
    [appointments],
  )
  const appointmentBySlot = useMemo(
    () => new Map(appointments.map((appointment) => [`${appointment.appointmentDate}|${appointment.appointmentTime}`, appointment])),
    [appointments],
  )
  const selectedCalendarCells = useMemo(
    () => calendarCells(calendarMonth.getFullYear(), calendarMonth.getMonth(), calendarHalf),
    [calendarHalf, calendarMonth],
  )
  const availableAppointmentOptions = useMemo(() => {
    const now = new Date()
    const today = localDateString(now)
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const options: Array<{ date: string; time: AdLeadAppointmentSlot }> = []

    for (let offset = 0; offset < 90; offset += 1) {
      const dateObject = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset)
      const date = localDateString(dateObject)
      AD_LEAD_APPOINTMENT_SLOTS.forEach((time) => {
        if ((date > today || (date === today && time > currentTime)) && !appointmentBySlot.has(`${date}|${time}`)) {
          options.push({ date, time })
        }
      })
    }
    return options
  }, [appointmentBySlot])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/ad-leads', { method: 'GET' })
      if (!response.ok) throw new Error('load_failed')
      const data = await response.json() as AdLeadsResponse
      setLeads(data.leads || [])
      setAppointments(data.appointments || [])
      setPage(1)
    } catch {
      setError('載入廣告新客失敗，請稍後再試。')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!localStorage.getItem('a2o_staff_auth_v2')) {
      navigate('/portal')
      return
    }

    if (hasAccess) load()
    else setLoading(false)
  }, [hasAccess, load, navigate])

  const unlock = () => {
    if (password !== AD_LEADS_PASSWORD) {
      setPasswordError('密碼不正確，請再試。')
      return
    }
    sessionStorage.setItem('a2o_ad_leads_access', 'true')
    setPasswordError('')
    setHasAccess(true)
  }

  const updateTracking = async (
    lead: AdLead,
    changes: Partial<Pick<AdLead, 'status' | 'owner'>>,
    appointment?: { appointmentDate: string; appointmentTime: AdLeadAppointmentSlot },
  ) => {
    const nextLead = { ...lead, ...changes }
    setSavingKey(lead.sourceKey)
    setError('')

    try {
      const response = await fetch('/api/ad-lead-tracking', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceKey: lead.sourceKey,
          status: nextLead.status,
          owner: nextLead.owner,
          ...(appointment || {}),
        }),
      })
      const data = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) {
        if (data.error === 'appointment_slot_taken') {
          setError('此時段剛剛已被預約，請選擇其他時間。')
          await load()
          return
        }
        throw new Error('save_failed')
      }
      setLeads(current => current.map(item => item.sourceKey === lead.sourceKey ? nextLead : item))
      if (appointment) {
        setAppointments(current => [
          ...current.filter(item => item.sourceKey !== lead.sourceKey),
          { sourceKey: lead.sourceKey, ...appointment },
        ])
      }
    } catch {
      setError('儲存跟進資料失敗，請稍後再試。')
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <div className="min-h-screen bg-a2o-beige text-a2o-black">
      <div className="bg-white border-b border-a2o-warm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/portal/staff')} className="text-a2o-black/60 hover:text-a2o-pink" aria-label="返回後台">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="text-lg font-serif font-bold">廣告新客</div>
            <p className="text-xs text-a2o-black/40">管理廣告表單提交及跟進狀況</p>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto p-4 pb-20">
        {!hasAccess ? (
          <section className="mx-auto mt-10 max-w-md rounded-2xl bg-white p-6 shadow-sm">
            <h1 className="font-serif text-xl font-bold">廣告新客保護頁面</h1>
            <p className="mt-2 text-sm text-a2o-black/50">請輸入密碼以查看廣告表單提交資料。</p>
            <label className="mt-5 block text-sm font-medium" htmlFor="ad-leads-password">廣告新客密碼</label>
            <input id="ad-leads-password" type="password" value={password} onChange={event => setPassword(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') unlock() }} className="mt-2 w-full rounded-lg border border-a2o-warm px-3 py-2" />
            {passwordError && <p role="alert" className="mt-2 text-sm text-red-600">{passwordError}</p>}
            <button type="button" onClick={unlock} className="mt-4 w-full rounded-lg bg-a2o-black px-4 py-2 text-sm font-medium text-white">進入廣告新客</button>
          </section>
        ) : <>
        {error && (
          <div role="alert" className="mb-4 bg-red-50 border border-red-100 text-red-700 rounded-xl p-3 text-sm flex items-center justify-between gap-3">
            <span>{error}</span>
            <button type="button" onClick={load} className="shrink-0 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50">
              重新載入
            </button>
          </div>
        )}

        <section aria-labelledby="appointment-calendar-title" className="mb-5 rounded-xl bg-white p-4 shadow-sm">
          <div className="mx-auto max-w-[680px]">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="appointment-calendar-title" className="font-serif text-xl font-bold">預約時間表</h2>
                <p className="mt-1 text-xs text-a2o-black/50">可截圖發送予客人・已預約時段不顯示客人姓名</p>
              </div>
              <div className="flex items-center rounded-lg border border-a2o-warm p-1 text-xs">
                <button type="button" onClick={() => setCalendarHalf('first')} className={`rounded-md px-3 py-1.5 ${calendarHalf === 'first' ? 'bg-a2o-black text-white' : 'text-a2o-black/60'}`}>1–15 日</button>
                <button type="button" onClick={() => setCalendarHalf('second')} className={`rounded-md px-3 py-1.5 ${calendarHalf === 'second' ? 'bg-a2o-black text-white' : 'text-a2o-black/60'}`}>16–月尾</button>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-y border-a2o-warm py-2">
              <button type="button" aria-label="上一個月" onClick={() => setCalendarMonth(current => new Date(current.getFullYear(), current.getMonth() - 1, 1))} className="rounded-md p-1 text-a2o-black/60 hover:bg-a2o-beige"><ChevronLeft className="h-4 w-4" /></button>
              <p className="text-sm font-semibold">{calendarMonth.getFullYear()} 年 {calendarMonth.getMonth() + 1} 月</p>
              <button type="button" aria-label="下一個月" onClick={() => setCalendarMonth(current => new Date(current.getFullYear(), current.getMonth() + 1, 1))} className="rounded-md p-1 text-a2o-black/60 hover:bg-a2o-beige"><ChevronRight className="h-4 w-4" /></button>
            </div>

            <div className="grid grid-cols-7 border-l border-t border-a2o-warm">
              {WEEKDAYS.map((weekday) => <div key={weekday} className="border-b border-r border-a2o-warm bg-a2o-beige px-1 py-2 text-center text-[10px] font-semibold text-a2o-black/60">{weekday}</div>)}
              {selectedCalendarCells.map((date, index) => (
                <div key={date || `blank-${index}`} className="min-h-36 border-b border-r border-a2o-warm p-1">
                  {date && <>
                    <p className="mb-1 text-center text-xs font-medium">{Number(date.slice(-2))}</p>
                    <div className="space-y-1">
                      {AD_LEAD_APPOINTMENT_SLOTS.map((time) => {
                        const booked = appointmentBySlot.get(`${date}|${time}`)
                        return <div key={time} className={`rounded-sm px-1 py-0.5 text-center text-[9px] leading-tight ${booked ? 'bg-a2o-pink text-white' : 'bg-a2o-black text-white'}`}>{booked ? '已預約' : time}</div>
                      })}
                    </div>
                  </>}
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-3 text-[10px] text-a2o-black/55"><span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-a2o-black" />可預約</span><span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-a2o-pink" />已預約</span></div>
          </div>
        </section>

        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-a2o-black/40 flex justify-center items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> 載入中...</div>
          ) : (
            <table className="w-full min-w-[1100px] table-fixed text-sm">
              <thead className="bg-a2o-beige text-left text-xs text-a2o-black/60">
                <tr>
                  <th className="w-36 px-4 py-3 font-medium">姓名</th>
                  <th className="w-40 px-4 py-3 font-medium">電話號碼</th>
                  <th className="w-56 px-4 py-3 font-medium">填表日期</th>
                  <th className="w-36 px-4 py-3 font-medium">來源 Form</th>
                  <th className="w-44 px-4 py-3 font-medium">Tag</th>
                  <th className="w-40 px-4 py-3 font-medium">客人狀況</th>
                  <th className="w-32 px-4 py-3 font-medium">跟進同事</th>
                  <th className="w-52 px-4 py-3 font-medium">預約日期及時間</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-a2o-warm">
                {visibleLeads.map(lead => (
                  <tr key={lead.sourceKey}>
                    <td className="px-4 py-3 font-medium"><div className="truncate whitespace-nowrap" title={lead.name}>{lead.name}</div></td>
                    <td className="px-4 py-3 whitespace-nowrap">{lead.phone}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatSubmittedAt(lead.submittedAt)}</td>
                    <td className="px-4 py-3"><div className="truncate whitespace-nowrap" title={lead.source || '-'}>{lead.source || '-'}</div></td>
                    <td className="px-4 py-3"><div className="truncate whitespace-nowrap" title={lead.tag || '-'}>{lead.tag || '-'}</div></td>
                    <td className="px-4 py-3">
                      <select
                        aria-label={`${lead.name} 的客人狀況`}
                        value={lead.status}
                        disabled={savingKey === lead.sourceKey}
                        onChange={event => updateTracking(lead, { status: event.target.value as AdLeadStatus })}
                        className="w-full min-w-32 rounded-lg border border-a2o-warm bg-white px-2 py-1.5 text-xs disabled:opacity-50"
                      >
                        {AD_LEAD_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        aria-label={`${lead.name} 的跟進同事`}
                        value={lead.owner}
                        disabled={savingKey === lead.sourceKey}
                        onChange={event => updateTracking(lead, { owner: event.target.value as AdLeadOwner })}
                        className="w-full min-w-24 rounded-lg border border-a2o-warm bg-white px-2 py-1.5 text-xs disabled:opacity-50"
                      >
                        {AD_LEAD_OWNERS.map(owner => <option key={owner} value={owner}>{owner}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const currentAppointment = appointmentBySourceKey.get(lead.sourceKey)
                        const currentValue = currentAppointment ? `${currentAppointment.appointmentDate}|${currentAppointment.appointmentTime}` : ''
                        const options = currentAppointment && !availableAppointmentOptions.some(option => `${option.date}|${option.time}` === currentValue)
                          ? [{ date: currentAppointment.appointmentDate, time: currentAppointment.appointmentTime }, ...availableAppointmentOptions]
                          : availableAppointmentOptions
                        return <select
                          aria-label={`${lead.name} 的預約時間`}
                          value={currentValue}
                          disabled={savingKey === lead.sourceKey}
                          onChange={event => {
                            if (!event.target.value) return
                            const [appointmentDate, appointmentTime] = event.target.value.split('|')
                            updateTracking(lead, { status: '已預約' }, { appointmentDate, appointmentTime: appointmentTime as AdLeadAppointmentSlot })
                          }}
                          className="w-full min-w-44 rounded-lg border border-a2o-warm bg-white px-2 py-1.5 text-xs disabled:opacity-50"
                        >
                          <option value="">選擇時段</option>
                          {options.map(option => <option key={`${option.date}|${option.time}`} value={`${option.date}|${option.time}`}>{formatAppointmentOption(option.date, option.time)}</option>)}
                        </select>
                      })()}
                    </td>
                  </tr>
                ))}
                {!leads.length && (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-a2o-black/40">暫時未有廣告新客</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        {!loading && leads.length > LEADS_PER_PAGE && (
          <nav aria-label="廣告新客分頁" className="mt-4 flex items-center justify-between gap-3 text-sm">
            <span className="text-a2o-black/50">第 {page} / {pageCount} 頁・共 {leads.length} 位客人</span>
            <div className="flex gap-2">
              <button type="button" disabled={page === 1} onClick={() => setPage(current => Math.max(1, current - 1))} className="rounded-lg border border-a2o-warm bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40">上一頁</button>
              <button type="button" disabled={page === pageCount} onClick={() => setPage(current => Math.min(pageCount, current + 1))} className="rounded-lg border border-a2o-warm bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40">下一頁</button>
            </div>
          </nav>
        )}
        </>}
      </main>
    </div>
  )
}
