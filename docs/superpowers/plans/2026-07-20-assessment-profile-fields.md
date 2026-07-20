# Assessment Profile Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collect required name, Hong Kong WhatsApp number, height, weight, and one front-facing full-body photo in that order, then persist the two new numeric fields to the existing Google Sheet without changing CRM data.

**Architecture:** Keep one `AssessmentLeadForm` and remove its photo-first wizard state so all controls render in one vertical form. Extend the existing typed lead pipeline through the Vercel submission validator to the Apps Script webhook, appending height and weight as Sheet columns N and O so existing A:M data remains stable.

**Tech Stack:** React 18, TypeScript, Vitest, Testing Library, Vercel Functions, Supabase private Storage, Google Apps Script, Google Sheets.

---

## File map

- Modify `app/src/features/assessment/components/AssessmentLeadForm.tsx`: render the approved photo-last form and validate height/weight.
- Modify `app/src/features/assessment/components/AssessmentLeadForm.test.tsx`: lock field order, validation, payload, and retry state.
- Modify `app/src/features/assessment/types/assessment.ts`: add numeric `heightCm` and `weightKg` to `AssessmentLeadInput`.
- Modify `app/src/features/assessment/services/assessmentLeadApi.ts`: send the new values to `/api/assessment-submit`.
- Modify `app/src/features/assessment/services/assessmentLeadApi.test.ts`: verify exact pipeline payloads.
- Modify `app/api/_lib/assessmentValidation.ts`: validate and return trusted height/weight numbers.
- Modify `app/api/_lib/assessmentValidation.test.ts`: cover accepted values and rejected boundaries.
- Modify `app/api/assessment-submit.ts`: add trusted height/weight to `AssessmentSheetRow`.
- Modify `app/api/assessment-submit.test.ts`: verify the Sheet row.
- Modify `app/api/_lib/googleSheetWebhook.ts`: extend the row contract.
- Modify `app/api/_lib/googleSheetWebhook.test.ts`: verify the webhook body contains both numbers.
- Modify `app/integrations/google-apps-script/Code.gs`: append numeric values to N and O.
- Modify `app/integrations/google-apps-script/README.md`: document A:O and the new headers.
- Create `app/integrations/google-apps-script/Code.test.ts`: statically protect the 15-column row order.

### Task 1: Build the photo-last profile form

**Files:**
- Modify: `app/src/features/assessment/components/AssessmentLeadForm.test.tsx`
- Modify: `app/src/features/assessment/components/AssessmentLeadForm.tsx`
- Modify: `app/src/features/assessment/types/assessment.ts`

- [ ] **Step 1: Write failing component tests for field order and submitted values**

Replace the photo-first expectation and update the successful submission test with:

```tsx
it('shows required profile fields before the photo selector', () => {
  render(<AssessmentLeadForm {...defaultProps} />)
  const controls = [
    screen.getByLabelText('稱呼／姓名'),
    screen.getByLabelText('WhatsApp 電話號碼'),
    screen.getByLabelText('身高（cm）'),
    screen.getByLabelText('體重（kg）'),
    screen.getByLabelText('選擇正面全身相'),
  ]

  for (let index = 1; index < controls.length; index += 1) {
    expect(controls[index - 1].compareDocumentPosition(controls[index]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  }
})

it('submits numeric height and weight with the contact details and photo', async () => {
  const user = userEvent.setup()
  const onSubmit = vi.fn().mockResolvedValue(undefined)
  render(<AssessmentLeadForm {...defaultProps} onSubmit={onSubmit} />)
  const photo = new File(['portrait'], 'full-body.jpg', { type: 'image/jpeg' })

  await user.type(screen.getByLabelText('稱呼／姓名'), '陳先生')
  await user.type(screen.getByLabelText('WhatsApp 電話號碼'), '9123 4567')
  await user.type(screen.getByLabelText('身高（cm）'), '175')
  await user.type(screen.getByLabelText('體重（kg）'), '68.5')
  await user.upload(screen.getByLabelText('選擇正面全身相'), photo)
  await user.click(screen.getByRole('checkbox'))
  await user.click(screen.getByRole('button', { name: '提交並製作個人檢測報告' }))

  await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({
    name: '陳先生', phone: '91234567', heightCm: 175, weightKg: 68.5,
    consent: true, photo,
  }))
})
```

