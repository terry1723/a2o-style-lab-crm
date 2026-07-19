import { beforeEach, describe, expect, it, vi } from 'vitest'
import { saveClient } from '../../../lib/clientData'
import type { AssessmentAnswerMap, Attribution } from '../types/assessment'
import { submitAssessmentLeadToPipeline } from './assessmentLeadApi'
import { submitAssessmentLead } from './assessmentSessionRepository'

vi.mock('../../../lib/clientData', () => ({
  saveClient: vi.fn().mockResolvedValue({ id: 'client-1' }),
}))

vi.mock('./assessmentLeadApi', () => ({
  submitAssessmentLeadToPipeline: vi.fn().mockResolvedValue({ ok: true, duplicate: false }),
}))

describe('submitAssessmentLead', () => {
  beforeEach(() => {
    vi.mocked(saveClient).mockClear()
    vi.mocked(submitAssessmentLeadToPipeline).mockClear()
  })

  it('submits the photo and answers through the assessment pipeline without writing CRM data', async () => {
    const answers: AssessmentAnswerMap = {
      q1: ['q1_6'],
      q2: ['q2_a'],
      q3: ['q3_a'],
      q4: ['q4_e'],
    }
    const attribution: Attribution = { sourceUrl: 'https://example.com', referrer: '' }
    const photo = new File(['portrait'], 'full-body.jpg', { type: 'image/jpeg' })

    await submitAssessmentLead(
      {
        name: '陳先生',
        phone: '9123 4567',
        consent: true,
        photo,
      },
      'session-1',
      answers,
      attribution,
    )

    expect(submitAssessmentLeadToPipeline).toHaveBeenCalledWith({
      input: {
        name: '陳先生',
        phone: '9123 4567',
        consent: true,
        photo,
      },
      sessionId: 'session-1',
      answers,
      attribution,
    })
    expect(saveClient).not.toHaveBeenCalled()
    expect(submitAssessmentLeadToPipeline).toHaveBeenCalledWith(expect.not.objectContaining({
      result: expect.anything(),
      config: expect.anything(),
    }))
  })
})
