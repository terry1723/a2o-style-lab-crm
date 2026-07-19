import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AssessmentResult } from './AssessmentResult'

describe('AssessmentResult capture shell', () => {
  it('collects the required photo without revealing an instant report result', () => {
    render(
      <AssessmentResult
        submitted={false}
        submitting={false}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
        onRestart={vi.fn()}
      />,
    )

    expect(screen.queryByText('未被發揮的形象潛力')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '上傳正面全身相' })).toBeInTheDocument()
  })
})