Add table-driven tests that submit height `119`, `231`, or `175.5`, and weight `34`, `201`, or `68.55`, then expect the appropriate Traditional Chinese error and zero `onSubmit` calls.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `cd app && npm test -- --run src/features/assessment/components/AssessmentLeadForm.test.tsx`

Expected: FAIL because height/weight controls do not exist and the current component opens on the photo-only step.

- [ ] **Step 3: Extend the lead input type**

```ts
export type AssessmentLeadInput = {
  name: string
  phone: string
  heightCm: number
  weightKg: number
  consent: true
  photo: File
}
```

- [ ] **Step 4: Replace the two-step form with one ordered form**

Remove `step`, the photo-only early return, and both navigation buttons. Add string state and numeric validation:

```ts
const [heightCm, setHeightCm] = useState('')
const [weightKg, setWeightKg] = useState('')

const parsedHeight = Number(heightCm)
const parsedWeight = Number(weightKg)
if (!/^\d+$/.test(heightCm) || parsedHeight < 120 || parsedHeight > 230) {
  setError('請輸入 120 至 230 cm 嘅身高。')
  return
}
if (!/^\d+(?:\.\d)?$/.test(weightKg) || parsedWeight < 35 || parsedWeight > 200) {
  setError('請輸入 35 至 200 kg 嘅體重，最多一位小數。')
  return
}
if (!photoFile) {
  setError('請上傳正面全身相。')
  return
}
```

Render number inputs after phone and before the existing upload block:

```tsx
<input id="assessment-height" aria-label="身高（cm）" inputMode="numeric" value={heightCm}
  onChange={(event) => setHeightCm(event.target.value)} placeholder="例如：175" />
<input id="assessment-weight" aria-label="體重（kg）" inputMode="decimal" value={weightKg}
  onChange={(event) => setWeightKg(event.target.value)} placeholder="例如：68.5" />
```

Call `onSubmit` with `heightCm: parsedHeight` and `weightKg: parsedWeight`. Keep the existing preview, remove button, consent, submit error, and submitted confirmation.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run: `cd app && npm test -- --run src/features/assessment/components/AssessmentLeadForm.test.tsx`

Expected: all form tests PASS.

- [ ] **Step 6: Commit the form slice**

```bash
git add app/src/features/assessment/components/AssessmentLeadForm.tsx \
  app/src/features/assessment/components/AssessmentLeadForm.test.tsx \
  app/src/features/assessment/types/assessment.ts
git commit -m "feat: collect assessment height and weight"
```

### Task 2: Propagate profile values through the browser pipeline

**Files:**
- Modify: `app/src/features/assessment/services/assessmentLeadApi.test.ts`
- Modify: `app/src/features/assessment/services/assessmentLeadApi.ts`

- [ ] **Step 1: Write the failing exact-payload assertion**

Add `heightCm: 175, weightKg: 68.5` to every `AssessmentLeadInput` test fixture. In the first test, require:

```ts
expect(fetchImpl).toHaveBeenNthCalledWith(2, '/api/assessment-submit', expect.objectContaining({
  body: JSON.stringify(expect.objectContaining({
    heightCm: 175,
    weightKg: 68.5,
  })),
}))
```

Because `JSON.stringify(expect.objectContaining())` is not a runtime matcher, implement the assertion by parsing the recorded body:

```ts
const submissionBody = JSON.parse(String(fetchImpl.mock.calls[1]?.[1]?.body))
expect(submissionBody).toEqual(expect.objectContaining({ heightCm: 175, weightKg: 68.5 }))
```

- [ ] **Step 2: Run the service test and verify RED**

Run: `cd app && npm test -- --run src/features/assessment/services/assessmentLeadApi.test.ts`

Expected: FAIL because the request body omits both fields.

- [ ] **Step 3: Add both fields to the submission request**

```ts
heightCm: payload.input.heightCm,
weightKg: payload.input.weightKg,
```

Place them after `phone` in the `/api/assessment-submit` body.

- [ ] **Step 4: Run the service test and verify GREEN**

Run: `cd app && npm test -- --run src/features/assessment/services/assessmentLeadApi.test.ts`

Expected: all pipeline tests PASS.

- [ ] **Step 5: Commit the pipeline slice**

