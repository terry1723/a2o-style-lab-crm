import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  getAllClients, getClientServices, saveClient, saveClientServices,
  saveServiceSession, deleteServiceSession, getServiceSessions,
  type ClientData, type ServiceItem, type ServiceSession
} from '../lib/clientData'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import {
  ArrowLeft, LogOut, Search, ChevronDown, ChevronUp, Edit3,
  Plus, Minus, Copy, CheckCircle2, User, Phone, Palette, X, RefreshCw,
  Calendar, Check
} from 'lucide-react'
import ColorEditor from '../components/ColorEditor'
import ColorReport from '../components/ColorReport'
import UpcomingAppointments from '../components/UpcomingAppointments'

const PIC_OPTIONS = ['terry', 'andy', 'caren', 'ryan', 'martin']
const DEFAULT_SERVICE_LOCATION = '荔枝角億利工業中心204'

const isHairService = (name: string) => name.includes('髮')
const isPhotoOrMakeupService = (name: string) => name.includes('攝影') || name.includes('化妝')

const getDefaultLocation = (_name: string) => DEFAULT_SERVICE_LOCATION

const formatMoney = (value?: string | number | null) => Number(value || 0).toLocaleString()

const formatBookingDate = (value?: string) => {
  if (!value) return '待確定'

  const raw = String(value).trim()
  if (!raw) return '待確定'

  const dateParts = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (dateParts) return `${Number(dateParts[3])}/${Number(dateParts[2])}`

  const date = new Date(raw)
  if (!Number.isNaN(date.getTime())) return `${date.getDate()}/${date.getMonth() + 1}`

  return raw
}

const formatServiceTitle = (service: ServiceItem) => {
  let title = `【${service.name}】x${Number(service.count || 0)}`
  if (service.name.includes('髮')) title += ' 及顏色測試'
  if (service.name.includes('穿搭') || service.name.includes('造型')) title += ' 包2套服裝+6套造型建議'
  return title
}

