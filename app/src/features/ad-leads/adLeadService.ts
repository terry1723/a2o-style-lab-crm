export const AD_LEAD_STATUSES = ['未聯絡', 'WhatsApp 跟進中', '已預約', '已拒絕'] as const
export const AD_LEAD_OWNERS = ['Terry', 'Ryan', 'Martin', 'Caren', 'New'] as const
export const AD_LEAD_APPOINTMENT_SLOTS = ['12:00', '13:30', '15:00', '16:30', '18:00', '19:30', '21:00'] as const

export type AdLeadStatus = (typeof AD_LEAD_STATUSES)[number]
export type AdLeadOwner = (typeof AD_LEAD_OWNERS)[number]
export type AdLeadAppointmentSlot = (typeof AD_LEAD_APPOINTMENT_SLOTS)[number]

export type AdLeadAppointment = {
  sourceKey: string
  appointmentDate: string
  appointmentTime: AdLeadAppointmentSlot
}

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

export function monthHalfDates(year: number, monthIndex: number, half: 'first' | 'second'): string[] {
  const start = half === 'first' ? 1 : 16
  const end = half === 'first' ? 15 : new Date(year, monthIndex + 1, 0).getDate()

  return Array.from({ length: end - start + 1 }, (_, index) => {
    const day = start + index
    return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  })
}

export function submittedAtTime(value: string): number | null {
  const parsed = Date.parse(value)
  if (Number.isFinite(parsed)) return parsed

  const match = value.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(上午|下午)\s+(\d{1,2}):(\d{2}):(\d{2})$/)
  if (!match) return null

  const [, year, month, day, period, hourText, minute, second] = match
  let hour = Number(hourText)
  if (period === '下午' && hour < 12) hour += 12
  if (period === '上午' && hour === 12) hour = 0

  return new Date(Number(year), Number(month) - 1, Number(day), hour, Number(minute), Number(second)).getTime()
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
    .filter((row) => hasRequiredValues(row) && submittedAtTime(row.submittedAt) !== null)
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
    .sort((a, b) => submittedAtTime(b.submittedAt)! - submittedAtTime(a.submittedAt)!)
}
