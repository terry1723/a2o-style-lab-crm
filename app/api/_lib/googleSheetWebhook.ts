export type AssessmentSheetRow = {
  submittedAt: string
  sessionId: string
  name: string
  phone: string
  q1: string
  q2: string
  q3: string
  q4: string
  resultTitle: string
  photoPath: string
  photoSignedUrl: string
  privacyConsent: true
  marketingConsent: boolean
  utmSource: string
}

type WebhookOptions = {
  webhookUrl?: string
  sharedSecret?: string
  fetchImpl?: typeof fetch
}

type WebhookResponse = {
  ok?: boolean
  duplicate?: boolean
  error?: string
}

function safeWebhookReason(value: unknown): string {
  const reason = typeof value === 'string' ? value : 'rejected'
  return /^[a-z0-9_-]{1,80}$/i.test(reason) ? reason : 'rejected'
}

export async function appendAssessmentLead(row: AssessmentSheetRow, options: WebhookOptions = {}) {
  const webhookUrl = options.webhookUrl ?? process.env.APPS_SCRIPT_WEBHOOK_URL
  const sharedSecret = options.sharedSecret ?? process.env.APPS_SCRIPT_SHARED_SECRET
  const fetchImpl = options.fetchImpl ?? fetch

  if (!webhookUrl || !sharedSecret) throw new Error('sheet_server_not_configured')

  const webhookRow = {
    ...row,
    photoPath: row.photoPath || '未提供',
    photoSignedUrl: row.photoSignedUrl || '未提供',
  }

  try {
    const response = await fetchImpl(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...webhookRow, secret: sharedSecret }),
      redirect: 'follow',
    })
    const responseText = await response.text()
    let payload: WebhookResponse
    try {
      payload = JSON.parse(responseText) as WebhookResponse
    } catch {
      throw new Error(`sheet_write_failed:invalid_response_${response.status}`)
    }

    if (!response.ok) throw new Error(`sheet_write_failed:http_${response.status}`)
    if (payload.ok !== true) throw new Error(`sheet_write_failed:${safeWebhookReason(payload.error)}`)
    return { duplicate: payload.duplicate === true }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'sheet_server_not_configured') throw error
      if (error.message.startsWith('sheet_write_failed:')) throw error
    }
    throw new Error('sheet_write_failed:network_error')
  }
}
