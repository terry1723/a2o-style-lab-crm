import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AssessmentQuestion } from '../types/assessment'
import { QuestionOverlay } from './QuestionOverlay'

describe('QuestionOverlay', () => {
  it('renders the 1–10 answer as a compact five-column scale', () => {
    const question: AssessmentQuestion = {
      id: 'q1',
      type: 'single',
      layout: 'scale',
      title: '從1到10分，你會畀自己形象幾多分？',
      options: Array.from({ length: 10 }, (_, index) => ({
        id: `q1_${index + 1}`,
        label: String(index + 1),
        value: String(index + 1),
      })),
    }

    render(
      <QuestionOverlay
        question={question}
        progress="1 / 4"
        disabled={false}
        onConfirm={vi.fn()}
      />,
    )

    const firstOption = screen.getByRole('radio', { name: '1' })
    expect(firstOption.parentElement).toHaveClass('grid-cols-5')
    expect(screen.getAllByRole('radio')).toHaveLength(10)
  })
})
