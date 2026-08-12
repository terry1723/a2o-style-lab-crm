import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AssessmentSection } from './AssessmentSection'
import { getAssessmentSideMotion } from './assessmentSectionMotion'

vi.mock('./AssessmentEngine', () => ({ AssessmentEngine: () => <div data-testid="assessment-engine">Engine</div> }))

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, tag: string) => ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => {
      const Element = tag as keyof React.JSX.IntrinsicElements
      const { initial: _initial, whileInView: _whileInView, viewport: _viewport, transition: _transition, ...htmlProps } = props as Record<string, unknown>
      return <Element {...htmlProps}>{children}</Element>
    },
  }),
  useReducedMotion: () => false,
}))

describe('AssessmentSection motion boundaries', () => {
  it('slides only the two desktop case panels while keeping the engine shell separate', () => {
    render(<AssessmentSection />)

    expect(screen.getAllByTestId(/assessment-side-/)).toHaveLength(2)
    expect(screen.getByTestId('assessment-engine-shell')).not.toHaveAttribute('data-assessment-motion')
    expect(screen.getByTestId('assessment-engine')).toBeInTheDocument()
  })

  it('removes lateral movement when reduced motion is requested', () => {
    expect(getAssessmentSideMotion('left', true).initial.x).toBe(0)
    expect(getAssessmentSideMotion('right', true).initial.x).toBe(0)
    expect(getAssessmentSideMotion('left', false).initial.x).toBe(-36)
    expect(getAssessmentSideMotion('right', false).initial.x).toBe(36)
  })
})
