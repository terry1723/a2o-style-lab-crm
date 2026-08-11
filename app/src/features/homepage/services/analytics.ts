type HomepageEvent =
  | 'homepage_case_view'
  | 'homepage_case_swipe'
  | 'homepage_service_view'
  | 'homepage_scroll_25'
  | 'homepage_scroll_50'
  | 'homepage_scroll_75'
  | 'homepage_final_cta'
  | 'homepage_assessment_return'

export function trackHomepageEvent(name: HomepageEvent, payload: Record<string, string | number> = {}) {
  window.dispatchEvent(new CustomEvent('a2o:homepage-event', { detail: { name, ...payload } }))
}
