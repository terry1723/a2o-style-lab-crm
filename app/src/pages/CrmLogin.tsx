import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { registerUser, loginUser, getLoggedInUser } from '../lib/clientData'
import { isSupabaseConfigured } from '../lib/supabase'
import { UserPlus, LogIn, ArrowRight, Eye, EyeOff, Trash2, Database } from 'lucide-react'

export default function CrmLogin() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [dbMode, setDbMode] = useState(isSupabaseConfigured())

  useEffect(() => {
    // Force refresh check on mount
    setDbMode(isSupabaseConfigured())
    console.log('Supabase configured:', isSupabaseConfigured())
    
    const user = getLoggedInUser()
    if (user) {
      navigate('/crm/dashboard')
    }
  }, [navigate])

  const normalizePhone = (p: string) => {
    const clean = p.replace(/\s/g, '')
    if (/^\d{8}$/.test(clean)) return '+852' + clean
    if (/^852\d{8}$/.test(clean)) return '+' + clean
    return clean
  }

  const clearAllLocalData = () => {
    if (confirm('確定要清除所有本地數據？\n\n這會刪除瀏覽器中儲存的舊帳號，讓你可以重新註冊。')) {
      localStorage.removeItem('a2o_clients')
      localStorage.removeItem('a2o_services')
      localStorage.removeItem('a2o_sessions')
      localStorage.removeItem('a2o_users_custom')
      localStorage.removeItem('a2o_login_user')
      alert('已清除。請重新整理頁面後再試。')
      window.location.reload()
    }
  }

  const handleRegister = async () => {
    setError('')
    if (!name.trim() || !phone.trim() || !password.trim()) {
      setError('請填寫所有欄位')
      return
    }
    const cleanPhone = phone.replace(/\s/g, '')
    if (!/^\d{8}$/.test(cleanPhone) && !/^\d{11}$/.test(cleanPhone)) {
      setError('請輸入有效電話號碼（8位香港號碼或11位內地號碼）')
      return
    }
    setLoading(true)
    try {
      const nPhone = normalizePhone(phone)
      const result = await registerUser({ phone: nPhone, password, name })
      if (!result) {
        setError('此電話號碼已註冊')
        setLoading(false)
        return
      }
      await loginUser(nPhone, password)
      setLoading(false)
      navigate('/crm/styling-pool')
    } catch (err: any) {
      console.error('Register full error:', err)
      const msg = err?.message || err?.error_description || JSON.stringify(err) || '未知錯誤'
      setError('註冊失敗：' + msg)
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    setError('')
    if (!phone.trim() || !password.trim()) {
      setError('請填寫所有欄位')
      return
    }
    setLoading(true)
    try {
      const nPhone = normalizePhone(phone)
      const result = await loginUser(nPhone, password)
      if (!result) {
        setError('電話號碼或密碼錯誤')
        setLoading(false)
        return
      }
      setLoading(false)
      navigate('/crm/dashboard')
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err?.message || '登入失敗，請檢查網絡連接')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-a2o-beige flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-1">
              <img src="/images/A2O.png" alt="A2O" className="h-10 w-auto object-contain" />
            </div>
            <h2 className="text-lg font-bold text-a2o-black">
              {tab === 'register' ? '客戶註冊' : '客戶登入'}
            </h2>
            <p className="text-sm text-a2o-black/60 mt-1">
              {tab === 'register' ? '創建帳號追蹤你的進度' : '登入查看你的形象改造進度'}
            </p>
            
            {/* Connection mode indicator */}
            <div className="mt-3 flex justify-center">
              <span className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider font-medium ${
                dbMode 
                  ? 'bg-green-100 text-green-700 border border-green-200' 
                  : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
              }`}>
                <Database className="w-3 h-3" />
                {dbMode ? '已連接 Supabase 雲端' : '本地模式（未連接雲端）'}
              </span>
            </div>
            
            {!dbMode && (
              <p className="text-[10px] text-a2o-black/40 mt-1.5">
                數據儲存於瀏覽器。請按 Ctrl+Shift+R 強制刷新頁面以連接雲端。
              </p>
            )}
          </div>

          <div className="flex bg-a2o-beige rounded-full p-1 mb-6">
            <button
              onClick={() => setTab('login')}
              className={`flex-1 py-2 rounded-full text-sm font-medium transition-all ${
                tab === 'login' ? 'bg-white text-a2o-black shadow-sm' : 'text-a2o-black/50'
              }`}
            >
              登入
            </button>
            <button
              onClick={() => setTab('register')}
              className={`flex-1 py-2 rounded-full text-sm font-medium transition-all ${
                tab === 'register' ? 'bg-white text-a2o-black shadow-sm' : 'text-a2o-black/50'
              }`}
            >
              註冊
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, x: tab === 'register' ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: tab === 'register' ? -20 : 20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {tab === 'register' && (
                <div>
                  <label className="block text-sm font-medium text-a2o-black mb-1.5">姓名</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-a2o-warm bg-a2o-beige/50 focus:outline-none focus:ring-2 focus:ring-a2o-pink/50 text-a2o-black"
                    placeholder="請輸入姓名"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-a2o-black mb-1.5">
                  電話號碼（WhatsApp）
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-a2o-warm bg-a2o-beige/50 focus:outline-none focus:ring-2 focus:ring-a2o-pink/50 text-a2o-black"
                  placeholder="例如：95584880"
                />
                <p className="text-xs text-a2o-black/40 mt-1">
                  香港號碼直接輸入 8 位數字即可，系統會自動加上 +852
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-a2o-black mb-1.5">密碼</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-a2o-warm bg-a2o-beige/50 focus:outline-none focus:ring-2 focus:ring-a2o-pink/50 text-a2o-black pr-12"
                    placeholder="設定密碼"
                  />
                  <button
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-a2o-black/40 hover:text-a2o-black"
                  >
                    {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl"
                >
                  {error}
                </motion.div>
              )}

              <button
                onClick={tab === 'register' ? handleRegister : handleLogin}
                disabled={loading}
                className="w-full btn-primary justify-center disabled:opacity-50"
              >
                {loading ? (
                  <span className="animate-pulse">處理中...</span>
                ) : tab === 'register' ? (
                  <span className="flex items-center gap-2 justify-center">
                    <UserPlus className="w-4 h-4" /> 註冊
                  </span>
                ) : (
                  <span className="flex items-center gap-2 justify-center">
                    <LogIn className="w-4 h-4" /> 登入
                  </span>
                )}
              </button>
            </motion.div>
          </AnimatePresence>

          <div className="mt-6 pt-4 border-t border-a2o-warm">
            <button onClick={() => navigate('/')} className="text-sm text-a2o-black/50 hover:text-a2o-pink transition-colors flex items-center gap-1 justify-center">
              <ArrowRight className="w-4 h-4 rotate-180" /> 返回首頁
            </button>
            
            {/* Clear local data button */}
            <button
              onClick={clearAllLocalData}
              className="mt-3 text-xs text-red-400 hover:text-red-600 transition-colors flex items-center gap-1 justify-center mx-auto"
            >
              <Trash2 className="w-3 h-3" />
              清除瀏覽器舊數據（解決「已註冊」問題）
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
