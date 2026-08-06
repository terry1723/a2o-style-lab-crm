type SlackListChoice = {
  value: string
  label: string
  color: string
}

type SlackListColumn = {
  key: string
  name: string
  type: string
  is_primary_column?: boolean
  options?: {
    precision?: number
    format?: string
    date_format?: string
    choices?: SlackListChoice[]
  }
}

type SlackApiResponse = {
  ok?: boolean
  error?: string
  list_id?: string
}

const DEFAULT_STOCK_CHANNEL_ID = 'C0BMZTM7D9D'

function getSlackToken(): string {
  const token = process.env.SLACK_BOT_TOKEN
  if (!token) throw new Error('slack_not_configured')
  return token
}

async function slackApi(method: string, body: Record<string, unknown>): Promise<SlackApiResponse> {
  const response = await fetch(`https://slack.com/api/${method}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getSlackToken()}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) throw new Error(`slack_http_${response.status}`)
  const payload = await response.json() as SlackApiResponse
  if (!payload.ok) throw new Error(`slack_api_${method}_${payload.error || 'unknown_error'}`)
  return payload
}

function richText(value: string) {
  return [
    {
      type: 'rich_text',
      elements: [
        {
          type: 'rich_text_section',
          elements: [{ type: 'text', text: value }],
        },
      ],
    },
  ]
}

function stockSchema(): SlackListColumn[] {
  return [
    {
      key: 'product',
      name: '產品名稱',
      type: 'text',
      is_primary_column: true,
    },
    {
      key: 'photo',
      name: '產品相片',
      type: 'attachment',
    },
    {
      key: 'color',
      name: '顏色',
      type: 'text',
    },
    {
      key: 'size',
      name: '尺碼',
      type: 'text',
    },
    {
      key: 'current_stock',
      name: '現有庫存',
      type: 'number',
      options: { precision: 0 },
    },
    {
      key: 'minimum_stock',
      name: '最低庫存',
      type: 'number',
      options: { precision: 0 },
    },
    {
      key: 'stock_status',
      name: '庫存狀態',
      type: 'select',
      options: {
        format: 'single_select',
        choices: [
          { value: 'normal', label: '正常', color: 'green' },
          { value: 'low', label: '需要補貨', color: 'yellow' },
          { value: 'out', label: '缺貨', color: 'red' },
          { value: 'unknown', label: '待盤點', color: 'gray' },
        ],
      },
    },
    {
      key: 'supplier',
      name: '供應商',
      type: 'text',
    },
    {
      key: 'wechat_id',
      name: 'WeChat ID',
      type: 'text',
    },
    {
      key: 'cost',
      name: '最近成本（RMB）',
      type: 'number',
      options: { precision: 2 },
    },
    {
      key: 'last_updated',
      name: '最近更新',
      type: 'date',
      options: { date_format: 'YYYY/MM/DD' },
    },
    {
      key: 'source_message',
      name: '最近紀錄',
      type: 'link',
    },
    {
      key: 'notes',
      name: '備註',
      type: 'text',
    },
  ]
}

export async function ensureA2OStockList(existingListId = '') {
  const stockChannelId = process.env.SLACK_STOCK_CHANNEL_ID || DEFAULT_STOCK_CHANNEL_ID
  let listId = existingListId.trim()
  let created = false

  if (!listId) {
    const createdList = await slackApi('slackLists.create', {
      name: 'A2O 庫存總表',
      description_blocks: richText(
        'A2O 正式庫存紀錄｜產品、顏色及尺碼分開一行。日間原始入貨／出貨相片放在 #a2o-stock，每日由 Terry 使用 ChatGPT 整理後更新本表。',
      ),
      schema: stockSchema(),
      todo_mode: false,
    })
    listId = String(createdList.list_id || '')
    if (!listId) throw new Error('slack_stock_list_id_missing')
    created = true
  }

  await slackApi('slackLists.access.set', {
    list_id: listId,
    access_level: 'write',
    channel_ids: [stockChannelId],
  })

  return { listId, created, stockChannelId }
}
