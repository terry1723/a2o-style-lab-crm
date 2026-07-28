import { describe, expect, it } from 'vitest'
import {
  AD_LEAD_OWNERS,
  AD_LEAD_STATUSES,
  normalizeAdLeads,
  sourceKey,
} from './adLeadService'

describe('adLeadService', () => {
  it('exposes the supported lead statuses and owners', () => {
    expect(AD_LEAD_STATUSES).toEqual(['未聯絡', 'WhatsApp 跟進中', '已預約', '已拒絕'])
    expect(AD_LEAD_OWNERS).toEqual(['Terry', 'Ryan', 'Martin', 'Caren', 'New'])
  })

  it('builds a stable key from source and id', () => {
    expect(sourceKey('meta-lead-ad', 'lead-42')).toBe('meta-lead-ad:lead-42')
  })

  it('normalizes valid rows, applies defaults, and sorts by actual submission time', () => {
    const result = normalizeAdLeads(
      [
        {
          source: 'meta',
          id: 'older',
          submittedAt: '2026-07-10T09:00:00+08:00',
          name: 'Chan Tai Man',
          phone: '91234567',
          tag: 'summer',
        },
        {
          source: 'meta',
          id: 'newer',
          submittedAt: '2026-07-10T10:00:00+08:00',
          name: 'Lee Siu Ming',
          phone: '92345678',
          tag: 'summer',
        },
      ],
      {
        'meta:older': { status: '已預約', owner: 'Terry' },
      },
    )

    expect(result).toEqual([
      {
        source: 'meta',
        id: 'newer',
        submittedAt: '2026-07-10T10:00:00+08:00',
        name: 'Lee Siu Ming',
        phone: '92345678',
        tag: 'summer',
        sourceKey: 'meta:newer',
        status: '未聯絡',
        owner: 'Ryan',
      },
      {
        source: 'meta',
        id: 'older',
        submittedAt: '2026-07-10T09:00:00+08:00',
        name: 'Chan Tai Man',
        phone: '91234567',
        tag: 'summer',
        sourceKey: 'meta:older',
        status: '已預約',
        owner: 'Terry',
      },
    ])
  })

  it('omits rows with blank id, submission time, name, or phone', () => {
    const validRow = {
      source: 'meta',
      id: 'lead-1',
      submittedAt: '2026-07-10T09:00:00+08:00',
      name: 'Chan Tai Man',
      phone: '91234567',
      tag: 'summer',
    }

    expect(normalizeAdLeads([
      validRow,
      { ...validRow, id: '  ' },
      { ...validRow, id: 'lead-2', submittedAt: '' },
      { ...validRow, id: 'lead-3', name: ' ' },
      { ...validRow, id: 'lead-4', phone: '' },
    ])).toEqual([expect.objectContaining({ id: 'lead-1' })])
  })

  it('retains rows with blank source or tag', () => {
    const result = normalizeAdLeads([
      {
        source: '',
        id: 'lead-without-source',
        submittedAt: '2026-07-10T09:00:00+08:00',
        name: 'Chan Tai Man',
        phone: '91234567',
        tag: '',
      },
    ])

    expect(result).toEqual([
      expect.objectContaining({
        source: '',
        id: 'lead-without-source',
        tag: '',
        sourceKey: ':lead-without-source',
      }),
    ])
  })

  it('omits malformed timestamps and keeps valid leads in newest-first order', () => {
    const validRow = {
      source: 'meta',
      id: 'older',
      submittedAt: '2026-07-10T09:00:00+08:00',
      name: 'Chan Tai Man',
      phone: '91234567',
      tag: 'summer',
    }

    const result = normalizeAdLeads([
      validRow,
      { ...validRow, id: 'bad-timestamp', submittedAt: 'not a date' },
      { ...validRow, id: 'newer', submittedAt: '2026-07-10T10:00:00+08:00' },
    ])

    expect(result.map((lead) => lead.id)).toEqual(['newer', 'older'])
  })
})
