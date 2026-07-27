import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ASSESSMENT_WHATSAPP_LABEL,
  ASSESSMENT_WHATSAPP_URL,
} from '../config/assessmentWhatsApp'
import { AssessmentEngine } from './AssessmentEngine'

const { cancelSoundtrackFade, fadeAudioParam, fadeAudioVolume } = vi.hoisted(() => ({
  cancelSoundtrackFade: vi.fn(),
  fadeAudioParam: vi.fn(),
  fadeAudioVolume: vi.fn(),
}))

vi.mock('../services/audioVolume', () => ({ fadeAudioParam, fadeAudioVolume }))

function installMockAudioContext(options: { failSourceCreation?: boolean } = {}) {
  const gainParam = { value: 1 } as AudioParam
  const destination = {} as AudioDestinationNode
  const source = {
    connect: vi.fn(),
    disconnect: vi.fn(),
  } as unknown as MediaElementAudioSourceNode
  const gain = {
    gain: gainParam,
    connect: vi.fn(),
    disconnect: vi.fn(),
  } as unknown as GainNode
  const resume = vi.fn(() => Promise.resolve())
  const createMediaElementSource = vi.fn((_element: HTMLMediaElement): MediaElementAudioSourceNode => {
    if (options.failSourceCreation) throw new Error('source creation failed')
    return source
  })
  const context = {
    destination,
    createMediaElementSource,
    createGain: vi.fn(() => gain),
    resume,
    close: vi.fn(() => Promise.resolve()),
  } as unknown as AudioContext
  const AudioContextConstructor = vi.fn(function MockAudioContext() {
    return context
  })
  vi.stubGlobal('AudioContext', AudioContextConstructor)
  return {
    AudioContextConstructor,
    context,
    createMediaElementSource,
    destination,
    gain,
    gainParam,
    resume,
    source,
  }
}

async function advanceToFinalQuestion(container: HTMLElement) {
  const firstVideo = container.querySelector('video[src*="question-01"]') as HTMLVideoElement
  fireEvent.click(screen.getByRole('button', { name: '開始形象檢測' }))
  fireEvent.ended(firstVideo)

  for (const [answerName, nextScene] of [
    ['6', 'question-02'],
    ['會見客戶、銷售或商務洽談', 'question-03'],
    ['客戶信任與成交機會', 'question-04'],
  ] as const) {
    const answer = await screen.findByRole('radio', { name: answerName })
    await waitFor(() => expect(answer).toBeEnabled())
    fireEvent.click(answer)
    const nextVideo = await waitFor(() => {
      const video = container.querySelector(`video[src*="${nextScene}"]`) as HTMLVideoElement
      expect(video).toHaveClass('z-10')
      return video
    })
    fireEvent.ended(nextVideo)
  }

  return screen.findByRole('radio', { name: '髮型與頭部輪廓' })
}

