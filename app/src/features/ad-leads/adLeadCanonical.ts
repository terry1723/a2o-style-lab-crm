import { sourceKey, submittedAtTime, type AdLeadSourceRow } from './adLeadService.js'

export type CanonicalLeadDraft = {
  normalizedPhone: string
  displayPhone: string
  name: string
  latestSource: string
  latestTag: string
  firstSubmittedAt: string
  latestSubmittedAt: string
  latestSourceKey: string
}

export type SubmissionDraft = {
  sourceKey: string
  normalizedPhone: string | null
  submittedName: string
  submittedPhone: string
  source: string
  tag: string
  submittedAt: string
  sourceSpreadsheetId: string | null
  sourceSheetName: string | null
  sourceRowNumber: number | null
}

function clean(value: string): string {
  return value.trim()
}

export function normalizePhone(input: string): string | null {
  let value = clean(input).toLowerCase()
  value = value.replace(/^(p:|tel:)/, '')
  if (!value || /https?:\/\//.test(value) || /[a-z]/.test(value)) return null

  const digits = value.replace(/[\s()\-\.]/g, '')
  if (!/^\+?\d+$/.test(digits)) return null

  let normalized = digits
  if (normalized.startsWith('+')) normalized = normalized.slice(1)
  if (normalized.startsWith('00852')) normalized = normalized.slice(2)
  if (normalized.length === 8) normalized = `852${normalized}`
  if (!/^\d{8,15}$/.test(normalized)) return null
  return normalized
}

export function sourceMetadata(id: string): {
  spreadsheetId: string
  sheetName: string
  rowNumber: number
} | null {
  const match = id.match(/^([^:]+):(.+):(\d+)$/)
  if (!match) return null
  return { spreadsheetId: match[1], sheetName: match[2], rowNumber: Number(match[3]) }
}

function validRow(row: AdLeadSourceRow): boolean {
  return [row.source, row.id, row.submittedAt, row.name, row.phone]
    .every((value) => typeof value === 'string' && clean(value).length > 0)
    && submittedAtTime(row.submittedAt) !== null
}

function sortNewestFirst(rows: AdLeadSourceRow[]): AdLeadSourceRow[] {
  return [...rows].sort((a, b) => submittedAtTime(b.submittedAt)! - submittedAtTime(a.submittedAt)!)
}

export function buildCanonicalLeads(rows: AdLeadSourceRow[]): {
  leads: CanonicalLeadDraft[]
  submissions: SubmissionDraft[]
} {
  const validRows = rows.filter(validRow)
  const sortedRows = sortNewestFirst(validRows)
  const submissions = sortedRows.map((row) => {
    const metadata = sourceMetadata(row.id)
    return {
      sourceKey: sourceKey(row.source, row.id),
      normalizedPhone: normalizePhone(row.phone),
      submittedName: clean(row.name),
      submittedPhone: clean(row.phone),
      source: clean(row.source),
      tag: clean(row.tag),
      submittedAt: row.submittedAt,
      sourceSpreadsheetId: metadata?.spreadsheetId ?? null,
      sourceSheetName: metadata?.sheetName ?? null,
      sourceRowNumber: metadata?.rowNumber ?? null,
    }
  })

  const grouped = new Map<string, SubmissionDraft[]>()
  for (const submission of submissions) {
    if (!submission.normalizedPhone) continue
    const current = grouped.get(submission.normalizedPhone) ?? []
    current.push(submission)
    grouped.set(submission.normalizedPhone, current)
  }

  const leads = [...grouped.entries()].map(([normalizedPhone, groupedSubmissions]) => {
    const latest = groupedSubmissions[0]
    const earliest = groupedSubmissions[groupedSubmissions.length - 1]
    const latestTagged = groupedSubmissions.find((submission) => submission.tag.length > 0)
    return {
      normalizedPhone,
      displayPhone: latest.submittedPhone,
      name: latest.submittedName,
      latestSource: latest.source,
      latestTag: latestTagged?.tag ?? '',
      firstSubmittedAt: earliest.submittedAt,
      latestSubmittedAt: latest.submittedAt,
      latestSourceKey: latest.sourceKey,
    }
  }).sort((a, b) => submittedAtTime(b.latestSubmittedAt)! - submittedAtTime(a.latestSubmittedAt)!)

  return { leads, submissions }
}
