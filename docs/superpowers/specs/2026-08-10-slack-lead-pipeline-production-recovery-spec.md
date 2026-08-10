# A2O Google Sheet → Supabase → Slack Lead Pipeline Specification

> **Status:** 方案 A 已獲確認；本地程式實作及驗證已完成，正式部署仍需在已登入的
> Supabase、Google Apps Script、Slack 及 Vercel 環境執行 runbook。未完成部署閘門前，
> 不視為正式同步已上線。

## 1. 目標

讓四份廣告來源表格在新增客戶資料後，自動更新 CRM／Supabase，並將同一位客戶同步到 Slack **A2O Lead Pipeline** List。

目標服務水平：

- Google Form 支援的提交事件：完成提交後盡快同步。
- Meta／API／其他程式寫入 Google Sheet 的資料：在下一次成功的五分鐘補漏程序中同步。
- Google Apps Script 的排程可能有少量平台延遲，因此「五分鐘」是目標頻率，不作硬性秒數保證。
- CRM 的客人狀況、負責同事及預約日期時間變更，在下一次成功的五分鐘程序內更新同一個 Slack item。
- 一個已標準化電話號碼只對應一個主要 Lead；不同表格或多次提交全部保留在提交歷史。

## 2. 已確認的現況與根因（2026-08-10）

目前 CRM 網站有最新客戶，但 Slack List 沒有同步，並非 Google Sheet 沒有資料，而是正式環境沒有一條正在運作的同步鏈：

1. 本機有 canonical Lead／Outbox／Slack adapter 的未發佈程式，但相關 commit 尚未推送及部署。
2. 正式 Supabase 只有舊有的 `ad_lead_tracking` 及 `ad_lead_appointments`，尚未建立 canonical Lead、submission history 及 Outbox tables。
3. 原設計依賴 Vercel Cron；正式 Vercel 沒有相關 functions，而且現有方案的排程限制不適合每五分鐘執行。
4. 正式 Vercel 的 `/api/cron/ad-lead-sync` 及 `/api/ad-lead-sync-health` 會回傳前端 `index.html`，證明同步 functions 沒有存在於正式 deployment。
5. 只有 Slack token 並不足以完成同步；仍需要 List ID、欄位 mapping、去重、排隊、重試及排程機制。

因此，新的正式設計不再使用 Vercel 作為五分鐘 scheduler。Vercel 只保留現有網站及 CRM API；同步排程改由 Google Apps Script 負責，資料與同步狀態仍以 Supabase 為唯一資料來源。

## 3. 已選定架構：方案 A

```text
Google Form submission ── installable onFormSubmit trigger ──┐
                                                             │
Four approved Sheet tabs ── five-minute reconciliation ──────┤
                                                             v
                                              Google Apps Script
                                      normalize + cursor + HMAC request
                                                             |
                                                             v
                                                Supabase Edge Function
                                      import RPC + canonical Lead + Outbox
                                                             |
                                                             v
                                                  leased Slack worker
                                                             |
                                                             v
                                               A2O Lead Pipeline List

CRM status / owner / appointment RPC
                   |
                   v
        canonical Lead + same Outbox
                   |
                   └── processed by next Apps Script run ──> same Slack item
```

### 3.1 資料權責

- **Supabase 是唯一資料來源。**
- Google Sheets 是廣告 lead 的輸入來源，不是 CRM 狀態的主資料庫。
- Slack 是單向工作視圖，不會反向覆寫 Supabase／CRM。
- Vercel 不再負責排程、Outbox worker 或同步重試。

### 3.2 四個核准來源

| 顯示來源 | Spreadsheet ID | Sheet tab |
|---|---|---|
| Men New Form | `1BGJtbAbJekS_94c6KCVpMTsob8zcZQT0qTO9vPuPUOI` | `men-new form` |
| Style Lab New Form | `1BGJtbAbJekS_94c6KCVpMTsob8zcZQT0qTO9vPuPUOI` | `style lab new form` |
| A2O Style Lab | `1q9pwOqwnkwJpPEsjrSJBjWmtbybiLxP5oMNm2yK90zc` | `a2o style lab` |
| A2O Website | `1Xi_u4DYkkMtpl7ClpaxwOyGjU7VAud6d8_uQGmQRHcY` | `a2owebsite` |