describe('AssessmentEngine media layers', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    vi.useRealTimers()
    fadeAudioParam.mockReturnValue(cancelSoundtrackFade)
    fadeAudioVolume.mockReturnValue(cancelSoundtrackFade)
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows the approved WhatsApp action only during the active assessment and tracks it', () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    const analyticsEvents: Array<Record<string, unknown>> = []
    const analyticsListener = (event: Event) => {
      analyticsEvents.push((event as CustomEvent<Record<string, unknown>>).detail)
    }
    window.addEventListener('a2o:analytics', analyticsListener)
    render(<AssessmentEngine />)

    expect(screen.queryByRole('link', { name: ASSESSMENT_WHATSAPP_LABEL })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '開始形象檢測' }))

    const headerLink = screen.getByRole('link', { name: ASSESSMENT_WHATSAPP_LABEL })
    expect(headerLink).toHaveAttribute('href', ASSESSMENT_WHATSAPP_URL)
    expect(headerLink).toHaveAttribute('target', '_blank')
    expect(headerLink).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.queryByRole('button', { name: '重新開始診斷' })).not.toBeInTheDocument()

    headerLink.addEventListener('click', (event) => event.preventDefault(), { once: true })
    fireEvent.click(headerLink)
    expect(analyticsEvents).toContainEqual(expect.objectContaining({
      event: 'whatsapp_clicked',
      source: 'header',
      session_id: expect.any(String),
    }))

    window.removeEventListener('a2o:analytics', analyticsListener)
  })

  it('tracks the result WhatsApp action and hides the header action when completed', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    const analyticsEvents: Array<Record<string, unknown>> = []
    const analyticsListener = (event: Event) => {
      analyticsEvents.push((event as CustomEvent<Record<string, unknown>>).detail)
    }
    window.addEventListener('a2o:analytics', analyticsListener)
    const { container } = render(<AssessmentEngine />)
    const q4Answer = await advanceToFinalQuestion(container)

    vi.useFakeTimers()
    fireEvent.click(q4Answer)
    await act(async () => {
      vi.advanceTimersByTime(400)
      await Promise.resolve()
    })

    const resultLink = screen.getByRole('link', { name: ASSESSMENT_WHATSAPP_LABEL })
    expect(screen.getAllByRole('link', { name: ASSESSMENT_WHATSAPP_LABEL })).toHaveLength(1)
    resultLink.addEventListener('click', (event) => event.preventDefault(), { once: true })
    fireEvent.click(resultLink)
    expect(analyticsEvents).toContainEqual(expect.objectContaining({
      event: 'whatsapp_clicked',
      source: 'result',
      session_id: expect.any(String),
    }))

    window.removeEventListener('a2o:analytics', analyticsListener)
  })

  it('renders the looping preloaded assessment soundtrack without starting it on opening', () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    const { container } = render(<AssessmentEngine />)
    const soundtrack = container.querySelector('audio')

    expect(soundtrack).toHaveAttribute('src', '/media/assessment/soundtrack.mp3')
    expect(soundtrack).toHaveAttribute('preload', 'auto')
    expect(soundtrack).toHaveAttribute('loop')
    expect(soundtrack).toHaveAttribute('aria-hidden', 'true')
    expect(play).not.toHaveBeenCalled()
    expect(fadeAudioVolume).not.toHaveBeenCalled()
  })

  it('starts the soundtrack synchronously in the opening gesture with baseline volume and mute state', () => {
    let inStartGesture = false
    const soundtrackSnapshots: Array<{ gesture: boolean; volume: number; muted: boolean; currentTime: number }> = []
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
      if (this.tagName === 'AUDIO') {
        soundtrackSnapshots.push({
          gesture: inStartGesture,
          volume: this.volume,
          muted: this.muted,
          currentTime: this.currentTime,
        })
      }
      return Promise.resolve()
    })
    const { container } = render(<AssessmentEngine />)
    const soundtrack = container.querySelector('audio') as HTMLAudioElement
    soundtrack.currentTime = 12
    fireEvent.click(screen.getByRole('button', { name: '靜音' }))

    inStartGesture = true
    fireEvent.click(screen.getByRole('button', { name: '開始形象檢測' }))
    inStartGesture = false

    expect(soundtrackSnapshots).toEqual([{
      gesture: true,
      volume: 0.2,
      muted: true,
      currentTime: 0,
    }])
    expect(fadeAudioVolume).toHaveBeenCalledWith(soundtrack, 0.2, 240)
    expect(fadeAudioParam).not.toHaveBeenCalled()
  })

  it('unlocks a Web Audio gain graph in the start gesture and fades gain across assessment states', async () => {
    const graph = installMockAudioContext()
    let inStartGesture = false
    const soundtrackPlayGains: number[] = []
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
      if (this.tagName === 'AUDIO') {
        expect(inStartGesture).toBe(true)
        soundtrackPlayGains.push(graph.gainParam.value)
      }
      return Promise.resolve()
    })
    vi.spyOn(HTMLMediaElement.prototype, 'readyState', 'get')
      .mockReturnValue(HTMLMediaElement.HAVE_CURRENT_DATA)
    const { container } = render(<AssessmentEngine />)
    const soundtrack = container.querySelector('audio') as HTMLAudioElement
    const firstVideo = container.querySelector('video[src*="question-01"]') as HTMLVideoElement

    inStartGesture = true
    fireEvent.click(screen.getByRole('button', { name: '開始形象檢測' }))
    inStartGesture = false

    expect(graph.AudioContextConstructor).toHaveBeenCalledTimes(1)
    expect(graph.createMediaElementSource).toHaveBeenCalledWith(soundtrack)
    expect(graph.source.connect).toHaveBeenCalledWith(graph.gain)
    expect(graph.gain.connect).toHaveBeenCalledWith(graph.destination)
    expect(graph.context.resume).toHaveBeenCalledTimes(1)
    expect(soundtrackPlayGains).toEqual([0.2])
    await waitFor(() => expect(fadeAudioParam).toHaveBeenCalledWith(graph.gainParam, 0.2, 240))
    expect(fadeAudioVolume).not.toHaveBeenCalled()

    fireEvent.ended(firstVideo)
    await waitFor(() => expect(fadeAudioParam).toHaveBeenCalledWith(graph.gainParam, 0.32, 240))
    fireEvent.click(await screen.findByRole('radio', { name: '6' }))
    await waitFor(() => {
      const calls = fadeAudioParam.mock.calls
      expect(calls[calls.length - 1]).toEqual([graph.gainParam, 0.2, 240])
    })
    expect(cancelSoundtrackFade).toHaveBeenCalled()
  })

  it('fades element volume when Web Audio is unavailable', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'readyState', 'get')
      .mockReturnValue(HTMLMediaElement.HAVE_CURRENT_DATA)
    const { container } = render(<AssessmentEngine />)
    const soundtrack = container.querySelector('audio') as HTMLAudioElement
    const firstVideo = container.querySelector('video[src*="question-01"]') as HTMLVideoElement

    fireEvent.click(screen.getByRole('button', { name: '開始形象檢測' }))
    await waitFor(() => expect(fadeAudioVolume).toHaveBeenCalledWith(soundtrack, 0.2, 240))
    fireEvent.ended(firstVideo)
    await waitFor(() => expect(fadeAudioVolume).toHaveBeenCalledWith(soundtrack, 0.32, 240))
    fireEvent.click(await screen.findByRole('radio', { name: '6' }))

    await waitFor(() => {
      const calls = fadeAudioVolume.mock.calls
      const lastCall = calls[calls.length - 1]
      expect(lastCall).toEqual([soundtrack, 0.2, 240])
    })
    expect(cancelSoundtrackFade).toHaveBeenCalled()
  })

  it('ignores a stale resume rejection after unmount', async () => {
    const graph = installMockAudioContext()
    let rejectFirstResume: (reason?: unknown) => void = () => undefined
    const firstResume = new Promise<void>((_resolve, reject) => {
      rejectFirstResume = reject
    })
    graph.resume.mockImplementationOnce(() => firstResume)
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    const pausedMedia: HTMLMediaElement[] = []
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function (this: HTMLMediaElement) {
      pausedMedia.push(this)
    })
    const { container, unmount } = render(<AssessmentEngine />)
    const soundtrack = container.querySelector('audio') as HTMLAudioElement

    fireEvent.click(screen.getByRole('button', { name: '開始形象檢測' }))
    unmount()
    const pausesBeforeStaleRejection = pausedMedia.filter((media) => media === soundtrack).length

    await act(async () => {
      rejectFirstResume(new Error('stale resume rejected'))
      await Promise.resolve()
    })

    expect(pausedMedia.filter((media) => media === soundtrack)).toHaveLength(
      pausesBeforeStaleRejection,
    )
  })

  it('disables soundtrack after the current start resume rejects without blocking video', async () => {
    const graph = installMockAudioContext()
    let rejectResume: (reason?: unknown) => void = () => undefined
    graph.resume.mockImplementationOnce(() => new Promise<void>((_resolve, reject) => {
      rejectResume = reject
    }))
    const playedMedia: HTMLMediaElement[] = []
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
      playedMedia.push(this)
      return Promise.resolve()
    })
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    const { container } = render(<AssessmentEngine />)
    const soundtrack = container.querySelector('audio') as HTMLAudioElement
    const firstVideo = container.querySelector('video[src*="question-01"]') as HTMLVideoElement

    fireEvent.click(screen.getByRole('button', { name: '開始形象檢測' }))
    await act(async () => {
      rejectResume(new Error('current resume rejected'))
      await Promise.resolve()
    })

    expect(pause.mock.instances).toContain(soundtrack)
    expect(graph.resume).toHaveBeenCalledTimes(1)
    expect(playedMedia.filter((media) => media === soundtrack)).toHaveLength(1)
    expect(playedMedia.filter((media) => media === firstVideo)).toHaveLength(1)
  })

  it('skips soundtrack playback when Web Audio setup fails without blocking q1 video', async () => {
    installMockAudioContext({ failSourceCreation: true })
    const playedMedia: HTMLMediaElement[] = []
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
      playedMedia.push(this)
      return Promise.resolve()
    })
    const { container } = render(<AssessmentEngine />)
    const soundtrack = container.querySelector('audio') as HTMLAudioElement
    const firstVideo = container.querySelector('video[src*="question-01"]') as HTMLVideoElement

    fireEvent.click(screen.getByRole('button', { name: '開始形象檢測' }))
    fireEvent.ended(firstVideo)

    expect(playedMedia).not.toContain(soundtrack)
    expect(playedMedia).toContain(firstVideo)
    expect(await screen.findByRole('heading', { name: '以 1 至 10 分計算，你會給自己的形象多少分？' })).toBeInTheDocument()
  })

  it('disconnects and closes the Web Audio graph on unmount', () => {
    const graph = installMockAudioContext()
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    const { unmount } = render(<AssessmentEngine />)
    fireEvent.click(screen.getByRole('button', { name: '開始形象檢測' }))

    unmount()

    expect(graph.source.disconnect).toHaveBeenCalledTimes(1)
    expect(graph.gain.disconnect).toHaveBeenCalledTimes(1)
    expect(graph.context.close).toHaveBeenCalledTimes(1)
  })

  it('keeps the soundtrack mute state in sync with the top-right media control', () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    const { container } = render(<AssessmentEngine />)
    const soundtrack = container.querySelector('audio') as HTMLAudioElement
    const activeVideo = container.querySelector('video.z-10') as HTMLVideoElement

    fireEvent.click(screen.getByRole('button', { name: '靜音' }))
    expect(soundtrack.muted).toBe(true)
    expect(activeVideo.muted).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: '開啟聲音' }))
    expect(soundtrack.muted).toBe(false)
    expect(activeVideo.muted).toBe(false)
  })

  it('does not block q1 when soundtrack playback is rejected', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
      return this.tagName === 'AUDIO'
        ? Promise.reject(new Error('soundtrack rejected'))
        : Promise.resolve()
    })
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    const { container } = render(<AssessmentEngine />)
    const firstVideo = container.querySelector('video[src*="question-01"]') as HTMLVideoElement

    fireEvent.click(screen.getByRole('button', { name: '開始形象檢測' }))
    fireEvent.ended(firstVideo)

    expect(await screen.findByRole('heading', { name: '以 1 至 10 分計算，你會給自己的形象多少分？' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '點擊播放影片' })).not.toBeInTheDocument()
  })

  it('cancels soundtrack fading and stops playback on unmount', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    const { container, unmount } = render(<AssessmentEngine />)
    const soundtrack = container.querySelector('audio') as HTMLAudioElement

    fireEvent.click(screen.getByRole('button', { name: '開始形象檢測' }))
    await waitFor(() => expect(fadeAudioVolume).toHaveBeenCalledWith(soundtrack, 0.2, 240))
    soundtrack.currentTime = 5
    unmount()

    expect(cancelSoundtrackFade).toHaveBeenCalled()
    expect(pause.mock.instances).toContain(soundtrack)
    expect(soundtrack.currentTime).toBe(0)
  })

  it('renders only two scene buffers and no authored transition video', () => {
    const { container } = render(<AssessmentEngine />)

    expect(container.querySelectorAll('video')).toHaveLength(2)
    expect(container.querySelector('video[src*="transition"]')).not.toBeInTheDocument()
  })

  it('preloads the next scene but keeps its hidden buffer silent', () => {
    const { container } = render(<AssessmentEngine />)
    const [activeVideo, nextVideo] = Array.from(container.querySelectorAll('video'))

    expect(activeVideo).toHaveAttribute('preload', 'auto')
    expect(activeVideo.muted).toBe(false)
    expect(nextVideo).toHaveAttribute('preload', 'auto')
    expect(nextVideo.muted).toBe(true)
  })

  it('swaps scene buffers without fading a newly rebound video source into view', () => {
    const { container } = render(<AssessmentEngine />)

    for (const video of container.querySelectorAll('video')) {
      expect(video).not.toHaveClass('transition-opacity', 'duration-300')
    }
  })

  it('centres the portrait consultation stage on wider screens', () => {
    const { container } = render(<AssessmentEngine />)

    expect(container.querySelector('main')).toHaveClass('flex', 'items-center', 'justify-center')
  })

  it('uses the canonical opening cover for the desktop ambience', () => {
    render(<AssessmentEngine />)

    expect(screen.getByTestId('assessment-ambience').style.backgroundImage).toContain(
      '/images/assessment-landing.png',
    )
  })

  it('renders the canonical opening cover independently from the video buffers', () => {
    const { container } = render(<AssessmentEngine />)
    const opening = screen.getByTestId('assessment-opening')
    const videos = Array.from(container.querySelectorAll('video'))

    expect(opening.style.backgroundImage).toContain('linear-gradient')
    expect(opening.style.backgroundImage).toContain('/images/assessment-landing.png')
    expect(opening).toHaveStyle({ backgroundSize: 'cover', backgroundPosition: 'center' })
    expect(videos).toHaveLength(2)
    for (const video of videos) {
      expect(video).toHaveAttribute('poster', '/images/assessment-landing.png')
    }
  })

  it('always offers a fresh assessment start without resume copy', () => {
    render(<AssessmentEngine />)

    expect(screen.getByRole('button', { name: '開始形象檢測' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '繼續形象檢測' })).not.toBeInTheDocument()
    expect(screen.queryByText('繼續形象檢測')).not.toBeInTheDocument()
  })

  it('keeps q1 visible with recovery when its playback is rejected', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValue(new Error('playback rejected'))
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    const user = userEvent.setup()
    render(<AssessmentEngine />)

    await user.click(screen.getByRole('button', { name: '開始形象檢測' }))

    expect(await screen.findByRole('button', { name: '點擊播放影片' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '以 1 至 10 分計算，你會給自己的形象多少分？' })).not.toBeInTheDocument()
  })

  it('shows manual recovery when q1 visible playback never starts or progresses', async () => {
    vi.useFakeTimers()
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockReturnValue(new Promise<void>(() => undefined))
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    render(<AssessmentEngine />)

    fireEvent.click(screen.getByRole('button', { name: '開始形象檢測' }))
    await act(async () => {
      vi.advanceTimersByTime(5000)
      await Promise.resolve()
    })

    expect(screen.getByText('影片暫停了，你仍然可以繼續診斷。')).toBeInTheDocument()
  })

  it('resets the visible playback deadline on progress', async () => {
    vi.useFakeTimers()
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    const { container } = render(<AssessmentEngine />)
    const firstVideo = container.querySelector('video[src*="question-01"]') as HTMLVideoElement

    fireEvent.click(screen.getByRole('button', { name: '開始形象檢測' }))
    for (const currentTime of [1, 2, 3]) {
      await act(async () => {
        vi.advanceTimersByTime(3000)
        Object.defineProperty(firstVideo, 'currentTime', { configurable: true, value: currentTime })
        fireEvent.timeUpdate(firstVideo)
      })
    }

    expect(screen.queryByText('影片暫停了，你仍然可以繼續診斷。')).not.toBeInTheDocument()
  })

  it('reinstalls the visible playback watchdog after manual recovery', async () => {
    vi.useFakeTimers()
    let playCount = 0
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => {
      playCount += 1
      return playCount === 1 ? new Promise<void>(() => undefined) : Promise.resolve()
    })
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    render(<AssessmentEngine />)

    fireEvent.click(screen.getByRole('button', { name: '開始形象檢測' }))
    await act(async () => {
      vi.advanceTimersByTime(5000)
      await Promise.resolve()
    })
    fireEvent.click(screen.getByRole('button', { name: '點擊播放影片' }))
    await act(async () => Promise.resolve())
    expect(screen.queryByText('影片暫停了，你仍然可以繼續診斷。')).not.toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(5000)
      await Promise.resolve()
    })
    expect(screen.getByText('影片暫停了，你仍然可以繼續診斷。')).toBeInTheDocument()
  })

  it('does not classify the pause preceding natural media completion as a playback issue', async () => {
    vi.useFakeTimers()
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    const { container } = render(<AssessmentEngine />)
    const firstVideo = container.querySelector('video[src*="question-01"]') as HTMLVideoElement

    fireEvent.click(screen.getByRole('button', { name: '開始形象檢測' }))
    Object.defineProperty(firstVideo, 'ended', { configurable: true, value: true })
    fireEvent.pause(firstVideo)

    expect(screen.queryByText('影片暫停了，你仍然可以繼續診斷。')).not.toBeInTheDocument()
    fireEvent.ended(firstVideo)
    expect(screen.getByRole('heading', { name: '以 1 至 10 分計算，你會給自己的形象多少分？' })).toBeInTheDocument()
  })

  it('shows a question only after the active video genuinely ends', () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    const { container } = render(<AssessmentEngine />)
    const firstVideo = container.querySelector('video[src*="question-01"]') as HTMLVideoElement

    fireEvent.click(screen.getByRole('button', { name: '開始形象檢測' }))
    Object.defineProperty(firstVideo, 'currentTime', { configurable: true, value: 10_000 })
    fireEvent.timeUpdate(firstVideo)

    expect(screen.queryByRole('heading', { name: '以 1 至 10 分計算，你會給自己的形象多少分？' })).not.toBeInTheDocument()
    fireEvent.ended(firstVideo)
    expect(screen.getByRole('heading', { name: '以 1 至 10 分計算，你會給自己的形象多少分？' })).toBeInTheDocument()
  })

  it('does not let repeated waiting or stalled events extend the no-progress deadline', async () => {
    vi.useFakeTimers()
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    const { container } = render(<AssessmentEngine />)
    const firstVideo = container.querySelector('video[src*="question-01"]') as HTMLVideoElement

    fireEvent.click(screen.getByRole('button', { name: '開始形象檢測' }))
    await act(async () => {
      vi.advanceTimersByTime(1000)
      fireEvent(firstVideo, new Event('waiting'))
      vi.advanceTimersByTime(1000)
      fireEvent(firstVideo, new Event('playing'))
      vi.advanceTimersByTime(1000)
      fireEvent(firstVideo, new Event('stalled'))
      vi.advanceTimersByTime(1100)
      await Promise.resolve()
    })

    expect(screen.getByText('影片暫停了，你仍然可以繼續診斷。')).toBeInTheDocument()
  })

  it('keeps the active scene and question hidden when that scene fails to load', async () => {
    vi.useFakeTimers()
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    const { container } = render(<AssessmentEngine />)
    const firstVideo = container.querySelector('video[src*="question-01"]') as HTMLVideoElement

    fireEvent.click(screen.getByRole('button', { name: '開始形象檢測' }))
    fireEvent.error(firstVideo)
    expect(screen.getByRole('button', { name: '點擊播放影片' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '以 1 至 10 分計算，你會給自己的形象多少分？' })).not.toBeInTheDocument()
    await act(async () => {
      vi.advanceTimersByTime(5000)
      await Promise.resolve()
    })

    expect(screen.getByText('影片暫停了，你仍然可以繼續診斷。')).toBeInTheDocument()
  })

  it('ignores active-buffer errors outside the current playback lifecycle', () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    const { container } = render(<AssessmentEngine />)
    const firstVideo = container.querySelector('video[src*="question-01"]') as HTMLVideoElement

    fireEvent.error(firstVideo)
    expect(screen.queryByRole('button', { name: '點擊播放影片' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '開始形象檢測' }))
    fireEvent.ended(firstVideo)
    fireEvent.error(firstVideo)
    expect(screen.getByRole('heading', { name: '以 1 至 10 分計算，你會給自己的形象多少分？' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '點擊播放影片' })).not.toBeInTheDocument()

  })

  it('reloads an errored active video inside recovery before retrying playback', async () => {
    let q1Reloaded = false
    const recoveryOrder: string[] = []
    const load = vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(function (this: HTMLMediaElement) {
      if (this.getAttribute('src')?.includes('question-01')) {
        q1Reloaded = true
        recoveryOrder.push('load')
      }
    })
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
      if (!this.getAttribute('src')?.includes('question-01')) return Promise.resolve()
      recoveryOrder.push('play')
      return q1Reloaded
        ? Promise.resolve()
        : Promise.reject(new Error('media element remains errored until reload'))
    })
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    const { container } = render(<AssessmentEngine />)
    const firstVideo = container.querySelector('video[src*="question-01"]') as HTMLVideoElement

    fireEvent.click(screen.getByRole('button', { name: '開始形象檢測' }))
    expect(await screen.findByRole('button', { name: '點擊播放影片' })).toBeInTheDocument()
    expect(load.mock.instances).not.toContain(firstVideo)

    recoveryOrder.length = 0
    fireEvent.click(screen.getByRole('button', { name: '點擊播放影片' }))
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '點擊播放影片' })).not.toBeInTheDocument()
    })

    expect(recoveryOrder).toEqual(['load', 'play'])
    expect(screen.queryByRole('heading', { name: '以 1 至 10 分計算，你會給自己的形象多少分？' })).not.toBeInTheDocument()
    fireEvent.ended(firstVideo)
    expect(screen.getByRole('heading', { name: '以 1 至 10 分計算，你會給自己的形象多少分？' })).toBeInTheDocument()
  })

  it('prepares the inactive q2 buffer with load/current data and no hidden playback', async () => {
    const playSnapshots: HTMLMediaElement[] = []
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
      playSnapshots.push(this)
      return Promise.resolve()
    })
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function (this: HTMLMediaElement) {
      return undefined
    })
    vi.spyOn(HTMLMediaElement.prototype, 'readyState', 'get')
      .mockReturnValue(HTMLMediaElement.HAVE_CURRENT_DATA)
    const { container } = render(<AssessmentEngine />)
    const secondVideo = container.querySelector('video[src*="question-02"]') as HTMLVideoElement

    fireEvent.click(screen.getByRole('button', { name: '開始形象檢測' }))

    await waitFor(() => expect(pause.mock.instances).toContain(secondVideo))
    expect(playSnapshots).not.toContain(secondVideo)
    expect(secondVideo.currentTime).toBe(0)
    expect(secondVideo.muted).toBe(true)
    expect(secondVideo).toHaveClass('z-0')
  })

  it('commits q2 visibly before its audible play inside the answer gesture', async () => {
    let inAnswerGesture = false
    const q2PlaySnapshots: Array<{ muted: boolean; active: boolean; gesture: boolean }> = []
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
      if (this.getAttribute('src')?.includes('question-02')) {
        const active = this.classList.contains('z-10')
        q2PlaySnapshots.push({ muted: this.muted, active, gesture: inAnswerGesture })
        if (!this.muted && (!active || !inAnswerGesture)) {
          this.dispatchEvent(new Event('pause'))
          return Promise.reject(new Error('WebKit blocked non-gesture audio'))
        }
      }
      return Promise.resolve()
    })
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'readyState', 'get')
      .mockReturnValue(HTMLMediaElement.HAVE_CURRENT_DATA)
    const user = userEvent.setup()
    const { container } = render(<AssessmentEngine />)
    const firstVideo = container.querySelector('video[src*="question-01"]') as HTMLVideoElement
    const secondVideo = container.querySelector('video[src*="question-02"]') as HTMLVideoElement
    await user.click(screen.getByRole('button', { name: '開始形象檢測' }))
    fireEvent.ended(firstVideo)
    const answer = await screen.findByRole('radio', { name: '6' })
    await waitFor(() => expect(answer).toBeEnabled())
    inAnswerGesture = true
    fireEvent.click(answer)
    inAnswerGesture = false

    await waitFor(() => expect(secondVideo).toHaveClass('z-10'))
    expect(q2PlaySnapshots).toEqual([{ muted: false, active: true, gesture: true }])
    expect(secondVideo.currentTime).toBeLessThanOrEqual(0.05)
    expect(secondVideo.muted).toBe(false)
  })

  it('routes rejected q2 playback to recovery without exposing its question', async () => {
    let q2PlayCount = 0
    const q2PlaySnapshots: Array<{ muted: boolean; active: boolean }> = []
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
      if (this.getAttribute('src')?.includes('question-02')) {
        q2PlayCount += 1
        q2PlaySnapshots.push({ muted: this.muted, active: this.classList.contains('z-10') })
        if (q2PlayCount === 1) return Promise.reject(new Error('next preparation rejected'))
      }
      return Promise.resolve()
    })
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'readyState', 'get')
      .mockReturnValue(HTMLMediaElement.HAVE_CURRENT_DATA)
    const user = userEvent.setup()
    const { container } = render(<AssessmentEngine />)
    const firstVideo = container.querySelector('video[src*="question-01"]') as HTMLVideoElement
    const secondVideo = container.querySelector('video[src*="question-02"]') as HTMLVideoElement
    await user.click(screen.getByRole('button', { name: '開始形象檢測' }))
    fireEvent.ended(firstVideo)
    await user.click(await screen.findByRole('radio', { name: '6' }))

    expect(await screen.findByRole('button', { name: '點擊播放影片' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '你認為目前的形象最影響哪一個場合？' })).not.toBeInTheDocument()
    expect(secondVideo).toHaveClass('z-10')
    expect(secondVideo).toHaveAttribute('poster', '/images/assessment-landing.png')
    expect(q2PlaySnapshots).toEqual([{ muted: false, active: true }])
    expect(q2PlayCount).toBe(1)
  })

  it('routes a rejected visible q2 gesture play to manual playback recovery', async () => {
    let q2PlayCount = 0
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
      if (this.getAttribute('src')?.includes('question-02')) {
        q2PlayCount += 1
        if (q2PlayCount === 1) return Promise.reject(new Error('visible playback rejected'))
      }
      return Promise.resolve()
    })
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'readyState', 'get')
      .mockReturnValue(HTMLMediaElement.HAVE_CURRENT_DATA)
    const user = userEvent.setup()
    const { container } = render(<AssessmentEngine />)
    const firstVideo = container.querySelector('video[src*="question-01"]') as HTMLVideoElement
    const secondVideo = container.querySelector('video[src*="question-02"]') as HTMLVideoElement
    await user.click(screen.getByRole('button', { name: '開始形象檢測' }))
    fireEvent.ended(firstVideo)
    const answer = await screen.findByRole('radio', { name: '6' })
    await waitFor(() => expect(answer).toBeEnabled())
    fireEvent.click(answer)

    expect(await screen.findByText('影片暫停了，你仍然可以繼續診斷。')).toBeInTheDocument()
    expect(secondVideo).toHaveClass('z-10')
  })

  it('keeps Safari q2 video visible with recovery controls instead of skipping to its question', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
      if (this.getAttribute('src')?.includes('question-02')) {
        return Promise.reject(new Error('Safari could not start q2 playback'))
      }
      return Promise.resolve()
    })
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'readyState', 'get')
      .mockReturnValue(HTMLMediaElement.HAVE_CURRENT_DATA)
    const { container } = render(<AssessmentEngine />)
    const firstVideo = container.querySelector('video[src*="question-01"]') as HTMLVideoElement
    const secondVideo = container.querySelector('video[src*="question-02"]') as HTMLVideoElement
    fireEvent.click(screen.getByRole('button', { name: '開始形象檢測' }))
    fireEvent.ended(firstVideo)
    const answer = await screen.findByRole('radio', { name: '6' })
    await waitFor(() => expect(answer).toBeEnabled())
    fireEvent.click(answer)

    await waitFor(() => expect(secondVideo).toHaveClass('z-10'))
    expect(screen.queryByRole('radio', { name: '會見客戶、銷售或商務洽談' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '點擊播放影片' })).toBeInTheDocument()
  })

  it('never skips q2, q3, or q4 after failed preparation and rejected visible playback', async () => {
    const visiblePlayAttempts = new Map<string, number>()
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(function (this: HTMLMediaElement) {
      this.dispatchEvent(new Event('error'))
    })
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
      const src = this.getAttribute('src') ?? ''
      if (!/question-0[234]/.test(src)) return Promise.resolve()
      const attempts = (visiblePlayAttempts.get(src) ?? 0) + 1
      visiblePlayAttempts.set(src, attempts)
      return attempts === 1
        ? Promise.reject(new Error(`Safari rejected ${src}`))
        : Promise.resolve()
    })
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    const { container } = render(<AssessmentEngine />)
    const firstVideo = container.querySelector('video[src*="question-01"]') as HTMLVideoElement

    fireEvent.click(screen.getByRole('button', { name: '開始形象檢測' }))
    fireEvent.ended(firstVideo)

    for (const step of [
      { answer: '6', scene: 'question-02', nextAnswer: '會見客戶、銷售或商務洽談' },
      { answer: '會見客戶、銷售或商務洽談', scene: 'question-03', nextAnswer: '客戶信任與成交機會' },
      { answer: '客戶信任與成交機會', scene: 'question-04', nextAnswer: '髮型與頭部輪廓' },
    ]) {
      fireEvent.click(await screen.findByRole('radio', { name: step.answer }))
      const nextVideo = await waitFor(() => {
        const video = container.querySelector(`video[src*="${step.scene}"]`) as HTMLVideoElement
        expect(video).toHaveClass('z-10')
        return video
      })

      expect(screen.queryByRole('radio', { name: step.nextAnswer })).not.toBeInTheDocument()
      fireEvent.click(await screen.findByRole('button', { name: '點擊播放影片' }))
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: '點擊播放影片' })).not.toBeInTheDocument()
      })
      expect(screen.queryByRole('radio', { name: step.nextAnswer })).not.toBeInTheDocument()

      fireEvent.ended(nextVideo)
      expect(await screen.findByRole('radio', { name: step.nextAnswer })).toBeInTheDocument()
    }
  })

  it('routes an immediate WebKit policy pause on visible q2 to manual recovery', async () => {
    let q2PlayCount = 0
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
      if (this.getAttribute('src')?.includes('question-02')) {
        q2PlayCount += 1
        if (q2PlayCount === 1) queueMicrotask(() => this.dispatchEvent(new Event('pause')))
      }
      return Promise.resolve()
    })
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'readyState', 'get')
      .mockReturnValue(HTMLMediaElement.HAVE_CURRENT_DATA)
    const user = userEvent.setup()
    const { container } = render(<AssessmentEngine />)
    const firstVideo = container.querySelector('video[src*="question-01"]') as HTMLVideoElement
    const secondVideo = container.querySelector('video[src*="question-02"]') as HTMLVideoElement
    await user.click(screen.getByRole('button', { name: '開始形象檢測' }))
    fireEvent.ended(firstVideo)
    const answer = await screen.findByRole('radio', { name: '6' })
    await waitFor(() => expect(answer).toBeEnabled())
    fireEvent.click(answer)

    expect(await screen.findByText('影片暫停了，你仍然可以繼續診斷。')).toBeInTheDocument()
    expect(secondVideo).toHaveClass('z-10')
  })

  it('shows manual recovery when visible q2 later stalls', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'readyState', 'get').mockReturnValue(HTMLMediaElement.HAVE_CURRENT_DATA)
    const user = userEvent.setup()
    const { container } = render(<AssessmentEngine />)
    const firstVideo = container.querySelector('video[src*="question-01"]') as HTMLVideoElement
    const secondVideo = container.querySelector('video[src*="question-02"]') as HTMLVideoElement
    await user.click(screen.getByRole('button', { name: '開始形象檢測' }))
    fireEvent.ended(firstVideo)
    const answer = await screen.findByRole('radio', { name: '6' })
    await waitFor(() => expect(answer).toBeEnabled())
    vi.useFakeTimers()
    fireEvent.click(answer)
    expect(secondVideo).toHaveClass('z-10')

    fireEvent(secondVideo, new Event('stalled'))
    await act(async () => {
      vi.advanceTimersByTime(5000)
      await Promise.resolve()
    })
    expect(screen.getByText('影片暫停了，你仍然可以繼續診斷。')).toBeInTheDocument()
  })

  it('clears a pending q4 completion when the assessment unmounts', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
      return this.muted ? Promise.reject(new Error('skip background preparation')) : Promise.resolve()
    })
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    const { container, unmount } = render(<AssessmentEngine />)
    const q4Answer = await advanceToFinalQuestion(container)

    vi.useFakeTimers()
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout')
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout')
    fireEvent.click(q4Answer)
    const completionTimerCall = setTimeoutSpy.mock.calls.findIndex(([, delay]) => delay === 100 || delay === 320)
    const completionTimer = setTimeoutSpy.mock.results[completionTimerCall]?.value
    expect(completionTimer).toBeDefined()
    unmount()

    expect(clearTimeoutSpy).toHaveBeenCalledWith(completionTimer)
  })

  it('cancels deferred load-based q2 preparation on unmount', async () => {
    const pausedVideos: HTMLMediaElement[] = []
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function (this: HTMLMediaElement) {
      pausedVideos.push(this)
    })
    const load = vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined)
    const user = userEvent.setup()
    const { container, unmount } = render(<AssessmentEngine />)
    const secondVideo = container.querySelector('video[src*="question-02"]') as HTMLVideoElement
    await user.click(screen.getByRole('button', { name: '開始形象檢測' }))
    await waitFor(() => expect(load.mock.instances).toContain(secondVideo))
    unmount()
    fireEvent.loadedData(secondVideo)
    await act(async () => Promise.resolve())

    expect(play.mock.instances).not.toContain(secondVideo)
    expect(secondVideo).toHaveClass('z-0')
    expect(secondVideo.muted).toBe(true)
    expect(pausedVideos).toContain(secondVideo)
  })

  it('shows stalled-preparation q2 and routes its rejected visible play to recovery', async () => {
    vi.useFakeTimers()
    const q2Plays: Array<{ muted: boolean; active: boolean }> = []
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
      if (this.getAttribute('src')?.includes('question-02')) {
        q2Plays.push({ muted: this.muted, active: this.classList.contains('z-10') })
        return Promise.reject(new Error('visible q2 playback rejected'))
      }
      return Promise.resolve()
    })
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    const { container } = render(<AssessmentEngine />)
    const firstVideo = container.querySelector('video[src*="question-01"]') as HTMLVideoElement
    const secondVideo = container.querySelector('video[src*="question-02"]') as HTMLVideoElement

    fireEvent.click(screen.getByRole('button', { name: '開始形象檢測' }))
    await act(async () => {
      vi.advanceTimersByTime(3001)
      await Promise.resolve()
    })
    fireEvent.ended(firstVideo)
    const answer = screen.getByRole('radio', { name: '6' })
    expect(answer).toBeEnabled()
    fireEvent.click(answer)
    await act(async () => Promise.resolve())

    expect(screen.getByRole('button', { name: '點擊播放影片' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '你認為目前的形象最影響哪一個場合？' })).not.toBeInTheDocument()
    expect(secondVideo).toHaveClass('z-10')
    expect(secondVideo).toHaveAttribute('poster', '/images/assessment-landing.png')
    expect(q2Plays).toEqual([{ muted: false, active: true }])
    expect(pause.mock.instances).toContain(secondVideo)
  })
})
