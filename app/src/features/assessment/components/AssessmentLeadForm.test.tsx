import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AssessmentLeadForm } from './AssessmentLeadForm'

const defaultProps = {
  submitted: false,
  submitting: false,
  onSubmit: vi.fn().mockResolvedValue(undefined),
}

describe('AssessmentLeadForm', () => {
  it('shows required profile fields before the photo selector', () => {
    render(<AssessmentLeadForm {...defaultProps} />)
    const controls = [
      screen.getByLabelText('稱呼／姓名'),
      screen.getByLabelText('WhatsApp 電話號碼'),
      screen.getByLabelText('身高（cm）'),
      screen.getByLabelText('體重（kg）'),
      screen.getByLabelText('選擇正面全身相'),
    ]

    for (let index = 1; index < controls.length; index += 1) {
      expect(
        controls[index - 1].compareDocumentPosition(controls[index]) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy()
    }
  })

  it('submits numeric height and weight with the contact details and photo', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<AssessmentLeadForm {...defaultProps} onSubmit={onSubmit} />)
    const photo = new File(['portrait'], 'full-body.jpg', { type: 'image/jpeg' })

    await user.type(screen.getByLabelText('稱呼／姓名'), '陳先生')
    await user.type(screen.getByLabelText('WhatsApp 電話號碼'), '9123 4567')
    await user.type(screen.getByLabelText('身高（cm）'), '175')
    await user.type(screen.getByLabelText('體重（kg）'), '68.5')
    await user.upload(screen.getByLabelText('選擇正面全身相'), photo)
    expect(await screen.findByAltText('已選擇的正面全身相預覽')).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: '提交並製作個人檢測報告' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({
      name: '陳先生',
      phone: '91234567',
      heightCm: 175,
      weightKg: 68.5,
      consent: true,
      photo,
    }))
    expect(onSubmit).toHaveBeenCalledWith(expect.not.objectContaining({
      photoDataUrl: expect.anything(),
    }))
  })

  it.each([
    ['119', '68.5', '請輸入 120 至 230 cm 的身高。'],
    ['231', '68.5', '請輸入 120 至 230 cm 的身高。'],
    ['175.5', '68.5', '請輸入 120 至 230 cm 的身高。'],
    ['175', '34', '請輸入 35 至 200 kg 的體重，最多一位小數。'],
    ['175', '201', '請輸入 35 至 200 kg 的體重，最多一位小數。'],
    ['175', '68.55', '請輸入 35 至 200 kg 的體重，最多一位小數。'],
  ])('rejects invalid measurements height=%s weight=%s', async (height, weight, message) => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<AssessmentLeadForm {...defaultProps} onSubmit={onSubmit} />)
    const photo = new File(['portrait'], 'full-body.jpg', { type: 'image/jpeg' })

    await user.type(screen.getByLabelText('稱呼／姓名'), '陳先生')
    await user.type(screen.getByLabelText('WhatsApp 電話號碼'), '9123 4567')
    await user.type(screen.getByLabelText('身高（cm）'), height)
    await user.type(screen.getByLabelText('體重（kg）'), weight)
    await user.upload(screen.getByLabelText('選擇正面全身相'), photo)
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: '提交並製作個人檢測報告' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects a name longer than 80 characters before submission', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<AssessmentLeadForm {...defaultProps} onSubmit={onSubmit} />)
    const photo = new File(['portrait'], 'full-body.jpg', { type: 'image/jpeg' })

    fireEvent.change(screen.getByLabelText('稱呼／姓名'), { target: { value: '陳'.repeat(81) } })
    await user.type(screen.getByLabelText('WhatsApp 電話號碼'), '9123 4567')
    await user.type(screen.getByLabelText('身高（cm）'), '175')
    await user.type(screen.getByLabelText('體重（kg）'), '68.5')
    await user.upload(screen.getByLabelText('選擇正面全身相'), photo)
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: '提交並製作個人檢測報告' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('稱呼或姓名不可多於 80 個字。')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows the promised WhatsApp delivery window after successful submission', () => {
    render(<AssessmentLeadForm {...defaultProps} submitted />)

    expect(screen.getByRole('heading', { name: '已收到你的形象檢測資料' })).toBeInTheDocument()
    expect(screen.getByText(/我們會在 1–2 個工作天內透過 WhatsApp 聯絡你/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /WhatsApp 預約/ })).not.toBeInTheDocument()
  })

  it('uses written Chinese in the profile collection introduction', () => {
    render(<AssessmentLeadForm {...defaultProps} />)

    expect(screen.getByText('請填寫以下資料，讓我們更準確地了解你的形象需要。')).toBeInTheDocument()
  })

  it('keeps the selected photo and all profile fields when submission fails', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockRejectedValue(new Error('sheet unavailable'))
    render(<AssessmentLeadForm {...defaultProps} onSubmit={onSubmit} />)
    const photo = new File(['portrait'], 'retry-photo.jpg', { type: 'image/jpeg' })

    await user.type(screen.getByLabelText('稱呼／姓名'), '陳先生')
    await user.type(screen.getByLabelText('WhatsApp 電話號碼'), '9123 4567')
    await user.type(screen.getByLabelText('身高（cm）'), '175')
    await user.type(screen.getByLabelText('體重（kg）'), '68.5')
    await user.upload(screen.getByLabelText('選擇正面全身相'), photo)
    await screen.findByAltText('已選擇的正面全身相預覽')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: '提交並製作個人檢測報告' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('你已填寫的資料會保留')
    expect(screen.getByLabelText('稱呼／姓名')).toHaveValue('陳先生')
    expect(screen.getByLabelText('WhatsApp 電話號碼')).toHaveValue('9123 4567')
    expect(screen.getByLabelText('身高（cm）')).toHaveValue('175')
    expect(screen.getByLabelText('體重（kg）')).toHaveValue('68.5')
    expect(screen.getByAltText('已選擇的正面全身相預覽')).toBeInTheDocument()
  })
})
