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
        uploadReceipt: 'signed-upload-receipt',
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
      uploadReceipt: 'signed-upload-receipt',
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
        uploadReceipt: 'signed-upload-receipt',
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
      uploadReceipt: 'signed-upload-receipt',
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

  it('reuses the completed private upload when retrying a failed Sheet submission', async () => {
    const photo = new File(['portrait'], 'full-body.jpg', { type: 'image/jpeg' })
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        path: '2026/07/retry_session_12345/photo-id.jpg',
        token: 'signed-upload-token',
        bucket: 'assessment-photos',
        uploadReceipt: 'signed-upload-receipt',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'submission_unavailable' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, duplicate: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
    const uploadToSignedUrl = vi.fn().mockResolvedValue(undefined)
    const pipelineInput = {
      input: { name: '陳先生', phone: '91234567', consent: true as const, photo },
      sessionId: 'retry_session_12345',
      answers: { q1: ['q1_6'], q2: ['q2_a'], q3: ['q3_a'], q4: ['q4_e'] },
      attribution: { sourceUrl: '', referrer: '' },
    }

    await expect(submitAssessmentLeadToPipeline(pipelineInput, { fetchImpl, uploadToSignedUrl }))
      .rejects.toThrow('assessment_submission_failed')
    await expect(submitAssessmentLeadToPipeline(pipelineInput, { fetchImpl, uploadToSignedUrl }))
      .resolves.toEqual({ ok: true, duplicate: false })

    expect(uploadToSignedUrl).toHaveBeenCalledTimes(1)
    expect(fetchImpl).toHaveBeenCalledTimes(3)
    expect(fetchImpl.mock.calls[2]?.[0]).toBe('/api/assessment-submit')
    expect(JSON.parse(String(fetchImpl.mock.calls[2]?.[1]?.body))).toEqual(expect.objectContaining({
      photoPath: '2026/07/retry_session_12345/photo-id.jpg',
      uploadReceipt: 'signed-upload-receipt',
    }))
  })

  it.each([
    [{ bucket: 'assessment-photos', path: 'path', token: 'token' }, 'photo_upload_unavailable'],
    [{ ok: false, duplicate: false }, 'assessment_submission_failed'],
  ])('rejects malformed successful API payload %#', async (finalPayload, expectedError) => {
    const photo = new File(['portrait'], 'full-body.png', { type: 'image/png' })
    const validUpload = {
      path: '2026/07/malformed_session_1/photo-id.png',
      token: 'signed-upload-token',
      bucket: 'assessment-photos',
      uploadReceipt: 'signed-upload-receipt',
    }
    const isUploadCase = !('ok' in finalPayload)
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(isUploadCase ? finalPayload : validUpload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
    if (!isUploadCase) {
      fetchImpl.mockResolvedValueOnce(new Response(JSON.stringify(finalPayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
    }

    await expect(submitAssessmentLeadToPipeline({
      input: { name: '陳先生', phone: '91234567', consent: true, photo },
      sessionId: `malformed_session_${isUploadCase ? '1' : '2'}`,
      answers: { q1: ['q1_6'], q2: ['q2_a'], q3: ['q3_a'], q4: ['q4_e'] },
      attribution: { sourceUrl: '', referrer: '' },
    }, { fetchImpl, uploadToSignedUrl: vi.fn().mockResolvedValue(undefined) }))
      .rejects.toThrow(expectedError)
  })
})
