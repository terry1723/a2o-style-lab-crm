export type AssessmentStatus =
  | 'boot'
  | 'ready'
  | 'playing_scene'
  | 'showing_question'
  | 'submitting_answer'
  | 'transitioning'
  | 'playing_next_scene'
  | 'completed'
  | 'recoverable_error'
  | 'fatal_error'

export type AssessmentAnswerMap = Record<string, string[]>

export type AssessmentOption = {
  id: string
  label: string
  value: string
  score?: Record<string, number>
}

export type AssessmentQuestion = {
  id: string
  type: 'single' | 'multi'
  layout?: 'list' | 'scale'
  title: string
  subtitle?: string
  maxSelections?: number
  options: AssessmentOption[]
}

export type AssessmentScene = {
  id: string
  order: number
  enabled: boolean
  sceneVideoUrl: string
  posterUrl?: string
  transitionVideoUrl?: string
  questionCueSeconds: number
  idleMode?: 'hold-last-frame' | 'loop-tail' | 'continue'
  caption?: string
  question: AssessmentQuestion
}

export type AssessmentResultDefinition = {
  id: string
  eyebrow: string
  title: string
  summary: string
  recommendation: string
}

export type AssessmentConfig = {
  version: number
  experienceId: string
  opening: {
    headline: string
    supportingText: string
    cta: string
    posterUrl: string
    note: string
  }
  scenes: AssessmentScene[]
  results: Record<string, AssessmentResultDefinition>
  defaultResultId: string
  whatsappNumber: string
}

export type Attribution = {
  sourceUrl: string
  referrer: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmContent?: string
  utmTerm?: string
}

export type AssessmentMachineState = {
  status: AssessmentStatus
  sessionId: string
  currentSceneIndex: number
  activeBuffer: 0 | 1
  answers: AssessmentAnswerMap
  muted: boolean
  recovered: boolean
  playbackIssue?: string
}

export type AssessmentResult = AssessmentResultDefinition & {
  scores: Record<string, number>
}

export type AssessmentLeadInput = {
  name: string
  phone: string
  consent: true
  photo: File
}