現有 `AdLeadInbox.gs` 的多語／多格式 header mapping 及 Meta lead row normalization 應予保留，不應重新假設所有表格擁有相同欄位順序。

## 4. Google Apps Script 規格

### 4.1 兩種 Trigger

1. **Installable form-submit trigger**
   - 適用於由 Google Form 正常提交到 Sheet 的來源。
   - 收到事件後只處理該次新增 row，然後呼叫 Supabase Edge Function。
   - 成功 import 後，Edge Function 同一 request 會嘗試處理一小批 Outbox，達到接近即時的 Slack 更新。

2. **Installable time-driven trigger：每五分鐘**
   - 每次掃描全部四個核准 tab 的未處理範圍。
   - 必須保留，因為 API、Meta connector 或 script 寫入 Sheet 時，不保證會觸發 form-submit trigger。
   - 即使沒有新 Sheet row，也必須呼叫 Edge Function 一次，以處理 CRM 狀態／負責同事／預約更新所產生的 Outbox。

Google Apps Script 官方文件確認 installable form-submit 與 time-driven triggers 可用，而 `everyMinutes(n)` 支援 1、5、10、15、30 分鐘。程式或 API 寫入不一定觸發 installable form-submit，因此五分鐘補漏程序是必要部分。

### 4.2 增量掃描與 Cursor

- Script Properties 為每一個 `spreadsheetId + sheetName` 保存：
  - 最後成功處理 row number；
  - 最後成功時間；
  - 最近一次 request ID；
  - 最近一次錯誤摘要（不含客戶資料）。
- 每次掃描重新讀取最後成功 row 之前至少 10 rows，形成 overlap window。
- Supabase submission 使用穩定 `source_key = spreadsheetId:sheetName:rowNumber` 去重，因此 overlap 重讀不會重複建立 submission。
- Cursor 只可在 Supabase 回覆整個 batch 已接受後前移。
- request 失敗、逾時或回覆格式錯誤時，不可前移 Cursor；下一次 Trigger 會重試相同範圍。
- 初次部署及災難復原提供受控 `reconcileAllSources()`，分批回補舊資料，不應在一般五分鐘 run 每次全表重讀。

### 4.3 並行與執行時間

- 每個 handler 先取得 `LockService.getScriptLock()`；未能在短時間取得 lock 時結束，交由下一次五分鐘 run 補回。
- 每次送往 Edge Function 的 batch 上限 100 rows；超出時分批處理。
- 每次 run 設定明確時間預算，預留時間儲存 Cursor 及結束，不應等待至 Apps Script 強制終止。
- Apps Script 回應與 Execution log 只記錄來源、row 數量、成功／失敗數量及 request ID；不得記錄姓名或完整電話。

### 4.4 Apps Script 持有的 Secrets

Script Properties 只保存：

```text
AD_LEAD_EDGE_FUNCTION_URL
AD_LEAD_INGEST_HMAC_SECRET
```

Apps Script **不得**保存 Slack bot token、Supabase secret key 或 service-role key。

## 5. Supabase Edge Function 規格

建立一個對 Apps Script 開放的 `ad-lead-sync` Edge Function。它在一個 request 中完成：驗證 → import → enqueue → drain Outbox。

### 5.1 Request contract

```json
{
  "requestId": "uuid",
  "sentAt": "ISO-8601 UTC",
  "trigger": "form_submit | five_minute | manual_reconcile",
  "rows": [
    {
      "sourceKey": "spreadsheetId:sheetName:rowNumber",
      "sourceForm": "Men New Form",
      "submittedAt": "ISO-8601",
      "name": "string",
      "phone": "string",
      "tag": "string"
    }
  ]
}
```

