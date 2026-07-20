type AssessmentEventName =
  | 'assessment_view'
  | 'assessment_start'
  | 'scene_view'
  | 'question_shown'
  | 'answer_selected'
  | 'transition_started'
  | 'transition_completed'
  | 'assessment_completed'
  | 'lead_submitted'
  | 'whatsapp_clicked'
  | 'video_playback_error'
  | 'assessment_restarted'

type AssessmentEventPayload = Record<string, string | number | boolean | string[] | undefined>

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>
  }
}

export function trackAssessmentEvent(event: AssessmentEventName, payload: AssessmentEventPayload = {}) {
  const eventPayload = { event, ...payload }
  window.dataLayer?.push(eventPayload)
  window.dispatchEvent(new CustomEvent('a2o:analytics', { detail: eventPayload }))
}
