# A2O 廣告新客同步 Runbook

## 目的

Google Sheets 的四個指定工作表是輸入來源；Supabase 的 canonical lead 與
Outbox 是唯一資料來源；Slack Lead Pipeline 是單向同步的展示層。所有狀態、
負責同事及預約更新均先寫入 Supabase，再由 worker 推送 Slack。

## 部署順序

1. 在 Supabase SQL Editor 依次執行：
   - `supabase/migrations/20260809_create_ad_lead_canonical_sync.sql`
   - `supabase/migrations/20260810_harden_ad_lead_sync.sql`
2. Deploy `supabase/functions/ad-lead-sync`，並確認
   `supabase/config.toml` 的 `verify_jwt = false`。這是因為 Apps Script 不是
   Supabase Auth session caller；function 會自行驗證 HMAC、時間戳及 request id。
3. 為 Edge Function 設定 server-only secrets：

   ```text
   SUPABASE_SERVICE_ROLE_KEY
   AD_LEAD_INGEST_HMAC_SECRET
   SLACK_BOT_TOKEN
   SLACK_LEAD_PIPELINE_LIST_ID
   SLACK_LIST_COLUMN_MAP
   SLACK_STATUS_OPTION_MAP
   SLACK_OWNER_USER_MAP
   ```

   `SLACK_LIST_COLUMN_MAP` 必須包含 `phone`，並填入 Slack List 的實際 column
   id。Apps Script 不得保存 Slack token 或 Supabase service-role key。
4. 在同一個 Google Apps Script project 內載入：
   - `integrations/google-apps-script/AdLeadInbox.gs`
   - `integrations/google-apps-script/AdLeadSync.gs`
5. 在 Script Properties 設定：

   ```text
   AD_LEAD_EDGE_FUNCTION_URL=https://<project-ref>.supabase.co/functions/v1/ad-lead-sync
   AD_LEAD_INGEST_HMAC_SECRET=<與 Edge Function 完全相同的 secret>
   ```

6. 以穩定的 A2O Google 帳戶手動執行一次 `installA2OTriggers`，完成首次授權。
   它會建立四個 approved spreadsheet 的 form-submit trigger，以及唯一一個
   `runFiveMinuteSync` time trigger。不要在其他帳戶重複安裝。
7. 確認 Vercel 不再設定 `/api/cron/ad-lead-sync` cron；Vercel 只提供 CRM API/UI，
   不負責同步排程。

## 週期流程

每五分鐘，Apps Script 會：

1. 逐一讀取四個指定工作表。
2. 以 spreadsheet／sheet／row cursor 搭配十行 overlap 讀取，避免漏掉延遲寫入。
3. 以 HMAC 簽署最多 100 行的 request，成功收到 2xx 且 `ok=true` 才推進 cursor。
4. 即使沒有新表單資料，也送出空 rows heartbeat，讓 Supabase drain CRM Outbox。

Edge Function 會先以 `source_key` 做 idempotent import，再取得 database lease，
claim Outbox，逐筆以電話號碼分頁搜尋 Slack List，找到後更新，找不到才建立；
Slack API 失敗會按 backoff 重試，超過上限進入 dead-letter。

## 驗證清單

- 新增四個表單各一筆資料，五分鐘內在 CRM 出現，Slack 出現同一個 Lead。
- 重跑同一個 source row 不會增加第二個 Slack item。
- 同一電話號碼的新提交只保留一個 canonical Lead，並顯示最新提交資料。
- 在 CRM 更新狀態／負責同事／預約後，下一個 heartbeat 會更新原 Slack item。
- 暫停 Slack token 後，Outbox 會顯示 failed 並安排重試；恢復 token 後會自動補發。
- 檢查 Supabase `ad_lead_sync_runs`、`ad_lead_sync_requests` 及
  `slack_sync_outbox` 的狀態，再判斷是否需要人工 requeue dead-letter。

## 故障處理

- Apps Script 顯示 `edge_sync_failed`：檢查 Edge Function URL、HMAC secret、
  function logs；cursor 不會推進，可安全重跑。
- Edge Function 回傳 `slack_not_configured` 或
  `slack_phone_column_not_configured`：補齊 server secrets，然後重新執行 heartbeat。
- 發現 lease 長時間被鎖定：檢查 `ad_lead_sync_leases`；過期 lease 會自動接管，
  不要直接刪除 canonical lead 或 Outbox。
- 發現 dead-letter：先修正 Slack API／欄位設定，再使用受保護的 requeue 流程，
  不要手動重複建立 Slack item。
