# Assessment Written Chinese Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert all public interactive-assessment wording from Cantonese colloquialisms to natural Traditional Chinese written language without changing assessment behaviour or CRM systems.

**Architecture:** The public assessment text is defined in `assessmentConfig.ts` and rendered in the lead-form and result components. Update only those customer-facing literals; the data shape, question IDs, options, submit payload, API, and portal routes remain unchanged.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, Vite.

---

### Task 1: Protect the public written-language requirement with tests

**Files:**
- Modify: `app/src/features/assessment/components/AssessmentLeadForm.test.tsx`
- Modify: `app/src/features/assessment/components/AssessmentResult.test.tsx`

- [ ] **Step 1: Write failing tests for written-language customer copy**

Add assertions that render the final form and result states and require these exact phrases:

```tsx
expect(screen.getByText('請填寫以下資料，讓我們更準確地了解你的形象需要。')).toBeInTheDocument()
expect(screen.getByText('已收到你的形象檢測資料')).toBeInTheDocument()
expect(screen.getByText(/我們會在 1–2 個工作天內透過 WhatsApp 聯絡你/)).toBeInTheDocument()
```

- [ ] **Step 2: Run the focused tests and verify they fail**

Run:

```bash
cd app && npm test -- src/features/assessment/components/AssessmentLeadForm.test.tsx src/features/assessment/components/AssessmentResult.test.tsx
```

Expected: FAIL because the current rendered strings still include colloquial wording such as `你嘅` and `我哋`.

- [ ] **Step 3: Replace only public assessment copy**

Update customer-facing literals in:

```text
app/src/features/assessment/config/assessmentConfig.ts
app/src/features/assessment/components/AssessmentLeadForm.tsx
app/src/features/assessment/components/AssessmentResult.tsx
```

Use `你`, `你的`, `目前`, `我們`, `請`, and `可以`. Preserve all IDs, labels, validation rules, options, API payload fields, and completion timing.

- [ ] **Step 4: Run the focused tests and verify they pass**

Run the same command from Step 2.

Expected: PASS with no failing tests.

- [ ] **Step 5: Commit the tested copy update**

```bash
git add app/src/features/assessment/config/assessmentConfig.ts app/src/features/assessment/components/AssessmentLeadForm.tsx app/src/features/assessment/components/AssessmentResult.tsx app/src/features/assessment/components/AssessmentLeadForm.test.tsx app/src/features/assessment/components/AssessmentResult.test.tsx
git commit -m "fix: use written Chinese in assessment copy"
```

### Task 2: Validate the whole public assessment flow remains buildable

**Files:**
- Verify: `app/src/features/assessment/config/assessmentConfig.ts`
- Verify: `app/src/features/assessment/components/AssessmentLeadForm.tsx`
- Verify: `app/src/features/assessment/components/AssessmentResult.tsx`

- [ ] **Step 1: Scan for banned formal and colloquial address terms**

Run:

```bash
cd app && rg -n "閣下|閣下的|你嘅|我哋|而家|依家|咁樣|噉" src/features/assessment/config/assessmentConfig.ts src/features/assessment/components/AssessmentLeadForm.tsx src/features/assessment/components/AssessmentResult.tsx
```

Expected: no matches in customer-facing assessment copy.

- [ ] **Step 2: Run the assessment regression suite**

Run:

```bash
cd app && npm test -- src/features/assessment
```

Expected: all assessment test files pass.

- [ ] **Step 3: Build the production site**

Run:

```bash
cd app && npm run build
```

Expected: Vite production build exits with code 0.

- [ ] **Step 4: Push the reviewed commit and deploy production**

```bash
git push origin HEAD:codex/ad-lead-inbox-production
cd app && npx vercel --prod --yes
```

Expected: Git push succeeds and Vercel reports a ready production deployment.
