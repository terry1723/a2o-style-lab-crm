import { beforeEach, describe, expect, it, vi } from 'vitest'
import { saveClient } from '../../../lib/clientData'
import { assessmentConfig } from '../config/assessmentConfig'
import type { AssessmentAnswerMap, AssessmentResult, Attribution } from '../types/assessment'
import { submitAssessmentLead } from './assessmentSessionRepository'

vi.mock('../../../lib/clientData', () => ({
  saveClient: vi.fn().mockResolvedValue({ id: 'client-1' }),
}))

describe('submitAssessmentLead', () => {
  beforeEach(() => vi.mocked(saveClient).mockClear())

  it('saves the photo and four approved answers into the existing CRM record', async () => {
    const answers: AssessmentAnswerMap = {
      q1: ['q1_6'],
      q2: ['q2_a'],
      q3: ['q3_a'],
      q4: ['q4_e'],
    }
    const result: AssessmentResult = {
      ...assessmentConfig.results.professional_presence_gap,
      scores: { professional_presence_gap: 9 },
    }
    const attribution: Attribution = { sourceUrl: 'https://example.com', referrer: '' }

    await submitAssessmentLead(
      {
        name: '陳先生',
        phone: '9123 4567',
        consent: true,
        photoDataUrl: 'data:image/jpeg;base64,photo',
      },
      'session-1',
      answers,
      result,
      attribution,
      assessmentConfig,
    )

    expect(saveClient).toHaveBeenCalledWith(expect.objectContaining({
      name: '陳先生',
      phone: '+85291234567',
      before_photo: 'data:image/jpeg;base64,photo',
      pain_point: '6',
      purpose: '見客、銷售或傾生意',
      desired_effect: '客戶信任同成交機會',
      body_remark: expect.stringContaining('整體專業形象定位'),
      plan: 'Interactive Assessment Lead',
      status: 'active',
    }))
    expect(saveClient).toHaveBeenCalledWith(expect.not.objectContaining({ lifestyle: expect.anything() }))
  })
})
