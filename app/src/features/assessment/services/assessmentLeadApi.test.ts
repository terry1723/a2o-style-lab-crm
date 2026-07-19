import { describe, expect, it, vi } from 'vitest'
import type { AssessmentAnswerMap, Attribution } from '../types/assessment'
import { submitAssessmentLeadToPipeline } from './assessmentLeadApi'

describe('submitAssessmentLeadToPipeline', () => {
  it('uploads the original File with a signed token before submitting its private path', async () => {
    const photo = new File(['portrait'], 'full-body.jpg', { type: 'image/jpeg' })
    const answers: AssessmentAnswerMap = {
      q1: ['q1_6'],
      q2: ['q2_a'],
      q3: ['q3_a'],
      q4: ['q4_e'],
    }
    const attribution: Attribution = {
      sourceUrl: 'https://a2o-style-lab.vercel.app/?utm_source=facebook',
      referrer: 'https://facebook.com/',
      utmSource: 'facebook',
    }
    const uploadToSignedUrl = vi.fn().mockResolvedValue(undefined)
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        path: '2026/07/assessment_session_1234/photo-id.jpg',
        token: 'signed-upload-token',
        bucket: 'assessment-photos',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, duplicate: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))

    await submitAssessmentLeadToPipeline({
      input: { name: '陳先生', phone: '9123 4567', consent: true, photo },
      sessionId: 'assessment_session_1234',
      answers,
      attribution,
    }, { fetchImpl, uploadToSignedUrl })

    expect(fetchImpl).toHaveBeenNthCalledWith(1, '/api/assessment-upload-url', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'assessment_session_1234',
        mimeType: 'image/jpeg',
        extension: 'jpg',
        fileSize: photo.size,
      }),
    }))
    expect(uploadToSignedUrl).toHaveBeenCalledWith({
      bucket: 'assessment-photos',
      path: '2026/07/assessment_session_1234/photo-id.jpg',
      token: 'signed-upload-token',
      file: photo,
    })
    expect(fetchImpl).toHaveBeenNthCalledWith(2, '/api/assessment-submit', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'assessment_session_1234',
        name: '陳先生',
        phone: '9123 4567',
        consent: true,
        answers,
        photoPath: '2026/07/assessment_session_1234/photo-id.jpg',
        attribution,
      }),
    }))
  })

  it('does not submit lead data when the private photo upload fails', async () => {
    const photo = new File(['portrait'], 'full-body.webp', { type: 'image/webp' })
    const fetchImpl = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({
      path: '2026/07/assessment_session_1234/photo-id.webp',
      token: 'signed-upload-token',
      bucket: 'assessment-photos',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    const uploadToSignedUrl = vi.fn().mockRejectedValue(new Error('photo_upload_failed'))

    await expect(submitAssessmentLeadToPipeline({
      input: { name: '陳先生', phone: '91234567', consent: true, photo },
      sessionId: 'assessment_session_1234',
      answers: { q1: ['q1_6'], q2: ['q2_a'], q3: ['q3_a'], q4: ['q4_e'] },
      attribution: { sourceUrl: '', referrer: '' },
    }, { fetchImpl, uploadToSignedUrl })).rejects.toThrow('photo_upload_failed')

    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
})