Headers：

```text
X-A2O-Request-Id: <same requestId>
X-A2O-Timestamp: <unix timestamp>
X-A2O-Signature: sha256=<HMAC of timestamp + "\n" + requestId + "\n" + raw body>
Content-Type: application/json
```

### 5.2 驗證

- Function 由外部 Apps Script 呼叫，因此設定 `verify_jwt = false`，並在 handler 內自行驗證 HMAC；不能以「關閉 JWT」代替認證。
- HMAC secret 只存於 Supabase Function Secrets 及 Apps Script Properties。
- 拒絕 timestamp 超出 5 分鐘、request ID 重播、signature 不符、未知來源、超過 batch 上限或格式不合要求的 request。
- 所有資料庫寫入由 Edge Function 的 server-side secret client 執行；secret key 不傳給 Apps Script 或瀏覽器。
- 回覆只包含 aggregate counts、request ID 及錯誤代碼，不回傳 customer rows。

### 5.3 Import 與 canonical Lead

在單一資料庫 transaction／RPC 內：

1. 以 `source_key` idempotently upsert `ad_lead_submissions`，保留每次提交。
2. 將電話標準化為香港可比對格式；一個 normalized phone 對應一個 `ad_leads` primary row。
3. 較新的有效 submission 更新 Lead 的最新姓名、來源、tag 及提交時間。
4. 每個 Lead 的 `version` 在可同步欄位變更時增加。
5. 建立或合併一個 `slack_sync_outbox` pending row，使同一 Lead 的未處理變更合併到最新 target version。
6. 電話無法標準化的 submission 必須保留，並建立 `ad_lead_review_queue`／`needs_review` 記錄，不可靜默遺失。

### 5.4 Outbox worker

- Import 完成後，Function 透過資料庫 RPC claim 一個有期限的 worker lease，再處理有限批次（建議 25 rows）。
- 五分鐘 request 即使 `rows=[]`，仍會 drain pending／retryable Outbox，確保 CRM 的狀態、owner 及 appointment 變更可同步。
- 禁止任何「直接呼叫 Slack 後只寫 item ID」的旁路；即時路徑與補漏路徑必須使用同一個 leased Outbox worker。
- claim 回傳唯一 `locked_by` token。完成或失敗 RPC 必須同時比對 outbox ID、`locked_by`、processing 狀態及 expected target version；過期 worker 不可完成新 worker 的 lease。
- worker 載入 claim 後的最新 canonical snapshot，Slack 成功後以實際已送出的 snapshot version 記錄 `slack_last_synced_version`。
- 若處理期間 Lead 又更新，完成舊 version 後必須保留／建立下一個 pending target；不可把較新變更誤標為已同步。
- Slack `Retry-After`、429、5xx 及網絡錯誤使用 exponential backoff；達上限後成為 dead-letter，保留 sanitized error code。
- 提供受保護的 Supabase admin retry 操作；不可提供公開 browser endpoint。

## 6. Slack List 寫入規格

Slack Edge Function Secrets：

```text
SLACK_BOT_TOKEN
SLACK_LEAD_PIPELINE_LIST_ID
SLACK_LIST_COLUMN_MAP
SLACK_STATUS_OPTION_MAP
SLACK_OWNER_USER_MAP
AD_LEAD_INGEST_HMAC_SECRET
```

Slack app 需要 `lists:read` 及 `lists:write`，並可存取指定 List。

### 6.1 欄位 mapping

```json
{
  "lead": "<column-id>",
  "status": "<column-id>",
  "owner": "<column-id>",
  "phone": "<column-id>",
  "whatsapp": "<column-id>",
  "sourceForm": "<column-id>",
  "tag": "<column-id>",
  "latestSubmittedAt": "<column-id>",
  "appointmentAt": "<column-id>",
  "nextStep": "<column-id>"
}
```

