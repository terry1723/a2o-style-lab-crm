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

function dispatchSeekedWhenRewound(video: HTMLVideoElement) {
  let currentTime = 0
  Object.defineProperty(video, 'currentTime', {
    configurable: true,
    get: () => currentTime,
    set: (value: number) => {
      currentTime = value
      if (value === 0) queueMicrotask(() => video.dispatchEvent(new Event('seeked')))
    },
  })
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

  it('keeps both hidden preparation play calls muted and resumes at the first frame', async () => {
    const video = createReadyVideo()
    dispatchSeekedWhenRewound(video)
    const requestFrame = vi.spyOn(video, 'requestVideoFrameCallback')
    const mutedDuringPlay: boolean[] = []
    const play = vi.spyOn(video, 'play').mockImplementation(() => {
      mutedDuringPlay.push(video.muted)
      if (mutedDuringPlay.length === 1) video.currentTime = 0.8
      return Promise.resolve()
    })
    const pause = vi.spyOn(video, 'pause').mockImplementation(() => undefined)

    await expect(prepareHiddenVideo(video, 20, 20)).resolves.toBe(true)

    expect(play).toHaveBeenCalledTimes(2)
    expect(requestFrame).toHaveBeenCalledTimes(2)
    expect(mutedDuringPlay).toEqual([true, true])
    expect(pause).toHaveBeenCalled()
    expect(video.currentTime).toBeLessThanOrEqual(0.05)
    expect(video.muted).toBe(true)
  })

  it('fails without resuming when the rewound first frame is never decoded', async () => {
    const video = createReadyVideo()
    dispatchSeekedWhenRewound(video)
    let frameCallbackCount = 0
    video.requestVideoFrameCallback = (callback) => {
      frameCallbackCount += 1
      if (frameCallbackCount === 1) callback(0, {} as VideoFrameCallbackMetadata)
      return frameCallbackCount
    }
    const play = vi.spyOn(video, 'play').mockImplementation(() => {
      if (play.mock.calls.length === 1) video.currentTime = 0.8
      return Promise.resolve()
    })
    const pause = vi.spyOn(video, 'pause').mockImplementation(() => undefined)

    await expect(prepareHiddenVideo(video, 20, 20)).resolves.toBe(false)

    expect(frameCallbackCount).toBe(2)
    expect(play).toHaveBeenCalledOnce()
    expect(pause).toHaveBeenCalled()
    expect(video.muted).toBe(true)
  })

  it('prepares a hidden swap buffer on two decoded frames and leaves it paused', async () => {
    const video = createReadyVideo()
    dispatchSeekedWhenRewound(video)
    const requestFrame = vi.spyOn(video, 'requestVideoFrameCallback')
    const play = vi.spyOn(video, 'play').mockImplementation(() => {
      video.currentTime = 0.8
      return Promise.resolve()
    })
    const pause = vi.spyOn(video, 'pause').mockImplementation(() => undefined)

    await expect(prepareHiddenVideoForSwap(video, 20, 20)).resolves.toBe(true)

    expect(play).toHaveBeenCalledOnce()
    expect(requestFrame).toHaveBeenCalledTimes(2)
    expect(pause).toHaveBeenCalled()
    expect(video.currentTime).toBeLessThanOrEqual(0.05)
    expect(video.muted).toBe(true)
  })

  it('accepts a Safari-ready paused hidden buffer without trying to play it', async () => {
    const video = createReadyVideo()
    video.requestVideoFrameCallback = vi.fn(() => 1)
    const play = vi.spyOn(video, 'play').mockResolvedValue()
    vi.spyOn(video, 'pause').mockImplementation(() => undefined)

    await expect(prepareHiddenVideoForSwap(video, 10, 10)).resolves.toBe(true)

    expect(play).not.toHaveBeenCalled()
    expect(video.paused).toBe(true)
    expect(video.currentTime).toBe(0)
  })

  it('times out a never-settling hidden play and stops the muted buffer', async () => {
    const video = createReadyVideo()
    vi.spyOn(video, 'play').mockReturnValue(new Promise<void>(() => undefined))
    const pause = vi.spyOn(video, 'pause').mockImplementation(() => undefined)

    await expect(prepareHiddenVideoForSwap(video, 20, 20)).resolves.toBe(false)

    expect(pause).toHaveBeenCalled()
    expect(video.muted).toBe(true)
  })

  it('stops and keeps a hidden video muted when playback is rejected', async () => {
    const video = createReadyVideo()
    const play = vi.spyOn(video, 'play').mockRejectedValue(new Error('playback rejected'))
    const pause = vi.spyOn(video, 'pause').mockImplementation(() => undefined)

    await expect(prepareHiddenVideo(video, 20, 20)).resolves.toBe(false)

    expect(play).toHaveBeenCalledOnce()
    expect(pause).toHaveBeenCalledOnce()
    expect(video.muted).toBe(true)
  })
})
