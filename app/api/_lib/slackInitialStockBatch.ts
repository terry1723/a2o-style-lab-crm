type SlackListChoice = {
  value?: string
  label?: string
}

type SlackListColumn = {
  id?: string
  key?: string
  name?: string
  options?: { choices?: SlackListChoice[] }
}

type SlackListField = {
  key?: string
  column_id?: string
  value?: unknown
  text?: string
  rich_text?: unknown
  number?: unknown
}

type SlackListItem = {
  id?: string
  fields?: SlackListField[]
}

type SlackListFile = {
  list_metadata?: { schema?: SlackListColumn[] }
}

type SlackApiResponse = {
  ok?: boolean
  error?: string
  items?: SlackListItem[]
  item?: SlackListItem
  list?: SlackListFile
  file?: SlackListFile
  response_metadata?: { next_cursor?: string }
}

type StockRow = {
  product: string
  color: string
  size: string
  stock: number
  supplier: string
  wechatId: string
  costRmb: number
  sourceMessage: string
}

const STOCK_LIST_ID = 'F0BNFAWGYSW'
const STOCK_ROWS: StockRow[] = [
  {
    product: '直紋針織短袖圓領',
    color: '灰色',
    size: 'M',
    stock: 1,
    supplier: 'xing lu',
    wechatId: 'xing-lu888',
    costRmb: 98,
    sourceMessage: 'https://a2o-twn5102.slack.com/archives/C0BMZTM7D9D/p1786013592365499',
  },
  {
    product: '拉鏈領直紋針織短袖',
    color: '米白色',
    size: 'M',
    stock: 1,
    supplier: 'keepstable',
    wechatId: 'keepstable',
    costRmb: 95,
    sourceMessage: 'https://a2o-twn5102.slack.com/archives/C0BMZTM7D9D/p1786013743051329',
  },
  {
    product: '麻質半拉鏈假兩件上衣',
    color: '白色',
    size: 'L',
    stock: 1,
    supplier: 'xing lu',
    wechatId: 'xing-lu888',
    costRmb: 148,
    sourceMessage: 'https://a2o-twn5102.slack.com/archives/C0BMZTM7D9D/p1786013897288149',
  },
]

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
  return [{
    type: 'rich_text',
    elements: [{
      type: 'rich_text_section',
      elements: [{ type: 'text', text: value }],
    }],
  }]
}

function normalize(value: unknown): string {
  return String(value || '').trim().toLowerCase().replace(/[\s／/|｜_-]+/g, '')
}

function collectText(value: unknown): string[] {
  if (typeof value === 'string') {
    try {
      return collectText(JSON.parse(value))
    } catch {
      return [value]
    }
  }
  if (typeof value === 'number' || typeof value === 'boolean') return [String(value)]
  if (Array.isArray(value)) return value.flatMap(collectText)
  if (!value || typeof value !== 'object') return []
  const record = value as Record<string, unknown>
  const directKeys = ['text', 'label', 'value', 'original_url', 'display_name']
  const direct = directKeys.flatMap((key) => key in record ? collectText(record[key]) : [])
  if (direct.length) return direct
  return Object.values(record).flatMap(collectText)
}

function fieldText(item: SlackListItem, column: SlackListColumn | undefined): string {
  if (!column?.id) return ''
  const field = (item.fields || []).find((entry) => entry.column_id === column.id || entry.key === column.key)
  if (!field) return ''
  if (field.text) return field.text
  return collectText(field.rich_text ?? field.value).join(' ').trim()
}

async function listAllItems(listId: string): Promise<SlackListItem[]> {
  const items: SlackListItem[] = []
  let cursor = ''
  do {
    const payload = await slackApi('slackLists.items.list', {
      list_id: listId,
      limit: 100,
      ...(cursor ? { cursor } : {}),
    })
    items.push(...(payload.items || []))
    cursor = payload.response_metadata?.next_cursor || ''
  } while (cursor)
  return items
}

async function loadSchema(listId: string, items: SlackListItem[]): Promise<SlackListColumn[]> {
  const firstItemId = items.find((item) => item.id)?.id
  if (firstItemId) {
    const info = await slackApi('slackLists.items.info', { list_id: listId, id: firstItemId })
    const schema = info.list?.list_metadata?.schema || []
    if (schema.length) return schema
  }

  const placeholder = await slackApi('slackLists.items.create', { list_id: listId })
  const placeholderId = placeholder.item?.id
  if (!placeholderId) throw new Error('slack_stock_placeholder_missing')

  try {
    const info = await slackApi('slackLists.items.info', { list_id: listId, id: placeholderId })
    const schema = info.list?.list_metadata?.schema || []
    if (!schema.length) throw new Error('slack_stock_schema_unavailable')
    return schema
  } finally {
    await slackApi('slackLists.items.delete', { list_id: listId, id: placeholderId })
  }
}