```bash
git add app/src/features/assessment/services/assessmentLeadApi.ts \
  app/src/features/assessment/services/assessmentLeadApi.test.ts
git commit -m "feat: submit assessment profile measurements"
```

### Task 3: Validate measurements on the server

**Files:**
- Modify: `app/api/_lib/assessmentValidation.test.ts`
- Modify: `app/api/_lib/assessmentValidation.ts`

- [ ] **Step 1: Add accepted values and rejected-boundary tests**

Add `heightCm: 175` and `weightKg: 68.5` to `validPayload`, assert they survive parsing, and add:

```ts
it.each([
  ['missing height', { heightCm: undefined }, 'invalid_height'],
  ['decimal height', { heightCm: 175.5 }, 'invalid_height'],
  ['low height', { heightCm: 119 }, 'invalid_height'],
  ['high height', { heightCm: 231 }, 'invalid_height'],
  ['missing weight', { weightKg: undefined }, 'invalid_weight'],
  ['too many weight decimals', { weightKg: 68.55 }, 'invalid_weight'],
  ['low weight', { weightKg: 34 }, 'invalid_weight'],
  ['high weight', { weightKg: 201 }, 'invalid_weight'],
])('rejects %s', (_label, change, message) => {
  expect(() => validateAssessmentSubmission({ ...validPayload, ...change })).toThrow(message)
})
```

- [ ] **Step 2: Run the validator test and verify RED**

Run: `cd app && npm test -- --run api/_lib/assessmentValidation.test.ts`

Expected: FAIL because invalid measurements are accepted/ignored.

- [ ] **Step 3: Add numeric parsers and payload fields**

```ts
function parseHeight(value: unknown) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 120 || value > 230) {
    throw new Error('invalid_height')
  }
  return value
}

function parseWeight(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 35 || value > 200
    || Math.round(value * 10) !== value * 10) {
    throw new Error('invalid_weight')
  }
  return value
}
```

Add `heightCm` and `weightKg` to `AssessmentSubmissionPayload` and return the parsed values from `validateAssessmentSubmission`.

- [ ] **Step 4: Run the validator test and verify GREEN**

Run: `cd app && npm test -- --run api/_lib/assessmentValidation.test.ts`

Expected: all validator tests PASS.

- [ ] **Step 5: Commit server validation**

```bash
git add app/api/_lib/assessmentValidation.ts app/api/_lib/assessmentValidation.test.ts
git commit -m "feat: validate assessment measurements"
```

### Task 4: Append measurements without moving existing Sheet columns

**Files:**
- Modify: `app/api/assessment-submit.test.ts`
- Modify: `app/api/assessment-submit.ts`
- Modify: `app/api/_lib/googleSheetWebhook.test.ts`
- Modify: `app/api/_lib/googleSheetWebhook.ts`
- Create: `app/integrations/google-apps-script/Code.test.ts`
- Modify: `app/integrations/google-apps-script/Code.gs`
- Modify: `app/integrations/google-apps-script/README.md`

- [ ] **Step 1: Write failing Sheet-row tests**

Add the new numbers to the valid API payload and expected row:

```ts
expect(deps.appendAssessmentLead).toHaveBeenCalledWith(expect.objectContaining({
  heightCm: 175,
  weightKg: 68.5,
}))
```

Extend `AssessmentSheetRow` test fixtures and parse the Apps Script request body:

```ts
expect(body).toEqual(expect.objectContaining({ heightCm: 175, weightKg: 68.5 }))
```

Create `Code.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('assessment Apps Script row contract', () => {
  it('appends height and weight after the existing status column', () => {
    const source = readFileSync(new URL('./Code.gs', import.meta.url), 'utf8')
    expect(source).toMatch(/'新提交',[\s\S]*requireNumber\(payload, 'heightCm'[\s\S]*requireNumber\(payload, 'weightKg'/)
  })
})
```

- [ ] **Step 2: Run Sheet-related tests and verify RED**

Run: `cd app && npm test -- --run api/assessment-submit.test.ts api/_lib/googleSheetWebhook.test.ts integrations/google-apps-script/Code.test.ts`

Expected: FAIL because row types and Apps Script do not contain the measurements.

- [ ] **Step 3: Extend the trusted row contract**

Add to `AssessmentSheetRow`:

```ts
heightCm: number
weightKg: number
```

