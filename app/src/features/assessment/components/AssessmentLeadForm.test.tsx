import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AssessmentLeadForm } from './AssessmentLeadForm'

const defaultProps = {
  submitted: false,
  submitting: false,
  onSubmit: vi.fn().mockResolvedValue(undefined),
}

describe('AssessmentLeadForm', () => {
  it('requires one front-facing full-body photo before showing contact fields', () => {
    render(<AssessmentLeadForm {...defaultProps} />)

    expect(screen.getByRole('heading', { name: '上傳正面全身相' })).toBeInTheDocument()
    expect(screen.queryByLabelText('稱呼／姓名')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '繼續填寫聯絡資料' })).toBeDisabled()
  })

  it('accepts one image and submits only name, WhatsApp, consent and photo', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<AssessmentLeadForm {...defaultProps} onSubmit={onSubmit} />)
    const photo = new File(['portrait'], 'full-body.jpg', { type: 'image/jpeg' })

    await user.upload(screen.getByLabelText('選擇正面全身相'), photo)
    expect(await screen.findByAltText('已選擇的正面全身相預覽')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '繼續填寫聯絡資料' }))
    await user.type(screen.getByLabelText('稱呼／姓名'), '陳先生')
    await user.type(screen.getByLabelText('WhatsApp 電話號碼'), '9123 4567')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: '提交並製作個人檢測報告' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      name: '陳先生',
      phone: '91234567',
      consent: true,
      photo,
    }))
    expect(onSubmit).toHaveBeenCalledWith(expect.not.objectContaining({
      photoDataUrl: expect.anything(),
    }))
  })

  it('shows the promised WhatsApp delivery window after successful submission', () => {
    render(<AssessmentLeadForm {...defaultProps} submitted />)

    expect(screen.getByRole('heading', { name: '已收到你嘅形象檢測資料' })).toBeInTheDocument()
    expect(screen.getByText(/1–2個工作天內透過 WhatsApp 聯絡你/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /WhatsApp 預約/ })).not.toBeInTheDocument()
  })
})
