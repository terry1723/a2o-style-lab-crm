# A2O Assessment Lead Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upload assessment photos to private Supabase Storage and append completed lead data to the approved Google Sheet without writing to or changing the CRM.

**Architecture:** The browser requests a one-time upload token from a Vercel Function, uploads the photo directly to a private Supabase bucket, then sends a small validated lead payload to a second Vercel Function. The submission function derives trusted answer labels and result data, creates a seven-day signed photo URL, and calls a secret-protected Google Apps Script that performs an idempotent Sheet append.

**Tech Stack:** Vite, React, TypeScript, Vitest, Vercel Functions, Supabase JS, Google Apps Script, Google Sheets API/connector

---

## File Structure

### Create

- `app/api/_lib/assessmentValidation.ts` — server-side payload validation and normalization.
- `app/api/_lib/assessmentValidation.test.ts` — validation and answer allow-list tests.
- `app/api/_lib/supabaseAdmin.ts` — server-only Supabase client factory and environment checks.
- `app/api/_lib/storageService.ts` — signed upload and signed read URL operations.
- `app/api/_lib/storageService.test.ts` — storage service contract tests.
- `app/api/_lib/googleSheetWebhook.ts` — Apps Script webhook client and response validation.
- `app/api/_lib/googleSheetWebhook.test.ts` — webhook success, duplicate, and error tests.
- `app/api/assessment-upload-url.ts` — Vercel endpoint for one-time photo upload tokens.
- `app/api/assessment-upload-url.test.ts` — endpoint request/response tests.
- `app/api/assessment-submit.ts` — Vercel endpoint for final idempotent submission.
- `app/api/assessment-submit.test.ts` — endpoint orchestration tests.
- `app/integrations/google-apps-script/Code.gs` — reviewed Apps Script source.
- `app/integrations/google-apps-script/README.md` — deployment and authorization record.
- `app/src/features/assessment/services/assessmentLeadApi.ts` — browser upload and submission client.
- `app/src/features/assessment/services/assessmentLeadApi.test.ts` — frontend API contract tests.

### Modify

- `app/package.json` and `app/package-lock.json` — add Vercel Function types/runtime support.
- `app/src/features/assessment/types/assessment.ts` — replace base64 photo payload with a `File`.
- `app/src/features/assessment/components/AssessmentLeadForm.tsx` — preserve the selected `File` while keeping the current preview.
- `app/src/features/assessment/components/AssessmentLeadForm.test.tsx` — verify file submission and preserved retry state.
- `app/src/features/assessment/services/assessmentSessionRepository.ts` — call the new lead API and remove the CRM `saveClient` call.
- `app/src/features/assessment/services/assessmentSessionRepository.test.ts` — prove the mapped payload and CRM isolation.
- `app/vercel.json` — retain SPA rewrites while excluding `/api/*` from the index rewrite if required by Vercel routing verification.
- `app/.gitignore` and repository `.gitignore` — keep Vercel metadata and environment files excluded.

### Explicitly Do Not Modify

- `app/src/pages/CrmLogin.tsx`
- `app/src/pages/CrmStylingPool.tsx`
- `app/src/pages/CrmDashboard.tsx`
- `app/src/pages/Portal.tsx`
- `app/src/pages/PortalStaff.tsx`
- `app/src/lib/clientData.ts`
- Existing Supabase CRM tables or migrations

## Task 0: Preserve the Verified Homepage Baseline

