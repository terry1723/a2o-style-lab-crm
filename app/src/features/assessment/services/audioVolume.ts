export function fadeAudioVolume(
  audio: HTMLMediaElement,
  target: number,
  durationMs: number,
): () => void {
  const clampedTarget = Math.min(1, Math.max(0, target))

  if (durationMs <= 0) {
    audio.volume = clampedTarget
    return () => undefined
  }

  const startVolume = audio.volume
  let startTime: number | null = null
  let frameId: number | null = null
  let cancelled = false

  const updateVolume = (timestamp: number) => {
    frameId = null
    if (cancelled) return

    if (startTime === null) {
      startTime = timestamp
      frameId = requestAnimationFrame(updateVolume)
      return
    }

    const progress = Math.min((timestamp - startTime) / durationMs, 1)
    audio.volume = startVolume + (clampedTarget - startVolume) * progress

    if (progress < 1) frameId = requestAnimationFrame(updateVolume)
  }

  frameId = requestAnimationFrame(updateVolume)

  return () => {
    if (cancelled) return
    cancelled = true
    if (frameId !== null) cancelAnimationFrame(frameId)
    frameId = null
  }
}

export function fadeAudioParam(
  param: AudioParam,
  target: number,
  durationMs: number,
): () => void {
  const clampedTarget = Math.min(1, Math.max(0, target))

  if (durationMs <= 0) {
    param.value = clampedTarget
    return () => undefined
  }

  const startValue = param.value
  let startTime: number | null = null
  let frameId: number | null = null
  let cancelled = false

  const updateValue = (timestamp: number) => {
    frameId = null
    if (cancelled) return

    if (startTime === null) {
      startTime = timestamp
      frameId = requestAnimationFrame(updateValue)
      return
    }

    const progress = Math.min((timestamp - startTime) / durationMs, 1)
    param.value = startValue + (clampedTarget - startValue) * progress

    if (progress < 1) frameId = requestAnimationFrame(updateValue)
  }

  frameId = requestAnimationFrame(updateValue)

  return () => {
    if (cancelled) return
    cancelled = true
    if (frameId !== null) cancelAnimationFrame(frameId)
    frameId = null
  }
}
