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
  strategy: string
  objective: 'Customer Growth' | 'Customer Retention'
  direction: string
  actionPlan: string
  kpi: string
  priority: 'P1' | 'P2' | 'P3'
}

const DASHBOARD_CHANNEL_ID = 'C0BN9NM39BP'
const TEAM_ID = 'T0BNB4ARK2S'
const SOURCE_CANVAS_URL = 'https://a2o-twn5102.slack.com/docs/T0BNB4ARK2S/F0BNGSJ4UR2'
const MEETING_DATE = '2026-08-07'

const ROWS: ObjectiveRow[] = [
  {
    strategy: 'More Video',
    objective: 'Customer Growth',
    direction: 'Before / After、專業分析、真實案例',
    actionPlan: '會議草稿：建立每週拍攝及發布表；持續收集 Before / After；每月完成 8 組案例及 20 條影片。',
    kpi: 'Before / After 8組；Video 20條',
    priority: 'P1',
  },
  {
    strategy: 'B2B Partner Network',
    objective: 'Customer Growth',
    direction: '髮型屋、美容屋轉介合作',
    actionPlan: '會議草稿：建立目標 Partner 名單、聯絡及拜訪流程、轉介方案與跟進節奏。',
    kpi: '正式 Partner 4間',
    priority: 'P1',
  },
  {
    strategy: 'Website Conversion',
    objective: 'Customer Growth',
    direction: '診斷、案例、直接預約',
    actionPlan: '會議草稿：優化網站診斷入口、案例頁及預約 CTA；每週檢查網站 Lead 數量及轉換。',
    kpi: 'Website Leads 10個',
    priority: 'P2',
  },
  {
    strategy: 'Old Lead Reactivation',
    objective: 'Customer Growth',
    direction: '舊 Lead 重新跟進',
    actionPlan: '會議草稿：整理舊 Lead 名單、分批 WhatsApp 跟進、記錄回覆、預約及拒絕結果。',
    kpi: '舊 Lead 重新接觸 40人',
    priority: 'P1',
  },
  {
    strategy: 'Ad Optimisation',
    objective: 'Customer Growth',
    direction: '預算 HK$7,000、CPL ≤ HK$150',
    actionPlan: '會議草稿：每週檢查素材、CPL、Lead 質素及預約結果；暫停低效廣告並放大有效素材。',
    kpi: '預算 HK$7,000；CPL ≤ HK$150',
    priority: 'P1',
  },
  {
    strategy: 'Response System',
    objective: 'Customer Growth',
    direction: 'IG／FB／WhatsApp 統一、快速分工',
    actionPlan: '會議草稿：確認值班及交更方式、15分鐘首次回覆 SLA、3套標準回覆模板、每日 Close 前檢查未跟進名單。',
    kpi: '平均首次回覆時間 ≤15分鐘',
    priority: 'P1',
  },
  {
    strategy: '30-Day Follow-up',
    objective: 'Customer Retention',
    direction: '完成服務後 30 日內主動跟進',
    actionPlan: '會議草稿：整理現有 Package 客戶池，逐位設定 30 日跟進日期、聯絡內容及下一步。',
    kpi: '30日內跟進 20人',
    priority: 'P1',
  },
  {
    strategy: 'Clothing Follow-up',
    objective: 'Customer Retention',
    direction: '按客人形象方案持續推薦服裝',
    actionPlan: '會議草稿：為每位客人建立服裝建議及尺碼紀錄；跟進返店試身及每人購買 1 套衫。',
    kpi: '返店 20人；每人 1套；單套 HK$980',
    priority: 'P1',
  },
  {
    strategy: 'Maintenance Plan',
    objective: 'Customer Retention',
    direction: '建立持續形象維護服務',
    actionPlan: '會議草稿：決定服務內容、週期、價格、提醒方法及適合邀請的客戶。',
    kpi: '原有資料未設定獨立 KPI｜會議確認',
    priority: 'P2',
  },
  {
    strategy: 'Membership',
    objective: 'Customer Retention',
    direction: '建立長期會員關係及回購機制',
    actionPlan: '會議草稿：決定會員權益、價格、續會安排、服裝優惠及首批邀請名單。',
    kpi: '原有資料未設定獨立 KPI｜會議確認',
    priority: 'P2',
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
    { key: 'strategy', name: 'Strategy', type: 'text', is_primary_column: true },
    {
      key: 'objective',
      name: 'Objective',
      type: 'select',
      options: {
        format: 'single_select',
        choices: [
          { value: 'growth', label: 'Objective 1｜Customer Growth', color: 'blue' },
          { value: 'retention', label: 'Objective 2｜Customer Retention', color: 'purple' },
        ],
      },
    },
    { key: 'direction', name: '已確認方向', type: 'text' },
    { key: 'action_plan', name: 'Action Plan', type: 'text' },
    { key: 'kpi', name: 'KPI／目標', type: 'text' },
    { key: 'owner', name: '負責人', type: 'text' },
    { key: 'deadline', name: '完成期限', type: 'date', options: { date_format: 'YYYY/MM/DD' } },
    {
      key: 'status',
      name: '狀態',
      type: 'select',
      options: {
        format: 'single_select',
        choices: [
          { value: 'meeting', label: '待會議確認', color: 'gray' },
          { value: 'todo', label: '未開始', color: 'red' },
          { value: 'doing', label: '進行中', color: 'yellow' },
          { value: 'done', label: '已完成', color: 'green' },
          { value: 'blocked', label: '受阻', color: 'orange' },
        ],
      },
    },
    {
      key: 'priority',
      name: '優先次序',
      type: 'select',
      options: {
        format: 'single_select',
        choices: [
          { value: 'p1', label: 'P1', color: 'red' },
          { value: 'p2', label: 'P2', color: 'yellow' },
          { value: 'p3', label: 'P3', color: 'gray' },
        ],
      },
    },
    { key: 'meeting_date', name: '會議日期', type: 'date', options: { date_format: 'YYYY/MM/DD' } },
    { key: 'decision', name: '會議決定／備註', type: 'text' },
    { key: 'source', name: '原有 Operating System', type: 'link' },
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

function selectChoice(column: SlackListColumn | undefined, label: string): string | undefined {
  const target = normalize(label)
  return (column?.options?.choices || []).find((choice) => normalize(choice.label || choice.value) === target)?.value
}

export async function createA2OObjectivesList() {
  const created = await slackApi('slackLists.create', {
    name: 'A2O Objectives & Action Plan',
    description_blocks: richText(
      '明日會議工作表｜Objective、Strategy 同 KPI 來自已確認的 A2O Operating System；Action Plan 為會議草稿；負責人、期限及最終做法需要在 2026-08-07 會議確認。',
    ),
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
    strategy: findColumn(columns, 'Strategy'),
    objective: findColumn(columns, 'Objective'),
    direction: findColumn(columns, '已確認方向'),
    actionPlan: findColumn(columns, 'Action Plan'),
    kpi: findColumn(columns, 'KPI／目標'),
    owner: findColumn(columns, '負責人'),
    status: findColumn(columns, '狀態'),
    priority: findColumn(columns, '優先次序'),
    meetingDate: findColumn(columns, '會議日期'),
    decision: findColumn(columns, '會議決定／備註'),
    source: findColumn(columns, '原有 Operating System'),
  }
  if (!mapped.strategy?.id || !mapped.objective?.id || !mapped.actionPlan?.id) {
    throw new Error('slack_objectives_required_columns_missing')
  }

  const meetingChoice = selectChoice(mapped.status, '待會議確認')
  let createdRows = 0

  for (const row of ROWS) {
    const objectiveChoice = selectChoice(
      mapped.objective,
      row.objective === 'Customer Growth'
        ? 'Objective 1｜Customer Growth'
        : 'Objective 2｜Customer Retention',
    )
    const priorityChoice = selectChoice(mapped.priority, row.priority)
    const fields = [
      mapped.strategy?.id ? { column_id: mapped.strategy.id, rich_text: richText(row.strategy) } : null,
      mapped.objective?.id && objectiveChoice ? { column_id: mapped.objective.id, select: [objectiveChoice] } : null,
      mapped.direction?.id ? { column_id: mapped.direction.id, rich_text: richText(row.direction) } : null,
      mapped.actionPlan?.id ? { column_id: mapped.actionPlan.id, rich_text: richText(row.actionPlan) } : null,
      mapped.kpi?.id ? { column_id: mapped.kpi.id, rich_text: richText(row.kpi) } : null,
      mapped.owner?.id ? { column_id: mapped.owner.id, rich_text: richText('待 8/7 會議分配') } : null,
      mapped.status?.id && meetingChoice ? { column_id: mapped.status.id, select: [meetingChoice] } : null,
      mapped.priority?.id && priorityChoice ? { column_id: mapped.priority.id, select: [priorityChoice] } : null,
      mapped.meetingDate?.id ? { column_id: mapped.meetingDate.id, date: [MEETING_DATE] } : null,
      mapped.decision?.id ? { column_id: mapped.decision.id, rich_text: richText('明日會議確認 Owner、Deadline、第一步及匯報方式') } : null,
      mapped.source?.id ? {
        column_id: mapped.source.id,
        link: [{ original_url: SOURCE_CANVAS_URL, display_as_url: false, display_name: '查看原有內容' }],
      } : null,
    ].filter((field): field is Record<string, unknown> => Boolean(field))

    await slackApi('slackLists.items.create', { list_id: listId, initial_fields: fields })
    createdRows += 1
  }

  const listUrl = `https://app.slack.com/client/${TEAM_ID}/unified-files/list/${listId}`
  await slackApi('chat.postMessage', {
    channel: DASHBOARD_CHANNEL_ID,
    text: [
      '🎯 *A2O Objectives & Action Plan 已建立*',
      `明日會議日期：${MEETING_DATE}`,
      `已整理：2個 Objectives、10個 Strategies、KPI、Action Plan 草稿及待分配負責人。`,
      `<${listUrl}|開啟 Objectives & Action Plan List>`,
      `<${SOURCE_CANVAS_URL}|查看原有 A2O Operating System>`,
    ].join('\n'),
  })

  let tabAdded = false
  let tabError = ''
  try {
    await slackApi('bookmarks.add', {
      channel_id: DASHBOARD_CHANNEL_ID,
      title: 'Objectives & Action Plan',
      type: 'link',
      link: listUrl,
      emoji: ':dart:',
    })
    tabAdded = true
  } catch (error) {
    tabError = error instanceof Error ? error.message : 'slack_objectives_tab_failed'
  }

  return { listId, listUrl, createdRows, tabAdded, tabError }
}