**Files:**
- Commit the existing baseline files:
  - `app/.gitignore`
  - `.gitignore`
  - `app/docs/interactive-assessment-media.md`
  - `app/package.json`
  - `app/package-lock.json`
  - `app/public/images/assessment-landing.png`
  - `app/public/media/assessment/README.md`
  - `app/public/media/assessment/media-manifest.sample.json`
  - `app/public/media/assessment/question-01.mp4`
  - `app/public/media/assessment/question-02.mp4`
  - `app/public/media/assessment/question-03.mp4`
  - `app/public/media/assessment/question-04.mp4`
  - `app/src/features/assessment/components/AssessmentEngine.tsx`
  - `app/src/features/assessment/components/AssessmentEngine.test.tsx`
  - `app/src/features/assessment/components/AssessmentLeadForm.tsx`
  - `app/src/features/assessment/components/AssessmentLeadForm.test.tsx`
  - `app/src/features/assessment/components/AssessmentResult.tsx`
  - `app/src/features/assessment/components/AssessmentResult.test.tsx`
  - `app/src/features/assessment/components/QuestionOverlay.tsx`
  - `app/src/features/assessment/components/QuestionOverlay.test.tsx`
  - `app/src/features/assessment/components/SceneVideoBuffer.tsx`
  - `app/src/features/assessment/config/assessmentConfig.ts`
  - `app/src/features/assessment/config/assessmentConfig.test.ts`
  - `app/src/features/assessment/hooks/useAssessmentMachine.ts`
  - `app/src/features/assessment/hooks/useAssessmentMachine.test.tsx`
  - `app/src/features/assessment/hooks/useVideoPreloader.ts`
  - `app/src/features/assessment/services/assessmentSessionRepository.ts`
  - `app/src/features/assessment/services/assessmentSessionRepository.test.ts`
  - `app/src/features/assessment/types/assessment.ts`
  - `app/src/index.css`
  - `app/src/test/setup.ts`
  - `app/vite.config.ts`
- Exclude: `app/tsconfig.tsbuildinfo`, `.env.local`, `.vercel/`, and unrelated CRM files.

- [ ] **Step 1: Verify CRM files have no working-tree changes**

Run:

```bash
git diff --name-only HEAD -- app/src/pages/CrmLogin.tsx app/src/pages/CrmStylingPool.tsx app/src/pages/CrmDashboard.tsx app/src/pages/Portal.tsx app/src/pages/PortalStaff.tsx app/src/lib/clientData.ts supabase
```

Expected: no output.

- [ ] **Step 2: Run the verified homepage checks**

Run:

```bash
cd app
npm test
npm run lint
npm run build
```

Expected: all tests pass, lint has zero errors, and the production build exits 0. Existing unrelated lint warnings may remain documented.

- [ ] **Step 3: Stage the baseline intentionally**

Run:

```bash
git add .gitignore app/.gitignore app/docs/interactive-assessment-media.md app/package.json app/package-lock.json app/public/images/assessment-landing.png app/public/media/assessment app/src/features/assessment app/src/index.css app/src/test/setup.ts app/vite.config.ts
```

Confirm with:

```bash
git diff --cached --name-only
git diff --cached --check
```

Expected: no CRM or environment-secret files and no whitespace errors.

- [ ] **Step 4: Commit the baseline**

```bash
git commit -m "feat: finalize interactive assessment homepage"
```

## Task 1: Prepare the Approved Google Sheet

**External target:**
- Spreadsheet: `1Xi_u4DYkkMtpl7ClpaxwOyGjU7VAud6d8_uQGmQRHcY`
- Sheet: `工作表1`, `sheetId: 0`
- Range: `'工作表1'!A1:M1`

- [ ] **Step 1: Re-read metadata and the empty header range**

Use the Google Sheets connector to confirm the exact title, `sheetId`, and current `A1:M3` cell metadata immediately before writing.

Expected: the sheet remains empty and has no validation or formulas to preserve.

- [ ] **Step 2: Write and format the header atomically**

Use one Sheets `batchUpdate` containing:

