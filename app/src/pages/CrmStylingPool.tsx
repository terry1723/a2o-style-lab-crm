import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { saveClient, saveClientServices, getLoggedInUser, type ServiceItem } from '../lib/clientData'
import { ArrowLeft, Upload, Plus, Minus, CheckCircle2 } from 'lucide-react'

const PLAN_TEMPLATES: Record<string, { price: number; services: ServiceItem[] }> = {
  'A': {
    price: 3980,
    services: [
      { service_id: 'styling_advice', name: '造型建議', count: 1 },
      { service_id: 'styling_clothing', name: '造型服飾', count: 1 },
      { service_id: 'hair_design', name: '髮型設計', count: 1 },
      { service_id: 'skin_cleaning', name: '臉部清潔修眉療程', count: 1 },
      { service_id: 'photography', name: '個人攝影服務', count: 1 },
    ]
  },
  'B': {
    price: 7980,
    services: [
      { service_id: 'styling_advice', name: '造型建議', count: 2 },
      { service_id: 'styling_clothing', name: '造型服飾', count: 2 },
      { service_id: 'styling_course', name: '穿搭基礎課', count: 1 },
      { service_id: 'hair_design', name: '髮型設計', count: 2 },
      { service_id: 'skin_cleaning', name: '臉部清潔修眉療程', count: 1 },
      { service_id: 'photography', name: '個人攝影服務', count: 1 },
      { service_id: 'small_face', name: '日本小顏術療程', count: 1 },
    ]
  },
  'C': {
    price: 12980,
    services: [
      { service_id: 'styling_advice', name: '造型建議', count: 4 },
      { service_id: 'styling_clothing', name: '造型服飾', count: 4 },
      { service_id: 'styling_course', name: '穿搭基礎課', count: 2 },
      { service_id: 'hair_design', name: '髮型設計', count: 2 },
      { service_id: 'skin_cleaning', name: '臉部清潔修眉療程', count: 1 },
      { service_id: 'photography', name: '個人攝影服務', count: 2 },
      { service_id: 'small_face', name: '日本小顏術療程', count: 2 },
    ]
  },
  'StylePass': {
    price: 1200,
    services: [
      { service_id: 'styling_advice', name: '造型建議', count: 1 },
      { service_id: 'styling_clothing', name: '造型服飾', count: 1 },
    ]
  },
  'custom': {
    price: 0,
    services: [
      { service_id: 'styling_advice', name: '造型建議', count: 1 },
      { service_id: 'styling_clothing', name: '造型服飾', count: 1 },
      { service_id: 'styling_course', name: '穿搭基礎課', count: 1 },
      { service_id: 'hair_design', name: '髮型設計', count: 1 },
      { service_id: 'skin_cleaning', name: '臉部清潔修眉療程', count: 1 },
      { service_id: 'photography', name: '個人攝影服務', count: 1 },
      { service_id: 'small_face', name: '日本小顏術療程', count: 1 },
    ]
  }
}

