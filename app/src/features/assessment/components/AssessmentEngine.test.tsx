import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AssessmentEngine } from './AssessmentEngine'

function installAsyncFrameCallbacks(video: HTMLVideoElement) {
  let requestId = 0
  const requestFrame = vi.fn((callback: VideoFrameRequestCallback) => {
    requestId += 1
    queueMicrotask(() => callback(0, {} as VideoFrameCallbackMetadata))
    return requestId
  })
  video.requestVideoFrameCallback = requestFrame
  video.cancelVideoFrameCallback = vi.fn()
  return requestFrame
}

describe('AssessmentEngine media layers', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    localStorage.clear()
    sessionStorage.clear()
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

  it('falls back to the current question when video playback is rejected', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValue(new Error('playback rejected'))
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    const user = userEvent.setup()
    render(<AssessmentEngine />)

    await user.click(screen.getByRole('button', { name: '開始形象檢測' }))

    expect(await screen.findByRole('heading', { name: '從1到10分，你會畀自己形象幾多分？' })).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(10)
  })

  it('prepares the inactive q2 buffer silently on decoded frames while q1 is active', async () => {
    const playSnapshots: Array<{ video: HTMLMediaElement; muted: boolean }> = []
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
      playSnapshots.push({ video: this, muted: this.muted })
      return Promise.resolve()
    })
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function (this: HTMLMediaElement) {
      return undefined
    })
    vi.spyOn(HTMLMediaElement.prototype, 'readyState', 'get')
      .mockReturnValue(HTMLMediaElement.HAVE_CURRENT_DATA)
    const user = userEvent.setup()
    const { container } = render(<AssessmentEngine />)
    const secondVideo = container.querySelector('video[src*="question-02"]') as HTMLVideoElement
    const requestFrame = installAsyncFrameCallbacks(secondVideo)

    await user.click(screen.getByRole('button', { name: '開始形象檢測' }))

    await waitFor(() => expect(playSnapshots.filter(({ video }) => video === secondVideo)).toHaveLength(1))
    await waitFor(() => expect(requestFrame).toHaveBeenCalledTimes(2))
    expect(playSnapshots.find(({ video }) => video === secondVideo)?.muted).toBe(true)
    expect(pause.mock.instances).toContain(secondVideo)
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
    installAsyncFrameCallbacks(secondVideo)

    await user.click(screen.getByRole('button', { name: '開始形象檢測' }))
    await waitFor(() => expect(q2PlaySnapshots).toHaveLength(1))
    fireEvent.ended(firstVideo)
    const answer = await screen.findByRole('radio', { name: '6' })
    await waitFor(() => expect(answer).toBeEnabled())
    inAnswerGesture = true
    fireEvent.click(answer)
    inAnswerGesture = false

    await waitFor(() => expect(secondVideo).toHaveClass('z-10'))
    expect(q2PlaySnapshots).toEqual([
      { muted: true, active: false, gesture: false },
      { muted: false, active: true, gesture: true },
    ])
    expect(secondVideo.currentTime).toBeLessThanOrEqual(0.05)
    expect(secondVideo.muted).toBe(false)
  })

  it('stops rejected q2 playback and shows its canonical fallback question without audible playback', async () => {
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
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'readyState', 'get')
      .mockReturnValue(HTMLMediaElement.HAVE_CURRENT_DATA)
    const user = userEvent.setup()
    const { container } = render(<AssessmentEngine />)
    const firstVideo = container.querySelector('video[src*="question-01"]') as HTMLVideoElement
    const secondVideo = container.querySelector('video[src*="question-02"]') as HTMLVideoElement
    installAsyncFrameCallbacks(secondVideo)

    await user.click(screen.getByRole('button', { name: '開始形象檢測' }))
    await waitFor(() => expect(q2PlayCount).toBe(1))
    fireEvent.ended(firstVideo)
    await user.click(await screen.findByRole('radio', { name: '6' }))

    expect(await screen.findByRole('heading', { name: '你認為目前形象最影響到你邊一個場合？' })).toBeInTheDocument()
    expect(secondVideo).toHaveClass('z-10')
    expect(secondVideo).toHaveAttribute('poster', '/images/assessment-landing.png')
    expect(q2PlaySnapshots).toEqual([{ muted: true, active: false }])
    expect(pause.mock.instances).toContain(secondVideo)
    expect(q2PlayCount).toBe(1)
  })

  it('routes a rejected visible q2 gesture play to manual playback recovery', async () => {
    let q2PlayCount = 0
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
      if (this.getAttribute('src')?.includes('question-02')) {
        q2PlayCount += 1
        if (q2PlayCount === 2) return Promise.reject(new Error('visible playback rejected'))
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
    installAsyncFrameCallbacks(secondVideo)

    await user.click(screen.getByRole('button', { name: '開始形象檢測' }))
    await waitFor(() => expect(q2PlayCount).toBe(1))
    fireEvent.ended(firstVideo)
    const answer = await screen.findByRole('radio', { name: '6' })
    await waitFor(() => expect(answer).toBeEnabled())
    fireEvent.click(answer)

    expect(await screen.findByText('影片暫停了，你仍然可以繼續診斷。')).toBeInTheDocument()
    expect(secondVideo).toHaveClass('z-10')
  })

  it('routes an immediate WebKit policy pause on visible q2 to manual recovery', async () => {
    let q2PlayCount = 0
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
      if (this.getAttribute('src')?.includes('question-02')) {
        q2PlayCount += 1
        if (q2PlayCount === 2) queueMicrotask(() => this.dispatchEvent(new Event('pause')))
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
    installAsyncFrameCallbacks(secondVideo)

    await user.click(screen.getByRole('button', { name: '開始形象檢測' }))
    await waitFor(() => expect(q2PlayCount).toBe(1))
    fireEvent.ended(firstVideo)
    const answer = await screen.findByRole('radio', { name: '6' })
    await waitFor(() => expect(answer).toBeEnabled())
    fireEvent.click(answer)

    expect(await screen.findByText('影片暫停了，你仍然可以繼續診斷。')).toBeInTheDocument()
    expect(secondVideo).toHaveClass('z-10')
  })

  it('cancels deferred q2 preparation on restart without a stale buffer swap', async () => {
    const frameCallbacks: VideoFrameRequestCallback[] = []
    const pausedVideos: HTMLMediaElement[] = []
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function (this: HTMLMediaElement) {
      pausedVideos.push(this)
    })
    vi.spyOn(HTMLMediaElement.prototype, 'readyState', 'get')
      .mockReturnValue(HTMLMediaElement.HAVE_CURRENT_DATA)
    const user = userEvent.setup()
    const { container } = render(<AssessmentEngine />)
    const firstVideo = container.querySelector('video[src*="question-01"]') as HTMLVideoElement
    const secondVideo = container.querySelector('video[src*="question-02"]') as HTMLVideoElement
    secondVideo.requestVideoFrameCallback = vi.fn((callback) => {
      frameCallbacks.push(callback)
      return frameCallbacks.length
    })
    secondVideo.cancelVideoFrameCallback = vi.fn()

    await user.click(screen.getByRole('button', { name: '開始形象檢測' }))
    await waitFor(() => expect(frameCallbacks).toHaveLength(1))
    await user.click(screen.getByRole('button', { name: '重新開始診斷' }))
    const pausesAfterRestart = pausedVideos.filter((video) => video === secondVideo).length
    frameCallbacks[0](0, {} as VideoFrameCallbackMetadata)

    await waitFor(() => expect(screen.getByRole('button', { name: '開始形象檢測' })).toBeInTheDocument())
    expect(firstVideo).toHaveClass('z-10')
    expect(secondVideo).toHaveClass('z-0')
    expect(pausedVideos.filter((video) => video === secondVideo)).toHaveLength(pausesAfterRestart)
  })

  it('times out stalled q2 preparation and enables the canonical fallback answer path', async () => {
    vi.useFakeTimers()
    const q2Plays: Array<{ muted: boolean; active: boolean }> = []
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
      if (this.getAttribute('src')?.includes('question-02')) {
        q2Plays.push({ muted: this.muted, active: this.classList.contains('z-10') })
        return new Promise<void>(() => undefined)
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

    expect(screen.getByRole('heading', { name: '你認為目前形象最影響到你邊一個場合？' })).toBeInTheDocument()
    expect(secondVideo).toHaveClass('z-10')
    expect(secondVideo).toHaveAttribute('poster', '/images/assessment-landing.png')
    expect(q2Plays).toEqual([{ muted: true, active: false }])
    expect(pause.mock.instances).toContain(secondVideo)
  })
})
