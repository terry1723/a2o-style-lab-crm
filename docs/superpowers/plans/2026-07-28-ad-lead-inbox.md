# Advertising Lead Inbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a staff-only inbox that merges the four approved advertising lead tabs and saves follow-up status/owner separately from source Sheets.

**Architecture:** Apps Script reads only the four whitelisted tabs; Vercel proxies normalized rows; Supabase stores a tracking overlay keyed by source ID. The React portal renders the merged list and updates only that overlay.

**Tech Stack:** React, TypeScript, Vitest, Vercel Functions, Supabase, Google Apps Script.

---

### Task 1: Normalize lead records

**Files:**
- Create: `app/src/features/ad-leads/adLeadService.ts`
- Create: `app/src/features/ad-leads/adLeadService.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it('sorts the newest valid source lead first and supplies tracking defaults', () => {
  const leads = normalizeAdLeads([{ source: 'a2owebsite', id: 's1', submittedAt: '2026-07-20T09:00:00+08:00', name: 'A', phone: '90000000', tag: 'ig' }, { source: 'men-new-form', id: 'l1', submittedAt: '2026-07-21T09:00:00+08:00', name: 'B', phone: '91111111', tag: 'A2O MENS' }])
  expect(leads.map((lead) => lead.name)).toEqual(['B', 'A'])
  expect(leads[0]).toMatchObject({ status: '未聯絡', owner: 'Ryan' })
})
```

- [ ] **Step 2: Verify RED**

Run: `cd app && npm test -- --run src/features/ad-leads/adLeadService.test.ts`

Expected: FAIL because `normalizeAdLeads` does not exist.

- [ ] **Step 3: Implement the minimum contract**

```ts
export const AD_LEAD_STATUSES = ['未聯絡', 'WhatsApp 跟進中', '已預約', '已拒絕'] as const
export const AD_LEAD_OWNERS = ['Terry', 'Ryan', 'Martin', 'Caren', 'New'] as const
export const sourceKey = (source: string, id: string) => `${source}:${id}`
export function normalizeAdLeads(rows: AdLeadSourceRow[], tracking: Record<string, AdLeadTracking> = {}) {
  return rows.filter((row) => row.id && row.name && row.phone && row.submittedAt).map((row) => ({ ...row, sourceKey: sourceKey(row.source, row.id), status: tracking[sourceKey(row.source, row.id)]?.status ?? '未聯絡', owner: tracking[sourceKey(row.source, row.id)]?.owner ?? 'Ryan' })).sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt))
}
```

- [ ] **Step 4: Verify GREEN and commit**

Run: `cd app && npm test -- --run src/features/ad-leads/adLeadService.test.ts`

Expected: PASS.

Commit: `git add app/src/features/ad-leads && git commit -m "feat: define advertising lead contracts"`

### Task 2: Add read-only Google Apps Script aggregation

**Files:**
- Create: `app/integrations/google-apps-script/AdLeadInbox.gs`
- Create: `app/integrations/google-apps-script/AdLeadInbox.test.ts`

- [ ] **Step 1: Write the failing source contract test**

```ts
expect(source).toContain("'men-new form'")
expect(source).toContain("'style lab new form'")
expect(source).toContain("'a2o style lab'")
expect(source).toContain("'a2owebsite'")
expect(source).toContain('function doGet(event)')
expect(source).not.toContain('.appendRow(')
```

- [ ] **Step 2: Verify RED**

Run: `cd app && npm test -- --run integrations/google-apps-script/AdLeadInbox.test.ts`

Expected: FAIL because the source file does not exist.

- [ ] **Step 3: Implement the minimum secure reader**

`doGet(event)` must validate `AD_LEAD_READ_SECRET`; read exactly the four IDs/tab names from the spec; map each header layout to `{ source, id, submittedAt, name, phone, tag }`; omit incomplete rows; return JSON only; never use `appendRow`, `setValue`, or another write API.

- [ ] **Step 4: Verify GREEN, configure and commit**

Run: `cd app && npm test -- --run integrations/google-apps-script/AdLeadInbox.test.ts`

Expected: PASS.

Deploy this script as a private Web App and set `AD_LEAD_READ_SECRET`; set matching Vercel `AD_LEAD_APPS_SCRIPT_URL` and `AD_LEAD_READ_SECRET` variables. Commit: `git add app/integrations/google-apps-script && git commit -m "feat: add read-only advertising lead source"`.

### Task 3: Store only follow-up overlays in Supabase

