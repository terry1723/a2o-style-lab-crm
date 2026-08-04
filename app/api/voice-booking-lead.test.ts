import { describe, expect, it, vi } from 'vitest'
import { createVoiceBookingLeadHandler } from './voice-booking-lead'

function responseRecorder() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    status(code: number) { this.statusCode = code; return this },
    json(body: unknown) { this.body = body; return this },
    setHeader(name: string, value: string) { this.headers[name] = value; return this },
  }
}

const validLead = {
  name: '陳大文',
  phone: '9558 4880',
  goal: '想改善上班形象',
  preferredContact: 'WhatsApp',
  preferredTime: '平日晚上',
  privacyConsent: true,
  marketingConsent: false,
}

describe('voice booking lead endpoint', () => {
  it('stores only an explicitly consented booking request', async () => {
    const saveLead = vi.fn().mockResolvedValue(undefined)
    const response = responseRecorder()
    await createVoiceBookingLeadHandler({ saveLead })({ method: 'POST', body: validLead }, response)

    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual({ ok: true, message: 'booking_request_saved' })
    expect(saveLead).toHaveBeenCalledWith({
      name: '陳大文', phone: '+85295584880', goal: '想改善上班形象', preferredContact: 'WhatsApp', preferredTime: '平日晚上', marketingConsent: false,
    })
  })

  it('does not write a lead without privacy consent', async () => {
    const saveLead = vi.fn()
    const response = responseRecorder()
    await createVoiceBookingLeadHandler({ saveLead })({ method: 'POST', body: { ...validLead, privacyConsent: false } }, response)

    expect(response.statusCode).toBe(400)
    expect(response.body).toEqual({ error: 'invalid_booking_request' })
    expect(saveLead).not.toHaveBeenCalled()
  })

  it('rejects invalid phone numbers before CRM access', async () => {
    const saveLead = vi.fn()
    const response = responseRecorder()
    await createVoiceBookingLeadHandler({ saveLead })({ method: 'POST', body: { ...validLead, phone: 'not-a-phone' } }, response)

    expect(response.statusCode).toBe(400)
    expect(saveLead).not.toHaveBeenCalled()
  })
})
