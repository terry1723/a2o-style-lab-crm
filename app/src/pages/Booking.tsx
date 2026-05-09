import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Calendar, CheckCircle2 } from 'lucide-react'

export default function Booking() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [date, setDate] = useState('')
  const [style, setStyle] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const minDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const handleSubmit = () => {
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-a2o-beige flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-a2o-black mb-2">預約已提交</h2>
          <p className="text-a2o-black/60 mb-2">我們會盡快以 WhatsApp 確認你的預約。</p>
          <p className="text-sm text-a2o-black/40 mb-6">WhatsApp：5407 7240</p>
          <button onClick={() => navigate('/')} className="btn-primary">返回首頁</button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-a2o-beige">
      <nav className="bg-white border-b border-a2o-warm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/experience')} className="text-a2o-black/60 hover:text-a2o-pink">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-bold text-a2o-black">預約一日體驗</span>
        </div>
      </nav>

      <div className="max-w-lg mx-auto p-4 pb-20">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className={`flex-1 h-1.5 rounded-full transition-colors ${s <= step ? 'bg-a2o-pink' : 'bg-a2o-warm'}`} />
          ))}
        </div>

        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-xl font-bold text-a2o-black mb-1">選擇日期</h2>
            <p className="text-sm text-a2o-black/60 mb-6">請選擇你希望進行體驗的日期（最少 7 天後）</p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-a2o-black mb-2">日期</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-a2o-black/30" />
                <input
                  type="date"
                  min={minDate}
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-a2o-warm bg-white focus:outline-none focus:ring-2 focus:ring-a2o-pink/50"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-a2o-black mb-2">風格偏好</label>
              <div className="grid grid-cols-2 gap-3">
                {['港式復古風', '韓式極簡風'].map(s => (
                  <button
                    key={s}
                    onClick={() => setStyle(s)}
                    className={`py-3 px-4 rounded-xl text-sm font-medium border-2 transition-all ${
                      style === s ? 'border-a2o-pink bg-a2o-pink/10 text-a2o-pink' : 'border-a2o-warm text-a2o-black/70 hover:border-a2o-pink/50'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!date || !style}
              className="w-full btn-primary disabled:opacity-40 justify-center"
            >
              下一步
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-xl font-bold text-a2o-black mb-1">你的資料</h2>
            <p className="text-sm text-a2o-black/60 mb-6">讓我們初步了解你，以便安排最適合的體驗</p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-a2o-black mb-1.5">姓名</label>
                <input value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-a2o-warm bg-white focus:outline-none focus:ring-2 focus:ring-a2o-pink/50" placeholder="你的姓名" />
              </div>
              <div>
                <label className="block text-sm font-medium text-a2o-black mb-1.5">電話（WhatsApp）</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-a2o-warm bg-white focus:outline-none focus:ring-2 focus:ring-a2o-pink/50" placeholder="例如：95584880" />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 btn-secondary justify-center">上一步</button>
              <button
                onClick={() => setStep(3)}
                disabled={!name.trim() || !phone.trim()}
                className="flex-1 btn-primary disabled:opacity-40 justify-center"
              >
                下一步
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-xl font-bold text-a2o-black mb-1">確認預約</h2>
            <p className="text-sm text-a2o-black/60 mb-6">請確認以下資料正確</p>

            <div className="bg-white rounded-xl p-5 mb-6 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-a2o-black/60">體驗項目</span>
                <span className="font-medium">香港一日男士形象體驗</span>
              </div>
              <div className="flex justify-between">
                <span className="text-a2o-black/60">日期</span>
                <span className="font-medium">{date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-a2o-black/60">風格</span>
                <span className="font-medium">{style}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-a2o-black/60">姓名</span>
                <span className="font-medium">{name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-a2o-black/60">電話</span>
                <span className="font-medium">{phone}</span>
              </div>
              <div className="border-t border-a2o-warm pt-3 flex justify-between">
                <span className="text-a2o-black/60">費用</span>
                <span className="font-bold text-a2o-pink text-lg">HK$3,980</span>
              </div>
            </div>

            <div className="bg-a2o-beige rounded-xl p-4 mb-6">
              <p className="text-sm text-a2o-black/60 text-center">
                確認後我們會以 WhatsApp 發送付款連結<br />
                （訂金 HK$1,990）
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 btn-secondary justify-center">上一步</button>
              <button onClick={handleSubmit} className="flex-1 btn-primary justify-center">確認預約</button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
