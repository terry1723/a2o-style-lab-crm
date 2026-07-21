export type AssessmentSheetRow = {
  submittedAt: string
  sessionId: string
  name: string
  phone: string
  heightCm: number
  weightKg: number
  q1: string
  q2: string
  q3: string
  q4: string
  resultTitle: string
  photoPath: string
  photoSignedUrl: string
  utmSource: string
}

type WebhookOptions = {
  webhookUrl?: string
  sharedSecret?: string
  fetchImpl?: typeof fetch
}

export async function appendAssessmentLead(row: AssessmentSheetRow, options: WebhookOptions = {}) {
  const webhookUrl = options.webhookUrl ?? process.env.APPS_SCRIPT_WEBHOOK_URL
  const sharedSecret = options.sharedSecret ?? process.env.APPS_SCRIPT_SHARED_SECRET
  const fetchImpl = options.fetchImpl ?? fetch

  if (!webhookUrl || !sharedSecret) throw new Error('sheet_server_not_configured')

  try {
    const response = await fetchImpl(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...row, secret: sharedSecret }),
      redirect: 'follow',
    })
    const payload = await response.json() as { ok?: boolean; duplicate?: boolean }
    if (!response.ok || payload.ok !== true) throw new Error('sheet_write_failed')
    return { duplicate: payload.duplicate === true }
  } catch (error) {
    if (error instanceof Error && error.message === 'sheet_server_not_configured') throw error
    throw new Error('sheet_write_failed')
  }
}
