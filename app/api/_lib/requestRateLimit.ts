type RateLimitOptions = {
  limit: number
  windowMs: number
  now?: () => number
}

export function getForwardedAddress(headers?: Record<string, string | string[] | undefined>) {
  const forwarded = headers?.['x-forwarded-for']
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded
  return raw?.split(',')[0]?.trim() || 'unknown'
}

export function createFixedWindowRateLimiter({ limit, windowMs, now = Date.now }: RateLimitOptions) {
  const requests = new Map<string, { windowStartedAt: number; count: number }>()

  return (key: string) => {
    const currentTime = now()
    const existing = requests.get(key)
    if (!existing || currentTime - existing.windowStartedAt >= windowMs) {
      if (!existing && requests.size >= 5_000) {
        const oldestKey = requests.keys().next().value
        if (typeof oldestKey === 'string') requests.delete(oldestKey)
      }
      requests.set(key, { windowStartedAt: currentTime, count: 1 })
      return true
    }
    if (existing.count >= limit) return false
    existing.count += 1

    if (requests.size > 1_000) {
      for (const [storedKey, value] of requests) {
        if (currentTime - value.windowStartedAt >= windowMs) requests.delete(storedKey)
      }
    }
    return true
  }
}
