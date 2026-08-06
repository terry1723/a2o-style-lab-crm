from pathlib import Path

path = Path('app/api/slack-sync.ts')
text = path.read_text(encoding='utf-8')

import_line = "import { ensureA2OStockList } from './_lib/slackStockList.js'\n"
if import_line not in text:
    anchor = "import { syncA2OLeadList } from './_lib/slackLeadList.js'\n"
    text = text.replace(anchor, anchor + import_line)

if "const STOCK_LIST_KEY = 'slack:stock-list:v1'" not in text:
    text = text.replace(
        "const BOOTSTRAP_KEY = 'slack:bootstrap:v2'\n",
        "const BOOTSTRAP_KEY = 'slack:bootstrap:v2'\nconst STOCK_LIST_KEY = 'slack:stock-list:v1'\n",
    )

setup_block = """    let stockListSetup: Awaited<ReturnType<typeof ensureA2OStockList>> | null = null
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

if 'let stockListSetup:' not in text:
    anchor = "    const clients = (clientsResult.data || []) as ClientRow[]\n\n"
    text = text.replace(anchor, anchor + setup_block)

# Add stock setup details to bootstrap response.
bootstrap_anchor = "        leadListSync,\n        leadListSyncError,\n"
bootstrap_replacement = "        leadListSync,\n        leadListSyncError,\n        stockListSetup,\n        stockListSetupError,\n"
if bootstrap_replacement not in text:
    text = text.replace(bootstrap_anchor, bootstrap_replacement, 1)

# Add stock setup details to the normal response.
normal_anchor = "      leadListSync,\n      leadListSyncError,\n      unavailableSources: source.unavailableSources,\n"
normal_replacement = "      leadListSync,\n      leadListSyncError,\n      stockListSetup,\n      stockListSetupError,\n      unavailableSources: source.unavailableSources,\n"
if normal_replacement not in text:
    text = text.replace(normal_anchor, normal_replacement, 1)

path.write_text(text, encoding='utf-8')
