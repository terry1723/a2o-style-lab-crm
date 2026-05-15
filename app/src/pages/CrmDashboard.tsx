import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getLoggedInUser, logoutUser, getClientByPhone, getClientServices, getServiceSessions, type ClientData, type ServiceItem, type ServiceSession, type UserAccount } from '../lib/clientData'
import { ArrowLeft, LogOut, MessageCircle, Palette, Scissors, Shirt, Camera, Clock, Sparkles } from 'lucide-react'
import MemberPicks from '../components/MemberPicks'

const serviceIcons: Record<string, any> = {
  'styling_advice': Palette,
  'styling_clothing': Shirt,
  'styling_course': Shirt,
  'hair_design': Scissors,
  'photography': Camera,
  'skin_cleaning': Sparkles,
  'small_face': Palette,
}

type DashboardTab = 'progress' | 'member-picks'

export default function CrmDashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const recommendedProductId = new URLSearchParams(location.search).get('product')
  const [client, setClient] = useState<ClientData | null>(null)
  const [services, setServices] = useState<ServiceItem[]>([])
  const [sessions, setSessions] = useState<ServiceSession[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<DashboardTab>(recommendedProductId ? 'member-picks' : 'progress')
  const [user] = useState<UserAccount | null>(() => getLoggedInUser())

  useEffect(() => {
    let cancelled = false

    if (!user) {
      const redirectPath = `/crm/dashboard${location.search || ''}`
      navigate(`/crm/login?redirect=${encodeURIComponent(redirectPath)}`)
      return
    }

    const load = async () => {
      try {
        const found = await getClientByPhone(user.phone)
        if (cancelled) return
        setClient(found)

        if (found) {
          const [svcs, sess] = await Promise.all([
            getClientServices(found.id),
            getServiceSessions(found.id),
          ])
          if (cancelled) return
          setServices(svcs)
          setSessions(sess)
        } else {
          setServices([])
          setSessions([])
        }
      } catch (err) {
        console.error('CRM dashboard load error:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [navigate, user, location.search])

  if (loading) {
    return (
      <div className="min-h-screen bg-a2o-beige flex items-center justify-center">
        <div className="animate-pulse text-a2o-pink">加載中...</div>
      </div>
    )
  }

  if (!user) return null

  const calculateProgress = () => {
    if (!client) return 0
    if (client.status === 'completed') return 100
    if (services.length === 0) return 0
    const hasServices = services.some(s => s.count > 0)
    if (!hasServices) return 0
    return 0
  }

  const serviceStatus = calculateProgress()
  const pageWidthClass = client && activeTab === 'member-picks' ? 'max-w-[1500px]' : 'max-w-3xl'

  return (
    <div className="min-h-screen bg-a2o-beige">
      <div className="bg-white border-b border-a2o-warm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm text-a2o-black/60 hover:text-a2o-pink">
            <ArrowLeft className="w-4 h-4" /> 首頁
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-a2o-black/60">{user.name} · {user.phone}</span>
            <button onClick={() => { logoutUser(); navigate('/crm/login') }} className="text-sm text-a2o-black/40 hover:text-red-500 flex items-center gap-1">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className={`${pageWidthClass} mx-auto p-4 md:px-8 pb-20 transition-[max-width] duration-300`}>
        {!client ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-8 text-center mt-8">
            <Clock className="w-12 h-12 text-a2o-black/20 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-a2o-black mb-2">暫未找到你的服務記錄</h2>
            <p className="text-a2o-black/60 mb-4">請聯繫我們將你的帳號與服務關聯</p>
            <a href="https://wa.me/85254077240" target="_blank" rel="noopener noreferrer" className="btn-primary inline-flex items-center gap-2">
              <MessageCircle className="w-4 h-4" /> WhatsApp 聯繫我們
            </a>
          </motion.div>
        ) : (
          <>
            <div className="mb-4 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-a2o-warm/70">
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('progress')}
                  className={`rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                    activeTab === 'progress'
                      ? 'bg-a2o-black text-white shadow-sm'
                      : 'text-a2o-black/55 hover:bg-a2o-beige hover:text-a2o-black'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('member-picks')}
                  className={`rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                    activeTab === 'member-picks'
                      ? 'bg-a2o-black text-white shadow-sm'
                      : 'text-a2o-black/55 hover:bg-a2o-beige hover:text-a2o-black'
                  }`}
                >
                  Member Picks
                </button>
              </div>
            </div>

            {activeTab === 'progress' ? (
              <>
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="bg-white rounded-2xl p-5 sm:p-6 mb-4 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-a2o-black">你好，{client.name}</h2>
                      <p className="text-sm text-a2o-black/60">Plan {client.plan} · HK${client.plan_price}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-a2o-black/40">已付</p>
                      <p className="text-lg font-bold text-a2o-pink">HK${client.amount_paid}</p>
                    </div>
                  </div>

                  <div className="mb-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-a2o-black/60">整體進度</span>
                      <span className="font-bold text-a2o-black">{serviceStatus}%</span>
                    </div>
                    <div className="w-full h-2 bg-a2o-beige rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-a2o-pink rounded-full"
                        initial={false}
                        animate={{ width: `${serviceStatus}%` }}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                      />
                    </div>
                  </div>

                  {client.balance_due > 0 && (
                    <p className="text-sm text-a2o-black/60 mt-2">餘額：HK${client.balance_due}</p>
                  )}
                </motion.div>

                {client.seasonal_type && (
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="bg-white rounded-2xl p-5 sm:p-6 mb-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <Palette className="w-5 h-5 text-a2o-pink" />
                      <h3 className="font-bold text-a2o-black">你的顏色分析報告</h3>
                    </div>

                    <div className="bg-a2o-beige rounded-xl p-4 mb-4">
                      <p className="text-sm text-a2o-black/60 mb-1">季節類型</p>
                      <p className="text-xl font-bold text-a2o-pink">{client.seasonal_type}</p>
                      {client.color_strategy && (
                        <p className="text-sm text-a2o-black/70 mt-2">{client.color_strategy}</p>
                      )}
                    </div>

                    {client.suitable_colors && client.suitable_colors.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-medium text-a2o-black mb-2">最適合你的顏色</p>
                        <div className="flex flex-wrap gap-2">
                          {client.suitable_colors.map(c => (
                            <span key={c} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: c }} title={c} />
                          ))}
                        </div>
                      </div>
                    )}

                    {client.materials && client.materials.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-a2o-black mb-1">推薦材質</p>
                        <p className="text-sm text-a2o-black/60">{client.materials.join('、')}</p>
                      </div>
                    )}

                    {client.metals && client.metals.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-a2o-black mb-1">適合金屬</p>
                        <p className="text-sm text-a2o-black/60">{client.metals.join('、')}</p>
                      </div>
                    )}

                    {client.glasses && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-a2o-black mb-1">眼鏡框建議</p>
                        <p className="text-sm text-a2o-black/60">{client.glasses}</p>
                      </div>
                    )}

                    {client.watch && (
                      <div>
                        <p className="text-sm font-medium text-a2o-black mb-1">手錶建議</p>
                        <p className="text-sm text-a2o-black/60">{client.watch}</p>
                      </div>
                    )}
                  </motion.div>
                )}

                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="bg-white rounded-2xl p-5 sm:p-6 mb-4 shadow-sm">
                  <h3 className="font-bold text-a2o-black mb-4">服務狀態</h3>
                  <div className="space-y-3">
                    {services.length === 0 ? (
                      <p className="text-sm text-a2o-black/40 text-center py-4">暫無服務記錄，請聯繫職員更新</p>
                    ) : (
                      services.map((s) => {
                        const Icon = serviceIcons[s.service_id] || Shirt
                        const svcSessions = sessions.filter(sess => sess.service_id === s.service_id)
                        const completedCount = svcSessions.filter(sess => sess.status === 'completed').length
                        const scheduledCount = svcSessions.filter(sess => sess.status === 'scheduled').length
                        const remaining = s.count - completedCount

                        if (s.count <= 0) {
                          return (
                            <div key={s.service_id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                              <div className="flex items-center gap-3">
                                <Icon className="w-5 h-5 text-gray-300" />
                                <span className="text-sm font-medium text-gray-400">{s.name}</span>
                                <span className="text-xs text-gray-300">x0</span>
                              </div>
                              <span className="text-xs px-2 py-1 rounded-full font-medium bg-gray-100 text-gray-400">未包含</span>
                            </div>
                          )
                        }

                        let status: 'completed' | 'in_progress' | 'scheduled' | 'pending'
                        if (completedCount >= s.count) {
                          status = 'completed'
                        } else if (completedCount > 0) {
                          status = 'in_progress'
                        } else if (scheduledCount > 0) {
                          status = 'scheduled'
                        } else {
                          status = 'pending'
                        }

                        const statusLabels: Record<string, string> = {
                          'completed': '已完成',
                          'in_progress': '進行中',
                          'scheduled': '已預約',
                          'pending': '待預約',
                        }
                        const label = statusLabels[status]

                        return (
                          <div key={s.service_id} className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                            status === 'completed' ? 'bg-green-50' :
                            status === 'in_progress' ? 'bg-blue-50' :
                            status === 'scheduled' ? 'bg-yellow-50' :
                            'bg-a2o-beige'
                          }`}>
                            <div className="flex items-center gap-3">
                              <Icon className={`w-5 h-5 ${
                                status === 'completed' ? 'text-green-600' :
                                status === 'in_progress' ? 'text-blue-600' :
                                status === 'scheduled' ? 'text-yellow-600' :
                                'text-a2o-pink'
                              }`} />
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-a2o-black">{s.name}</span>
                                <span className="text-xs text-a2o-black/40">
                                  {completedCount > 0 ? `已完成 ${completedCount}/${s.count}` : `共 ${s.count} 次`}
                                  {remaining > 0 && status !== 'completed' ? ` · 剩 ${remaining} 次` : ''}
                                </span>
                              </div>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              status === 'completed' ? 'bg-green-100 text-green-700' :
                              status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                              status === 'scheduled' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-500'
                            }`}>
                              {label}
                            </span>
                          </div>
                        )
                      })
                    )}
                  </div>
                </motion.div>

                <div className="text-center mt-6">
                  <a href="https://wa.me/85254077240" target="_blank" rel="noopener noreferrer" className="btn-primary inline-flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" /> WhatsApp 聯繫我們
                  </a>
                </div>
              </>
            ) : (
              <MemberPicks client={client} clientPhone={user.phone} initialProductId={recommendedProductId || undefined} />
            )}
          </>
        )}
      </div>
    </div>
  )
}
