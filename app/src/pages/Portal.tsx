import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { verifyStaff } from '../lib/clientData'
import { LogIn, ArrowLeft, Eye, EyeOff } from 'lucide-react'

export default function Portal() {
  const navigate = useNavigate()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [showPin, setShowPin] = useState(false)

  const handleLogin = () => {
    if (!pin.trim()) {
      setError('請輸入密碼')
      return
    }
    if (verifyStaff(pin)) {
      localStorage.setItem('a2o_staff_auth', 'true')
      navigate('/portal/staff')
    } else {
      setError('密碼錯誤')
    }
  }

  return (
    <div className="min-h-screen bg-a2o-beige flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-2">
              <img src="/images/A2O.png" alt="A2O" className="h-10 w-auto object-contain" />
            </div>
            <h2 className="text-lg font-bold text-a2o-black">a2o 客戶管理後台</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-a2o-black mb-1.5">員工密碼</label>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  className="w-full px-4 py-3 rounded-xl border border-a2o-warm bg-a2o-beige/50 focus:outline-none focus:ring-2 focus:ring-a2o-pink/50 text-a2o-black pr-12"
                  placeholder="輸入員工密碼"
                />
                <button onClick={() => setShowPin(!showPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-a2o-black/40">
                  {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">
                {error}
              </motion.div>
            )}

            <button onClick={handleLogin} className="w-full btn-primary justify-center">
              <LogIn className="w-4 h-4" /> 登入
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-a2o-warm">
            <button onClick={() => navigate('/')} className="text-sm text-a2o-black/50 hover:text-a2o-pink flex items-center gap-1 justify-center">
              <ArrowLeft className="w-4 h-4" /> 返回首頁
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
