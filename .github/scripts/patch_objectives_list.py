from pathlib import Path

path = Path('app/api/slack-sync.ts')
text = path.read_text()

import_line = "import { createA2OObjectivesList } from './_lib/slackObjectivesList.js'\n"
anchor_import = "import { syncInitialA2OStockBatch } from './_lib/slackInitialStockBatch.js'\n"
if import_line not in text:
    text = text.replace(anchor_import, anchor_import + import_line)

constant_line = "const OBJECTIVES_LIST_SETUP_KEY = 'slack:objectives-list:2026-08-07-01'\n"
anchor_constant = "const INITIAL_STOCK_BATCH_KEY = 'slack:stock-batch:2026-08-06-01'\n"
if constant_line not in text:
    text = text.replace(anchor_constant, anchor_constant + constant_line)

block = """
    let objectivesListSetup: Awaited<ReturnType<typeof createA2OObjectivesList>> | null = null
    let objectivesListSetupError = ''
    if (!seenEvents.has(OBJECTIVES_LIST_SETUP_KEY)) {
      try {
        objectivesListSetup = await createA2OObjectivesList()
        await markEvents(supabase, [OBJECTIVES_LIST_SETUP_KEY])
        seenEvents.add(OBJECTIVES_LIST_SETUP_KEY)
      } catch (error) {
        objectivesListSetupError = error instanceof Error ? error.message : 'slack_objectives_list_setup_failed'
      }
    }

"""
anchor_block = "    const reminderMinutes = Math.max(5, Number(process.env.SLACK_FOLLOWUP_MINUTES || 15))\n"
if 'let objectivesListSetup:' not in text:
    text = text.replace(anchor_block, block + anchor_block)

# Add response fields to both bootstrap and normal response objects.
marker = "        stockListSetupError,\n"
replacement = "        stockListSetupError,\n        objectivesListSetup,\n        objectivesListSetupError,\n"
if replacement not in text:
    text = text.replace(marker, replacement, 1)

marker2 = "      stockListSetupError,\n      unavailableSources: source.unavailableSources,\n"
replacement2 = "      stockListSetupError,\n      objectivesListSetup,\n      objectivesListSetupError,\n      unavailableSources: source.unavailableSources,\n"
if replacement2 not in text:
    text = text.replace(marker2, replacement2, 1)

path.write_text(text)
