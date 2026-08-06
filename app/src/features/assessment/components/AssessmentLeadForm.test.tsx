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
  it('makes the photo optional and allows the contact form to continue without one', async () => {
    const user = userEvent.setup()
    render(<AssessmentLeadForm {...defaultProps} />)

    expect(screen.getByRole('heading', { name: '上傳正面全身相（可選）' })).toBeInTheDocument()
    expect(screen.queryByLabelText('稱呼／姓名')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '跳過相片並填寫聯絡資料' }))
    expect(screen.getByLabelText('稱呼／姓名')).toBeInTheDocument()
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
    await user.click(screen.getByRole('button', { name: '提交並領取我的免費報告' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      name: '陳先生',
      phone: '91234567',
      privacyConsent: true, marketingConsent: false,
      photo,
    }))
    expect(onSubmit).toHaveBeenCalledWith(expect.not.objectContaining({
      photoDataUrl: expect.anything(),
    }))
  })

  it('shows the promised WhatsApp delivery window after successful submission', () => {
    render(<AssessmentLeadForm {...defaultProps} submitted />)

    expect(screen.getByRole('heading', { name: '已收到你的形象檢測資料' })).toBeInTheDocument()
    expect(screen.getByText(/1–2 個工作天內透過 WhatsApp 與你聯絡/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /WhatsApp 預約/ })).not.toBeInTheDocument()
  })

  it('keeps the selected photo and contact details when submission fails', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockRejectedValue(new Error('sheet unavailable'))
    render(<AssessmentLeadForm {...defaultProps} onSubmit={onSubmit} />)
    const photo = new File(['portrait'], 'retry-photo.jpg', { type: 'image/jpeg' })

    await user.upload(screen.getByLabelText('選擇正面全身相'), photo)
    await screen.findByAltText('已選擇的正面全身相預覽')
    await user.click(screen.getByRole('button', { name: '繼續填寫聯絡資料' }))
    await user.type(screen.getByLabelText('稱呼／姓名'), '陳先生')
    await user.type(screen.getByLabelText('WhatsApp 電話號碼'), '9123 4567')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: '提交並領取我的免費報告' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('你已填寫的資料將會保留')
    expect(screen.getByLabelText('稱呼／姓名')).toHaveValue('陳先生')
    expect(screen.getByLabelText('WhatsApp 電話號碼')).toHaveValue('9123 4567')
    await user.click(screen.getByRole('button', { name: '更換相片' }))
    expect(screen.getByAltText('已選擇的正面全身相預覽')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '繼續填寫聯絡資料' }))
    expect(screen.getByLabelText('稱呼／姓名')).toHaveValue('陳先生')
    expect(screen.getByLabelText('WhatsApp 電話號碼')).toHaveValue('9123 4567')
  })
})