```json
[
  {
    "updateCells": {
      "range": {
        "sheetId": 0,
        "startRowIndex": 0,
        "endRowIndex": 1,
        "startColumnIndex": 0,
        "endColumnIndex": 13
      },
      "rows": [{
        "values": [
          {"userEnteredValue":{"stringValue":"提交時間"}},
          {"userEnteredValue":{"stringValue":"Session ID"}},
          {"userEnteredValue":{"stringValue":"稱呼／姓名"}},
          {"userEnteredValue":{"stringValue":"WhatsApp"}},
          {"userEnteredValue":{"stringValue":"Q1評分"}},
          {"userEnteredValue":{"stringValue":"Q2場合"}},
          {"userEnteredValue":{"stringValue":"Q3機會"}},
          {"userEnteredValue":{"stringValue":"Q4優先項目"}},
          {"userEnteredValue":{"stringValue":"初步結果"}},
          {"userEnteredValue":{"stringValue":"相片Storage路徑"}},
          {"userEnteredValue":{"stringValue":"7日限時相片連結"}},
          {"userEnteredValue":{"stringValue":"UTM來源"}},
          {"userEnteredValue":{"stringValue":"狀態"}}
        ]
      }],
      "fields": "userEnteredValue"
    }
  },
  {
    "repeatCell": {
      "range": {"sheetId":0,"startRowIndex":0,"endRowIndex":1,"startColumnIndex":0,"endColumnIndex":13},
      "cell": {
        "userEnteredFormat": {
          "backgroundColorStyle":{"rgbColor":{"red":0.10,"green":0.08,"blue":0.07}},
          "textFormat":{"bold":true,"foregroundColorStyle":{"rgbColor":{"red":1,"green":1,"blue":1}}},
          "verticalAlignment":"MIDDLE",
          "wrapStrategy":"WRAP"
        }
      },
      "fields":"userEnteredFormat(backgroundColorStyle,textFormat,verticalAlignment,wrapStrategy)"
    }
  },
  {
    "updateSheetProperties": {
      "properties":{"sheetId":0,"gridProperties":{"frozenRowCount":1}},
      "fields":"gridProperties.frozenRowCount"
    }
  },
  {
    "updateSpreadsheetProperties": {
      "properties":{"timeZone":"Asia/Hong_Kong"},
      "fields":"timeZone"
    }
  },
  {
    "autoResizeDimensions": {
      "dimensions":{"sheetId":0,"dimension":"COLUMNS","startIndex":0,"endIndex":13}
    }
  }
]
```

- [ ] **Step 3: Verify values and native formatting**

Re-read `'工作表1'!A1:M3` with `formattedValue,userEnteredValue,userEnteredFormat` and inspect the Google-rendered sheet at normal zoom.

Expected: exact headers, frozen first row, Hong Kong timezone, readable widths, and no unrelated cells changed.

## Task 2: Add Server-Side Validation

**Files:**
- Create: `app/api/_lib/assessmentValidation.ts`
- Test: `app/api/_lib/assessmentValidation.test.ts`

- [ ] **Step 1: Write failing validation tests**

Cover a valid payload plus rejection of an invalid phone, missing consent, unknown option ID, missing answer, unsafe session ID, and a photo path outside the session prefix.

```ts
const validPayload = {
  sessionId: 'session-1234567890',
  name: '陳先生',
  phone: '9123 4567',
  consent: true as const,
  answers: {
    q1: ['q1_6'],
    q2: ['q2_a'],
    q3: ['q3_a'],
    q4: ['q4_e'],
  },
  photoPath: '2026/07/session-1234567890/123e4567-e89b-12d3-a456-426614174000.jpg',
  attribution: { utmSource: 'instagram' },
}

it('normalises and validates an approved submission', () => {
  const parsed = validateAssessmentSubmission(validPayload)
  expect(parsed.phone).toBe('+85291234567')
  expect(parsed.answers.q4).toEqual(['q4_e'])
})

it('rejects an option id outside the approved config', () => {
  expect(() => validateAssessmentSubmission({
    ...validPayload,
    answers: { ...validPayload.answers, q2: ['q2_unknown'] },
  })).toThrow('invalid_answers')
})
```

- [ ] **Step 2: Run the tests and confirm RED**

```bash
cd app
npm test -- api/_lib/assessmentValidation.test.ts
```

Expected: FAIL because `validateAssessmentSubmission` does not exist.

- [ ] **Step 3: Implement the minimal validator**

Implement:

