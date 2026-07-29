# Optional Assessment Photo Design

## Goal

Allow a customer to submit the public A2O assessment without a full-body photo,
while keeping the existing private-photo workflow unchanged when a photo is
provided.

## Customer Experience

- The final form labels the full-body photo upload as optional.
- A customer may submit name, WhatsApp number, height, weight, consent, and
  four assessment answers without a photo.
- A customer who selects a valid photo follows the existing upload and preview
  flow.
- The completion message clearly states that an uploaded photo will be used as
  part of the analysis.

## Data Flow

`AssessmentLeadInput.photo` becomes optional. The client skips signed-upload
creation and upload receipt generation when no photo exists. The submission API
accepts either a complete valid photo/receipt pair or no photo fields at all.

When a photo exists, the API preserves the current private Supabase Storage
verification and signed-read URL generation. When it does not exist, the API
writes an empty `photoPath` and `photoSignedUrl` to the Google Sheet, while all
other lead fields and answers remain unchanged.

## Constraints

- A partial photo payload (only a path or only a receipt) is invalid.
- Existing photo submissions continue to use `assessment-photos` and current
  storage validation.
- No CRM tables, existing rows, staff login, booking, or appointment data is
  changed.
- The existing consent checkbox remains required.

## Validation

- UI test proves a no-photo form submission succeeds.
- Client API test proves no upload call is made without a photo.
- Server test proves no-photo submissions append a blank photo path and URL.
- Existing photo-path tests continue to pass.
- Assessment and API regression suites plus a production build pass.
