import { describe, expect, it } from 'vitest'
import { createAdLeadSyncCronHandler } from './ad-lead-sync'

function responseRecorder() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this },
    json(body: unknown) { this.body = body; return this },
  }
}

describe('retired Vercel ad lead sync route', () => {
  it('does not run a second import or Slack worker', async () => {
    const handler = createAdLeadSyncCronHandler()
    const response = responseRecorder()

    await handler({ method: 'GET' }, response)

    expect(response.statusCode).toBe(410)
    expect(response.body).toEqual({ error: 'sync_path_retired', replacement: 'supabase_edge_function' })
  })
})