Pass `payload.heightCm` and `payload.weightKg` from `assessment-submit.ts` to `appendAssessmentLead`.

- [ ] **Step 4: Extend Apps Script while preserving A:M**

Add a numeric validator:

```js
function requireNumber(payload, key, minimum, maximum, decimalPlaces) {
  const value = Number(payload[key])
  const multiplier = Math.pow(10, decimalPlaces)
  if (!isFinite(value) || value < minimum || value > maximum || Math.round(value * multiplier) !== value * multiplier) {
    throw new Error('invalid_' + key)
  }
  return value
}
```

Append after `'新提交'` in `row`:

```js
requireNumber(payload, 'heightCm', 120, 230, 0),
requireNumber(payload, 'weightKg', 35, 200, 1),
```

Update README expected columns to A:O and document N=`身高（cm）`, O=`體重（kg）`.

- [ ] **Step 5: Run Sheet-related tests and verify GREEN**

Run: `cd app && npm test -- --run api/assessment-submit.test.ts api/_lib/googleSheetWebhook.test.ts integrations/google-apps-script/Code.test.ts`

Expected: all selected tests PASS.

- [ ] **Step 6: Commit the Sheet slice**

```bash
git add app/api/assessment-submit.ts app/api/assessment-submit.test.ts \
  app/api/_lib/googleSheetWebhook.ts app/api/_lib/googleSheetWebhook.test.ts \
  app/integrations/google-apps-script/Code.gs \
  app/integrations/google-apps-script/Code.test.ts \
  app/integrations/google-apps-script/README.md
git commit -m "feat: append assessment measurements to Sheet"
```

### Task 5: Verify, update live Apps Script, and release

**Files:**
- Verify all modified files
- Do not stage: `app/tsconfig.tsbuildinfo`

- [ ] **Step 1: Run complete local verification**

Run:

```bash
cd app
npm test
npm run lint
npm run build
```

Expected: all tests PASS, ESLint has zero errors, and Vite production build exits 0. Existing unrelated warnings must be reported rather than silently described as clean.

- [ ] **Step 2: Confirm scope and privacy boundaries**

Run:

```bash
git diff --check
git status --short
git diff -- app/src/pages/CrmLogin.tsx app/src/lib/clientData.ts app/src/pages/Portal.tsx
```

Expected: no whitespace errors; no diff in CRM login, CRM persistence, or Portal login; `app/tsconfig.tsbuildinfo` remains unstaged.

- [ ] **Step 3: Update the live Google Sheet contract**

In the approved Sheet `1Xi_u4DYkkMtpl7ClpaxwOyGjU7VAud6d8_uQGmQRHcY`, set N1 to `身高（cm）` and O1 to `體重（kg）` without moving or rewriting A:M. Open Extensions → Apps Script, replace the deployed `Code.gs` with the reviewed repository version, create a new Web App version using the same execute-as and access settings, and keep the current `SHARED_SECRET` Script Property unchanged.

- [ ] **Step 4: Push and wait for a Ready Vercel preview**

```bash
git push origin codex/assessment-lead-pipeline
npx --yes vercel list a2o-style-lab
```

Copy the exact newest Preview URL printed by `vercel list` and pass that observed
URL to `npx --yes vercel inspect URL --wait --timeout 2m`. Do not guess or
construct a deployment URL. Expected: the commit is pushed and the new
GitHub-triggered Preview reports `Ready`.

- [ ] **Step 5: Promote the Ready preview and verify production safely**

```bash
curl -sS -D - -o /dev/null https://a2o-style-lab.vercel.app/api/assessment-submit
```

Using the exact Ready Preview URL observed in Step 4, run `npx --yes vercel
promote URL --yes`. Read the exact Production URL from the successful output or
the next `npx --yes vercel list a2o-style-lab`, inspect that observed URL until
it reports `Ready`, then run `npx --yes vercel alias set URL
a2o-style-lab.vercel.app`. Expected: production reports `Ready`, the official
alias changes successfully, and the shown GET request to the POST-only endpoint
returns HTTP 405 JSON. Do not submit synthetic or real customer data merely for
deployment verification.

- [ ] **Step 6: Report the release**

Report the production URL, commit hashes, test/build evidence, Apps Script version update, and the fact that CRM data and login files were untouched.
