type SlackMessage = {
  channel: string
  text: string
  blocks?: Record<string, unknown>[]
}

type SlackApiResponse = {
  ok?: boolean
  error?: string
  channel?: string
  ts?: string
}

function getSlackToken() {
  const token = process.env.SLACK_BOT_TOKEN
  if (!token) throw new Error('slack_not_configured')
  return token
}

export async function postSlackMessage(message: SlackMessage): Promise<SlackApiResponse> {
  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getSlackToken()}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      ...message,
      mrkdwn: true,
      unfurl_links: false,
      unfurl_media: false,
    }),
  })

  if (!response.ok) throw new Error(`slack_http_${response.status}`)

  const payload = await response.json() as SlackApiResponse
  if (!payload.ok) throw new Error(`slack_api_${payload.error || 'unknown_error'}`)
  return payload
}

export function maskPhone(value: unknown): string {
  const digits = String(value || '').replace(/\D/g, '')
  if (digits.length < 4) return '未提供'
  return `•••• ${digits.slice(-4)}`
}

export function formatHkd(value: unknown): string {
  const amount = Number(value || 0)
  return `HK$${Number.isFinite(amount) ? amount.toLocaleString('en-HK') : '0'}`
}

export function portalUrl(): string {
  return process.env.A2O_PORTAL_URL || 'https://a2o-style-lab.vercel.app/#/portal/staff'
}
