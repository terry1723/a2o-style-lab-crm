# Advertising Lead Inbox Design

## Objective

Add a staff-only CRM page named `廣告新客` that combines only the four approved
Google Sheets tabs into one newest-first lead inbox. It lets staff see new ad
submissions and maintain an internal follow-up status and owner without
changing the source forms, existing CRM clients, or staff authentication.

## Approved Sources

| Display source | Spreadsheet ID | Exact tab | Date | Name | Phone | Tag |
| --- | --- | --- | --- | --- | --- | --- |
| Men New Form | `1BGJtbAbJekS_94c6KCVpMTsob8zcZQT0qTO9vPuPUOI` | `men-new form` | `時間戳記` (fallback `created_time`) | `姓名` (fallback `full_name`) | `聯絡電話` (fallback `whatsapp_電話號碼`) | `form_name`, then `ad_name` |
| Style Lab New Form | `1BGJtbAbJekS_94c6KCVpMTsob8zcZQT0qTO9vPuPUOI` | `style lab new form` | `時間戳記` | `你的姓名` | `WhatsApp 聯絡電話` | `第 1 欄` |
| A2O Style Lab | `1q9pwOqwnkwJpPEsjrSJBjWmtbybiLxP5oMNm2yK90zc` | `a2o style lab` | `created_time` | `full_name` | `phone_number` | `form_name`, then `ad_name` |
| A2O Website | `1Xi_u4DYkkMtpl7ClpaxwOyGjU7VAud6d8_uQGmQRHcY` | `a2owebsite` | `提交時間` | `稱呼／姓名` | `WhatsApp` | `UTM來源` |

No other tab in any workbook is read or displayed.

## Architecture

1. A restricted Google Apps Script endpoint reads only the four approved
   spreadsheet IDs and exact tab names using the owner's Google permission.
   It returns a normalized read-only lead list to the CRM server after checking
   a shared server secret. It never writes to the source sheets.
2. A Vercel server endpoint calls that Apps Script endpoint. Browser code never
   receives the Apps Script URL or shared secret.
3. The server merges records, derives a stable `sourceKey` from source,
   spreadsheet row ID/lead ID/session ID, normalizes dates, and sorts newest to
   oldest.
4. Supabase stores the CRM-only overlay for each `sourceKey`: `status`,
   `owner`, `updated_at`. It does not copy the source lead details into the
   existing `clients` table and does not change Google Sheet rows.
5. The staff UI merges the live source list with the Supabase overlay. New
   source keys with no overlay render as `未聯絡` and `Ryan`.

## Staff UI

- Add a `廣告新客` navigation tab beside the existing staff CRM areas.
- Display only: 姓名, 電話號碼, 填表日期, 來源 Form, Tag, 客人狀況, 跟進同事.
- Default sort: newest submitted lead first.
- Status choices: `未聯絡`, `WhatsApp 跟進中`, `已預約`, `已拒絕`.
- Owner choices: `Terry`, `Ryan`, `Martin`, `Caren`, `New`.
- Default for every new lead: status `未聯絡`, owner `Ryan`.
- Status and owner save independently and refresh without changing source lead
  fields. Loading and error states must be visible; failed saves must not claim
  success.

## Data Boundaries and Reliability

- Existing CRM clients, appointments, sales data, staff profiles, and portal
  login remain unchanged.
- Customer phone numbers stay behind the existing staff portal and are never
  embedded in browser configuration, public files, logs, or test fixtures.
- The browser calls only Vercel endpoints. Google authorization and shared
  secrets remain server-side.
- A source failure shows the affected source as unavailable while preserving
  tracking data already saved in Supabase; no source data is invented.
- A missing or malformed source row is excluded rather than producing a
  misleading blank lead.

## Verification

- Unit tests normalize all four header layouts, derive stable source keys, and
  sort by actual submission time.
- API tests reject unauthenticated/invalid requests, do not expose secrets, and
  preserve default status/owner for untracked leads.
- UI tests show only the seven approved columns and verify status/owner changes.
- Test all existing code, lint, and production build before release. Confirm a
  newly added source row appears at the top and a follow-up update persists
  after refresh without changing the original spreadsheet row.
