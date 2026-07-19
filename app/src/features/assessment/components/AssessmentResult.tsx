import { ClipboardCheck, RotateCcw } from 'lucide-react'
import type { AssessmentLeadInput } from '../types/assessment'
import { AssessmentLeadForm } from './AssessmentLeadForm'

type Props = {
  submitted: boolean
  submitting: boolean
  onSubmit: (input: AssessmentLeadInput) => Promise<void>
  onRestart: () => void
}

export function AssessmentResult({
  submitted,
  submitting,
  onSubmit,
  onRestart,
}: Props) {
  return (
    <section className="absolute inset-0 z-40 overflow-y-auto bg-black/72 px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-[calc(env(safe-area-inset-top)+4.5rem)] text-white backdrop-blur-xl">
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center py-6">
        <div className="assessment-result-enter rounded-[2rem] border border-white/15 bg-white/10 p-5 shadow-2xl sm:p-7">
          {!submitted && (
            <>
              <span className="inline-flex items-center gap-2 rounded-full bg-a2o-pink/20 px-3 py-1.5 text-xs font-semibold text-[#F1B6C6]">
                <ClipboardCheck className="h-3.5 w-3.5" /> 四條問題已完成
              </span>
              <h1 className="mt-4 font-serif text-2xl font-medium leading-tight sm:text-3xl">最後一步：準備你嘅個人檢測報告</h1>
              <p className="mt-3 text-sm leading-relaxed text-white/70">上傳一張正面全身相，再留下接收報告嘅資料。</p>
            </>
          )}

          <AssessmentLeadForm
            submitted={submitted}
            submitting={submitting}
            onSubmit={onSubmit}
          />

          <button
            type="button"
            onClick={onRestart}
            className="mx-auto mt-5 flex items-center gap-2 text-xs font-medium text-white/50 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-a2o-pink"
          >
            <RotateCcw className="h-3.5 w-3.5" /> 重新開始檢測
          </button>
        </div>
      </div>
    </section>
  )
}
