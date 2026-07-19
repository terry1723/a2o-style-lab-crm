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
    const user = userEvent.setup()
    render(<AssessmentEngine />)

    await user.click(screen.getByRole('button', { name: '開始形象檢測' }))

    expect(await screen.findByRole('heading', { name: '從1到10分，你會畀自己形象幾多分？' })).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(10)
  })

  it('starts the next direct scene once inside the answer gesture without pausing and replaying it', async () => {
    const playedVideos: HTMLMediaElement[] = []
    const pausedVideos: HTMLMediaElement[] = []
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
      playedVideos.push(this)
      return Promise.resolve()
    })
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function (this: HTMLMediaElement) {
      pausedVideos.push(this)
    })
    vi.spyOn(HTMLMediaElement.prototype, 'readyState', 'get')
      .mockReturnValue(HTMLMediaElement.HAVE_CURRENT_DATA)
    const user = userEvent.setup()
    const { container } = render(<AssessmentEngine />)
    const firstVideo = container.querySelector('video[src*="question-01"]') as HTMLVideoElement
    const secondVideo = container.querySelector('video[src*="question-02"]') as HTMLVideoElement

    await user.click(screen.getByRole('button', { name: '開始形象檢測' }))
    fireEvent.ended(firstVideo)
    await user.click(await screen.findByRole('radio', { name: '6' }))

    await waitFor(() => expect(secondVideo).toHaveClass('z-10'))
    expect(playedVideos.filter((video) => video === secondVideo)).toHaveLength(1)
    expect(pausedVideos).not.toContain(secondVideo)
    expect(secondVideo.muted).toBe(false)
  })
})
