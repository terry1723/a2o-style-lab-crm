# A2O Assessment Lead Pipeline Design

## Objective

Connect the public four-video image assessment to a private Supabase Storage
bucket and the existing Google Sheet without changing the CRM or Portal
applications.

The public website must only show a successful submission after both the photo
upload and the Google Sheet row write have succeeded.

## Confirmed Scope

- Store each submitted full-body photo in a private Supabase Storage bucket.
- Append each completed assessment to spreadsheet
  `1Xi_u4DYkkMtpl7ClpaxwOyGjU7VAud6d8_uQGmQRHcY`, sheet `工作表1`.
- Keep the existing four questions, lead form, consent text, videos, and public
  homepage experience.
- Stop the assessment flow from creating or updating rows in the CRM `clients`
  table.
- Do not modify CRM or Portal pages, routes, data access code, or database
  schema.
- Deploy the completed integration through the existing Vercel project
  `a2o-s-projects/a2o-style-lab`.

## Out of Scope

- Generating the personal image report.
- Sending WhatsApp messages.
- Adding the assessment leads to the CRM.
- Changing CRM or Portal authentication, screens, records, or workflows.
- Building a permanent public photo gallery or a new staff dashboard.

## Selected Architecture

Use Vercel Serverless Functions as the trusted boundary between the public
browser, Supabase, and a Google Apps Script web app.

The browser never receives the Supabase service-role key, the Apps Script
shared secret, or any Google authorization credential.

### Components

1. **Assessment frontend**
   - Requests a one-time signed upload URL from Vercel.
   - Uploads the selected photo directly to Supabase Storage.
   - Sends the assessment payload and resulting storage path to Vercel.
   - Shows success only after the final API response confirms the Sheet write.

2. **Vercel upload-signing endpoint**
   - Validates the session ID, file extension, and MIME type.
   - Creates a non-identifying object path.
   - Returns a one-time Supabase signed upload token.

3. **Private Supabase Storage bucket**
   - Bucket name: `assessment-photos`.
   - Public access disabled.
   - Maximum object size: 10 MB.
   - Allowed types: JPEG, PNG, and WebP.
   - Object paths use year, month, session ID, and a random UUID. Client names
     and phone numbers never appear in filenames.

4. **Vercel submission endpoint**
   - Validates the complete lead payload.
   - Creates a seven-day signed photo URL for A2O staff use.
   - Calls the Apps Script endpoint with a server-only shared secret.
   - Returns success only when Apps Script confirms a row was written or the
     same Session ID already exists.

5. **Google Apps Script web app**
   - Accepts calls only when the shared secret matches.
   - Uses a script lock to serialize concurrent writes.
   - Uses Session ID as the idempotency key.
   - Appends one row to `工作表1` and returns structured JSON.

## Data Flow

1. The customer finishes question four and selects a photo.
2. The frontend requests an upload token with `sessionId`, MIME type, file
   extension, and file size.
3. Vercel validates the request and returns a signed upload token and storage
   path.
4. The browser uploads the original file directly to the private bucket.
5. The customer enters a name and WhatsApp number and confirms consent.
6. The frontend submits the contact fields, four answers, result, attribution,
   and storage path to Vercel.
7. Vercel normalizes the Hong Kong phone number, validates all fields, creates
   a seven-day signed photo URL, and calls Apps Script.
8. Apps Script appends the row or returns the existing Session ID result.
9. The frontend displays the existing one-to-two-working-day confirmation.

## Google Sheet Schema

The existing empty sheet `工作表1` will receive one frozen header row with the
following columns in this exact order:

| Column | Header | Value |
| --- | --- | --- |
| A | 提交時間 | Hong Kong submission timestamp |
| B | Session ID | Assessment idempotency key |
| C | 稱呼／姓名 | Customer-entered name |
| D | WhatsApp | Normalized `+852` phone number |
| E | Q1評分 | Selected 1–10 score |
| F | Q2場合 | Selected answer label |
| G | Q3機會 | Selected answer label |
| H | Q4優先項目 | Selected answer label |
| I | 初步結果 | Calculated result title |
| J | 相片Storage路徑 | Durable private bucket object path |
| K | 7日限時相片連結 | Seven-day signed Supabase URL |
| L | UTM來源 | `utm_source`, blank when absent |
| M | 狀態 | Initial value `新提交` |

