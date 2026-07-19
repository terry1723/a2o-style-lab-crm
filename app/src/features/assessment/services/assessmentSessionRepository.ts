import { isSupabaseConfigured, supabase } from '../../../lib/supabase'
import { saveClient } from '../../../lib/clientData'
import type {
  AssessmentAnswerMap,
  AssessmentConfig,
  AssessmentLeadInput,
  AssessmentResult,
  Attribution,
} from '../types/assessment'
import { getSelectedLabels } from './scoring'

const RETRY_KEY = 'a2o_assessment_retry_queue_v1'
let remoteAssessmentSchema: 'unknown' | 'available' | 'missing' = 'unknown'

type RetryItem = {
  kind: 'session' | 'answer'
  payload: Record<string, unknown>
}

function queueRetry(item: RetryItem) {
  try {
    const queue = JSON.parse(localStorage.getItem(RETRY_KEY) ?? '[]') as RetryItem[]
    const signature = JSON.stringify(item)
    if (!queue.some((queued) => JSON.stringify(queued) === signature)) queue.push(item)
    localStorage.setItem(RETRY_KEY, JSON.stringify(queue.slice(-20)))
  } catch {
    localStorage.setItem(RETRY_KEY, JSON.stringify([item]))
  }
}

function isMissingTable(error: { code?: string; message?: string } | null) {
  return error?.code === 'PGRST205' || error?.message?.includes('assessment_') === true
}

function normaliseHongKongPhone(phone: string) {
  const clean = phone.replace(/[\s-]/g, '')
  if (/^\+852\d{8}$/.test(clean)) return clean
  if (/^852\d{8}$/.test(clean)) return `+${clean}`
  if (/^\d{8}$/.test(clean)) return `+852${clean}`
  return clean
}

export async function createAssessmentSession(
  sessionId: string,
  attribution: Attribution,
) {
  const payload = {
    id: sessionId,
    anonymous_token: sessionId,
    status: 'in_progress',
    current_scene: 1,
    started_at: new Date().toISOString(),
    source_url: attribution.sourceUrl,
    referrer: attribution.referrer || null,
    utm_source: attribution.utmSource ?? null,
    utm_medium: attribution.utmMedium ?? null,
    utm_campaign: attribution.utmCampaign ?? null,
    utm_content: attribution.utmContent ?? null,
    utm_term: attribution.utmTerm ?? null,
    device_category: window.innerWidth < 768 ? 'mobile' : 'desktop',
  }

  if (!isSupabaseConfigured() || remoteAssessmentSchema === 'missing') {
    queueRetry({ kind: 'session', payload })
    return false
  }

  const { error } = await supabase.from('assessment_sessions').insert(payload)
  if (!error || error.code === '23505') {
    remoteAssessmentSchema = 'available'
    return true
  }
  if (isMissingTable(error)) remoteAssessmentSchema = 'missing'
  queueRetry({ kind: 'session', payload })
  return false
}

export async function persistAssessmentAnswer(
  sessionId: string,
  questionId: string,
  selectedOptionIds: string[],
) {
  const payload = {
    id: `${sessionId}:${questionId}`,
    session_id: sessionId,
    question_id: questionId,
    selected_option_ids: selectedOptionIds,
    answered_at: new Date().toISOString(),
  }

  if (!isSupabaseConfigured() || remoteAssessmentSchema === 'missing') {
    queueRetry({ kind: 'answer', payload })
    return false
  }

  const { error } = await supabase.from('assessment_answers').insert(payload)
  if (!error || error.code === '23505') {
    remoteAssessmentSchema = 'available'
    return true
  }
  if (isMissingTable(error)) remoteAssessmentSchema = 'missing'
  queueRetry({ kind: 'answer', payload })
  return false
}

export async function submitAssessmentLead(
  input: AssessmentLeadInput,
  sessionId: string,
  answers: AssessmentAnswerMap,
  result: AssessmentResult,
  attribution: Attribution,
  config: AssessmentConfig,
) {
  const labels = getSelectedLabels(config, answers)
  const metadata = JSON.stringify({
    assessmentSessionId: sessionId,
    resultType: result.id,
    answers,
    answerLabels: labels,
    attribution,
    consent: input.consent,
    submittedAt: new Date().toISOString(),
  })

  return saveClient({
    name: input.name.trim(),
    phone: normaliseHongKongPhone(input.phone),
    before_photo: input.photoDataUrl,
    pain_point: labels.q1?.join('、') ?? '',
    purpose: labels.q2?.join('、') ?? '',
    desired_effect: labels.q3?.join('、') ?? '',
    body_remark: `優先改善：${labels.q4?.join('、') ?? '-'}\n診斷 Session：${sessionId}`,
    favorite_style: result.title,
    color_notes: metadata,
    plan: 'Interactive Assessment Lead',
    plan_price: 0,
    amount_paid: 0,
    balance_due: 0,
    status: 'active',
  })
}
