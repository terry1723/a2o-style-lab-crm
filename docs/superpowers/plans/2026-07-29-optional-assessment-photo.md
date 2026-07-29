# Optional Assessment Photo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let customers submit the A2O assessment without a photo while retaining the existing private upload flow whenever a photo is supplied.

**Architecture:** The UI submits an optional `photo` field. The client pipeline only requests and uploads a private Storage object when that field exists. The server validates either a complete path-and-receipt pair or neither field, then writes blank photo columns to Google Sheets for no-photo submissions.

**Tech Stack:** React, TypeScript, Vitest, Vercel Functions, Supabase Storage, Google Apps Script webhook.

---

### Task 1: Make the public form photo optional

**Files:**
- Modify: `app/src/features/assessment/types/assessment.ts`
- Modify: `app/src/features/assessment/components/AssessmentLeadForm.tsx`
- Modify: `app/src/features/assessment/components/AssessmentLeadForm.test.tsx`
- Modify: `app/src/features/assessment/components/AssessmentResult.tsx`
- Modify: `app/src/features/assessment/components/AssessmentResult.test.tsx`

- [ ] **Step 1: Write a failing no-photo form-submission test**

Add a test that fills name, phone, height, weight, and consent without calling
`user.upload`, then expects `onSubmit` to receive:

```tsx
{
  name: '陳先生',
  phone: '91234567',
  heightCm: 175,
  weightKg: 68.5,
  consent: true,
  photo: undefined,
}
```

- [ ] **Step 2: Run the focused form test and verify it fails**

```bash
cd app && npm test -- src/features/assessment/components/AssessmentLeadForm.test.tsx
```

Expected: FAIL because the current form requires `photoFile`.

- [ ] **Step 3: Make the form type and UI optional**

Set `AssessmentLeadInput.photo` to `photo?: File`. Remove the missing-photo
validation branch. Change visible copy to `上傳正面全身相（選填）` and explain
that an uploaded photo can improve the analysis. Keep invalid selected-file
validation unchanged.

- [ ] **Step 4: Run the focused form test and verify it passes**

Run the same command from Step 2.

- [ ] **Step 5: Update the result copy and test**

Use `請填寫基本資料；如方便，可上傳一張正面全身相。` in the result shell.
Update its test to assert this exact text.

### Task 2: Support no-photo submissions in the client pipeline

**Files:**
- Modify: `app/src/features/assessment/services/assessmentLeadApi.ts`
- Modify: `app/src/features/assessment/services/assessmentLeadApi.test.ts`

- [ ] **Step 1: Write a failing no-photo pipeline test**

Add a test that calls `submitAssessmentLeadToPipeline` with `photo: undefined`
and expects exactly one request to `/api/assessment-submit`, with no
`photoPath` or `uploadReceipt`, and no `uploadToSignedUrl` call.

- [ ] **Step 2: Run the client-pipeline test and verify it fails**

```bash
cd app && npm test -- src/features/assessment/services/assessmentLeadApi.test.ts
```

Expected: FAIL because the current implementation reads `payload.input.photo.type`.

- [ ] **Step 3: Branch the upload flow only when a photo exists**

Only calculate the extension, request `/api/assessment-upload-url`, upload, and
send `photoPath` / `uploadReceipt` when `payload.input.photo` exists. Always
send the remaining lead payload to `/api/assessment-submit`.

- [ ] **Step 4: Run the client-pipeline test and verify it passes**

Run the same command from Step 2.

### Task 3: Accept complete-or-absent photo data in the server API

**Files:**
- Modify: `app/api/_lib/assessmentValidation.ts`
- Modify: `app/api/_lib/assessmentValidation.test.ts`
- Modify: `app/api/assessment-submit.ts`
- Modify: `app/api/assessment-submit.test.ts`

- [ ] **Step 1: Write failing validation and handler tests**

Add a validation test for a payload without `photoPath` and `uploadReceipt`.
Add a handler test that verifies a no-photo payload does not call
`assertUploadedPhoto` or `createPhotoReadUrl`, and appends:

```ts
{ photoPath: '', photoSignedUrl: '' }
```

- [ ] **Step 2: Run the server tests and verify they fail**

```bash
cd app && npm test -- api/_lib/assessmentValidation.test.ts api/assessment-submit.test.ts
```

Expected: FAIL because `validateAssessmentSubmission` currently requires a
photo path and upload receipt.

- [ ] **Step 3: Validate complete-or-absent photo fields**

Make `photoPath` and `uploadReceipt` optional in
`AssessmentSubmissionPayload`. Reject a partial pair. Retain the existing path,
receipt, bucket, and private-object validation when both are present.

- [ ] **Step 4: Write blank sheet values when no photo exists**

In `assessment-submit.ts`, call Storage verification and signed URL creation
only for a complete photo pair. Pass empty strings to `appendAssessmentLead`
when no photo was supplied.

- [ ] **Step 5: Run server tests and verify they pass**

Run the same command from Step 2.

### Task 4: Regression verification and release

**Files:**
- Verify: all files above

- [ ] **Step 1: Run assessment and submission regression tests**

```bash
cd app && npm test -- src/features/assessment api/assessment-submit.test.ts api/_lib/assessmentValidation.test.ts
```

Expected: all test files pass.

- [ ] **Step 2: Build production assets**

```bash
cd app && npm run build && git diff --check
```

Expected: build exits 0 and the diff check has no output.

- [ ] **Step 3: Commit, push, and promote the verified deployment**

```bash
git add app/src/features/assessment app/api/_lib/assessmentValidation.ts app/api/_lib/assessmentValidation.test.ts app/api/assessment-submit.ts app/api/assessment-submit.test.ts
git commit -m "feat: make assessment photo optional"
git push origin HEAD:codex/ad-lead-inbox-production
```

After Vercel creates the branch preview, promote the Ready preview deployment
with `npx vercel promote <preview-url> --yes --timeout 3m`.
