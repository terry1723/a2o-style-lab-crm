from pathlib import Path

path = Path('app/api/slack-sync.ts')
text = path.read_text(encoding='utf-8')

old = """    let stockListSetup: Awaited<ReturnType<typeof ensureA2OStockList>> | null = null
    let stockListSetupError = ''
    try {
      const stockListRow = trackingRows.find((row) => row.source_key === STOCK_LIST_KEY)
      stockListSetup = await ensureA2OStockList(stockListRow?.status || '')
      if (!stockListRow || stockListRow.status !== stockListSetup.listId) {
        const { error } = await supabase.from('ad_lead_tracking').upsert(
          [{ source_key: STOCK_LIST_KEY, status: stockListSetup.listId, owner: 'Inventory' }],
          { onConflict: 'source_key' },
        )
        if (error) throw error
      }
    } catch (error) {
      stockListSetupError = error instanceof Error ? error.message : 'slack_stock_list_setup_failed'
    }

"""

new = """    let stockListSetup: Awaited<ReturnType<typeof ensureA2OStockList>> | null = null
    let stockListSetupError = ''
    try {
      stockListSetup = await ensureA2OStockList()
    } catch (error) {
      stockListSetupError = error instanceof Error ? error.message : 'slack_stock_list_setup_failed'
    }

"""

if old in text:
    text = text.replace(old, new)

text = text.replace("const STOCK_LIST_KEY = 'slack:stock-list:v1'\n", '')
path.write_text(text, encoding='utf-8')