- 預約欄必須包含香港日期與時間，不能只寫日期。
- 如果 canonical Lead 已有 `slack_list_item_id`，直接 update 該 item。
- 沒有 item ID 時，以 normalized phone 查找現有 item；找到便保存其 item ID 並 update，找不到才 create。
- Slack List pagination 必須讀取 `response_metadata.next_cursor`，循環至 cursor 為空；不可只查首 100 items。
- 同一 normalized phone 永遠只可 create 一個主要 Slack item。

## 7. CRM 寫入與預約一致性

- CRM status、owner、appointment RPC 更新 canonical `ad_leads` 後，必須同一 transaction enqueue／coalesce Outbox。
- 預約顯示以 canonical `appointment_at` 為準，並投影到該 Lead 最新可見 source key；不可因同一電話再次提交便失去原有預約。
- 舊 `ad_lead_appointments` slot 需要一次性 reconciliation，避免同一 canonical Lead 因 source key 轉變而重複預約。
- 既有 `book_ad_lead_appointment` 的 security semantics 不可意外降低。若保留 `SECURITY DEFINER`，必須使用 hardened `search_path` 及明確 execute grants。
- Slack 不可反向改動 CRM 狀態或預約。

## 8. Health、監察與私隱

建立受保護的 Supabase admin health 查詢，顯示：

- 上一次 Apps Script run 時間及狀態；
- 四個來源各自最後成功時間、cursor 及成功／失敗狀態；
- pending、processing、failed、dead-letter counts；
- oldest pending age；
- 最近一次 Slack 成功時間。

Health 不可公開。現有只靠 client-side page password 的頁面不視為 server authentication。未有正式 staff server session 前，health 只可由 Supabase Dashboard／受保護 admin tool 查看。

Logs 不得包含姓名、完整電話、raw Sheet row、HMAC secret、Supabase secret key、Slack token 或 Slack column IDs。

## 9. 部署與切換次序

### Phase A — 整理及 review 程式

1. 以本規格取代 Vercel Cron 方案。
2. 修正現有 implementation 的已知 race、Slack pagination、appointment projection、lease ownership 及 version accounting 問題。
3. 保留所有與此功能無關的 CRM、PDF、產品圖片及 report generator 變更，不混入同步 release。

### Phase B — Supabase migration

1. Review 並以 additive migration 建立：
   - `ad_leads`
   - `ad_lead_submissions`
   - `slack_sync_outbox`
   - `ad_lead_sync_runs`
   - `ad_lead_sync_leases`
   - `ad_lead_review_queue`
2. 啟用 RLS，並限制 internal RPC／tables 只可由 server-side secret role 使用。
3. 執行 Supabase security 及 performance advisors。
4. 先保持 CRM legacy read mode，直至 backfill 驗證完成。

### Phase C — Edge Function

1. 部署 `ad-lead-sync`，設定 `verify_jwt = false` 及 handler HMAC verification。
2. 設定 Slack 及 HMAC secrets；不得放入 Git 或 Vercel public env。
3. 先用 signed dry-run／synthetic payload 驗證 unauthorized、replay、bad signature、empty worker run 及 Slack preflight。

### Phase D — Apps Script

1. 在現有 Apps Script 專案更新 normalization、cursor、HMAC client 及 reconciliation handlers。
2. 以穩定的 A2O Google account 安裝：
   - 可用來源的 form-submit triggers；
   - 一個 `everyMinutes(5)` time-driven trigger。
3. 先執行一次受控全量 backfill；之後只用 incremental cursor。
4. Apps Script Executions 必須顯示成功，四個來源均有獨立狀態。

### Phase E — canonical cutover

1. 比較 legacy lead count、canonical primary lead count、submission count 及抽樣電話去重結果。
2. 連續重跑 reconciliation 兩次，Slack item 不可增加重複紀錄。
3. 將 CRM lead reader／writer 切換至 canonical mode。
4. 停用並移除 Vercel 五分鐘 Cron 設定，避免雙 worker；網站仍由 Vercel 正常提供。