```ts
export type AssessmentSubmissionPayload = {
  sessionId: string
  name: string
  phone: string
  consent: true
  answers: Record<string, string[]>
  photoPath: string
  attribution: { utmSource?: string }
}

export function normaliseHongKongPhone(phone: string) {
  const clean = phone.replace(/[\s-]/g, '')
  if (/^\+852\d{8}$/.test(clean)) return clean
  if (/^852\d{8}$/.test(clean)) return `+${clean}`
  if (/^\d{8}$/.test(clean)) return `+852${clean}`
  throw new Error('invalid_phone')
}
```

Use `assessmentConfig.scenes` as the single option allow-list. Require exactly one selected approved ID for every enabled scene. Require a photo path matching `YYYY/MM/<sessionId>/<uuid>.(jpg|jpeg|png|webp)`.

- [ ] **Step 4: Run the targeted test and confirm GREEN**

```bash
npm test -- api/_lib/assessmentValidation.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/_lib/assessmentValidation.ts app/api/_lib/assessmentValidation.test.ts
git commit -m "feat: validate assessment submissions server-side"
```

## Task 3: Add Private Storage Signing

**Files:**
- Create: `app/api/_lib/supabaseAdmin.ts`
- Create: `app/api/_lib/storageService.ts`
- Create: `app/api/_lib/storageService.test.ts`
- Create: `app/api/assessment-upload-url.ts`
- Create: `app/api/assessment-upload-url.test.ts`
- Modify: `app/package.json`
- Modify: `app/package-lock.json`

- [ ] **Step 1: Add Vercel Function types**

```bash
cd app
npm install --save-dev @vercel/node
```

- [ ] **Step 2: Write failing storage service tests**

```ts
const fakeStorage = {
  createSignedUploadUrl: vi.fn().mockResolvedValue({
    data: { path: 'ignored-by-service', token: 'one-time-token' },
    error: null,
  }),
}

it('creates an anonymous session-scoped object path', async () => {
  const result = await createPhotoUpload({
    sessionId: 'session-1234567890',
    mimeType: 'image/jpeg',
    extension: 'jpg',
  }, fakeStorage)
  expect(result.path).toMatch(/^\d{4}\/\d{2}\/session-1234567890\/[0-9a-f-]+\.jpg$/)
  expect(result.path).not.toContain('陳先生')
})
```

Test invalid MIME/extension combinations and upstream errors.

- [ ] **Step 3: Run the test and confirm RED**

```bash
npm test -- api/_lib/storageService.test.ts api/assessment-upload-url.test.ts
```

Expected: FAIL because the storage modules and endpoint do not exist.

- [ ] **Step 4: Implement the admin client and storage service**

`supabaseAdmin.ts` must read only server variables:

```ts
import { createClient } from '@supabase/supabase-js'

export function createSupabaseAdmin() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('supabase_server_not_configured')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
```

`storageService.ts` must call `createSignedUploadUrl(path)` and return only `path` and `token`. Add a separate `createPhotoReadUrl(path, 604800)` function.

- [ ] **Step 5: Implement the upload endpoint**

The handler accepts POST only, enforces JSON input, validates session/MIME/size, rejects files over `10 * 1024 * 1024`, and returns:

```json
{"path":"2026/07/session-id/uuid.jpg","token":"one-time-token","bucket":"assessment-photos"}
```

Do not return server credentials or raw Supabase errors.

- [ ] **Step 6: Run targeted tests and confirm GREEN**

```bash
npm test -- api/_lib/storageService.test.ts api/assessment-upload-url.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/package.json app/package-lock.json app/api/_lib/supabaseAdmin.ts app/api/_lib/storageService.ts app/api/_lib/storageService.test.ts app/api/assessment-upload-url.ts app/api/assessment-upload-url.test.ts
git commit -m "feat: issue private assessment photo uploads"
```

## Task 4: Create and Authorize the Apps Script Receiver

**Files:**
- Create: `app/integrations/google-apps-script/Code.gs`
- Create: `app/integrations/google-apps-script/README.md`

- [ ] **Step 1: Write the Apps Script source locally**

The complete behavior must follow this shape:

