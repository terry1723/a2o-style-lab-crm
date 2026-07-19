import { render, screen } from '@testing-library/react'
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

  it('falls back to the current question when video playback is rejected', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValue(new Error('playback rejected'))
    const user = userEvent.setup()
    render(<AssessmentEngine />)

    await user.click(screen.getByRole('button', { name: '開始形象檢測' }))

    expect(await screen.findByRole('heading', { name: '從1到10分，你會畀自己形象幾多分？' })).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(10)
  })
})
