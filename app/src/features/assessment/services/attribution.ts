import type { Attribution } from '../types/assessment'

export function getAttribution(): Attribution {
  const primary = new URLSearchParams(window.location.search)
  const hashQuery = window.location.hash.includes('?')
    ? new URLSearchParams(window.location.hash.split('?')[1])
    : new URLSearchParams()
  const read = (key: string) => primary.get(key) ?? hashQuery.get(key) ?? undefined

  return {
    sourceUrl: window.location.href,
    referrer: document.referrer,
    utmSource: read('utm_source'),
    utmMedium: read('utm_medium'),
    utmCampaign: read('utm_campaign'),
    utmContent: read('utm_content'),
    utmTerm: read('utm_term'),
  }
}
