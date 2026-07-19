import { describe, expect, it, vi } from 'vitest'
import {
  prepareHiddenVideo,
  prepareHiddenVideoForSwap,
  unlockHiddenVideo,
  waitForActualFrame,
} from './videoPlayback'

function createReadyVideo() {
  const video = document.createElement('video')
  Object.defineProperty(video, 'readyState', {
    configurable: true,
    get: () => HTMLMediaElement.HAVE_CURRENT_DATA,
  })
  video.requestVideoFrameCallback = (callback) => {
    queueMicrotask(() => callback(0, {} as VideoFrameCallbackMetadata))
    return 1
  }
  return video
}

describe('hidden video playback', () => {
  it('cancels a pending decoded-frame request when confirmation times out', async () => {
    const video = createReadyVideo()
    video.requestVideoFrameCallback = () => 42
    const cancelFrame = vi.fn()
    video.cancelVideoFrameCallback = cancelFrame

    await expect(waitForActualFrame(video, 10)).resolves.toBe(false)

    expect(cancelFrame).toHaveBeenCalledWith(42)
  })

  it('unlocks an inactive video silently and returns it to the start', async () => {
    const video = createReadyVideo()
    video.currentTime = 1.25
    const mutedDuringPlay: boolean[] = []
    const play = vi.spyOn(video, 'play').mockImplementation(() => {
      mutedDuringPlay.push(video.muted)
      return Promise.resolve()
    })
    const pause = vi.spyOn(video, 'pause').mockImplementation(() => undefined)

    await expect(unlockHiddenVideo(video)).resolves.toBe(true)

    expect(play).toHaveBeenCalledOnce()
    expect(mutedDuringPlay).toEqual([true])
    expect(pause).toHaveBeenCalledOnce()
    expect(video.currentTime).toBe(0)
    expect(video.muted).toBe(true)
  })

  it('starts authored playback muted from the prepared first frame', async () => {
    const video = createReadyVideo()
    const requestFrame = vi.spyOn(video, 'requestVideoFrameCallback')
    const mutedDuringPlay: boolean[] = []
    const play = vi.spyOn(video, 'play').mockImplementation(() => {
      mutedDuringPlay.push(video.muted)
      return Promise.resolve()
    })
    const pause = vi.spyOn(video, 'pause').mockImplementation(() => undefined)

    await expect(prepareHiddenVideo(video, 20, 20)).resolves.toBe(true)

    expect(play).toHaveBeenCalledOnce()
    expect(requestFrame).not.toHaveBeenCalled()
    expect(mutedDuringPlay).toEqual([true])
    expect(pause).toHaveBeenCalled()
    expect(video.currentTime).toBeLessThanOrEqual(0.05)
    expect(video.muted).toBe(true)
  })

  it('loads a hidden swap buffer when current data is absent', async () => {
    const video = document.createElement('video')
    let readyState = HTMLMediaElement.HAVE_NOTHING
    Object.defineProperty(video, 'readyState', {
      configurable: true,
      get: () => readyState,
    })
    const load = vi.spyOn(video, 'load').mockImplementation(() => {
      readyState = HTMLMediaElement.HAVE_CURRENT_DATA
      queueMicrotask(() => video.dispatchEvent(new Event('loadeddata')))
    })
    const play = vi.spyOn(video, 'play').mockResolvedValue()
    const pause = vi.spyOn(video, 'pause').mockImplementation(() => undefined)

    await expect(prepareHiddenVideoForSwap(video, 20, 20)).resolves.toBe(true)

    expect(load).toHaveBeenCalledOnce()
    expect(play).not.toHaveBeenCalled()
    expect(pause).toHaveBeenCalled()
    expect(video.currentTime).toBe(0)
    expect(video.muted).toBe(true)
  })

  it('prepares a hidden swap buffer from current data and leaves it paused', async () => {
    const video = createReadyVideo()
    const requestFrame = vi.spyOn(video, 'requestVideoFrameCallback')
    const play = vi.spyOn(video, 'play').mockResolvedValue()
    const pause = vi.spyOn(video, 'pause').mockImplementation(() => undefined)

    await expect(prepareHiddenVideoForSwap(video, 20, 20)).resolves.toBe(true)

    expect(play).not.toHaveBeenCalled()
    expect(requestFrame).not.toHaveBeenCalled()
    expect(pause).toHaveBeenCalled()
    expect(video.currentTime).toBeLessThanOrEqual(0.05)
    expect(video.muted).toBe(true)
  })

  it('does not seek again after confirming current data at the start', async () => {
    const video = document.createElement('video')
    let currentTime = 1
    let readyState = HTMLMediaElement.HAVE_CURRENT_DATA
    let seekCount = 0
    Object.defineProperty(video, 'currentTime', {
      configurable: true,
      get: () => currentTime,
      set: (value: number) => {
        seekCount += 1
        currentTime = value
        if (seekCount > 1) readyState = HTMLMediaElement.HAVE_METADATA
      },
    })
    Object.defineProperty(video, 'readyState', {
      configurable: true,
      get: () => readyState,
    })
    vi.spyOn(video, 'pause').mockImplementation(() => undefined)

    await expect(prepareHiddenVideoForSwap(video, 20, 20)).resolves.toBe(true)

    expect(seekCount).toBe(1)
    expect(video.readyState).toBe(HTMLMediaElement.HAVE_CURRENT_DATA)
    expect(video.currentTime).toBe(0)
  })

  it('accepts a Safari-ready paused hidden buffer without trying to play it', async () => {
    const video = createReadyVideo()
    video.requestVideoFrameCallback = vi.fn(() => 1)
    const play = vi.spyOn(video, 'play').mockResolvedValue()
    const pause = vi.spyOn(video, 'pause').mockImplementation(() => undefined)

    await expect(prepareHiddenVideoForSwap(video, 10, 10)).resolves.toBe(true)

    expect(play).not.toHaveBeenCalled()
    expect(pause).toHaveBeenCalled()
    expect(video.paused).toBe(true)
    expect(video.currentTime).toBe(0)
    expect(video.muted).toBe(true)
  })

  it('times out when a hidden swap buffer never receives current data', async () => {
    const video = document.createElement('video')
    const load = vi.spyOn(video, 'load').mockImplementation(() => undefined)
    const play = vi.spyOn(video, 'play').mockResolvedValue()
    const pause = vi.spyOn(video, 'pause').mockImplementation(() => undefined)

    await expect(prepareHiddenVideoForSwap(video, 20, 20)).resolves.toBe(false)

    expect(load).toHaveBeenCalledOnce()
    expect(play).not.toHaveBeenCalled()
    expect(pause).toHaveBeenCalled()
    expect(video.currentTime).toBe(0)
    expect(video.muted).toBe(true)
  })

  it('fails preparation when loading the hidden swap buffer errors', async () => {
    const video = document.createElement('video')
    vi.spyOn(video, 'load').mockImplementation(() => {
      queueMicrotask(() => video.dispatchEvent(new Event('error')))
    })
    const play = vi.spyOn(video, 'play').mockResolvedValue()
    const pause = vi.spyOn(video, 'pause').mockImplementation(() => undefined)

    await expect(prepareHiddenVideoForSwap(video, 20, 20)).resolves.toBe(false)

    expect(play).not.toHaveBeenCalled()
    expect(pause).toHaveBeenCalled()
    expect(video.currentTime).toBe(0)
    expect(video.muted).toBe(true)
  })

  it('aborts pending hidden swap preparation and leaves the buffer stopped', async () => {
    const video = document.createElement('video')
    const controller = new AbortController()
    vi.spyOn(video, 'load').mockImplementation(() => queueMicrotask(() => controller.abort()))
    const play = vi.spyOn(video, 'play').mockResolvedValue()
    const pause = vi.spyOn(video, 'pause').mockImplementation(() => undefined)

    await expect(
      prepareHiddenVideoForSwap(video, 20, 20, controller.signal),
    ).resolves.toBe(false)

    expect(play).not.toHaveBeenCalled()
    expect(pause).toHaveBeenCalled()
    expect(video.currentTime).toBe(0)
    expect(video.muted).toBe(true)
  })

  it('rejects a hidden swap preparation that becomes stale while loading', async () => {
    const video = document.createElement('video')
    let isCurrent = true
    let readyState = HTMLMediaElement.HAVE_NOTHING
    Object.defineProperty(video, 'readyState', {
      configurable: true,
      get: () => readyState,
    })
    vi.spyOn(video, 'load').mockImplementation(() => {
      isCurrent = false
      readyState = HTMLMediaElement.HAVE_CURRENT_DATA
      queueMicrotask(() => video.dispatchEvent(new Event('loadeddata')))
    })
    const play = vi.spyOn(video, 'play').mockResolvedValue()
    const pause = vi.spyOn(video, 'pause').mockImplementation(() => undefined)

    await expect(
      prepareHiddenVideoForSwap(video, 20, 20, undefined, () => isCurrent),
    ).resolves.toBe(false)

    expect(play).not.toHaveBeenCalled()
    expect(pause).toHaveBeenCalled()
    expect(video.currentTime).toBe(0)
    expect(video.muted).toBe(true)
  })

  it('stops and keeps a hidden video muted when playback is rejected', async () => {
    const video = createReadyVideo()
    const play = vi.spyOn(video, 'play').mockRejectedValue(new Error('playback rejected'))
    const pause = vi.spyOn(video, 'pause').mockImplementation(() => undefined)

    await expect(prepareHiddenVideo(video, 20, 20)).resolves.toBe(false)

    expect(play).toHaveBeenCalledOnce()
    expect(pause).toHaveBeenCalled()
    expect(video.muted).toBe(true)
  })
})