```js
const SPREADSHEET_ID = '1Xi_u4DYkkMtpl7ClpaxwOyGjU7VAud6d8_uQGmQRHcY'
const SHEET_NAME = '工作表1'

function jsonResponse(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON)
}

function doPost(event) {
  const lock = LockService.getScriptLock()
  try {
    const payload = JSON.parse(event.postData.contents || '{}')
    const expected = PropertiesService.getScriptProperties().getProperty('SHARED_SECRET')
    if (!expected || payload.secret !== expected) return jsonResponse({ ok: false, error: 'unauthorized' })

    lock.waitLock(10000)
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME)
    if (!sheet) return jsonResponse({ ok: false, error: 'sheet_missing' })

    const lastRow = sheet.getLastRow()
    if (lastRow > 1) {
      const ids = sheet.getRange(2, 2, lastRow - 1, 1).getDisplayValues().flat()
      if (ids.indexOf(payload.sessionId) >= 0) return jsonResponse({ ok: true, duplicate: true })
    }

    sheet.appendRow([
      Utilities.formatDate(new Date(payload.submittedAt), 'Asia/Hong_Kong', 'yyyy-MM-dd HH:mm:ss'),
      payload.sessionId, payload.name, payload.phone,
      payload.q1, payload.q2, payload.q3, payload.q4, payload.resultTitle,
      payload.photoPath, payload.photoSignedUrl, payload.utmSource || '', '新提交',
    ])
    return jsonResponse({ ok: true, duplicate: false })
  } catch (error) {
    return jsonResponse({ ok: false, error: 'write_failed' })
  } finally {
    try { lock.releaseLock() } catch (_) {}
  }
}
```

- [ ] **Step 2: Self-review the script**

Verify the exact spreadsheet ID, exact sheet name, 13-column order, lock release, secret check, and duplicate behavior. Confirm no secret is committed.

- [ ] **Step 3: Install the script in the bound Google Sheet**

Open Extensions → Apps Script in the approved Sheet, paste `Code.gs`, add the generated shared secret to Script Properties as `SHARED_SECRET`, deploy as a Web App executing as the owner, and authorize access to this spreadsheet.

- [ ] **Step 4: Record non-secret deployment information**

Write only the deployment date, Sheet ID, and configuration variable names in `README.md`. Do not commit the webhook URL or secret.

- [ ] **Step 5: Commit**

```bash
git add app/integrations/google-apps-script/Code.gs app/integrations/google-apps-script/README.md
git commit -m "feat: add idempotent Google Sheet receiver"
```

## Task 5: Add the Google Sheet Webhook and Submission Endpoint

**Files:**
- Create: `app/api/_lib/googleSheetWebhook.ts`
- Create: `app/api/_lib/googleSheetWebhook.test.ts`
- Create: `app/api/assessment-submit.ts`
- Create: `app/api/assessment-submit.test.ts`

- [ ] **Step 1: Write failing webhook tests**

```ts
const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

const validRow = {
  submittedAt: '2026-07-19T01:00:00.000Z',
  sessionId: 'session-1234567890',
  name: '陳先生',
  phone: '+85291234567',
  q1: '6',
  q2: '見客、銷售或傾生意',
  q3: '客戶信任同成交機會',
  q4: '整體專業形象定位',
  resultTitle: '專業存在感落差',
  photoPath: '2026/07/session-1234567890/123e4567-e89b-12d3-a456-426614174000.jpg',
  photoSignedUrl: 'https://example.supabase.co/signed/photo',
  utmSource: 'instagram',
}

it('accepts a duplicate Session ID as an idempotent success', async () => {
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true, duplicate: true })))
  await expect(appendAssessmentLead(validRow)).resolves.toEqual({ duplicate: true })
})

it('rejects an Apps Script write failure', async () => {
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: false, error: 'write_failed' })))
  await expect(appendAssessmentLead(validRow)).rejects.toThrow('sheet_write_failed')
})
```

- [ ] **Step 2: Write failing endpoint orchestration tests**

