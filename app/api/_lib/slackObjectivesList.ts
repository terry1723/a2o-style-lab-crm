type SlackListColumn = {
  id?: string
  key?: string
  name?: string
}

type SlackListItem = {
  id?: string
}

type SlackListFile = {
  list_metadata?: { schema?: SlackListColumn[] }
}

type SlackApiResponse = {
  ok?: boolean
  error?: string
  list_id?: string
  item?: SlackListItem
  list?: SlackListFile
}

type ObjectiveRow = {
  objective: string
  strategy: string
  dashboard: string
  actionPlan: string
}

const DASHBOARD_CHANNEL_ID = 'C0BN9NM39BP'
const TEAM_ID = 'T0BNB4ARK2S'

const ROWS: ObjectiveRow[] = [
  {
    objective: 'Objective 1｜Customer Growth',
    strategy: 'More Video',
    dashboard: '8組 Before / After；20條 Video',
    actionPlan: '每週安排拍攝、剪片及發布',
  },
  {
    objective: 'Objective 1｜Customer Growth',
    strategy: 'B2B Partner Network',
    dashboard: '4間正式 Partner',
    actionPlan: '建立名單、聯絡、拜訪及轉介方案',
  },
  {
    objective: 'Objective 1｜Customer Growth',
    strategy: 'Website Conversion',
    dashboard: '10個 Website Leads',
    actionPlan: '優化診斷、案例頁及預約 CTA',
  },
  {
    objective: 'Objective 1｜Customer Growth',
    strategy: 'Old Lead Reactivation',
    dashboard: '重新接觸 40個舊 Lead',
    actionPlan: '分批 WhatsApp 跟進並記錄結果',
  },
  {
    objective: 'Objective 1｜Customer Growth',
    strategy: 'Ad Optimisation',
    dashboard: 'Budget HK$7,000；CPL ≤ HK$150',
    actionPlan: '每週檢查 CPL、素材及 Lead 質素',
  },
  {
    objective: 'Objective 1｜Customer Growth',
    strategy: 'Response System',
    dashboard: '首次回覆 ≤15分鐘',
    actionPlan: '定值班、交更、回覆模板及 Close Check',
  },
  {
    objective: 'Objective 2｜Customer Retention',
    strategy: '30-Day Follow-up',
    dashboard: '20位客人完成 30日跟進',
    actionPlan: '整理客戶池並設定跟進日期',
  },
  {
    objective: 'Objective 2｜Customer Retention',
    strategy: 'Clothing Follow-up',
    dashboard: '20位返店；每人1套；HK$980／套',
    actionPlan: '建立尺碼及服裝建議並邀請返店',
  },
  {
    objective: 'Objective 2｜Customer Retention',
    strategy: 'Maintenance Plan',
    dashboard: '定服務內容、週期及價格',
    actionPlan: '設計維護方案及首批邀請名單',
  },
  {
    objective: 'Objective 2｜Customer Retention',
    strategy: 'Membership',
    dashboard: '定會員權益、價格及續會安排',
    actionPlan: '設計會員方案及首批邀請名單',
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

function schema() {
  return [
    { key: 'objective', name: 'Objective', type: 'text', is_primary_column: true },
    { key: 'strategy', name: 'Strategy', type: 'text' },
    { key: 'dashboard', name: 'Dashboard', type: 'text' },
    { key: 'action_plan', name: 'Action Plan', type: 'text' },
  ]
}

async function loadSchema(listId: string): Promise<SlackListColumn[]> {
  const placeholder = await slackApi('slackLists.items.create', { list_id: listId })
  const placeholderId = placeholder.item?.id
  if (!placeholderId) throw new Error('slack_objectives_placeholder_missing')

  try {
    const info = await slackApi('slackLists.items.info', { list_id: listId, id: placeholderId })
    const listSchema = info.list?.list_metadata?.schema || []
    if (!listSchema.length) throw new Error('slack_objectives_schema_unavailable')
    return listSchema
  } finally {
    await slackApi('slackLists.items.delete', { list_id: listId, id: placeholderId })
  }
}

function findColumn(columns: SlackListColumn[], name: string): SlackListColumn | undefined {
  const target = normalize(name)
  return columns.find((column) => [column.name, column.key].some((value) => normalize(value) === target))
}

export async function createA2OObjectivesList() {
  const created = await slackApi('slackLists.create', {
    name: 'A2O Objectives Dashboard',
    description_blocks: richText('A2O 會議用簡易表：Objective、Strategy、Dashboard、Action Plan。'),
    schema: schema(),
    todo_mode: false,
  })
  const listId = String(created.list_id || '')
  if (!listId) throw new Error('slack_objectives_list_id_missing')

  await slackApi('slackLists.access.set', {
    list_id: listId,
    access_level: 'write',
    channel_ids: [DASHBOARD_CHANNEL_ID],
  })

  const columns = await loadSchema(listId)
  const mapped = {
    objective: findColumn(columns, 'Objective'),
    strategy: findColumn(columns, 'Strategy'),
    dashboard: findColumn(columns, 'Dashboard'),
    actionPlan: findColumn(columns, 'Action Plan'),
  }
  if (!mapped.objective?.id || !mapped.strategy?.id || !mapped.dashboard?.id || !mapped.actionPlan?.id) {
    throw new Error('slack_objectives_required_columns_missing')
  }

  let createdRows = 0
  for (const row of ROWS) {
    await slackApi('slackLists.items.create', {
      list_id: listId,
      initial_fields: [
        { column_id: mapped.objective.id, rich_text: richText(row.objective) },
        { column_id: mapped.strategy.id, rich_text: richText(row.strategy) },
        { column_id: mapped.dashboard.id, rich_text: richText(row.dashboard) },
        { column_id: mapped.actionPlan.id, rich_text: richText(row.actionPlan) },
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
      title: 'Objectives Dashboard',
      type: 'link',
      link: listUrl,
      emoji: ':bar_chart:',
    })
    tabAdded = true
  } catch (error) {
    tabError = error instanceof Error ? error.message : 'slack_objectives_tab_failed'
  }

  await slackApi('chat.postMessage', {
    channel: DASHBOARD_CHANNEL_ID,
    text: [
      '📊 *A2O Objectives Dashboard 已建立*',
      '簡化為 4欄：Objective｜Strategy｜Dashboard｜Action Plan',
      `<${listUrl}|開啟新表>`,
    ].join('\n'),
  })

  return { listId, listUrl, createdRows, tabAdded, tabError }
}
