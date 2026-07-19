import { useState, type ChangeEvent, type FormEvent } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  LoaderCircle,
  Trash2,
  Upload,
} from 'lucide-react'
import type { AssessmentLeadInput } from '../types/assessment'

const ACCEPTED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_PHOTO_BYTES = 10 * 1024 * 1024

type Props = {
  submitted: boolean
  submitting: boolean
  onSubmit: (input: AssessmentLeadInput) => Promise<void>
}

export function AssessmentLeadForm({ submitted, submitting, onSubmit }: Props) {
  const [step, setStep] = useState<'photo' | 'contact'>('photo')
  const [photoDataUrl, setPhotoDataUrl] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoName, setPhotoName] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState('')

  const choosePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!ACCEPTED_PHOTO_TYPES.has(file.type)) {
      setError('請上傳 JPEG、PNG 或 WebP 格式嘅相片。')
      event.target.value = ''
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError('相片檔案不可超過 10 MB。')
      event.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setError('暫時未能讀取相片，請重新選擇。')
        return
      }
      setPhotoDataUrl(reader.result)
      setPhotoFile(file)
      setPhotoName(file.name)
      setError('')
    }
    reader.onerror = () => setError('暫時未能讀取相片，請重新選擇。')
    reader.readAsDataURL(file)
  }

  const removePhoto = () => {
    setPhotoDataUrl('')
    setPhotoFile(null)
    setPhotoName('')
    setError('')
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const cleanPhone = phone.replace(/[\s-]/g, '')
    const validPhone = /^(?:\+?852)?\d{8}$/.test(cleanPhone)

    if (!name.trim()) {
      setError('請填寫稱呼或姓名。')
      return
    }
    if (!validPhone) {
      setError('請填寫有效嘅香港 WhatsApp 電話號碼。')
      return
    }
    if (!consent) {
      setError('請確認同意資料及相片用途。')
      return
    }

    setError('')
    if (!photoFile) {
      setError('請先上傳正面全身相。')
      setStep('photo')
      return
    }

    try {
      await onSubmit({ name: name.trim(), phone: cleanPhone, consent: true, photo: photoFile })
    } catch {
      setError('暫時未能提交，請稍後再試。你已填嘅資料會保留。')
    }
  }

  if (submitted) {
    return (
      <div className="mt-6 rounded-3xl border border-white/15 bg-white/10 p-5 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-[#8FD3A8]" />
        <h2 className="mt-3 font-serif text-2xl font-medium">已收到你嘅形象檢測資料</h2>
        <p className="mt-3 text-sm leading-relaxed text-white/70">
          A2O 團隊會根據你嘅答案及正面全身相，準備個人形象檢測報告。
          我哋會喺1–2個工作天內透過 WhatsApp 聯絡你，請留意訊息。
        </p>
      </div>
    )
  }

  if (step === 'photo') {
    return (
      <section className="mt-6" aria-labelledby="assessment-photo-title">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-a2o-pink/20 text-[#F1B6C6]">
            <Camera className="h-5 w-5" />
          </span>
          <div>
            <h2 id="assessment-photo-title" className="text-lg font-semibold">上傳正面全身相</h2>
            <p className="mt-1 text-xs leading-relaxed text-white/60">企直面向鏡頭，請影到由頭到腳；自然光、冇濾鏡會更適合分析。</p>
          </div>
        </div>

        {photoDataUrl ? (
          <div className="mt-4 overflow-hidden rounded-3xl border border-white/15 bg-black/25 p-3">
            <img
              src={photoDataUrl}
              alt="已選擇的正面全身相預覽"
              className="mx-auto max-h-72 w-full rounded-2xl object-contain"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-xs text-white/60">{photoName}</p>
              <button
                type="button"
                onClick={removePhoto}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-xs text-white/75 transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-a2o-pink"
              >
                <Trash2 className="h-3.5 w-3.5" /> 移除
              </button>
            </div>
          </div>
        ) : (
          <label
            htmlFor="assessment-photo"
            className="mt-4 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-white/25 bg-white/5 px-5 py-6 text-center transition hover:border-a2o-pink/70 hover:bg-white/10 focus-within:ring-2 focus-within:ring-a2o-pink"
          >
            <Upload className="h-6 w-6 text-[#F1B6C6]" />
            <span className="mt-2 text-sm font-semibold">選擇正面全身相</span>
            <span className="mt-1 text-xs text-white/45">JPEG、PNG、WebP｜最多 10 MB</span>
            <input
              id="assessment-photo"
              type="file"
              aria-label="選擇正面全身相"
              accept="image/jpeg,image/png,image/webp"
              onChange={choosePhoto}
              className="sr-only"
            />
          </label>
        )}

        {error && <p role="alert" className="mt-3 text-sm text-[#FFB4B4]">{error}</p>}
        <button
          type="button"
          disabled={!photoFile}
          onClick={() => {
            setError('')
            setStep('contact')
          }}
          className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-a2o-pink px-5 py-3 text-sm font-semibold text-white transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          繼續填寫聯絡資料 <ArrowRight className="h-4 w-4" />
        </button>
      </section>
    )
  }

  return (
    <form className="mt-6 space-y-3" onSubmit={submit} noValidate>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-white/45">最後一步</p>
          <h2 className="mt-1 text-lg font-semibold">留下報告接收資料</h2>
        </div>
        <button
          type="button"
          onClick={() => {
            setError('')
            setStep('photo')
          }}
          className="inline-flex items-center gap-1 text-xs text-white/55 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-a2o-pink"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> 更換相片
        </button>
      </div>
      <div>
        <label htmlFor="assessment-name" className="mb-1.5 block text-xs font-medium text-white/70">稱呼／姓名</label>
        <input
          id="assessment-name"
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="min-h-12 w-full rounded-2xl border border-white/15 bg-white/10 px-4 text-base text-white outline-none placeholder:text-white/35 focus:border-a2o-pink focus:ring-2 focus:ring-a2o-pink/30"
          placeholder="例如：陳先生"
        />
      </div>
      <div>
        <label htmlFor="assessment-phone" className="mb-1.5 block text-xs font-medium text-white/70">WhatsApp 電話號碼</label>
        <input
          id="assessment-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className="min-h-12 w-full rounded-2xl border border-white/15 bg-white/10 px-4 text-base text-white outline-none placeholder:text-white/35 focus:border-a2o-pink focus:ring-2 focus:ring-a2o-pink/30"
          placeholder="例如：9123 4567"
        />
      </div>
      <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-white/5 p-3 text-xs leading-relaxed text-white/60">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[#D4849A]"
        />
        <span>我同意 A2O Style Lab 使用以上資料及相片，作個人形象檢測及 WhatsApp 跟進之用。</span>
      </label>
      {error && <p role="alert" className="text-sm text-[#FFB4B4]">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-a2o-pink px-5 py-3 text-sm font-semibold text-white transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60"
      >
        {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        {submitting ? '提交中…' : '提交並製作個人檢測報告'}
      </button>
    </form>
  )
}
