import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Home from './Home'

vi.mock('../features/assessment/components/AssessmentSection', () => ({
  AssessmentSection: () => <section id="assessment"><p>A2O STYLE LAB</p><h2>真實形象改造案例</h2><div data-testid="assessment-engine">Assessment</div><p>A2O STYLE LAB</p><h2>看得見的形象轉變</h2></section>,
}))

vi.mock('../features/homepage/components/A2OHomepageContent', () => ({
  A2OHomepageContent: ({ assessment }: { assessment: React.ReactNode }) => <main><section data-testid="homepage-content">Homepage</section>{assessment}<section data-testid="homepage-after-assessment">After assessment</section></main>,
}))

describe('Home public experience order', () => {
  it('shows the editorial homepage before the assessment section', () => {
    render(<Home />)

    const homepage = screen.getByTestId('homepage-content')
    const assessment = screen.getByTestId('assessment-engine')

    const afterAssessment = screen.getByTestId('homepage-after-assessment')

    expect(homepage.nextElementSibling).toBe(assessment.closest('section'))
    expect(assessment.closest('section')?.nextElementSibling).toBe(afterAssessment)
    expect(assessment.closest('section')).toHaveAttribute('id', 'assessment')
  })

  it('frames the desktop assessment with the approved transformation context', () => {
    render(<Home />)

    expect(screen.getByRole('heading', { name: '真實形象改造案例' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '看得見的形象轉變' })).toBeInTheDocument()
    expect(screen.getAllByText('A2O STYLE LAB')).toHaveLength(2)
  })
})
