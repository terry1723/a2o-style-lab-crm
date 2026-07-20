# A2O Assessment Profile Fields Design

Date: 2026-07-20
Status: Approved direction, awaiting written-spec review

## Objective

Update the final assessment step so a lead provides the information needed for
an initial image assessment before uploading one front-facing full-body photo.
The four question videos, answer flow, private photo storage, CRM data, CRM
login, and portal login remain unchanged.

## Final-step experience

Use one vertically ordered form rather than a multi-page wizard. The controls
appear in this order:

1. `稱呼／姓名`
2. `WhatsApp 電話號碼`
3. `身高（cm）`
4. `體重（kg）`
5. `上傳正面全身相`
6. Existing privacy consent
7. `提交並製作個人檢測報告`

All five data/photo fields and consent are required. The photo selector stays
at the bottom of the form and keeps the existing preview, file-type, 10 MB
limit, remove, and retry behaviour. A failed submission preserves every field
and the selected photo.

## Validation

- Name: trimmed, 1–80 characters.
- Phone: an eight-digit Hong Kong number with optional `852` or `+852`, using
  the current normalisation rules.
- Height: whole-number centimetres from 120 through 230.
- Weight: kilograms from 35 through 200, allowing one decimal place.
- Photo: one JPEG, PNG, or WebP file no larger than 10 MB.
- Consent: must be checked.

Validation runs in the browser for immediate feedback and again in the Vercel
server endpoint. The server never trusts client-supplied numeric values.

## Data flow

`AssessmentLeadInput` gains numeric `heightCm` and `weightKg` fields. The lead
pipeline sends them with the existing name, phone, answers, attribution, photo
path, and upload receipt. The server validates both numbers before generating
the existing result labels and Google Sheet row.

The private Supabase Storage upload flow does not change. No photo is written
to Google Sheet; the Sheet continues to receive the private object path and the
time-limited signed review URL.

## Google Sheet compatibility

Preserve the existing A:M column order and all existing rows. Add two columns
at the end only:

- N: `身高（cm）`
- O: `體重（kg）`

The Apps Script webhook appends the two validated numeric values after the
existing status column. Its reviewed source and README change from A:M to A:O,
and the live Apps Script deployment must be updated before the website change
is promoted to production. No existing row is rewritten or moved.

## Error handling

- Empty or out-of-range height and weight show specific Traditional Chinese
  guidance and block submission.
- Server-side validation failures return the existing generic
  `invalid_submission` response without exposing implementation details.
- Upload or Sheet failures retain the user's complete form state for retry.
- Existing rate limits, upload receipts, and duplicate-session protection stay
  in place.

## Tests and release checks

Add regression coverage for:

- the visible field order and photo-last layout;
- required and range validation for height and weight;
- the submitted lead input containing numeric height and weight;
- lead-pipeline propagation to `/api/assessment-submit`;
- server validation rejecting missing, malformed, and out-of-range values;
- Google Sheet rows including height and weight without changing A:M;
- the Apps Script row shape using A:O.

Before release, run the focused tests, full Vitest suite, ESLint, and production
build. Deploy through the existing GitHub-to-Vercel flow, verify the production
API route without submitting real customer data, and leave CRM routes and data
untouched.