**Files:**
- Create: `app/supabase/migrations/20260728_create_ad_lead_tracking.sql`
- Create: `app/api/_lib/adLeadTracking.ts`
- Create: `app/api/ad-leads.ts`
- Create: `app/api/ad-lead-tracking.ts`
- Create: `app/api/ad-leads.test.ts`

- [ ] **Step 1: Write the failing endpoint test**

```ts
await trackingHandler({ method: 'PATCH', body: { sourceKey: 'a2owebsite:s1', status: '已預約', owner: 'Martin' } }, response)
expect(response.statusCode).toBe(200)
expect(upsert).toHaveBeenCalledWith({ source_key: 'a2owebsite:s1', status: '已預約', owner: 'Martin' })
```

- [ ] **Step 2: Verify RED**

Run: `cd app && npm test -- --run api/ad-leads.test.ts`

Expected: FAIL because the tracking API does not exist.

- [ ] **Step 3: Implement schema and handlers**

```sql
create table public.ad_lead_tracking (
  source_key text primary key,
  status text not null check (status in ('未聯絡','WhatsApp 跟進中','已預約','已拒絕')),
  owner text not null check (owner in ('Terry','Ryan','Martin','Caren','New')),
  updated_at timestamptz not null default now()
);
alter table public.ad_lead_tracking enable row level security;
```

`GET /api/ad-leads` calls Apps Script server-to-server, loads the overlay with `createSupabaseAdmin`, normalizes and sorts. `PATCH /api/ad-lead-tracking` validates source key/status/owner and upserts only this table. Both set `Cache-Control: no-store`; neither touches `clients` or Sheets.

- [ ] **Step 4: Verify GREEN, migrate and commit**

Run: `cd app && npm test -- --run api/ad-leads.test.ts`

Expected: PASS.

Apply the migration in Supabase SQL Editor; compare existing `clients` row count before/after. Commit: `git add app/api app/supabase/migrations && git commit -m "feat: store advertising lead tracking"`.

### Task 4: Add the portal page

**Files:**
- Create: `app/src/pages/PortalAdLeads.tsx`
- Create: `app/src/pages/PortalAdLeads.test.tsx`
- Modify: `app/src/App.tsx`
- Modify: `app/src/pages/PortalStaff.tsx`
- Modify: `app/src/pages/PortalPhotos.tsx`

- [ ] **Step 1: Write the failing UI test**

```tsx
expect(await screen.findByText('廣告新客')).toBeInTheDocument()
expect(screen.getByText('來源 Form')).toBeInTheDocument()
expect(screen.getByText('Tag')).toBeInTheDocument()
await user.selectOptions(screen.getByLabelText('客人狀況'), '已預約')
expect(fetchMock).toHaveBeenCalledWith('/api/ad-lead-tracking', expect.objectContaining({ method: 'PATCH' }))
```

- [ ] **Step 2: Verify RED**

Run: `cd app && npm test -- --run src/pages/PortalAdLeads.test.tsx`

Expected: FAIL because the page and route do not exist.

- [ ] **Step 3: Implement page and navigation**

Require `a2o_staff_auth_v2`, fetch `/api/ad-leads`, and render exactly 姓名、電話號碼、填表日期、來源 Form、Tag、客人狀況、跟進同事. Add status/owner selects; save only after a successful PATCH and visibly retain an error if it fails. Add a `廣告新客` link in the staff navigation and route `/portal/ad-leads`.

- [ ] **Step 4: Verify GREEN and commit**

Run: `cd app && npm test -- --run src/pages/PortalAdLeads.test.tsx src/pages/PortalStaff.test.tsx src/pages/Portal.test.tsx`

Expected: PASS.

Commit: `git add app/src/pages app/src/App.tsx && git commit -m "feat: add advertising lead inbox to portal"`

### Task 5: Full verification and release

- [ ] **Step 1: Run full checks**

Run: `cd app && npm test && npm run lint && npm run build && git diff --check`

Expected: all tests pass, no new lint errors, production build succeeds, and no whitespace errors.

- [ ] **Step 2: Verify live boundaries**

Use an existing lead only: change its status and owner, refresh, verify persistence, then verify the original Google Sheet row is unchanged. Confirm no source other than the four approved forms appears and existing client records/login remain unchanged.

- [ ] **Step 3: Release**

Run: `git push origin codex/assessment-lead-pipeline` then `npx --yes vercel@latest --prod --yes`.

Confirm production `/portal/ad-leads` requires the existing staff login, shows newest-first source leads, and preserves the saved tracking overlay.
