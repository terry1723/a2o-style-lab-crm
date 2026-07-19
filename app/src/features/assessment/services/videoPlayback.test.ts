import { describe, expect, it, vi } from 'vitest'
import { prepareHiddenVideo, unlockHiddenVideo } from './videoPlayback'

function createReadyVideo() {
  const video = document.createElement('video')
  Object.defineProperty(video, 'readyState', {
    configurable: true,
    get: () => HTMLMediaElement.HAVE_CURRENT_DATA,
  })
  video.requestVideoFrameCallback = (callback) => {
    callback(0, {} as VideoFrameCallbackMetadata)
    return 1
  }
  return video
}

describe('hidden video playback', () => {
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
    const mutedDuringPlay: boolean[] = []
    const play = vi.spyOn(video, 'play').mockImplementation(() => {
      mutedDuringPlay.push(video.muted)
      if (mutedDuringPlay.length === 1) video.currentTime = 0.8
      return Promise.resolve()
    })
    const pause = vi.spyOn(video, 'pause').mockImplementation(() => undefined)

    await expect(prepareHiddenVideo(video, 20, 20)).resolves.toBe(true)

    expect(play).toHaveBeenCalledTimes(2)
    expect(mutedDuringPlay).toEqual([true, true])
    expect(pause).toHaveBeenCalled()
    expect(video.currentTime).toBeLessThanOrEqual(0.05)
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
