import { useState } from 'react'
import { ArrowRight, CheckCircle2, LoaderCircle, MessageCircle } from 'lucide-react'
import type { AssessmentLeadInput } from '../types/assessment'

type Props = {
  submitted: boolean
  submitting: boolean
  whatsappUrl: string
  onSubmit: (input: AssessmentLeadInput) => Promise<void>
  onWhatsApp: () => void
}

export function AssessmentLeadForm({ submitted, submitting, whatsappUrl, onSubmit, onWhatsApp }: Props) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const cleanPhone = phone.replace(/\s/g, '')
    if (!name.trim() || !/^\+?\d{8,15}$/.test(cleanPhone) || !consent) {
      setError('請填寫姓名、有效 WhatsApp 電話並確認同意聯絡。')
      return
    }
    setError('')
    try {
      await onSubmit({ name, phone: cleanPhone, consent })
    } catch {
      setError('暫時未能提交，請稍後再試或直接 WhatsApp 聯絡我們。')
    }
  }

  if (submitted) {
    return (
      <div className="mt-6 rounded-3xl border border-white/15 bg-white/10 p-5 text-center">
        <CheckCircle2 className="mx-auto h-9 w-9 text-[#8FD3A8]" />
        <h3 className="mt-3 text-lg font-semibold">初步分析已保存</h3>
        <p className="mt-1 text-sm text-white/65">你可以直接 WhatsApp 我們，安排更深入的一對一形象分析。</p>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onWhatsApp}
          className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <MessageCircle className="h-4 w-4" /> WhatsApp 預約分析
        </a>
      </div>
    )
  }

  return (
    <form className="mt-6 space-y-3" onSubmit={submit} noValidate>
      <div>
        <label htmlFor="assessment-name" className="mb-1.5 block text-xs font-medium text-white/70">姓名</label>
        <input
          id="assessment-name"
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="min-h-12 w-full rounded-2xl border border-white/15 bg-white/10 px-4 text-base text-white outline-none placeholder:text-white/35 focus:border-a2o-pink focus:ring-2 focus:ring-a2o-pink/30"
          placeholder="你的姓名"
        />
      </div>
      <div>
        <label htmlFor="assessment-phone" className="mb-1.5 block text-xs font-medium text-white/70">WhatsApp 電話</label>
        <input
          id="assessment-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className="min-h-12 w-full rounded-2xl border border-white/15 bg-white/10 px-4 text-base text-white outline-none placeholder:text-white/35 focus:border-a2o-pink focus:ring-2 focus:ring-a2o-pink/30"
          placeholder="例如：54077240"
        />
      </div>
      <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-white/5 p-3 text-xs leading-relaxed text-white/60">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[#D4849A]"
        />
        <span>我同意 A2O Style Lab 使用以上資料聯絡我及提供初步形象建議。</span>
      </label>
      {error && <p role="alert" className="text-sm text-[#FFB4B4]">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-a2o-pink px-5 py-3 text-sm font-semibold text-white transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60"
      >
        {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        {submitting ? '保存中…' : '取得完整分析建議'}
      </button>
    </form>
  )
}