export default function CrmStylingPool() {
  const navigate = useNavigate()
  const user = getLoggedInUser()

  const [form, setForm] = useState({
    name: '', age: '', phone: user?.phone?.replace('+852', '') || '', occupation: '',
    height: '', weight: '', shoulder_width: '', waist_size: '', pant_length: '', shoe_size: '',
    body_type: '', body_remark: '', pain_point: '', favorite_style: '', purpose: '',
    lifestyle: '', desired_effect: '', budget: '', plan: 'B', plan_price: 7980,
    amount_paid: 0, before_photo: '', notes: ''
  })

  const [services, setServices] = useState<ServiceItem[]>(PLAN_TEMPLATES['B'].services)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')

  const handlePlanChange = (plan: string) => {
    const tmpl = PLAN_TEMPLATES[plan]
    setForm({ ...form, plan, plan_price: tmpl.price })
    setServices([...tmpl.services])
  }

  const adjustService = (sid: string, delta: number) => {
    setServices(prev => prev.map(s => s.service_id === sid ? { ...s, count: Math.max(0, s.count + delta) } : s))
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      setPreviewUrl(base64)
      setForm(prev => ({ ...prev, before_photo: base64 }))
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    setLoading(true)
    const id = 'c_' + Date.now()
    const cleanPhone = form.phone.replace(/\s/g, '')
    const phone = /^\d{8}$/.test(cleanPhone) ? '+852' + cleanPhone : cleanPhone
    const price = form.plan === 'custom' ? form.plan_price : PLAN_TEMPLATES[form.plan].price

    try {
      await saveClient({
        id, ...form, phone, plan_price: price,
        balance_due: price - form.amount_paid,
      })
      await saveClientServices(id, services)

      // Link user account if logged in
      if (user) {
        const allUsers = JSON.parse(localStorage.getItem('a2o_users_custom') || '[]')
        const idx = allUsers.findIndex((u: any) => u.id === user.id)
        if (idx >= 0) {
          allUsers[idx].clientId = id
          localStorage.setItem('a2o_users_custom', JSON.stringify(allUsers))
        }
      }

      setSubmitted(true)
      setTimeout(() => navigate('/crm/dashboard'), 2000)
    } catch (err: any) {
      console.error('Submit error:', err)
      const detail = err?.message || err?.error?.message || err?.error_description || JSON.stringify(err)
      alert('保存失敗：\n\n' + detail + '\n\n請截圖此錯誤訊息傳給開發人員。')
      setLoading(false)
    }
  }

  const inputClass = "w-full px-4 py-3 rounded-xl border border-a2o-warm bg-white focus:outline-none focus:ring-2 focus:ring-a2o-pink/50 text-a2o-black text-sm"
  const labelClass = "block text-sm font-medium text-a2o-black mb-1.5"

  if (submitted) {
    return (
      <div className="min-h-screen bg-a2o-beige flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-a2o-black mb-2">資料已提交</h2>
          <p className="text-a2o-black/60">正在跳轉至你的進度面板...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-a2o-beige">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 pb-20">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm text-a2o-black/60 hover:text-a2o-pink mb-6">
          <ArrowLeft className="w-4 h-4" /> 返回首頁
        </button>

        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-a2o-black mb-6">客戶資料登記</h1>

        {/* Basic Info */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 mb-4 shadow-sm">
          <h3 className="font-bold text-a2o-black mb-4">基本信息</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={labelClass}>姓名 *</label><input className={inputClass} value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
            <div><label className={labelClass}>年齡</label><input className={inputClass} value={form.age} onChange={e => setForm({...form, age: e.target.value})} /></div>
            <div><label className={labelClass}>電話 *</label><input className={inputClass} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
            <div><label className={labelClass}>職業</label><input className={inputClass} value={form.occupation} onChange={e => setForm({...form, occupation: e.target.value})} placeholder="例如：金融業、教育界、自僱" /></div>
          </div>
        </div>

        {/* Body Measurements */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 mb-4 shadow-sm">
          <h3 className="font-bold text-a2o-black mb-4">身型數據</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { key: 'height', label: '身高（cm）' }, { key: 'weight', label: '體重（kg）' },
              { key: 'shoulder_width', label: '肩闊（cm）' }, { key: 'waist_size', label: '腰圍（cm）' },
              { key: 'pant_length', label: '褲長（cm）' }, { key: 'shoe_size', label: '鞋碼' },
            ].map((f) => (
              <div key={f.key}>
                <label className={labelClass}>{f.label}</label>
                <input className={inputClass} value={(form as any)[f.key]} onChange={e => setForm({...form, [f.key]: e.target.value})} />
              </div>
            ))}
          </div>
          <div className="mt-4">
            <label className={labelClass}>身型描述</label>
            <textarea className={inputClass + " min-h-[80px]"} value={form.body_type} onChange={e => setForm({...form, body_type: e.target.value})} placeholder="例如：肩膀寬、腰較細、有肚腩" />
          </div>
          <div className="mt-4">
            <label className={labelClass}>外形備註</label>
            <textarea className={inputClass + " min-h-[60px]"} value={form.body_remark} onChange={e => setForm({...form, body_remark: e.target.value})} />
          </div>
        </div>

        {/* Style Needs */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 mb-4 shadow-sm">
          <h3 className="font-bold text-a2o-black mb-4">風格需求</h3>
          <div className="space-y-4">
            {[
              { key: 'pain_point', label: '穿搭痛點', ph: '例如：不懂搭配、買錯尺寸' },
              { key: 'favorite_style', label: '最喜愛風格', ph: '例如：韓式、日式、商務' },
              { key: 'purpose', label: '穿搭目的', ph: '例如：約會、職場、日常' },
              { key: 'lifestyle', label: '生活方式', ph: '例如：經常出差、久坐辦公室' },
              { key: 'desired_effect', label: '希望達到的效果', ph: '例如：看起來更成熟、更有親和力' },
            ].map((f) => (
              <div key={f.key}>
                <label className={labelClass}>{f.label}</label>
                <textarea className={inputClass + " min-h-[60px]"} value={(form as any)[f.key]} onChange={e => setForm({...form, [f.key]: e.target.value})} placeholder={f.ph} />
              </div>
            ))}
          </div>
        </div>

        {/* Plan & Services */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 mb-4 shadow-sm">
          <h3 className="font-bold text-a2o-black mb-4">計劃與付款</h3>
          <div className="mb-4">
            <label className={labelClass}>選擇計劃</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {['A', 'B', 'C', 'StylePass', 'custom'].map(p => (
                <button
                  key={p}
                  onClick={() => handlePlanChange(p)}
                  className={`py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                    form.plan === p ? 'bg-a2o-pink text-white' : 'bg-a2o-beige text-a2o-black hover:bg-a2o-pink/20'
                  }`}
                >
                  {p === 'custom' ? '自定義' : p === 'StylePass' ? '會員' : `Plan ${p}`}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className={labelClass}>服務項目</label>
            <div className="space-y-2">
              {services.map(s => (
                <div key={s.service_id} className="flex items-center justify-between bg-a2o-beige rounded-xl px-4 py-3">
                  <span className="text-sm font-medium text-a2o-black">{s.name}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => adjustService(s.service_id, -1)} className="w-7 h-7 rounded-full bg-white flex items-center justify-center hover:bg-a2o-pink/20">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-sm font-bold">{s.count}</span>
                    <button onClick={() => adjustService(s.service_id, 1)} className="w-7 h-7 rounded-full bg-white flex items-center justify-center hover:bg-a2o-pink/20">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>計劃價格（HK$）</label>
              <input type="number" className={inputClass} value={form.plan_price} onChange={e => setForm({...form, plan_price: Number(e.target.value)})} />
            </div>
            <div>
              <label className={labelClass}>已付金額（HK$）</label>
              <input type="number" className={inputClass} value={form.amount_paid} onChange={e => setForm({...form, amount_paid: Number(e.target.value)})} />
            </div>
          </div>
          <p className="text-sm text-a2o-pink mt-2 font-medium">餘額：HK${form.plan_price - form.amount_paid}</p>
        </div>

        {/* Photo Upload */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 mb-4 shadow-sm">
          <h3 className="font-bold text-a2o-black mb-4">Before 照片</h3>
          <div className="border-2 border-dashed border-a2o-warm rounded-xl p-6 text-center hover:border-a2o-pink/50 transition-colors">
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="max-h-48 mx-auto rounded-lg mb-3" />
            ) : (
              <Upload className="w-8 h-8 text-a2o-black/30 mx-auto mb-2" />
            )}
            <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" id="photo-upload" />
            <label htmlFor="photo-upload" className="cursor-pointer text-sm text-a2o-pink hover:underline">
              {previewUrl ? '更換照片' : '點擊上傳照片'}
            </label>
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitted || loading}
          className="w-full btn-primary py-4 text-base justify-center disabled:opacity-50"
        >
          {loading ? '提交中...' : submitted ? '已提交' : '提交資料'}
        </button>
      </div>
    </div>
  )
}