Test that one valid request validates data, creates a seven-day read URL, derives labels/result from `assessmentConfig`, calls Apps Script once, and returns `200`. Test that invalid input returns `400`, a missing server config returns `503`, and an upstream write failure returns `502` without personal data.

- [ ] **Step 3: Run the tests and confirm RED**

```bash
npm test -- api/_lib/googleSheetWebhook.test.ts api/assessment-submit.test.ts
```

Expected: FAIL because the modules do not exist.

- [ ] **Step 4: Implement the webhook client**

Read `APPS_SCRIPT_WEBHOOK_URL` and `APPS_SCRIPT_SHARED_SECRET` from `process.env`, POST JSON, follow redirects, require a JSON `{ok:true}` response, and map all other responses to `sheet_write_failed`.

- [ ] **Step 5: Implement the submission endpoint**

Build the trusted row server-side:

```ts
const labels = getSelectedLabels(assessmentConfig, payload.answers)
const result = calculateAssessmentResult(assessmentConfig, payload.answers)
const photoSignedUrl = await createPhotoReadUrl(payload.photoPath, 7 * 24 * 60 * 60)

await appendAssessmentLead({
  submittedAt: new Date().toISOString(),
  sessionId: payload.sessionId,
  name: payload.name,
  phone: payload.phone,
  q1: labels.q1?.[0] ?? '',
  q2: labels.q2?.[0] ?? '',
  q3: labels.q3?.[0] ?? '',
  q4: labels.q4?.[0] ?? '',
  resultTitle: result.title,
  photoPath: payload.photoPath,
  photoSignedUrl,
  utmSource: payload.attribution.utmSource ?? '',
})
```

- [ ] **Step 6: Run targeted tests and confirm GREEN**

```bash
npm test -- api/_lib/googleSheetWebhook.test.ts api/assessment-submit.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/api/_lib/googleSheetWebhook.ts app/api/_lib/googleSheetWebhook.test.ts app/api/assessment-submit.ts app/api/assessment-submit.test.ts
git commit -m "feat: append assessment leads to Google Sheets"
```

## Task 6: Connect the Browser Flow and Remove CRM Writes

**Files:**
- Create: `app/src/features/assessment/services/assessmentLeadApi.ts`
- Create: `app/src/features/assessment/services/assessmentLeadApi.test.ts`
- Modify: `app/src/features/assessment/types/assessment.ts`
- Modify: `app/src/features/assessment/components/AssessmentLeadForm.tsx`
- Modify: `app/src/features/assessment/components/AssessmentLeadForm.test.tsx`
- Modify: `app/src/features/assessment/services/assessmentSessionRepository.ts`
- Modify: `app/src/features/assessment/services/assessmentSessionRepository.test.ts`

- [ ] **Step 1: Write failing frontend API tests**

Test this sequence:

1. POST file metadata to `/api/assessment-upload-url`.
2. Call `supabase.storage.from('assessment-photos').uploadToSignedUrl(path, token, file)`.
3. POST the small lead payload to `/api/assessment-submit`.
4. Reject on any partial failure.

```ts
const { uploadToSignedUrl } = vi.hoisted(() => ({ uploadToSignedUrl: vi.fn() }))

vi.mock('../../../lib/supabase', () => ({
  supabase: { storage: { from: () => ({ uploadToSignedUrl }) } },
}))

it('uploads the photo before submitting the lead payload', async () => {
  const events: string[] = []
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    events.push(url.endsWith('upload-url') ? 'upload-url' : 'submit')
    return url.endsWith('upload-url')
      ? Response.json({ path: '2026/07/session-1234567890/photo.jpg', token: 'token', bucket: 'assessment-photos' })
      : Response.json({ ok: true })
  })
  vi.stubGlobal('fetch', fetchMock)
  uploadToSignedUrl.mockImplementation(async () => {
    events.push('upload')
    return { data: { path: '2026/07/session-1234567890/photo.jpg' }, error: null }
  })

  const validInput = {
    sessionId: 'session-1234567890',
    name: '陳先生',
    phone: '+85291234567',
    consent: true as const,
    photo: new File(['photo'], 'full-body.jpg', { type: 'image/jpeg' }),
    answers: { q1: ['q1_6'], q2: ['q2_a'], q3: ['q3_a'], q4: ['q4_e'] },
    attribution: { sourceUrl: 'https://a2o-style-lab.vercel.app', referrer: '', utmSource: 'instagram' },
  }

  await uploadAndSubmitAssessment(validInput)
  expect(events).toEqual(['upload-url', 'upload', 'submit'])
})
```

