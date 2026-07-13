import { RotateCcw, Sparkles } from 'lucide-react'
import type { AssessmentLeadInput, AssessmentResult as Result } from '../types/assessment'
import { AssessmentLeadForm } from './AssessmentLeadForm'

type Props = {
  result: Result
  submitted: boolean
  submitting: boolean
  whatsappUrl: string
  onSubmit: (input: AssessmentLeadInput) => Promise<void>
  onWhatsApp: () => void
  onRestart: () => void
}

export function AssessmentResult({
  result,
  submitted,
  submitting,
  whatsappUrl,
  onSubmit,
  onWhatsApp,
  onRestart,
}: Props) {
  return (
    <section className="absolute inset-0 z-40 overflow-y-auto bg-black/72 px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-[calc(env(safe-area-inset-top)+4.5rem)] text-white backdrop-blur-xl">
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center py-6">
        <div className="assessment-result-enter rounded-[2rem] border border-white/15 bg-white/10 p-5 shadow-2xl sm:p-7">
          <span className="inline-flex items-center gap-2 rounded-full bg-a2o-pink/20 px-3 py-1.5 text-xs font-semibold text-[#F1B6C6]">
            <Sparkles className="h-3.5 w-3.5" /> {result.eyebrow}
          </span>
          <h1 className="mt-4 font-serif text-3xl font-medium leading-tight sm:text-4xl">{result.title}</h1>
          <p className="mt-4 text-sm leading-relaxed text-white/75 sm:text-base">{result.summary}</p>
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-white/45">建議先做</p>
            <p className="mt-2 text-sm leading-relaxed text-white/85">{result.recommendation}</p>
          </div>

          <AssessmentLeadForm
            submitted={submitted}
            submitting={submitting}
            whatsappUrl={whatsappUrl}
            onSubmit={onSubmit}
            onWhatsApp={onWhatsApp}
          />

          <button
            type="button"
            onClick={onRestart}
            className="mx-auto mt-5 flex items-center gap-2 text-xs font-medium text-white/50 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-a2o-pink"
          >
            <RotateCcw className="h-3.5 w-3.5" /> 重新開始診斷
          </button>
        </div>
      </div>
    </section>
  )
}