The header row will use clear A2O-compatible formatting, remain frozen, and
preserve the rest of the currently empty workbook.

## Validation Rules

- Name: trimmed, non-empty, maximum 80 characters.
- WhatsApp: Hong Kong eight-digit number with optional `852` or `+852` prefix;
  stored as `+852########`.
- Consent: must be `true`.
- Answers: exactly one approved option ID for each of `q1`, `q2`, `q3`, and
  `q4`.
- Photo: required, JPEG/PNG/WebP, at most 10 MB.
- Storage path: must start with the expected year/month/session prefix and must
  belong to `assessment-photos`.
- Session ID: 16–80 safe URL characters.

## Privacy and Security

- Supabase Storage remains private; no public bucket URL is created.
- The seven-day signed link is operational convenience, not the permanent
  source of truth. Column J keeps the durable private path after Column K
  expires.
- Service credentials are stored only as encrypted Vercel environment
  variables.
- Client photos, names, and phone numbers are never written to source control,
  test fixtures, filenames, analytics events, or application logs.
- Error messages returned to the browser do not expose upstream credentials or
  raw provider responses.
- The Apps Script endpoint rejects missing or invalid shared secrets.

## Idempotency and Failure Handling

- Session ID is the unique submission key in the Google Sheet.
- Repeating the final request with the same Session ID returns success without
  appending a duplicate row.
- A failed photo upload leaves the customer on the form with all entered values
  preserved.
- A successful photo upload followed by a failed Sheet write can be retried
  using the same storage path.
- The success panel is never shown for a partial failure.
- Provider failures use a concise Cantonese retry message and are recorded
  without personal data.

## CRM Isolation

The assessment submission service will no longer call `saveClient`. The change
is limited to the assessment feature and new serverless integration modules.

The following remain unchanged:

- `app/src/pages/CrmLogin.tsx`
- `app/src/pages/CrmStylingPool.tsx`
- `app/src/pages/CrmDashboard.tsx`
- `app/src/pages/Portal.tsx`
- `app/src/pages/PortalStaff.tsx`
- `app/src/lib/clientData.ts`
- Existing Supabase CRM tables and migrations

## Configuration

The integration requires these encrypted Vercel variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET=assessment-photos`
- `APPS_SCRIPT_WEBHOOK_URL`
- `APPS_SCRIPT_SHARED_SECRET`

The existing public variables remain unchanged:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Testing and Verification

1. Unit-test validation, phone normalization, payload mapping, idempotency
   handling, and frontend error preservation.
2. Verify tests fail before each corresponding production implementation.
3. Test the Vercel endpoints with mocked Supabase and Apps Script responses.
4. Verify the private bucket rejects public reads and enforces MIME and size
   limits.
5. Submit one synthetic end-to-end test lead with a generated non-person photo.
6. Confirm exactly one Sheet row, one private Storage object, and no CRM client
   row are created for the synthetic Session ID.
7. Remove the synthetic row and object after recording the verification result.
8. Run the full test suite, lint, TypeScript build, and production build.
9. Deploy to Vercel production and smoke-test the homepage, photo upload,
   successful Sheet append, duplicate prevention, and existing CRM hash route.

## Deployment Sequence

1. Create and format the Sheet header.
2. Create the Apps Script code and complete the one-time Google authorization.
3. Create the private Supabase bucket and obtain the service-role key through
   the authenticated Supabase dashboard.
4. Add encrypted variables to Vercel Production and Preview environments.
5. Implement and verify the serverless endpoints and frontend integration.
6. Run the synthetic end-to-end test and clean up its test data.
7. Deploy production and complete live smoke tests.
