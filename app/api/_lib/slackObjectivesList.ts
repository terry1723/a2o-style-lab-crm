type SlackListColumn = {
  id?: string
  key?: string
  name?: string
}

type SlackListField = {
  key?: string
  column_id?: string
  value?: unknown
  text?: string
  rich_text?: unknown
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
  list_id?: string
  item?: SlackListItem
  items?: SlackListItem[]
  list?: SlackListFile
  response_metadata?: { next_cursor?: string }
}

type ObjectiveRow = {
  objective: string
  strategy: string
  weeklyDashboard: string
  weeklyActionPlan: string
  monthlyKpi: string
}

const DASHBOARD_CHANNEL_ID = 'C0BN9NM39BP'
const TEAM_ID = 'T0BNB4ARK2S'
const WEEKLY_LIST_ID = 'F0BNCV037M3'
const WEEKLY_PERIOD = '2026/08/10–2026/08/17'

const ROWS: ObjectiveRow[] = [
  {
    objective: 'Objective 1｜Customer Growth',
    strategy: 'More Video',
    weeklyDashboard: '2組 Before / After；5條 Video',
    weeklyActionPlan: '安排拍攝、剪片及發布時間表',
    monthlyKpi: '8組 Before / After；20條 Video',
  },
  {
    objective: 'Objective 1｜Customer Growth',
    strategy: 'B2B Partner Network',
    weeklyDashboard: '推進1間正式 Partner',
    weeklyActionPlan: '完成名單、聯絡、拜訪及轉介方案',
    monthlyKpi: '4間正式 Partner',
  },
  {
    objective: 'Objective 1｜Customer Growth',
    strategy: 'Website Conversion',
    weeklyDashboard: '取得3個 Website Leads',
    weeklyActionPlan: '優化診斷、案例頁及預約 CTA',
    monthlyKpi: '10個 Website Leads',
  },
  {
    objective: 'Objective 1｜Customer Growth',
    strategy: 'Old Lead Reactivation',
    weeklyDashboard: '重新接觸10個舊 Lead',
    weeklyActionPlan: '分批 WhatsApp 跟進並記錄結果',
    monthlyKpi: '重新接觸40個舊 Lead',
  },
  {
    objective: 'Objective 1｜Customer Growth',
    strategy: 'Ad Optimisation',
    weeklyDashboard: 'Budget HK$1,750；CPL ≤ HK$150',
    weeklyActionPlan: '檢查 CPL、素材及 Lead 質素',
    monthlyKpi: 'Budget HK$7,000；CPL ≤ HK$150',
  },
  {
    objective: 'Objective 1｜Customer Growth',
    strategy: 'Response System',
    weeklyDashboard: '平均首次回覆 ≤15分鐘',
    weeklyActionPlan: '落實值班、交更、回覆模板及 Close Check',
    monthlyKpi: '平均首次回覆 ≤15分鐘',
  },
  {
    objective: 'Objective 2｜Customer Retention',
    strategy: '30-Day Follow-up',
    weeklyDashboard: '完成5位客人 30日跟進',
    weeklyActionPlan: '整理客戶池並設定跟進日期',
    monthlyKpi: '完成20位客人 30日跟進',
  },
  {
    objective: 'Objective 2｜Customer Retention',
    strategy: 'Clothing Follow-up',
    weeklyDashboard: '5位返店；5套；HK$4,900',
    weeklyActionPlan: '建立尺碼及服裝建議並邀請返店',
    monthlyKpi: '20位返店；20套；HK$19,600',
  },
  {
    objective: 'Objective 2｜Customer Retention',
    strategy: 'Maintenance Plan',
    weeklyDashboard: '完成服務內容、週期及價格草案',
    weeklyActionPlan: '完成維護方案及首批邀請名單',
    monthlyKpi: '完成 Maintenance Plan 方案及首批邀請名單',
  },
  {
    objective: 'Objective 2｜Customer Retention',
    strategy: 'Membership',
    weeklyDashboard: '完成會員權益、價格及續會草案',
    weeklyActionPlan: '完成會員方案及首批邀請名單',
    monthlyKpi: '完成 Membership 方案及首批邀請名單',
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

async function loadSchema(listId: string, items: SlackListItem[] = []): Promise<SlackListColumn[]> {
  const firstItemId = items.find((item) => item.id)?.id
  if (firstItemId) {
    const info = await slackApi('slackLists.items.info', { list_id: listId, id: firstItemId })
    const schema = info.list?.list_metadata?.schema || []
    if (schema.length) return schema
  }

  const placeholder = await slackApi('slackLists.items.create', { list_id: listId })
  const placeholderId = placeholder.item?.id
  if (!placeholderId) throw new Error('slack_objectives_placeholder_missing')

  try {
    const info = await slackApi('slackLists.items.info', { list_id: listId, id: placeholderId })
    const schema = info.list?.list_metadata?.schema || []
    if (!schema.length) throw new Error('slack_objectives_schema_unavailable')
    return schema
  } finally {
    await slackApi('slackLists.items.delete', { list_id: listId, id: placeholderId })
  }
}

function findColumn(columns: SlackListColumn[], name: string): SlackListColumn | undefined {
  const target = normalize(name)
  return columns.find((column) => [column.name, column.key].some((value) => normalize(value) === target))
}

async function updateWeeklyDashboard() {
  await slackApi('slackLists.update', {
    id: WEEKLY_LIST_ID,
    name: '2026年8月 Objective Dashboard｜8/10–8/17',
    description_blocks: richText(`每週 Objective Dashboard｜統計期間：${WEEKLY_PERIOD}`),
  })

  const items = await listAllItems(WEEKLY_LIST_ID)
  const columns = await loadSchema(WEEKLY_LIST_ID, items)
  const mapped = {
    objective: findColumn(columns, 'Objective'),
    strategy: findColumn(columns, 'Strategy'),
    dashboard: findColumn(columns, 'Dashboard'),
    actionPlan: findColumn(columns, 'Action Plan'),
  }
  if (!mapped.objective?.id || !mapped.strategy?.id || !mapped.dashboard?.id || !mapped.actionPlan?.id) {
    throw new Error('slack_weekly_dashboard_required_columns_missing')
  }

  const byStrategy = new Map<string, SlackListItem>()
  for (const item of items) {
    const strategy = fieldText(item, mapped.strategy)
    if (strategy) byStrategy.set(normalize(strategy), item)
  }

  let updatedRows = 0
  for (const row of ROWS) {
    const item = byStrategy.get(normalize(row.strategy))
    if (!item?.id) continue
    const cells = [
      { row_id: item.id, column_id: mapped.objective.id, rich_text: richText(row.objective) },
      { row_id: item.id, column_id: mapped.strategy.id, rich_text: richText(row.strategy) },
      { row_id: item.id, column_id: mapped.dashboard.id, rich_text: richText(row.weeklyDashboard) },
      { row_id: item.id, column_id: mapped.actionPlan.id, rich_text: richText(row.weeklyActionPlan) },
    ]
    await slackApi('slackLists.items.update', { list_id: WEEKLY_LIST_ID, cells })
    updatedRows += 1
  }

  return {
    listId: WEEKLY_LIST_ID,
    listUrl: `https://app.slack.com/client/${TEAM_ID}/unified-files/list/${WEEKLY_LIST_ID}`,
    updatedRows,
  }
}

function kpiSchema() {
  return [
    { key: 'objective', name: 'Objective', type: 'text', is_primary_column: true },
    { key: 'strategy', name: 'Strategy', type: 'text' },
    { key: 'kpi', name: 'KPI', type: 'text' },
    { key: 'target', name: '2026年8月目標', type: 'text' },
  ]
}

async function createMonthlyKpiList() {
  const created = await slackApi('slackLists.create', {
    name: '2026年8月 KPI',
    description_blocks: richText('A2O 2026年8月每月 KPI。'),
    schema: kpiSchema(),
    todo_mode: false,
  })
  const listId = String(created.list_id || '')
  if (!listId) throw new Error('slack_august_kpi_list_id_missing')

  await slackApi('slackLists.access.set', {
    list_id: listId,
    access_level: 'write',
    channel_ids: [DASHBOARD_CHANNEL_ID],
  })

  const columns = await loadSchema(listId)
  const mapped = {
    objective: findColumn(columns, 'Objective'),
    strategy: findColumn(columns, 'Strategy'),
    kpi: findColumn(columns, 'KPI'),
    target: findColumn(columns, '2026年8月目標'),
  }
  if (!mapped.objective?.id || !mapped.strategy?.id || !mapped.kpi?.id || !mapped.target?.id) {
    throw new Error('slack_august_kpi_required_columns_missing')
  }

  let createdRows = 0
  for (const row of ROWS) {
    await slackApi('slackLists.items.create', {
      list_id: listId,
      initial_fields: [
        { column_id: mapped.objective.id, rich_text: richText(row.objective) },
        { column_id: mapped.strategy.id, rich_text: richText(row.strategy) },
        { column_id: mapped.kpi.id, rich_text: richText(row.monthlyKpi) },
        { column_id: mapped.target.id, rich_text: richText(row.monthlyKpi) },
      ],
    })
    createdRows += 1
  }

  const listUrl = `https://app.slack.com/client/${TEAM_ID}/unified-files/list/${listId}`
  let tabAdded = false
  let tabError = ''
  try {
    await slackApi('bookmarks.add', {
      channel_id: DASHBOARD_CHANNEL_ID,
      title: '2026年8月 KPI',
      type: 'link',
      link: listUrl,
      emoji: ':dart:',
    })
    tabAdded = true
  } catch (error) {
    tabError = error instanceof Error ? error.message : 'slack_august_kpi_tab_failed'
  }

  return { listId, listUrl, createdRows, tabAdded, tabError }
}

export async function createA2OObjectivesList() {
  const weeklyDashboard = await updateWeeklyDashboard()
  const monthlyKpi = await createMonthlyKpiList()

  await slackApi('chat.postMessage', {
    channel: DASHBOARD_CHANNEL_ID,
    text: [
      '📊 *2026年8月 Dashboard & KPI 已更新*',
      `Weekly Objective Dashboard：${WEEKLY_PERIOD}`,
      `<${weeklyDashboard.listUrl}|開啟 Weekly Objective Dashboard>`,
      `<${monthlyKpi.listUrl}|開啟 2026年8月 KPI>`,
    ].join('\n'),
  })

  return { weeklyDashboard, monthlyKpi }
}
