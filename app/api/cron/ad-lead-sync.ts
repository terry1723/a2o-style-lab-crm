import type { VercelRequest, VercelResponse } from '@vercel/node'

type RequestLike = { method?: string }
type ResponseLike = {
  status: (code: number) => ResponseLike
  json: (body: unknown) => unknown
}

/**
 * The old Vercel Cron worker is intentionally retired. Google Apps Script now
 * invokes the Supabase Edge Function every five minutes, which is the only
 * supported import and Slack sync path.
 */
export function createAdLeadSyncCronHandler() {
  return async (_request: RequestLike, response: ResponseLike) => {
    response.status(410).json({ error: 'sync_path_retired', replacement: 'supabase_edge_function' })
  }
}

const handler = createAdLeadSyncCronHandler()

export default async function adLeadSyncCron(_request: VercelRequest, response: VercelResponse) {
  await handler(_request, response)
}
