import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const runtimeFiles = [
  'assessment-upload-url.ts',
  'assessment-submit.ts',
  '_lib/assessmentValidation.ts',
  '_lib/storageService.ts',
  '_lib/supabaseAdmin.ts',
  '_lib/googleSheetWebhook.ts',
]

describe('Vercel Node ESM imports', () => {
  it.each(runtimeFiles)('%s uses explicit .js extensions for relative imports', (file) => {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8')
    const relativeImports = [...source.matchAll(/from\s+['"](\.{1,2}\/[^'"]+)['"]/g)]
      .map((match) => match[1])

    expect(relativeImports).not.toContainEqual(expect.not.stringMatching(/\.js$/))
  })
})
