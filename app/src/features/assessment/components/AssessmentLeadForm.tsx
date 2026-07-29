import { useState, type ChangeEvent, type FormEvent } from 'react'
import {
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

const inputClassName = 'min-h-12 w-full rounded-2xl border border-white/15 bg-white/10 px-4 text-base text-white outline-none placeholder:text-white/35 focus:border-a2o-pink focus:ring-2 focus:ring-a2o-pink/30'

export function AssessmentLeadForm({ submitted, submitting, onSubmit }: Props) {
  const [photoDataUrl, setPhotoDataUrl] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoName, setPhotoName] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState('')

  const choosePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!ACCEPTED_PHOTO_TYPES.has(file.type)) {
      setError('請上傳 JPEG、PNG 或 WebP 格式的相片。')
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
    const trimmedName = name.trim()
    const cleanPhone = phone.replace(/[\s-]/g, '')
    const validPhone = /^(?:\+?852)?\d{8}$/.test(cleanPhone)
    const parsedHeight = Number(heightCm)
    const parsedWeight = Number(weightKg)

    if (!trimmedName) {
      setError('請填寫稱呼或姓名。')
      return
    }
    if (trimmedName.length > 80) {
      setError('稱呼或姓名不可多於 80 個字。')
      return
    }
    if (!validPhone) {
      setError('請填寫有效的香港 WhatsApp 電話號碼。')
      return
    }
    if (!/^\d+$/.test(heightCm) || parsedHeight < 120 || parsedHeight > 230) {
      setError('請輸入 120 至 230 cm 的身高。')
      return
    }
    if (!/^\d+(?:\.\d)?$/.test(weightKg) || parsedWeight < 35 || parsedWeight > 200) {
      setError('請輸入 35 至 200 kg 的體重，最多一位小數。')
      return
    }
    if (!consent) {
      setError('請確認同意資料用途。')
      return
    }

    setError('')
    try {
      await onSubmit({
        name: trimmedName,
        phone: cleanPhone,
        heightCm: parsedHeight,
        weightKg: parsedWeight,
        consent: true,
        photo: photoFile ?? undefined,
      })
    } catch {
      setError('暫時未能提交，請稍後再試。你已填寫的資料會保留。')
    }
  }

  if (submitted) {
    return (
      <div className="mt-6 rounded-3xl border border-white/15 bg-white/10 p-5 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-[#8FD3A8]" />
        <h2 className="mt-3 font-serif text-2xl font-medium">已收到你的形象檢測資料</h2>
        <p className="mt-3 text-sm leading-relaxed text-white/70">
          A2O 團隊會根據你的答案準備個人形象檢測報告；如你已上傳正面全身相，我們會一併作為分析參考。
          我們會在 1–2 個工作天內透過 WhatsApp 聯絡你，請留意訊息。
        </p>
      </div>
    )
  }

  return (
    <form className="mt-6 space-y-3" onSubmit={submit} noValidate>
      <div className="mb-4">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-white/45">最後一步</p>
        <h2 className="mt-1 text-lg font-semibold">準備你的個人檢測報告</h2>
        <p className="mt-1 text-xs leading-relaxed text-white/55">請填寫以下資料，讓我們更準確地了解你的形象需要。</p>
      </div>

      <div>
        <label htmlFor="assessment-name" className="mb-1.5 block text-xs font-medium text-white/70">稱呼／姓名</label>
        <input
          id="assessment-name"
          autoComplete="name"
          maxLength={80}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={inputClassName}
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
          className={inputClassName}
          placeholder="例如：9123 4567"
        />
      </div>
      <div>
        <label htmlFor="assessment-height" className="mb-1.5 block text-xs font-medium text-white/70">身高（cm）</label>
        <input
          id="assessment-height"
          inputMode="numeric"
          autoComplete="off"
          value={heightCm}
          onChange={(event) => setHeightCm(event.target.value)}
          className={inputClassName}
          placeholder="例如：175"
        />
      </div>
      <div>
        <label htmlFor="assessment-weight" className="mb-1.5 block text-xs font-medium text-white/70">體重（kg）</label>
        <input
          id="assessment-weight"
          inputMode="decimal"
          autoComplete="off"
          value={weightKg}
          onChange={(event) => setWeightKg(event.target.value)}
          className={inputClassName}
          placeholder="例如：68.5"
        />
      </div>

      <section className="pt-2" aria-labelledby="assessment-photo-title">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-a2o-pink/20 text-[#F1B6C6]">
            <Camera className="h-5 w-5" />
          </span>
          <div>
            <h3 id="assessment-photo-title" className="text-sm font-semibold">上傳正面全身相（選填）</h3>
            <p className="mt-1 text-xs leading-relaxed text-white/60">如方便，請正面站立面向鏡頭，確保相片拍攝到全身；在自然光下拍攝並避免使用濾鏡。上傳相片有助我們提供更完整的分析。</p>
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
      </section>

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-white/5 p-3 text-xs leading-relaxed text-white/60">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[#D4849A]"
        />
        <span>我同意 A2O Style Lab 使用以上資料，以及我選擇上傳的相片，用於個人形象檢測及 WhatsApp 跟進。</span>
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
