export type FrameVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (callback: () => void) => number
  cancelVideoFrameCallback?: (handle: number) => void
}

function playHiddenVideo(video: HTMLVideoElement, timeoutMs: number, signal?: AbortSignal) {
  return new Promise<boolean>((resolve) => {
    let settled = false
    const finish = (started: boolean, stop: boolean) => {
      if (settled) return
      settled = true
      window.clearTimeout(timeout)
      signal?.removeEventListener('abort', onAbort)
      if (stop) {
        video.muted = true
        video.pause()
      }
      resolve(started)
    }
    const onAbort = () => finish(false, true)
    const timeout = window.setTimeout(() => finish(false, true), timeoutMs)

    signal?.addEventListener('abort', onAbort, { once: true })
    if (signal?.aborted) {
      finish(false, true)
      return
    }

    try {
      void video.play().then(
        () => finish(true, false),
        () => finish(false, true),
      )
    } catch {
      finish(false, true)
    }
  })
}

export function waitForActualFrame(
  video: FrameVideo | null,
  timeoutMs = 3000,
  signal?: AbortSignal,
) {
  if (!video) return Promise.resolve(false)

  return new Promise<boolean>((resolve) => {
    let settled = false
    let frameRequestId: number | null = null
    const finish = (ready: boolean) => {
      if (settled) return
      settled = true
      window.clearTimeout(timeout)
      video.removeEventListener('loadeddata', onLoadedData)
      video.removeEventListener('error', onError)
      signal?.removeEventListener('abort', onAbort)
      if (frameRequestId !== null) video.cancelVideoFrameCallback?.(frameRequestId)
      frameRequestId = null
      resolve(ready)
    }
    const onLoadedData = () => {
      if (!video.requestVideoFrameCallback) {
        finish(video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA)
        return
      }

      let callbackRanSynchronously = false
      const requestId = video.requestVideoFrameCallback(() => {
        callbackRanSynchronously = true
        frameRequestId = null
        finish(true)
      })
      if (!callbackRanSynchronously) frameRequestId = requestId
    }
    const onError = () => finish(false)
    const onAbort = () => finish(false)
    const timeout = window.setTimeout(() => finish(false), timeoutMs)

    video.addEventListener('error', onError, { once: true })
    signal?.addEventListener('abort', onAbort, { once: true })
    if (signal?.aborted) {
      finish(false)
      return
    }
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) onLoadedData()
    else video.addEventListener('loadeddata', onLoadedData, { once: true })
  })
}

export function rewindToFirstFrame(video: FrameVideo, timeoutMs = 1500, signal?: AbortSignal) {
  video.pause()

  return new Promise<boolean>((resolve) => {
    let settled = false
    let frameConfirmationPending = false
    let frameRequestId: number | null = null
    const finish = (ready: boolean) => {
      if (settled) return
      settled = true
      window.clearTimeout(timeout)
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('error', onError)
      signal?.removeEventListener('abort', onAbort)
      if (frameRequestId !== null) video.cancelVideoFrameCallback?.(frameRequestId)
      frameRequestId = null
      resolve(ready)
    }
    const confirmRewoundFrame = () => {
      if (settled || frameConfirmationPending) return
      frameConfirmationPending = true

      if (!video.requestVideoFrameCallback) {
        finish(
          video.currentTime <= 0.05
          && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA,
        )
        return
      }

      let callbackRanSynchronously = false
      const requestId = video.requestVideoFrameCallback(() => {
        callbackRanSynchronously = true
        frameRequestId = null
        finish(video.currentTime <= 0.05)
      })
      if (!callbackRanSynchronously) frameRequestId = requestId
    }
    const onSeeked = () => confirmRewoundFrame()
    const onError = () => finish(false)
    const onAbort = () => finish(false)
    const timeout = window.setTimeout(() => finish(false), timeoutMs)

    video.addEventListener('seeked', onSeeked, { once: true })
    video.addEventListener('error', onError, { once: true })
    signal?.addEventListener('abort', onAbort, { once: true })
    if (signal?.aborted) {
      finish(false)
      return
    }
    const alreadyAtStart = video.currentTime <= 0.05
    video.currentTime = 0

    if (alreadyAtStart) confirmRewoundFrame()
  })
}

export async function unlockHiddenVideo(
  video: HTMLVideoElement | null,
  signal?: AbortSignal,
  isCurrent: () => boolean = () => true,
) {
  if (!video) return false

  video.muted = true
  try {
    await video.play()
    if (signal?.aborted || !isCurrent()) return false
    video.pause()
    video.currentTime = 0
    return true
  } catch {
    if (signal?.aborted || !isCurrent()) return false
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

export async function prepareHiddenVideoForSwap(
  video: FrameVideo | null,
  frameTimeoutMs = 3000,
  rewindTimeoutMs = 1500,
  signal?: AbortSignal,
  isCurrent: () => boolean = () => true,
) {
  if (!video) return false
  const current = () => !signal?.aborted && isCurrent()
  if (!current()) return false

  try {
    video.muted = true
    video.currentTime = 0
    const playbackStarted = await playHiddenVideo(video, frameTimeoutMs, signal)
    if (!playbackStarted) return false
    if (!current()) return false

    const frameReady = await waitForActualFrame(video, frameTimeoutMs, signal)
    if (!current()) return false
    if (!frameReady) {
      video.muted = true
      video.pause()
      return false
    }

    video.muted = true
    const firstFrameReady = await rewindToFirstFrame(video, rewindTimeoutMs, signal)
    if (!current()) return false
    if (!firstFrameReady) {
      video.muted = true
      video.pause()
      return false
    }

    video.muted = true
    video.pause()
    return true
  } catch {
    if (!current()) return false
    video.muted = true
    video.pause()
    return false
  }
}

export async function prepareHiddenVideo(
  video: FrameVideo | null,
  frameTimeoutMs = 3000,
  rewindTimeoutMs = 1500,
) {
  const prepared = await prepareHiddenVideoForSwap(video, frameTimeoutMs, rewindTimeoutMs)
  if (!video || !prepared) return false

  try {
    video.muted = true
    return await playHiddenVideo(video, frameTimeoutMs)
  } catch {
    return false
  }
}
