import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('assessment Apps Script row contract', () => {
  it('preserves the exact 15-column A:O append order', () => {
    const source = readFileSync(join(process.cwd(), 'integrations/google-apps-script/Code.gs'), 'utf8')
    const rowBlock = source.match(/const row = \[\n([\s\S]*?)\n\s*\]/)?.[1]
    const rowEntries = rowBlock
      ?.split('\n')
      .map((line) => line.trim().replace(/,$/, ''))
      .filter(Boolean)

    expect(rowEntries).toEqual([
      "Utilities.formatDate(submittedDate, 'Asia/Hong_Kong', 'yyyy-MM-dd HH:mm:ss')",
      'sessionId',
      "requireText(payload, 'name', 80)",
      "requireText(payload, 'phone', 20)",
      "requireText(payload, 'q1', 20)",
      "requireText(payload, 'q2', 200)",
      "requireText(payload, 'q3', 200)",
      "requireText(payload, 'q4', 200)",
      "requireText(payload, 'resultTitle', 120)",
      "optionalText(payload, 'photoPath', 500)",
      "optionalText(payload, 'photoSignedUrl', 2000)",
      'safeText(payload.utmSource, 200)',
      "'新提交'",
      "requireNumber(payload, 'heightCm', 120, 230, 0)",
      "requireNumber(payload, 'weightKg', 35, 200, 1)",
    ])
  })
})