## 10. 驗收測試

正式完成必須通過以下測試：

1. **Google Form 即時路徑：**新增 synthetic lead，Supabase、CRM 及 Slack 接近即時更新。
2. **五分鐘補漏：**直接／程式寫入一個 synthetic Sheet row，不依賴 form trigger，下一次成功的 reconciliation 能補回。
3. **四個來源：**四個指定 tab 各新增一個 synthetic row，來源及 tag 正確。
4. **電話去重：**同一電話以不同格式及不同 form 再提交，只增加 submission history，不新增 primary Lead 或 Slack item。
5. **Slack 深頁查找：**matching phone 位於第 100 item 之後仍能找到；測試使用 `response_metadata.next_cursor`。
6. **Cursor recovery：**模擬 Edge Function 失敗，Cursor 不前移；下一次 run 重送並成功，沒有重複 submission。
7. **並行：**form-submit 與 time trigger 同時執行，最後只有一個 Slack item，沒有兩個 worker 同時完成同一 lease。
8. **CRM status：**`未聯絡` 改為 `WhatsApp 跟進中`，下一次五分鐘 run 更新同一 Slack item。
9. **CRM owner：**Terry、Ryan、Martin、Caren、New mappings 正確。
10. **Appointment：**Slack 顯示香港日期及時間；同電話再次提交不會失去或重複預約。
11. **Retry：**模擬 Slack 429／5xx，遵守 backoff，恢復後完成同一 Outbox item。
12. **Dead-letter：**永久 mapping 錯誤會成為 dead-letter，sanitized error 可在受保護 admin flow 重排。
13. **Empty sweep：**沒有新 Sheet row，但有 CRM Outbox 時，五分鐘 run 仍可更新 Slack。
14. **私隱：**Apps Script、Supabase 及 Slack sync logs 均沒有完整電話、姓名或 secrets。
15. **重跑安全：**同一批資料連續執行三次，Lead、submission 及 Slack item counts 保持 idempotent。

## 11. Rollback

如果 canonical cutover 失敗：

1. CRM reader／writer 切回 legacy mode。
2. 暫停 Apps Script 五分鐘及 form-submit triggers，防止錯誤 Slack 寫入繼續發生。
3. 保留 canonical tables、submissions、Outbox 及 run logs作診斷；不得 truncate 或刪除舊 CRM records。
4. 修正後先以 synthetic payload 及受控 reconciliation 驗證，再重新啟用 triggers。

## 12. Definition of done

只有以下全部成立，才可稱為完成：

- 正式 Supabase 已有 canonical、submission history、Outbox、lease 及 review queue。
- Edge Function 已部署並通過 HMAC、replay、batch、lease、retry 及 privacy tests。
- Apps Script form-submit triggers 及五分鐘 trigger 均由穩定 A2O account 安裝及成功執行。
- 四個來源均通過 incremental 及 backfill 測試。
- CRM status／owner／appointment 能在沒有新 Sheet row 時同步到同一 Slack item。
- Slack pagination、電話去重及 race-condition 測試通過。
- Vercel 不再承擔五分鐘排程，亦不存在第二個同時運作的 sync worker。
- 所有 15 項正式 acceptance tests 通過，CRM、Supabase、Google Sheets及 Slack 對同一 synthetic Lead 顯示一致結果。

## 13. 參考文件

- [Google Apps Script installable triggers](https://developers.google.com/apps-script/guides/triggers/installable)
- [Google Apps Script trigger restrictions](https://developers.google.com/apps-script/guides/triggers/)
- [Google Apps Script ClockTriggerBuilder](https://developers.google.com/apps-script/reference/script/clock-trigger-builder)
- [Supabase Edge Function authorization headers](https://supabase.com/docs/guides/functions/auth-headers)
- [Supabase API key security](https://supabase.com/docs/guides/getting-started/api-keys)
- [Slack Lists API](https://docs.slack.dev/reference/methods/slackLists.items.list/)