- [ ] **Step 2: Update form tests first**

Change the expected submit value from a base64 string to the exact selected `File`. Add a test proving that an API rejection keeps the preview, name, and phone values visible.

- [ ] **Step 3: Replace the repository test first**

Mock `uploadAndSubmitAssessment`, remove the `saveClient` mock, and assert the mapped call contains `name`, normalized phone, answers, attribution, Session ID, consent, and the original `File`.

Also assert the test module never imports or calls `saveClient`.

- [ ] **Step 4: Run all three targeted tests and confirm RED**

```bash
npm test -- src/features/assessment/services/assessmentLeadApi.test.ts src/features/assessment/components/AssessmentLeadForm.test.tsx src/features/assessment/services/assessmentSessionRepository.test.ts
```

Expected: FAIL because the frontend client and File-based contract do not exist.

- [ ] **Step 5: Implement the browser API client**

Expose:

```ts
export async function uploadAndSubmitAssessment(input: AssessmentLeadSubmission): Promise<void>
```

Map MIME types to `jpg`, `png`, or `webp`; send `file.size`; upload through the existing configured Supabase browser client; then POST the final payload. Convert provider responses to `assessment_upload_failed` or `assessment_submit_failed` without logging personal data.

- [ ] **Step 6: Preserve the selected File in the form**

Store both the `File` and the existing preview data URL. Submit:

```ts
await onSubmit({ name: name.trim(), phone: cleanPhone, consent: true, photo: photoFile })
```

Keep the current 10 MB and MIME checks and the existing Cantonese error panel.

- [ ] **Step 7: Replace the assessment CRM write**

`submitAssessmentLead` must call `uploadAndSubmitAssessment` and must no longer import `saveClient`, write `before_photo`, or create a `clients` row.

- [ ] **Step 8: Run the targeted tests and confirm GREEN**

```bash
npm test -- src/features/assessment/services/assessmentLeadApi.test.ts src/features/assessment/components/AssessmentLeadForm.test.tsx src/features/assessment/services/assessmentSessionRepository.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add app/src/features/assessment/services/assessmentLeadApi.ts app/src/features/assessment/services/assessmentLeadApi.test.ts app/src/features/assessment/types/assessment.ts app/src/features/assessment/components/AssessmentLeadForm.tsx app/src/features/assessment/components/AssessmentLeadForm.test.tsx app/src/features/assessment/services/assessmentSessionRepository.ts app/src/features/assessment/services/assessmentSessionRepository.test.ts
git commit -m "feat: submit assessment leads outside the CRM"
```

## Task 7: Configure Supabase and Vercel Secrets

**External systems:** Supabase dashboard and Vercel project settings.

- [ ] **Step 1: Create the private bucket**

In the authenticated Supabase project, create `assessment-photos` with:

- Public: disabled
- File size limit: 10 MB
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`

Do not add anonymous read, list, update, or delete policies. Upload access comes only from one-time signed upload tokens.

- [ ] **Step 2: Obtain the server-only key safely**

Retrieve the project service-role key in the authenticated Supabase dashboard. Never paste it into source files, terminal command arguments, chat, or logs.

- [ ] **Step 3: Add encrypted Vercel variables**

Add these to Production and Preview through the authenticated Vercel UI or secret-safe interactive prompts:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_STORAGE_BUCKET=assessment-photos
APPS_SCRIPT_WEBHOOK_URL
APPS_SCRIPT_SHARED_SECRET
```

Keep the existing `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` unchanged.

