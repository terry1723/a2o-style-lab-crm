import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function runtimeSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return runtimeSourceFiles(path)
    if (!/\.(ts|tsx)$/.test(entry.name) || entry.name.includes('.test.')) return []
    return [path]
  })
}

describe('assessment and CRM isolation', () => {
  it('keeps all production assessment modules outside CRM persistence', () => {
    const assessmentRuntimeFiles = [
      ...runtimeSourceFiles(join(process.cwd(), 'src/features/assessment')),
      ...runtimeSourceFiles(join(process.cwd(), 'api')),
    ]
    const sources = assessmentRuntimeFiles.map((file) => ({
      file,
      source: readFileSync(file, 'utf8'),
    }))

    for (const { file, source } of sources) {
      expect(source, file).not.toMatch(/clientData|saveClient/)
    }
  })
})
