import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { A2OMarquee } from './A2OMarquee'

const motionState = vi.hoisted(() => ({ reduced: false }))

vi.mock('framer-motion', () => ({
  useReducedMotion: () => motionState.reduced,
}))

const phrase = 'PROPORTION · COLOUR · GROOMING · STYLE · A2O STYLE LAB'

describe('A2OMarquee', () => {
  beforeEach(() => { motionState.reduced = false })

  it('renders four copies of the approved phrase inside an animated track', () => {
    render(<A2OMarquee />)

    const track = screen.getByTestId('a2o-marquee-track')
    expect(within(track).getAllByText((_, element) => element?.tagName === 'SPAN' && element.textContent?.startsWith(phrase) === true)).toHaveLength(4)
    expect(track).toHaveClass('a2o-marquee-track')
  })

  it('renders one static phrase when reduced motion is preferred', () => {
    motionState.reduced = true
    render(<A2OMarquee />)

    expect(screen.getAllByText(phrase)).toHaveLength(1)
    expect(screen.queryByTestId('a2o-marquee-track')).not.toBeInTheDocument()
  })
})