- [ ] **Step 4: Verify names and scopes only**

```bash
npx vercel@latest env ls
```

Expected: all five server variables exist for Production and Preview; no secret values appear in output.

## Task 8: Verify Routing, Full Tests, and CRM Isolation

**Files:**
- Modify only if verification proves necessary: `app/vercel.json`

- [ ] **Step 1: Run full automated verification**

```bash
cd app
npm test
npm run lint
npm run build
git diff --check
```

Expected: all tests pass, lint has zero errors, build exits 0, and no whitespace errors.

- [ ] **Step 2: Inspect the CRM isolation diff**

```bash
git diff HEAD -- app/src/pages/CrmLogin.tsx app/src/pages/CrmStylingPool.tsx app/src/pages/CrmDashboard.tsx app/src/pages/Portal.tsx app/src/pages/PortalStaff.tsx app/src/lib/clientData.ts supabase
```

Expected: no output.

- [ ] **Step 3: Verify local API routing**

Run Vercel local development and confirm `/api/assessment-upload-url` and `/api/assessment-submit` reach functions rather than the SPA rewrite. If the current catch-all rewrite intercepts them, change `app/vercel.json` to:

```json
{
  "rewrites": [
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

Then re-run function and SPA route checks.

- [ ] **Step 4: Commit any routing-only correction**

```bash
git add app/vercel.json
git commit -m "fix: preserve Vercel assessment API routes"
```

Skip this commit when no file change is required.

## Task 9: Synthetic End-to-End Verification

**Test data:** generated non-person image, synthetic name `A2O 測試`, synthetic phone `+85290000000`, unique Session ID prefixed `test-`.

- [ ] **Step 1: Record the pre-test state**

Read the current Sheet rows in a bounded range, confirm the synthetic Session ID does not exist, and record that there is no CRM client with the synthetic phone.

- [ ] **Step 2: Submit through the actual browser flow**

Complete all four questions, upload the generated fixture, enter the synthetic contact data, consent, and submit.

Expected: the success panel appears only after the request completes.

- [ ] **Step 3: Verify all three destinations**

- Sheet: exactly one new row with the expected 13 fields.
- Storage: exactly one private object at the recorded path; anonymous direct read fails.
- CRM: no `clients` row exists for the test phone or Session ID.

- [ ] **Step 4: Verify idempotency**

Replay the final submission using the same Session ID.

Expected: API success with no second Sheet row and no second Storage object.

- [ ] **Step 5: Clean up only the synthetic data**

Delete the exact synthetic Sheet row and exact synthetic Storage object after verifying their identifiers. Re-read the bounded Sheet range and Storage path to confirm cleanup. Do not use broad row, bucket, or recursive deletion.

## Task 10: Production Deployment and Live Smoke Test

- [ ] **Step 1: Run final fresh verification**

```bash
cd app
npm test
npm run lint
npm run build
```

Expected: same passing result as Task 8.

- [ ] **Step 2: Deploy production from repository root**

```bash
cd ..
npx vercel@latest deploy --prod --yes
npx vercel@latest inspect https://a2o-style-lab.vercel.app --wait
```

Expected: target `production`, status `Ready`, alias `https://a2o-style-lab.vercel.app`.

- [ ] **Step 3: Run live smoke tests**

Verify on the production alias:

- Homepage and Q1/Q2 video assets load without media errors.
- A synthetic photo upload and Sheet submission succeeds.
- Duplicate Session ID does not append twice.
- Direct Storage object URL remains private.
- `https://a2o-style-lab.vercel.app/#/crm/login` still renders the existing CRM login page.
- No CRM record is created by the assessment.

- [ ] **Step 4: Clean up the live synthetic data**

Remove the exact production smoke-test Sheet row and Storage object and verify both removals.

- [ ] **Step 5: Commit final verified source changes**

Stage only the reviewed integration files, confirm with `git diff --cached --name-only` and `git diff --cached --check`, then:

```bash
git commit -m "feat: connect assessment leads to Sheets and Storage"
```
