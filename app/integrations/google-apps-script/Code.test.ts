import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('assessment Apps Script row contract', () => {
  it('appends height and weight after the existing status column', () => {
    const source = readFileSync(join(process.cwd(), 'integrations/google-apps-script/Code.gs'), 'utf8')

    expect(source).toMatch(
      /'新提交',[\s\S]*requireNumber\(payload, 'heightCm'[\s\S]*requireNumber\(payload, 'weightKg'/,
    )
  })
})
