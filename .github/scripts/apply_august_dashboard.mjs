const token = process.env.SECRET_SLACK_BOT_TOKEN || process.env.VAR_SLACK_BOT_TOKEN
if (!token) throw new Error('SLACK_BOT_TOKEN is not available in GitHub Actions')

const DASHBOARD_CHANNEL_ID = 'C0BN9NM39BP'
const TEAM_ID = 'T0BNB4ARK2S'
const WEEKLY_LIST_ID = 'F0BNCV037M3'
const WEEKLY_PERIOD = '2026/08/10–2026/08/17'

const rows = [
  ['Objective 1｜Customer Growth', 'More Video', '2組 Before / After；5條 Video', '安排拍攝、剪片及發布時間表', '8組 Before / After；20條 Video'],
  ['Objective 1｜Customer Growth', 'B2B Partner Network', '推進1間正式 Partner', '完成名單、聯絡、拜訪及轉介方案', '4間正式 Partner'],
  ['Objective 1｜Customer Growth', 'Website Conversion', '取得3個 Website Leads', '優化診斷、案例頁及預約 CTA', '10個 Website Leads'],
  ['Objective 1｜Customer Growth', 'Old Lead Reactivation', '重新接觸10個舊 Lead', '分批 WhatsApp 跟進並記錄結果', '重新接觸40個舊 Lead'],
  ['Objective 1｜Customer Growth', 'Ad Optimisation', 'Budget HK$1,750；CPL ≤ HK$150', '檢查 CPL、素材及 Lead 質素', 'Budget HK$7,000；CPL ≤ HK$150'],
  ['Objective 1｜Customer Growth', 'Response System', '平均首次回覆 ≤15分鐘', '落實值班、交更、回覆模板及 Close Check', '平均首次回覆 ≤15分鐘'],
  ['Objective 2｜Customer Retention', '30-Day Follow-up', '完成5位客人 30日跟進', '整理客戶池並設定跟進日期', '完成20位客人 30日跟進'],
  ['Objective 2｜Customer Retention', 'Clothing Follow-up', '5位返店；5套；HK$4,900', '建立尺碼及服裝建議並邀請返店', '20位返店；20套；HK$19,600'],
  ['Objective 2｜Customer Retention', 'Maintenance Plan', '完成服務內容、週期及價格草案', '完成維護方案及首批邀請名單', '完成 Maintenance Plan 方案及首批邀請名單'],
  ['Objective 2｜Customer Retention', 'Membership', '完成會員權益、價格及續會草案', '完成會員方案及首批邀請名單', '完成 Membership 方案及首批邀請名單'],
]

