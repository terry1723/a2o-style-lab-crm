import type { MouseEventHandler } from 'react'
import { ClipboardCheck, MessageCircle } from 'lucide-react'
import {
  ASSESSMENT_WHATSAPP_LABEL,
  ASSESSMENT_WHATSAPP_URL,
} from '../config/assessmentWhatsApp'
import type { AssessmentLeadInput } from '../types/assessment'
import { AssessmentLeadForm } from './AssessmentLeadForm'

type Props = {
  submitted: boolean
  submitting: boolean
  onSubmit: (input: AssessmentLeadInput) => Promise<void>
  onWhatsAppClick: MouseEventHandler<HTMLAnchorElement>
}

export function AssessmentResult({
  submitted,
  submitting,
  onSubmit,
  onWhatsAppClick,
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
              <h1 className="mt-4 font-serif text-2xl font-medium leading-tight sm:text-3xl">最後一步：準備閣下的個人檢測報告</h1>
              <p className="mt-3 text-sm leading-relaxed text-white/70">如欲提供相片，請上傳一張正面全身相，並留下接收報告的資料。</p>
            </>
          )}

          <AssessmentLeadForm
            submitted={submitted}
            submitting={submitting}
            onSubmit={onSubmit}
          />

          <a
            href={ASSESSMENT_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onWhatsAppClick}
            className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-a2o-pink px-5 py-3 text-center text-sm font-semibold text-white shadow-lg transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <MessageCircle className="h-4 w-4" />
            {ASSESSMENT_WHATSAPP_LABEL}
          </a>
        </div>
      </div>
    </section>
  )
}
