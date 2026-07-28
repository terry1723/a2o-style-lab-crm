# Portal Authentication and Statistics Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the portal authenticate exclusively through the Supabase-backed server endpoint and hide the five aggregate dashboard cards.

**Architecture:** The existing `/api/staff-login.ts` stays the only PIN verification boundary. `Portal` posts the entered PIN there and writes its existing browser session marker only after a successful response. `PortalStaff` loses only its aggregate presentation and derived totals; its client and service functions stay unchanged.

**Tech Stack:** React 18, TypeScript, React Router, Vite, Vitest, Testing Library, Vercel Functions, Supabase Admin.

---

### Task 1: Lock the portal login contract with tests

**Files:**
- Modify: `app/src/pages/Portal.test.tsx`
- Modify: `app/src/pages/Portal.tsx`

- [x] **Step 1: Write failing tests**

Add a test that mocks a `401` response for `A2O2026`, clicks `登入`, and asserts:

```tsx
expect(screen.queryByText('Portal staff destination')).not.toBeInTheDocument()
expect(localStorage.getItem('a2o_staff_auth')).toBeNull()
expect(await screen.findByText('密碼錯誤')).toBeInTheDocument()
```

Add a second test that makes `fetch` reject and asserts `暫時未能登入，請稍後再試。`.

- [x] **Step 2: Verify RED**

Run: `npx vitest run src/pages/Portal.test.tsx`

Expected: FAIL because the Portal currently calls `verifyStaff()` and locally accepts `A2O2026`.

- [x] **Step 3: Implement minimal server-only login**

Replace the `verifyStaff` import and synchronous handler with this request path:

```tsx
const response = await fetch('/api/staff-login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ pin }),
})
const result = await response.json().catch(() => null)
if (!response.ok || !result?.authenticated) {
  setError('密碼錯誤')
  return
}
localStorage.setItem('a2o_staff_auth', 'true')
navigate('/portal/staff')
```

Add `loading` state. Disable the button while the request is pending and show `登入中…`. A thrown request error must show `暫時未能登入，請稍後再試。`. Do not add any browser fallback PIN check.

- [x] **Step 4: Verify GREEN**

Run: `npx vitest run src/pages/Portal.test.tsx`

Expected: PASS for the existing rotated-PIN test plus both new regressions.

- [x] **Step 5: Commit**

```bash
git add app/src/pages/Portal.tsx app/src/pages/Portal.test.tsx
git commit -m "fix: verify portal PIN on server"
```

### Task 2: Remove aggregate dashboard cards without changing CRM records

**Files:**
- Modify: `app/src/pages/PortalStaff.tsx`
- Create: `app/src/pages/PortalStaff.test.tsx`

- [x] **Step 1: Write a failing privacy-render test**

Mock `getAllClients`, `getClientServices`, and `getServiceSessions` before importing `PortalStaff`; set `a2o_staff_auth`; render it with a router. Assert the search box remains visible and each label below is absent:

```tsx
for (const label of ['總客戶', '進行中', '已完成', '總銷售額', '已收款']) {
  expect(screen.queryByText(label)).not.toBeInTheDocument()
}
expect(await screen.findByPlaceholderText('搜索姓名或電話...')).toBeInTheDocument()
```

- [x] **Step 2: Verify RED**

Run: `npx vitest run src/pages/PortalStaff.test.tsx`

Expected: FAIL because the current stats grid renders all five labels.

- [x] **Step 3: Remove only aggregate presentation**

Delete the `totalSales` and `totalCollected` reductions and the adjacent `/* Stats */` grid in `PortalStaff.tsx`. Do not alter `refresh`, `filtered`, `UpcomingAppointments`, search/filter controls, client saving, service saving, images, or logout.

- [x] **Step 4: Verify GREEN**

Run: `npx vitest run src/pages/PortalStaff.test.tsx`

Expected: PASS; the five labels are absent while the client-management controls remain.

- [ ] **Step 5: Commit**

```bash
git add app/src/pages/PortalStaff.tsx app/src/pages/PortalStaff.test.tsx
git commit -m "feat: hide portal aggregate statistics"
```

### Task 3: Verify and release

**Files:**
- No source changes expected

- [ ] **Step 1: Run full verification**

Run:

```bash
npm test
npm run lint
npm run build
```

Expected: all tests pass, lint has no errors, and the production build succeeds. Report existing warnings separately.

- [ ] **Step 2: Scope review**

Run:

```bash
git diff --check
git diff --name-only HEAD~2..HEAD
```

Expected: only Portal login, Portal Staff dashboard UI, their tests, and the spec/plan documents changed. Confirm no Supabase schema, `staff_profiles` data, client records, customer-facing assessment files, or CRM data changed.

- [ ] **Step 3: Deploy safely**

1. Push `codex/assessment-lead-pipeline` to the existing Draft PR.
2. Wait for its Vercel preview to become Ready.
3. Promote that exact preview to production.
4. Confirm `/portal` rejects the old PIN and accepts only the current Supabase PIN. Do not create or edit client records during this check.

- [ ] **Step 4: Report**

Report the production URL, commits, verification results, removed dashboard metrics, and confirmation that neither CRM data nor the Supabase PIN record changed.