function findColumn(schema: SlackListColumn[], name: string): SlackListColumn | undefined {
  const target = normalize(name)
  return schema.find((column) => [column.name, column.key].some((value) => normalize(value) === target))
}

function selectChoice(column: SlackListColumn | undefined, label: string): string | undefined {
  const target = normalize(label)
  return (column?.options?.choices || []).find((choice) => normalize(choice.label || choice.value) === target)?.value
}

function buildFields(
  row: StockRow,
  columns: {
    product?: SlackListColumn
    color?: SlackListColumn
    size?: SlackListColumn
    stock?: SlackListColumn
    status?: SlackListColumn
    supplier?: SlackListColumn
    wechat?: SlackListColumn
    cost?: SlackListColumn
    updated?: SlackListColumn
    source?: SlackListColumn
    notes?: SlackListColumn
  },
) {
  const statusChoice = selectChoice(columns.status, '待盤點')
  return [
    columns.product?.id ? { column_id: columns.product.id, rich_text: richText(row.product) } : null,
    columns.color?.id ? { column_id: columns.color.id, rich_text: richText(row.color) } : null,
    columns.size?.id ? { column_id: columns.size.id, rich_text: richText(row.size) } : null,
    columns.stock?.id ? { column_id: columns.stock.id, number: [row.stock] } : null,
    columns.status?.id && statusChoice ? { column_id: columns.status.id, select: [statusChoice] } : null,
    columns.supplier?.id ? { column_id: columns.supplier.id, rich_text: richText(row.supplier) } : null,
    columns.wechat?.id ? { column_id: columns.wechat.id, rich_text: richText(row.wechatId) } : null,
    columns.cost?.id ? { column_id: columns.cost.id, number: [row.costRmb] } : null,
    columns.updated?.id ? { column_id: columns.updated.id, date: ['2026-08-06'] } : null,
    columns.source?.id ? { column_id: columns.source.id, rich_text: richText(row.sourceMessage) } : null,
    columns.notes?.id ? { column_id: columns.notes.id, rich_text: richText('首次入帳｜入貨 +1｜已由 ChatGPT 核對') } : null,
  ].filter((field): field is Record<string, unknown> => Boolean(field))
}

export async function syncInitialA2OStockBatch() {
  await slackApi('slackLists.update', {
    id: STOCK_LIST_ID,
    name: 'A2O 庫存總表',
    description_blocks: richText('A2O 所有入貨、出貨、贈送、退貨、損壞及盤點調整嘅正式庫存總表。每個產品、顏色及尺碼分開一行；每次由 ChatGPT 核對 #a2o-stock 未有 ✅ 嘅紀錄後更新。'),
  })

  const items = await listAllItems(STOCK_LIST_ID)
  const schema = await loadSchema(STOCK_LIST_ID, items)
  const columns = {
    product: findColumn(schema, '產品名稱'),
    color: findColumn(schema, '顏色'),
    size: findColumn(schema, '尺碼'),
    stock: findColumn(schema, '現有庫存'),
    status: findColumn(schema, '庫存狀態'),
    supplier: findColumn(schema, '供應商'),
    wechat: findColumn(schema, 'WeChat ID'),
    cost: findColumn(schema, '最近成本（RMB）'),
    updated: findColumn(schema, '最近更新'),
    source: findColumn(schema, '最近紀錄'),
    notes: findColumn(schema, '備註'),
  }
  if (!columns.product?.id || !columns.color?.id || !columns.size?.id || !columns.stock?.id) {
    throw new Error('slack_stock_required_columns_missing')
  }

  const existing = new Map<string, SlackListItem>()
  const blankItems: SlackListItem[] = []
  for (const item of items) {
    const product = fieldText(item, columns.product)
    const color = fieldText(item, columns.color)
    const size = fieldText(item, columns.size)
    const key = [product, color, size].map(normalize).join('|')
    if (key === '||') blankItems.push(item)
    else existing.set(key, item)
  }

  let created = 0
  let updated = 0
  let reusedBlank = 0
  for (const row of STOCK_ROWS) {
    const key = [row.product, row.color, row.size].map(normalize).join('|')
    const fields = buildFields(row, columns)
    const current = existing.get(key)

    if (current?.id) {
      await slackApi('slackLists.items.update', {
        list_id: STOCK_LIST_ID,
        cells: fields.map((field) => ({ ...field, row_id: current.id })),
      })
      updated += 1
      continue
    }

    const blank = blankItems.shift()
    if (blank?.id) {
      await slackApi('slackLists.items.update', {
        list_id: STOCK_LIST_ID,
        cells: fields.map((field) => ({ ...field, row_id: blank.id })),
      })
      reusedBlank += 1
      continue
    }

    await slackApi('slackLists.items.create', {
      list_id: STOCK_LIST_ID,
      initial_fields: fields,
    })
    created += 1
  }

  return { listId: STOCK_LIST_ID, created, updated, reusedBlank, total: STOCK_ROWS.length }
}
