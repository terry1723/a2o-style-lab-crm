from pathlib import Path

path = Path('app/api/slack-sync.ts')
text = path.read_text(encoding='utf-8')

import_line = "import { syncInitialA2OStockBatch } from './_lib/slackInitialStockBatch.js'\n"
if import_line not in text:
    anchor = "import { ensureA2OStockList } from './_lib/slackStockList.js'\n"
    if anchor not in text:
        raise SystemExit('stock list import anchor missing')
    text = text.replace(anchor, anchor + import_line, 1)

const_line = "const INITIAL_STOCK_BATCH_KEY = 'slack:stock-batch:2026-08-06-01'\n"
if const_line not in text:
    anchor = "const BOOTSTRAP_KEY = 'slack:bootstrap:v2'\n"
    if anchor not in text:
        raise SystemExit('bootstrap key anchor missing')
    text = text.replace(anchor, anchor + const_line, 1)

block = """
    let stockBatchSync: Awaited<ReturnType<typeof syncInitialA2OStockBatch>> | null = null
    let stockBatchSyncError = ''
    if (!seenEvents.has(INITIAL_STOCK_BATCH_KEY)) {
      try {
        stockBatchSync = await syncInitialA2OStockBatch()
        await markEvents(supabase, [INITIAL_STOCK_BATCH_KEY])
        seenEvents.add(INITIAL_STOCK_BATCH_KEY)
      } catch (error) {
        stockBatchSyncError = error instanceof Error ? error.message : 'slack_initial_stock_batch_failed'
      }
    }

"""
if 'let stockBatchSync:' not in text:
    anchor = """    let leadListSync: Awaited<ReturnType<typeof syncA2OLeadList>> | null = null
    let leadListSyncError = ''
    try {
      leadListSync = await syncA2OLeadList(leads)
    } catch (error) {
      leadListSyncError = error instanceof Error ? error.message : 'slack_list_sync_failed'
    }

"""
    if anchor not in text:
        raise SystemExit('lead list sync anchor missing')
    text = text.replace(anchor, anchor + block, 1)

response_anchor = "        leadListSyncError,\n"
response_replacement = "        leadListSyncError,\n        stockBatchSync,\n        stockBatchSyncError,\n"
text = text.replace(response_anchor, response_replacement)

final_anchor = "      leadListSyncError,\n"
final_replacement = "      leadListSyncError,\n      stockBatchSync,\n      stockBatchSyncError,\n"
text = text.replace(final_anchor, final_replacement)

path.write_text(text, encoding='utf-8')
