export type FrameVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (callback: () => void) => number
}

export function waitForActualFrame(video: FrameVideo | null, timeoutMs = 3000) {
  if (!video) return Promise.resolve(false)

  return new Promise<boolean>((resolve) => {
    let settled = false
    const finish = (ready: boolean) => {
      if (settled) return
      settled = true
      window.clearTimeout(timeout)
      video.removeEventListener('loadeddata', onLoadedData)
      resolve(ready)
    }
    const onLoadedData = () => {
      if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(() => finish(true))
      else finish(video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA)
    }
    const timeout = window.setTimeout(
      () => finish(video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA),
      timeoutMs,
    )

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) onLoadedData()
    else video.addEventListener('loadeddata', onLoadedData, { once: true })
  })
}

export function rewindToFirstFrame(video: HTMLVideoElement, timeoutMs = 1500) {
  video.pause()

  return new Promise<boolean>((resolve) => {
    let settled = false
    const finish = (ready: boolean) => {
      if (settled) return
      settled = true
      window.clearTimeout(timeout)
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('error', onError)
      resolve(ready)
    }
    const onSeeked = () => finish(video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA)
    const onError = () => finish(false)
    const timeout = window.setTimeout(
      () => finish(video.currentTime <= 0.05 && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA),
      timeoutMs,
    )

    video.addEventListener('seeked', onSeeked, { once: true })
    video.addEventListener('error', onError, { once: true })
    const alreadyAtStart = video.currentTime <= 0.05
    video.currentTime = 0

    if (alreadyAtStart && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) finish(true)
  })
}

export async function unlockHiddenVideo(video: HTMLVideoElement | null) {
  if (!video) return false

  video.muted = true
  try {
    await video.play()
    video.pause()
    video.currentTime = 0
    return true
  } catch {
    video.muted = true
    video.pause()
    try {
      video.currentTime = 0
    } catch {
      // The element may not have loaded metadata yet; it must still stay silent.
    }
    return false
  }
}

export async function prepareHiddenVideo(
  video: FrameVideo | null,
  frameTimeoutMs = 3000,
  rewindTimeoutMs = 1500,
) {
  if (!video) return false

  try {
    video.muted = true
    video.currentTime = 0
    video.muted = true
    await video.play()

    const frameReady = await waitForActualFrame(video, frameTimeoutMs)
    if (!frameReady) {
      video.muted = true
      video.pause()
      return false
    }

    video.muted = true
    const firstFrameReady = await rewindToFirstFrame(video, rewindTimeoutMs)
    if (!firstFrameReady) {
      video.muted = true
      video.pause()
      return false
    }

    video.muted = true
    await video.play()
    return true
  } catch {
    video.muted = true
    video.pause()
    return false
  }
}
