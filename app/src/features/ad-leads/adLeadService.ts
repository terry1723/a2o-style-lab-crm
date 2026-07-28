export const AD_LEAD_STATUSES = ['未聯絡', 'WhatsApp 跟進中', '已預約', '已拒絕'] as const
export const AD_LEAD_OWNERS = ['Terry', 'Ryan', 'Martin', 'Caren', 'New'] as const

export type AdLeadStatus = (typeof AD_LEAD_STATUSES)[number]
export type AdLeadOwner = (typeof AD_LEAD_OWNERS)[number]

export interface AdLeadSourceRow {
  source: string
  id: string
  submittedAt: string
  name: string
  phone: string
  tag: string
}

export interface AdLeadTracking {
  status?: AdLeadStatus
  owner?: AdLeadOwner
}

export interface AdLead extends AdLeadSourceRow {
  sourceKey: string
  status: AdLeadStatus
  owner: AdLeadOwner
}

export function sourceKey(source: string, id: string): string {
  return `${source}:${id}`
}

function hasRequiredValues(row: AdLeadSourceRow): boolean {
  return [row.id, row.submittedAt, row.name, row.phone]
    .every((value) => value.trim().length > 0)
}

export function normalizeAdLeads(
  rows: AdLeadSourceRow[],
  tracking: Record<string, AdLeadTracking> = {},
): AdLead[] {
  return rows
    .filter((row) => hasRequiredValues(row) && Number.isFinite(Date.parse(row.submittedAt)))
    .map((row) => {
      const key = sourceKey(row.source, row.id)
      const overlay = tracking[key]

      return {
        ...row,
        sourceKey: key,
        status: overlay?.status ?? '未聯絡',
        owner: overlay?.owner ?? 'Ryan',
      }
    })
    .sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt))
}