export default function PortalStaff() {
  const navigate = useNavigate()
  const [clients, setClients] = useState<ClientData[]>([])
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingColor, setEditingColor] = useState<string | null>(null)
  const [editingServices, setEditingServices] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const [dbMode, setDbMode] = useState<'supabase' | 'local'>('local')
  const [serviceSummaries, setServiceSummaries] = useState<Record<string, string[]>>({})
  const [savingPic, setSavingPic] = useState<string | null>(null)
  const [editingProfile, setEditingProfile] = useState<string | null>(null)
  const [profileDrafts, setProfileDrafts] = useState<Record<string, Partial<ClientData>>>({})

  const buildServiceSummaries = async (clientList: ClientData[]) => {
    const entries = await Promise.all(clientList.map(async (client) => {
      const [services, sessions] = await Promise.all([
        getClientServices(client.id),
        getServiceSessions(client.id),
      ])

      const unfinished = services
        .map(service => {
          const completed = sessions.filter(session =>
            session.service_id === service.service_id && session.status === 'completed'
          ).length
          const remaining = Math.max(0, Number(service.count || 0) - completed)
          return remaining > 0 ? `${service.name}(${remaining})` : null
        })
        .filter(Boolean) as string[]

      return [client.id, unfinished.slice(0, 5)] as const
    }))

    setServiceSummaries(Object.fromEntries(entries))
  }

  const refresh = useCallback(async () => {
    setLoading(true)
    const data = await getAllClients()
    setClients(data)
    setDbMode(isSupabaseConfigured() ? 'supabase' : 'local')
    await buildServiceSummaries(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!localStorage.getItem('a2o_staff_auth')) {
      navigate('/portal')
      return
    }
    refresh()
    // Refresh on window focus
    const handleFocus = () => refresh()
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [navigate, refresh])

  const filtered = clients.filter(c => {
    const matchSearch = (c.name + c.phone).toLowerCase().includes(search.toLowerCase())
    if (filter === 'all') return matchSearch
    if (filter === 'active') return matchSearch && c.status === 'active'
    if (filter === 'completed') return matchSearch && c.status === 'completed'
    if (filter === 'color_done') return matchSearch && Boolean(c.seasonal_type)
    return matchSearch
  })

  const totalSales = clients.reduce((sum, c) => sum + Number(c.plan_price || 0), 0)
  const totalCollected = clients.reduce((sum, c) => sum + Number(c.amount_paid || 0), 0)

  const formatClientDate = (value?: string) => {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString('zh-HK', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  const handleServiceSave = async (clientId: string, services: ServiceItem[]) => {
    await saveClientServices(clientId, services)
    setEditingServices(null)
    await refresh()
  }


  const startProfileEdit = (client: ClientData) => {
    setEditingProfile(client.id)
    setProfileDrafts(prev => ({
      ...prev,
      [client.id]: {
        name: client.name || '',
        phone: client.phone || '',
        occupation: client.occupation || '',
        height: client.height || '',
        weight: client.weight || '',
        shoulder_width: client.shoulder_width || '',
        waist_size: client.waist_size || '',
        pant_length: client.pant_length || '',
        shoe_size: client.shoe_size || '',
        body_type: client.body_type || '',
        body_remark: client.body_remark || '',
        pain_point: client.pain_point || '',
        favorite_style: client.favorite_style || '',
        purpose: client.purpose || '',
        lifestyle: client.lifestyle || '',
        desired_effect: client.desired_effect || '',
        budget: client.budget || '',
        plan: client.plan || '',
        plan_price: Number(client.plan_price || 0),
        amount_paid: Number(client.amount_paid || 0),
        status: client.status || 'active',
        before_photo: client.before_photo || '',
      }
    }))
  }

  const updateProfileDraft = (clientId: string, key: keyof ClientData, value: string | number) => {
    setProfileDrafts(prev => ({
      ...prev,
      [clientId]: { ...(prev[clientId] || {}), [key]: value }
    }))
  }

  const handleProfilePhoto = (clientId: string, file?: File) => {
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => updateProfileDraft(clientId, 'before_photo', reader.result as string)
    reader.readAsDataURL(file)
  }

  const saveProfileEdit = async (client: ClientData) => {
    const draft = profileDrafts[client.id] || {}
    const price = Number(draft.plan_price || 0)
    const paid = Number(draft.amount_paid || 0)
    await saveClient({
      id: client.id,
      ...draft,
      plan_price: price,
      amount_paid: paid,
      balance_due: Math.max(0, price - paid),
    })
    setEditingProfile(null)
    await refresh()
  }

  const copyWelcomeMessage = async (client: ClientData) => {
    const [services, sessions] = await Promise.all([
      getClientServices(client.id),
      getServiceSessions(client.id),
    ])

    const activeServices = services.filter(service => Number(service.count || 0) > 0)

    const serviceBlocks = activeServices.length
      ? activeServices.map(service => {
        const serviceCount = Number(service.count || 0)
        const serviceSessions = sessions
          .filter(session => session.service_id === service.service_id && session.status !== 'cancelled')
          .sort((a, b) => `${a.date || ''} ${a.time || ''}`.localeCompare(`${b.date || ''} ${b.time || ''}`))

        if (serviceSessions.length === 0 && isPhotoOrMakeupService(service.name)) {
          return `${formatServiceTitle(service)}\n待確定`
        }

        if (serviceSessions.length === 0) {
          const staffLabel = isHairService(service.name) ? '髮形師' : '負責人'
          return [
            formatServiceTitle(service),
            '日期：待確定',
            '時間：待確定',
            `地點：${getDefaultLocation(service.name)}`,
            `${staffLabel}：待確定`,
          ].join('\n')
        }

        const bookedLines = serviceSessions.map(session => {
          const staffLabel = isHairService(service.name) ? '髮形師' : '負責人'
          return [
            `日期：${formatBookingDate(session.date)}`,
            `時間：${session.time || '待確定'}`,
            `地點：${session.location || getDefaultLocation(service.name)}`,
            `${staffLabel}：${session.staff || '待確定'}`,
          ].join('\n')
        })

        const remaining = Math.max(0, serviceCount - serviceSessions.length)
        const remainingLine = remaining > 0 ? [`尚餘 ${remaining} 次待確定`] : []

        return [
          formatServiceTitle(service),
          ...bookedLines,
          ...remainingLine,
        ].join('\n')
      }).join('\n\n')
      : '服務項目待職員更新'

    const deposit = formatMoney(client.amount_paid)
    const hasBalanceDue = client.balance_due !== null && client.balance_due !== undefined && String(client.balance_due).trim() !== ''
    const netValue = hasBalanceDue
      ? Number(client.balance_due)
      : Math.max(0, Number(client.plan_price || 0) - Number(client.amount_paid || 0))
    const net = formatMoney(netValue)

    const text = `${client.name}
A2O Style Lab Confirmed Booking:
================

${serviceBlocks}

Deposit: $${deposit}
Net: $${net}

================
注意事項：
1. 請【準時】到達約定地點，如遲到造型師有機會需要按原定時間完成造型指導，或於下堂補足時間。
2. ⁠上穿搭造型指導當日，建議穿一件黑色 或 白色圓領T恤打底。`
    safeCopy(text, client.id + '_welcome')
  }

  const handlePicChange = async (client: ClientData, pic: string) => {
    setSavingPic(client.id)

    try {
      await saveClient({ id: client.id, pic })
      setClients(prev => prev.map(c => c.id === client.id ? { ...c, pic } : c))
    } catch (err) {
      console.error('PIC save error:', err)
      alert('PIC 儲存失敗，請重新整理後再試。')
    } finally {
      setSavingPic(null)
    }
  }

  // Robust clipboard copy with fallback
  const safeCopy = async (text: string, clientId: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
      } else {
        // Fallback for non-HTTPS or older browsers
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopiedId(clientId)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Copy failed:', err)
      alert('複製失敗，請手動選取以下文字複製：\n\n' + text.slice(0, 200) + '...')
    }
  }

  const copyBodyAnalysis = (client: ClientData) => {
    const text = `📋 身型數據
================
姓名：${client.name}
身高：${client.height || '-'}cm
體重：${client.weight || '-'}kg
肩闊：${client.shoulder_width || '-'}cm
腰圍：${client.waist_size || '-'}cm
褲長：${client.pant_length || '-'}cm
鞋碼：${client.shoe_size || '-'}
身型：${client.body_type || '-'}

痛點：${client.pain_point || '-'}
目的：${client.purpose || '-'}
風格：${client.favorite_style || '-'}
希望效果：${client.desired_effect || '-'}
================`
    safeCopy(text, client.id)
  }

  const copyColorReport = (client: ClientData) => {
    const text = `🎨 顏色分析報告
================
姓名：${client.name}
季節類型：${client.seasonal_type || '尚未分析'}

${client.color_strategy ? `【核心策略】\n${client.color_strategy}\n` : ''}
${client.suitable_colors?.length ? `【適合顏色】\n${client.suitable_colors.join('、')}\n` : ''}
${client.avoid_colors?.length ? `【必須遠離】\n${client.avoid_colors.join('、')}\n` : ''}
${client.materials?.length ? `【推薦材質】\n${client.materials.join('、')}\n` : ''}
${client.metals?.length ? `【適合金屬】\n${client.metals.join('、')}\n` : ''}
${client.glasses ? `【眼鏡框】\n${client.glasses}\n` : ''}
${client.watch ? `【手錶】\n${client.watch}\n` : ''}
${client.neutral_colors?.length ? `【最佳中性色】\n${client.neutral_colors.join('、')}\n` : ''}
================`
    safeCopy(text, client.id + '_color')
  }

  const copyFullAnalysis = (client: ClientData) => {
    const text = `📋 A₂O Style Lab 客戶分析報告
================
姓名：${client.name}
電話：${client.phone}
職業：${client.occupation || '-'}

【身型數據】
身高：${client.height || '-'}cm
體重：${client.weight || '-'}kg
肩闊：${client.shoulder_width || '-'}cm
腰圍：${client.waist_size || '-'}cm
褲長：${client.pant_length || '-'}cm
鞋碼：${client.shoe_size || '-'}
身型：${client.body_type || '-'}

【風格分析】
痛點：${client.pain_point || '-'}
目的：${client.purpose || '-'}
喜愛風格：${client.favorite_style || '-'}
希望效果：${client.desired_effect || '-'}

【顏色分析】
季節類型：${client.seasonal_type || '尚未分析'}
${client.color_strategy ? `核心策略：${client.color_strategy}` : ''}
${client.suitable_colors?.length ? `適合顏色：${client.suitable_colors.join('、')}` : ''}
${client.avoid_colors?.length ? `必須遠離：${client.avoid_colors.join('、')}` : ''}
${client.materials?.length ? `推薦材質：${client.materials.join('、')}` : ''}
${client.metals?.length ? `適合金屬：${client.metals.join('、')}` : ''}
${client.glasses ? `眼鏡框：${client.glasses}` : ''}
${client.watch ? `手錶：${client.watch}` : ''}
================`
    safeCopy(text, client.id)
  }

  return (
    <div className="min-h-screen bg-a2o-beige">
      {/* Header */}
      <div className="bg-white border-b border-a2o-warm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="text-a2o-black/60 hover:text-a2o-pink">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="text-lg font-serif font-bold text-a2o-black">
              A<span className="text-a2o-pink text-xs align-super">2</span>O 後台
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider ${
              dbMode === 'supabase' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {dbMode === 'supabase' ? 'Supabase' : '本地'}
            </span>
          </div>
          <button
            onClick={() => { localStorage.removeItem('a2o_staff_auth'); navigate('/portal') }}
            className="text-sm text-a2o-black/50 hover:text-red-500 flex items-center gap-1"
          >
            <LogOut className="w-4 h-4" /> 登出
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 pb-20">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          {[
            { label: '總客戶', value: clients.length },
            { label: '進行中', value: clients.filter(c => c.status === 'active').length },
            { label: '已完成', value: clients.filter(c => c.status === 'completed').length },
            { label: '總銷售額', value: `HK${totalSales.toLocaleString()}` },
            { label: '已收款', value: `HK${totalCollected.toLocaleString()}` },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-xs text-a2o-black/50 uppercase tracking-wider">{s.label}</p>
              <p className="text-xl sm:text-2xl font-bold text-a2o-black mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        <UpcomingAppointments />

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-a2o-black/30" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-a2o-warm bg-white focus:outline-none focus:ring-2 focus:ring-a2o-pink/50 text-sm"
              placeholder="搜索姓名或電話..."
            />
          </div>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-a2o-warm bg-white text-sm focus:outline-none focus:ring-2 focus:ring-a2o-pink/50"
          >
            <option value="all">全部</option>
            <option value="active">進行中</option>
            <option value="completed">已完成</option>
            <option value="color_done">已完成顏色分析</option>
          </select>
          <button
            onClick={refresh}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl border border-a2o-warm bg-white text-sm text-a2o-black hover:bg-a2o-pink hover:text-white hover:border-a2o-pink transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">刷新</span>
          </button>
        </div>

        {/* Client List */}
        <div className="space-y-3">
          {filtered.map((client) => (
            <div key={client.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === client.id ? null : client.id)}
                className="w-full px-4 py-4 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  {client.before_photo ? (
                    <img src={client.before_photo} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-a2o-beige flex items-center justify-center">
                      <User className="w-5 h-5 text-a2o-black/30" />
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-a2o-black text-sm">{client.name}</p>
                    <p className="text-xs text-a2o-black/50 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {client.phone}
                    </p>
                  </div>
                </div>
                <div className="flex-1 px-4 hidden md:block">
                  {serviceSummaries[client.id]?.length ? (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="text-a2o-black/40">未完成：</span>
                      {serviceSummaries[client.id].map(item => (
                        <span key={item} className="px-2 py-1 rounded-full bg-a2o-beige text-a2o-black/60">
                          {item}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">全部服務已完成</span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs bg-a2o-beige px-2 py-1 rounded-full text-a2o-black/60">
                    Plan {client.plan}
                  </span>
                  {expandedId === client.id ? <ChevronUp className="w-4 h-4 text-a2o-black/40" /> : <ChevronDown className="w-4 h-4 text-a2o-black/40" />}
                </div>
              </button>

              <div className="md:hidden px-4 pb-3">
                {serviceSummaries[client.id]?.length ? (
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-a2o-black/40">未完成：</span>
                    {serviceSummaries[client.id].map(item => (
                      <span key={item} className="px-2 py-1 rounded-full bg-a2o-beige text-a2o-black/60">
                        {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">全部服務已完成</span>
                )}
              </div>

              <AnimatePresence>
                {expandedId === client.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="px-4 pb-4 border-t border-a2o-warm/50 pt-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">會員資料</span>
                        <button
                          onClick={() => editingProfile === client.id ? setEditingProfile(null) : startProfileEdit(client)}
                          className="text-xs text-a2o-pink hover:underline flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          {editingProfile === client.id ? '取消' : '編輯會員資料'}
                        </button>
                      </div>

                      {editingProfile === client.id && (
                        <div className="bg-a2o-beige rounded-xl p-3 space-y-3">
                          {(() => {
                            const d = profileDrafts[client.id] || {}
                            const field = (key: keyof ClientData, label: string, type = 'text') => (
                              <div>
                                <label className="block text-xs text-a2o-black/50 mb-1">{label}</label>
                                <input
                                  type={type}
                                  value={(d as any)[key] || ''}
                                  onChange={e => updateProfileDraft(client.id, key, type === 'number' ? Number(e.target.value) : e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg border border-a2o-warm bg-white text-sm focus:outline-none focus:ring-2 focus:ring-a2o-pink/50"
                                />
                              </div>
                            )
                            const area = (key: keyof ClientData, label: string) => (
                              <div>
                                <label className="block text-xs text-a2o-black/50 mb-1">{label}</label>
                                <textarea
                                  value={(d as any)[key] || ''}
                                  onChange={e => updateProfileDraft(client.id, key, e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg border border-a2o-warm bg-white text-sm min-h-[64px] focus:outline-none focus:ring-2 focus:ring-a2o-pink/50"
                                />
                              </div>
                            )
                            return (
                              <>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  {field('name','姓名')}{field('phone','電話')}{field('occupation','職業')}
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                                  {field('height','身高')}{field('weight','體重')}{field('shoulder_width','肩闊')}{field('waist_size','腰圍')}{field('pant_length','褲長')}{field('shoe_size','鞋碼')}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {area('body_type','身型描述')}{area('pain_point','痛點')}{area('purpose','目的')}{area('favorite_style','風格')}{area('desired_effect','希望效果')}{area('body_remark','備註')}
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                  {field('plan','Plan')}{field('plan_price','計劃價格','number')}{field('amount_paid','已付款','number')}
                                  <div>
                                    <label className="block text-xs text-a2o-black/50 mb-1">狀態</label>
                                    <select
                                      value={String(d.status || 'active')}
                                      onChange={e => updateProfileDraft(client.id, 'status', e.target.value)}
                                      className="w-full px-3 py-2 rounded-lg border border-a2o-warm bg-white text-sm"
                                    >
                                      <option value="active">進行中</option>
                                      <option value="completed">已完成</option>
                                    </select>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 bg-white rounded-lg p-3 border border-a2o-warm">
                                  {(d.before_photo || client.before_photo) ? (
                                    <img src={String(d.before_photo || client.before_photo)} className="w-16 h-16 rounded-lg object-cover" />
                                  ) : (
                                    <div className="w-16 h-16 rounded-lg bg-a2o-beige flex items-center justify-center text-xs text-a2o-black/40">相片</div>
                                  )}
                                  <input type="file" accept="image/*" onChange={e => handleProfilePhoto(client.id, e.target.files?.[0])} className="text-xs" />
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => saveProfileEdit(client)} className="px-3 py-2 bg-a2o-black text-white rounded-lg text-xs font-medium">保存會員資料</button>
                                  <button onClick={() => setEditingProfile(null)} className="px-3 py-2 border border-a2o-warm bg-white rounded-lg text-xs">取消</button>
                                </div>
                              </>
                            )
                          })()}
                        </div>
                      )}

                      {/* Basic Info */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                        <div><span className="text-a2o-black/50">身高</span> <span className="font-medium">{client.height || '-'}</span></div>
                        <div><span className="text-a2o-black/50">體重</span> <span className="font-medium">{client.weight || '-'}</span></div>
                        <div><span className="text-a2o-black/50">肩闊</span> <span className="font-medium">{client.shoulder_width || '-'}</span></div>
                        <div><span className="text-a2o-black/50">腰圍</span> <span className="font-medium">{client.waist_size || '-'}</span></div>
                        <div><span className="text-a2o-black/50">褲長</span> <span className="font-medium">{client.pant_length || '-'}</span></div>
                        <div><span className="text-a2o-black/50">鞋碼</span> <span className="font-medium">{client.shoe_size || '-'}</span></div>
                        <div><span className="text-a2o-black/50">新增日期</span> <span className="font-medium">{formatClientDate(client.created_at)}</span></div>
                      </div>

                      {/* PIC */}
                      <div className="bg-a2o-beige rounded-xl p-3">
                        <label className="block text-xs text-a2o-black/50 mb-1.5">負責 PIC</label>
                        <select
                          value={client.pic || ''}
                          onChange={(e) => handlePicChange(client, e.target.value)}
                          disabled={savingPic === client.id}
                          className="w-full px-3 py-2 rounded-lg border border-a2o-warm bg-white text-sm focus:outline-none focus:ring-2 focus:ring-a2o-pink/50 disabled:opacity-50"
                        >
                          <option value="">未分配</option>
                          {PIC_OPTIONS.map(pic => (
                            <option key={pic} value={pic}>{pic}</option>
                          ))}
                        </select>
                        {savingPic === client.id && (
                          <p className="text-xs text-a2o-black/40 mt-1">儲存中...</p>
                        )}
                      </div>

                      {/* Pain point & Purpose */}
                      <div className="bg-a2o-beige rounded-xl p-3 space-y-2 text-sm">
                        {client.pain_point && <p><span className="text-a2o-black/50">痛點：</span>{client.pain_point}</p>}
                        {client.purpose && <p><span className="text-a2o-black/50">目的：</span>{client.purpose}</p>}
                        {client.favorite_style && <p><span className="text-a2o-black/50">風格：</span>{client.favorite_style}</p>}
                      </div>

                      {/* Color Analysis */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Palette className="w-4 h-4 text-a2o-pink" />
                            <span className="font-bold text-sm">顏色分析</span>
                          </div>
                          <button
                            onClick={() => setEditingColor(editingColor === client.id ? null : client.id)}
                            className="text-xs text-a2o-pink hover:underline flex items-center gap-1"
                          >
                            <Edit3 className="w-3 h-3" />
                            {editingColor === client.id ? '取消' : '編輯'}
                          </button>
                        </div>

                        {editingColor === client.id ? (
                          <ColorEditor 
                            client={client} 
                            onSave={async (data) => {
                              await saveClient({ id: client.id, ...data })
                              setEditingColor(null)
                              await refresh()
                            }}
                            onCancel={() => setEditingColor(null)}
                          />
                        ) : client.seasonal_type ? (
                          <ColorReport client={client} />
                        ) : (
                          <p className="text-sm text-a2o-black/40">尚未進行顏色分析，點擊「編輯」開始</p>
                        )}
                      </div>

                      {/* Services */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-sm">服務管理</span>
                          <button
                            onClick={() => setEditingServices(editingServices === client.id ? null : client.id)}
                            className="text-xs text-a2o-pink hover:underline flex items-center gap-1"
                          >
                            <Edit3 className="w-3 h-3" />
                            {editingServices === client.id ? '完成' : '編輯'}
                          </button>
                        </div>
                        <ServiceEditor
                          clientId={client.id}
                          editing={editingServices === client.id}
                          onSave={(services) => handleServiceSave(client.id, services)}
                        />
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => copyBodyAnalysis(client)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-a2o-black text-white rounded-lg text-xs font-medium hover:bg-a2o-pink transition-colors"
                        >
                          {copiedId === client.id ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedId === client.id ? '已複製' : '複製身型數據'}
                        </button>
                        
                        {client.seasonal_type && (
                          <button
                            onClick={() => copyColorReport(client)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-a2o-pink text-white rounded-lg text-xs font-medium hover:bg-a2o-pink-dark transition-colors"
                          >
                            {copiedId === client.id + '_color' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedId === client.id + '_color' ? '已複製' : '複製顏色報告'}
                          </button>
                        )}
                        
                        <button
                          onClick={() => copyWelcomeMessage(client)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
                        >
                          {copiedId === client.id + '_welcome' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedId === client.id + '_welcome' ? '已複製' : '複製歡迎訊息'}
                        </button>

                        <button
                          onClick={() => copyFullAnalysis(client)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-a2o-warm text-a2o-black rounded-lg text-xs font-medium hover:bg-a2o-black hover:text-white transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          複製完整報告
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-12 text-a2o-black/40">
              <User className="w-10 h-10 mx-auto mb-3" />
              <p>暫無客戶記錄</p>
              {dbMode === 'supabase' && <p className="text-xs mt-2">已連接 Supabase，請確認表結構正確</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ServiceEditor({ clientId, editing, onSave }: { clientId: string; editing: boolean; onSave: (s: ServiceItem[]) => void }) {
  const [services, setServices] = useState<ServiceItem[]>([])
  const [sessions, setSessions] = useState<ServiceSession[]>([])
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(false)
  const [addingSession, setAddingSession] = useState<string | null>(null)
  const [newSession, setNewSession] = useState({ date: '', time: '', location: '', staff: '' })

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [svcData, sessData] = await Promise.all([
        getClientServices(clientId),
        getServiceSessions(clientId)
      ])
      setServices(svcData)
      setSessions(sessData)
      setLoading(false)
    }
    load()
  }, [clientId])

  const adjust = (sid: string, delta: number) => {
    setServices(prev => prev.map(s => s.service_id === sid ? { ...s, count: Math.max(0, s.count + delta) } : s))
  }

  const addNew = () => {
    if (!newName.trim()) return
    const sid = 'svc_' + Math.random().toString(36).slice(2, 8)
    setServices(prev => [...prev, { service_id: sid, name: newName.trim(), count: 1 }])
    setNewName('')
  }

  const remove = (sid: string) => {
    setServices(prev => prev.filter(s => s.service_id !== sid))
  }

  // Session management
  const getSvcSessions = (sid: string) => sessions.filter(s => s.service_id === sid)

  const getCompletedCount = (sid: string) => getSvcSessions(sid).filter(s => s.status === 'completed').length

  const handleAddSession = async (sid: string) => {
    if (!newSession.date || !newSession.time) {
      alert('請選擇日期和時間')
      return
    }
    const session: ServiceSession = {
      client_id: clientId,
      service_id: sid,
      date: newSession.date,
      time: newSession.time,
      location: newSession.location || '荔枝角億利工業中心204',
      staff: newSession.staff || '待定',
      status: 'scheduled'
    }
    const ok = await saveServiceSession(session)
    if (ok) {
      // 檢查數據實際儲存位置
      const { data: dbData } = await supabase.from('service_sessions').select('*').eq('client_id', clientId)
      const isInSupabase = dbData && dbData.length > 0
      
      const updated = await getServiceSessions(clientId)
      setSessions(updated)
      setAddingSession(null)
      setNewSession({ date: '', time: '', location: '', staff: '' })
      
      if (isInSupabase) {
        alert('✅ 預約已添加成功！數據已永久儲存到 Supabase 雲端。')
      } else {
        alert('⚠️ 預約已添加成功！數據暫時儲存在瀏覽器本地（localStorage）。\n\n為確保數據永久保存，請聯繫開發人員檢查 Supabase 表結構。')
      }
    } else {
      alert('❌ 添加預約失敗。')
    }
  }

const handleComplete = async (session: ServiceSession) => {
  if (!session.id) {
    alert('❌ 無法完成：此預約缺少 session ID，請刪除後重新新增預約。')
    return
  }

  const okConfirm = confirm(`確認完成這次預約？\n\n${session.date} ${session.time}\n${session.location}\n${session.staff}`)
  if (!okConfirm) return

  const updated = {
    ...session,
    status: 'completed' as const,
    completed_at: new Date().toISOString(),
  }

  const ok = await saveServiceSession(updated)

  if (ok) {
    const refreshed = await getServiceSessions(clientId)
    setSessions(refreshed)
    alert('✅ 已標記為完成')
  } else {
    alert('❌ 更新失敗，請重新整理後再試')
  }
}

  const handleDeleteSession = async (id: string) => {
    if (!confirm('確定刪除此預約？')) return
    const ok = await deleteServiceSession(id)
    if (ok) {
      const refreshed = await getServiceSessions(clientId)
      setSessions(refreshed)
    }
  }

  if (loading) return <p className="text-sm text-a2o-black/40">加載中...</p>

  if (!editing) {
    return (
      <div className="space-y-3">
        {services.map(s => {
          const svcSessions = getSvcSessions(s.service_id)
          const completed = getCompletedCount(s.service_id)
          // const scheduled = svcSessions.filter(sess => sess.status === 'scheduled').length
          return (
            <div key={s.service_id} className="bg-a2o-beige rounded-xl p-3">
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-a2o-black font-medium text-sm">{s.name}</span>
                  <span className="text-xs bg-a2o-pink/10 text-a2o-pink px-2 py-0.5 rounded-full">{completed}/{s.count} 已完成</span>
                </div>
                <span className="text-xs text-a2o-black/50">總次數: x{s.count}</span>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-a2o-warm rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-a2o-pink rounded-full transition-all"
                  style={{ width: `${Math.min(100, (completed / s.count) * 100)}%` }}
                />
              </div>

              {/* Session list */}
              {svcSessions.length > 0 && (
                <div className="space-y-1.5 mt-2">
                  {svcSessions.map(sess => (
                    <div key={sess.id} className={`flex items-center justify-between text-xs rounded-lg px-2.5 py-1.5 ${
                      sess.status === 'completed' ? 'bg-green-50 border border-green-200' : 'bg-white border border-a2o-warm'
                    }`}>
                      <div className="flex items-center gap-2">
                        {sess.status === 'completed' ? (
                          <Check className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <Calendar className="w-3.5 h-3.5 text-a2o-pink" />
                        )}
                        <span className={sess.status === 'completed' ? 'text-green-700 line-through' : 'text-a2o-black'}>
                          {sess.date} {sess.time}
                        </span>
                        <span className="text-a2o-black/50">{sess.location}</span>
                        <span className="text-a2o-black/50">{sess.staff}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {sess.status !== 'completed' && (
                          <button
                            onClick={() => handleComplete(sess)}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-600 hover:bg-green-100"
                          >
                            完成
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteSession(sess.id!)}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-400 hover:bg-red-100"
                        >
                          刪除
                        </button>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          sess.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-600'
                        }`}>
                          {sess.status === 'completed' ? '已完成' : '已預約'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add session button */}
              {addingSession === s.service_id ? (
                <div className="mt-2 bg-white rounded-lg p-2.5 border border-a2o-warm space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                      <input
                      type="date"
                      value={newSession.date ? newSession.date.replace(/\//g, '-') : ''}
                      onChange={e => setNewSession({ ...newSession, date: e.target.value.replace(/-/g, '/') })}
                      className="px-2 py-1.5 border border-a2o-warm rounded text-xs"
                    />
                    <input
                      type="time"
                      value={newSession.time}
                      onChange={e => setNewSession({ ...newSession, time: e.target.value })}
                      className="px-2 py-1.5 border border-a2o-warm rounded text-xs"
                    />
                    <input
                      type="text"
                      placeholder="地點"
                      value={newSession.location}
                      onChange={e => setNewSession({ ...newSession, location: e.target.value })}
                      className="px-2 py-1.5 border border-a2o-warm rounded text-xs"
                    />
                    <input
                      type="text"
                      placeholder="負責人"
                      value={newSession.staff}
                      onChange={e => setNewSession({ ...newSession, staff: e.target.value })}
                      className="px-2 py-1.5 border border-a2o-warm rounded text-xs"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAddSession(s.service_id)}
                      className="flex-1 py-1.5 bg-a2o-pink text-white rounded text-xs font-medium"
                    >
                      添加預約
                    </button>
                    <button
                      onClick={() => { setAddingSession(null); setNewSession({ date: '', time: '', location: '', staff: '' }) }}
                      className="px-3 py-1.5 border border-a2o-warm rounded text-xs"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingSession(s.service_id)}
                  className="mt-2 flex items-center gap-1 text-xs text-a2o-pink hover:text-a2o-pink-dark"
                >
                  <Plus className="w-3 h-3" /> 新增預約
                </button>
              )}
            </div>
          )
        })}
        {services.length === 0 && <p className="text-sm text-a2o-black/40">暫無服務項目</p>}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {services.map(s => (
        <div key={s.service_id} className="flex items-center justify-between bg-white border border-a2o-warm rounded-lg px-3 py-2 text-sm">
          <span className="text-a2o-black">{s.name}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => adjust(s.service_id, -1)} className="w-6 h-6 rounded-full bg-a2o-beige flex items-center justify-center hover:bg-a2o-pink/20">
              <Minus className="w-3 h-3" />
            </button>
            <span className="w-5 text-center font-bold">{s.count}</span>
            <button onClick={() => adjust(s.service_id, 1)} className="w-6 h-6 rounded-full bg-a2o-beige flex items-center justify-center hover:bg-a2o-pink/20">
              <Plus className="w-3 h-3" />
            </button>
            <button onClick={() => remove(s.service_id)} className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center hover:bg-red-100 ml-1">
              <X className="w-3 h-3 text-red-500" />
            </button>
          </div>
        </div>
      ))}

      <div className="flex gap-2">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addNew()}
          className="flex-1 px-3 py-2 rounded-lg border border-a2o-warm bg-white text-sm focus:outline-none focus:ring-2 focus:ring-a2o-pink/50"
          placeholder="新增服務名稱..."
        />
        <button onClick={addNew} className="px-3 py-2 bg-a2o-pink text-white rounded-lg text-sm font-medium hover:bg-a2o-pink-dark">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <button
        onClick={() => onSave(services)}
        className="w-full py-2 bg-a2o-black text-white rounded-lg text-sm font-medium hover:bg-a2o-pink transition-colors"
      >
        保存服務變更
      </button>
    </div>
  )
}
