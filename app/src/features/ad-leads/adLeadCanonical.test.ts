import { describe, expect, it } from 'vitest'
import { buildCanonicalLeads, normalizePhone, sourceMetadata } from './adLeadCanonical'

describe('canonical advertising leads', () => {
  it('normalizes equivalent Hong Kong phone formats to one key', () => {
    expect(normalizePhone('9869 0911')).toBe('85298690911')
    expect(normalizePhone('+85298690911')).toBe('85298690911')
    expect(normalizePhone('p:+852-9869-0911')).toBe('85298690911')
  })

  it('keeps every submission while returning one latest-first canonical lead per phone', () => {
    const result = buildCanonicalLeads([
      { source: 'A2O Website', id: 'sheet:2', submittedAt: '2026-08-09T09:00:00+08:00', name: 'Old', phone: '98690911', tag: 'old' },
      { source: 'Men New Form', id: 'sheet:8', submittedAt: '2026-08-09T10:00:00+08:00', name: 'New', phone: '+85298690911', tag: 'new' },
      { source: 'Meta', id: 'lead-2', submittedAt: '2026-08-09T11:00:00+08:00', name: 'Other', phone: '91234567', tag: '' },
    ])

    expect(result.leads).toHaveLength(2)
    expect(result.leads.find((lead) => lead.normalizedPhone === '85298690911')).toMatchObject({
      normalizedPhone: '85298690911', name: 'New', latestSource: 'Men New Form', latestTag: 'new',
    })
    expect(result.submissions).toHaveLength(3)
  })

  it('keeps the latest non-empty tag when a newer submission omits its tag', () => {
    const result = buildCanonicalLeads([
      { source: 'Meta', id: 'lead-old', submittedAt: '2026-08-09T09:00:00+08:00', name: 'Old', phone: '98690911', tag: 'campaign-a' },
      { source: 'Meta', id: 'lead-new', submittedAt: '2026-08-09T10:00:00+08:00', name: 'New', phone: '98690911', tag: '' },
    ])
    expect(result.leads[0]).toMatchObject({ name: 'New', latestTag: 'campaign-a' })
  })

  it('extracts source sheet metadata from an Apps Script row id', () => {
    expect(sourceMetadata('1sheet:style lab new form:42')).toEqual({
      spreadsheetId: '1sheet', sheetName: 'style lab new form', rowNumber: 42,
    })
  })
})
