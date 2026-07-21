import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { MouseEvent } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
  ASSESSMENT_WHATSAPP_LABEL,
  ASSESSMENT_WHATSAPP_URL,
} from '../config/assessmentWhatsApp'
import { AssessmentResult } from './AssessmentResult'

describe('AssessmentResult capture shell', () => {
  it('collects the required photo without revealing an instant report result', () => {
    render(
      <AssessmentResult
        submitted={false}
        submitting={false}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
        onWhatsAppClick={vi.fn()}
      />,
    )

    expect(screen.queryByText('未被發揮的形象潛力')).not.toBeInTheDocument()
    expect(screen.getByText('先填寫基本資料，再上傳一張正面全身相。')).toBeInTheDocument()
    expect(screen.queryByText('上傳一張正面全身相，再留下接收報告嘅資料。')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '上傳正面全身相' })).toBeInTheDocument()
  })

  it('replaces restart with the approved WhatsApp CTA', async () => {
    const user = userEvent.setup()
    const onWhatsAppClick = vi.fn((event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault()
    })
    render(
      <AssessmentResult
        submitted={false}
        submitting={false}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
        onWhatsAppClick={onWhatsAppClick}
      />,
    )

    const link = screen.getByRole('link', { name: ASSESSMENT_WHATSAPP_LABEL })
    expect(link).toHaveAttribute('href', ASSESSMENT_WHATSAPP_URL)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.queryByRole('button', { name: '重新開始檢測' })).not.toBeInTheDocument()

    await user.click(link)
    expect(onWhatsAppClick).toHaveBeenCalledOnce()
  })

  it('keeps the WhatsApp CTA visible after lead submission', () => {
    render(
      <AssessmentResult
        submitted
        submitting={false}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
        onWhatsAppClick={vi.fn()}
      />,
    )

    expect(screen.getByRole('link', { name: ASSESSMENT_WHATSAPP_LABEL })).toBeInTheDocument()
  })
})