async function slack(method, body) {
  const response = await fetch(`https://slack.com/api/${method}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(body),
  })
  const payload = await response.json()
  if (!response.ok || !payload.ok) throw new Error(`${method}: ${payload.error || response.status}`)
  return payload
}

function richText(value) {
  return [{ type: 'rich_text', elements: [{ type: 'rich_text_section', elements: [{ type: 'text', text: value }] }] }]
}

function normalize(value) {
  return String(value || '').trim().toLowerCase().replace(/[\s／/|｜_-]+/g, '')
}

function collectText(value) {
  if (typeof value === 'string') {
    try { return collectText(JSON.parse(value)) } catch { return [value] }
  }
  if (typeof value === 'number' || typeof value === 'boolean') return [String(value)]
  if (Array.isArray(value)) return value.flatMap(collectText)
  if (!value || typeof value !== 'object') return []
  const direct = ['text', 'label', 'value', 'original_url', 'display_name']
    .flatMap((key) => key in value ? collectText(value[key]) : [])
  return direct.length ? direct : Object.values(value).flatMap(collectText)
}

function fieldText(item, column) {
  if (!column?.id) return ''
  const field = (item.fields || []).find((entry) => entry.column_id === column.id || entry.key === column.key)
  if (!field) return ''
  if (field.text) return field.text
  return collectText(field.rich_text ?? field.value).join(' ').trim()
}

async function listAllItems(listId) {
  const items = []
  let cursor = ''
  do {
    const payload = await slack('slackLists.items.list', { list_id: listId, limit: 100, ...(cursor ? { cursor } : {}) })
    items.push(...(payload.items || []))
    cursor = payload.response_metadata?.next_cursor || ''
  } while (cursor)
  return items
}

async function loadSchema(listId, items = []) {
  const firstId = items.find((item) => item.id)?.id
  if (firstId) {
    const info = await slack('slackLists.items.info', { list_id: listId, id: firstId })
    const schema = info.list?.list_metadata?.schema || []
    if (schema.length) return schema
  }
  const placeholder = await slack('slackLists.items.create', { list_id: listId })
  try {
    const info = await slack('slackLists.items.info', { list_id: listId, id: placeholder.item.id })
    return info.list?.list_metadata?.schema || []
  } finally {
    await slack('slackLists.items.delete', { list_id: listId, id: placeholder.item.id })
  }
}

function findColumn(schema, name) {
  const target = normalize(name)
  return schema.find((column) => [column.name, column.key].some((value) => normalize(value) === target))
}

async function updateWeekly() {
  await slack('slackLists.update', {
    id: WEEKLY_LIST_ID,
    name: '2026年8月 Objective Dashboard｜8/10–8/17',
    description_blocks: richText(`每週 Objective Dashboard｜統計期間：${WEEKLY_PERIOD}`),
  })
  const items = await listAllItems(WEEKLY_LIST_ID)
  const schema = await loadSchema(WEEKLY_LIST_ID, items)
  const objective = findColumn(schema, 'Objective')
  const strategy = findColumn(schema, 'Strategy')
  const dashboard = findColumn(schema, 'Dashboard')
  const actionPlan = findColumn(schema, 'Action Plan')
  if (![objective, strategy, dashboard, actionPlan].every((column) => column?.id)) throw new Error('weekly columns missing')

  const byStrategy = new Map(items.map((item) => [normalize(fieldText(item, strategy)), item]))
  let updated = 0
  for (const [objectiveValue, strategyValue, dashboardValue, actionValue] of rows) {
    const item = byStrategy.get(normalize(strategyValue))
    if (!item?.id) continue
    await slack('slackLists.items.update', {
      list_id: WEEKLY_LIST_ID,
      cells: [
        { row_id: item.id, column_id: objective.id, rich_text: richText(objectiveValue) },
        { row_id: item.id, column_id: strategy.id, rich_text: richText(strategyValue) },
        { row_id: item.id, column_id: dashboard.id, rich_text: richText(dashboardValue) },
        { row_id: item.id, column_id: actionPlan.id, rich_text: richText(actionValue) },
      ],
    })
    updated += 1
  }
  return { updated, url: `https://app.slack.com/client/${TEAM_ID}/unified-files/list/${WEEKLY_LIST_ID}` }
}

async function createKpi() {
  const created = await slack('slackLists.create', {
    name: '2026年8月 KPI',
    description_blocks: richText('A2O 2026年8月每月 KPI。'),
    schema: [
      { key: 'objective', name: 'Objective', type: 'text', is_primary_column: true },
      { key: 'strategy', name: 'Strategy', type: 'text' },
      { key: 'kpi', name: 'KPI', type: 'text' },
      { key: 'target', name: '2026年8月目標', type: 'text' },
    ],
    todo_mode: false,
  })
  const listId = created.list_id
  await slack('slackLists.access.set', { list_id: listId, access_level: 'write', channel_ids: [DASHBOARD_CHANNEL_ID] })
  const schema = await loadSchema(listId)
  const objective = findColumn(schema, 'Objective')
  const strategy = findColumn(schema, 'Strategy')
  const kpi = findColumn(schema, 'KPI')
  const target = findColumn(schema, '2026年8月目標')
  if (![objective, strategy, kpi, target].every((column) => column?.id)) throw new Error('KPI columns missing')

  for (const [objectiveValue, strategyValue, , , monthlyKpi] of rows) {
    await slack('slackLists.items.create', {
      list_id: listId,
      initial_fields: [
        { column_id: objective.id, rich_text: richText(objectiveValue) },
        { column_id: strategy.id, rich_text: richText(strategyValue) },
        { column_id: kpi.id, rich_text: richText(monthlyKpi) },
        { column_id: target.id, rich_text: richText(monthlyKpi) },
      ],
    })
  }

  const url = `https://app.slack.com/client/${TEAM_ID}/unified-files/list/${listId}`
  await slack('bookmarks.add', { channel_id: DASHBOARD_CHANNEL_ID, title: '2026年8月 KPI', type: 'link', link: url, emoji: ':dart:' })
  return { listId, url }
}

const weekly = await updateWeekly()
const kpi = await createKpi()
await slack('chat.postMessage', {
  channel: DASHBOARD_CHANNEL_ID,
  text: [`📊 *2026年8月 Dashboard & KPI 已更新*`, `Weekly：${WEEKLY_PERIOD}`, `<${weekly.url}|開啟 Weekly Objective Dashboard>`, `<${kpi.url}|開啟 2026年8月 KPI>`].join('\n'),
})
console.log(JSON.stringify({ weekly, kpi }))
