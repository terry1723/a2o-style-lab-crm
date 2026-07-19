import { useEffect, useState } from 'react'
import { Check, ChevronRight } from 'lucide-react'
import type { AssessmentQuestion } from '../types/assessment'

type Props = {
  question: AssessmentQuestion
  progress: string
  disabled: boolean
  onConfirm: (optionIds: string[]) => void
}

export function QuestionOverlay({ question, progress, disabled, onConfirm }: Props) {
  const [selected, setSelected] = useState<string[]>([])
  const isScale = question.layout === 'scale'

  useEffect(() => {
    setSelected([])
  }, [question.id])

  const choose = (optionId: string) => {
    if (disabled) return
    if (question.type === 'single') {
      setSelected([optionId])
      onConfirm([optionId])
      return
    }

    setSelected((current) => {
      if (current.includes(optionId)) return current.filter((id) => id !== optionId)
      if (question.maxSelections && current.length >= question.maxSelections) return current
      return [...current, optionId]
    })
  }

  return (
    <section
      className="assessment-question-enter absolute inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:px-6"
      aria-labelledby={`question-${question.id}`}
    >
      <div className="mx-auto max-w-md rounded-[1.75rem] border border-white/20 bg-black/60 p-4 text-white shadow-2xl backdrop-blur-xl sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-white/65">形象診斷</span>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium tabular-nums text-white/85">{progress}</span>
        </div>
        <h2 id={`question-${question.id}`} className="font-sans text-xl font-semibold leading-snug tracking-tight sm:text-2xl">
          {question.title}
        </h2>
        {question.subtitle && <p className="mt-1 text-xs text-white/60">{question.subtitle}</p>}

        <div
          className={`mt-4 grid gap-2 ${isScale ? 'grid-cols-5' : ''}`}
          role={question.type === 'single' ? 'radiogroup' : 'group'}
        >
          {question.options.map((option) => {
            const checked = selected.includes(option.id)
            return (
              <button
                key={option.id}
                type="button"
                role={question.type === 'single' ? 'radio' : 'checkbox'}
                aria-checked={checked}
                disabled={disabled}
                onClick={() => choose(option.id)}
                className={`flex min-h-12 w-full items-center rounded-2xl border py-3 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-a2o-pink focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-wait ${
                  isScale ? 'justify-center px-2 text-center text-base tabular-nums' : 'justify-between gap-3 px-4 text-left text-sm'
                } ${
                  checked
                    ? 'border-a2o-pink bg-a2o-pink text-white'
                    : 'border-white/15 bg-white/10 text-white hover:border-white/35 hover:bg-white/15'
                }`}
              >
                <span>{option.label}</span>
                {!isScale && (
                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${checked ? 'border-white bg-white text-a2o-pink' : 'border-white/35'}`}>
                    {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {question.type === 'multi' && (
          <button
            type="button"
            disabled={disabled || selected.length === 0}
            onClick={() => onConfirm(selected)}
            className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-a2o-black transition hover:bg-a2o-beige focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-a2o-pink disabled:opacity-40"
          >
            繼續 <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </section>
  )
}
