import { describe, expect, it } from 'vitest'
import {
  ASSESSMENT_WHATSAPP_LABEL,
  ASSESSMENT_WHATSAPP_URL,
} from './assessmentWhatsApp'

describe('assessment WhatsApp configuration', () => {
  it('keeps the approved CTA label and prefilled destination exact', () => {
    expect(ASSESSMENT_WHATSAPP_LABEL).toBe('透過 WhatsApp 免費了解我的形象問題')
    expect(ASSESSMENT_WHATSAPP_URL).toBe(
      'https://wa.me/85254077240?text=%E4%BD%A0%E5%A5%BD%EF%BC%8C%E6%88%91%E5%95%B1%E5%95%B1%E5%AE%8C%E6%88%90%E5%92%97%E7%B6%B2%E7%AB%99%E4%B8%8A%E5%98%85%E5%BD%A2%E8%B1%A1%E5%88%86%E6%9E%90%EF%BC%8C%E6%83%B3%E4%BA%86%E8%A7%A3%E4%B8%80%E4%B8%8B%E8%87%AA%E5%B7%B1%E5%8F%AF%E4%BB%A5%E9%BB%9E%E6%A8%A3%E6%94%B9%E5%96%84%E5%BD%A2%E8%B1%A1%E3%80%82',
    )
  })
})
