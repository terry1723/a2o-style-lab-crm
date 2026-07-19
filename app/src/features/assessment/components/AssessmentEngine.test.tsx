import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AssessmentEngine } from './AssessmentEngine'

describe('AssessmentEngine media layers', () => {
  beforeEach(() => {
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

  it('silently unlocks the inactive q2 buffer during the start gesture', async () => {
    const playSnapshots: Array<{ video: HTMLMediaElement; muted: boolean }> = []
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
      playSnapshots.push({ video: this, muted: this.muted })
      return Promise.resolve()
    })
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    const user = userEvent.setup()
    const { container } = render(<AssessmentEngine />)
    const secondVideo = container.querySelector('video[src*="question-02"]') as HTMLVideoElement

    await user.click(screen.getByRole('button', { name: '開始形象檢測' }))

    await waitFor(() => expect(playSnapshots.filter(({ video }) => video === secondVideo)).toHaveLength(1))
    expect(playSnapshots.find(({ video }) => video === secondVideo)?.muted).toBe(true)
    expect(pause.mock.instances).toContain(secondVideo)
    expect(secondVideo.currentTime).toBe(0)
    expect(secondVideo.muted).toBe(true)
    expect(secondVideo).toHaveClass('z-0')
  })

  it('prepares every q2 play silently before swapping it into view at the first frame', async () => {
    const q2PlaySnapshots: Array<{ muted: boolean; active: boolean }> = []
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
      if (this.getAttribute('src')?.includes('question-02')) {
        q2PlaySnapshots.push({ muted: this.muted, active: this.classList.contains('z-10') })
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
    await waitFor(() => expect(q2PlaySnapshots).toHaveLength(1))
    fireEvent.ended(firstVideo)
    await user.click(await screen.findByRole('radio', { name: '6' }))

    await waitFor(() => expect(secondVideo).toHaveClass('z-10'))
    expect(q2PlaySnapshots).toHaveLength(3)
    expect(q2PlaySnapshots.every(({ muted, active }) => muted && !active)).toBe(true)
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
        if (q2PlayCount === 2) return Promise.reject(new Error('next playback rejected'))
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

    await user.click(screen.getByRole('button', { name: '開始形象檢測' }))
    await waitFor(() => expect(q2PlayCount).toBe(1))
    fireEvent.ended(firstVideo)
    await user.click(await screen.findByRole('radio', { name: '6' }))

    expect(await screen.findByRole('heading', { name: '你認為目前形象最影響到你邊一個場合？' })).toBeInTheDocument()
    expect(secondVideo).toHaveClass('z-10')
    expect(secondVideo).toHaveAttribute('poster', '/images/assessment-landing.png')
    expect(q2PlaySnapshots).toEqual([
      { muted: true, active: false },
      { muted: true, active: false },
    ])
    expect(pause.mock.instances).toContain(secondVideo)
    expect(q2PlayCount).toBe(2)
  })
})
