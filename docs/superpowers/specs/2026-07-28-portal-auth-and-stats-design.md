# Portal Authentication and Statistics Removal Design

## Goal

Make the staff portal accept only the current PIN stored in Supabase and remove the five dashboard summary cards that expose client and revenue totals.

## Root Cause

The production deployment is still built from `main`, which uses the browser-side `verifyStaffDb()` flow. If the public Supabase configuration is unavailable, that helper falls back to a hard-coded legacy PIN, so a Supabase update cannot invalidate it. The isolated release branch already contains `/api/staff-login`, which reads `staff_profiles` using the server-side Supabase admin client and has rate limiting; releasing that branch removes the fallback.

## Approved Design

1. Replace the Portal's local hard-coded PIN check with an asynchronous POST to `/api/staff-login`.
2. On a `200 { authenticated: true }` response, retain the existing session marker (`a2o_staff_auth`) and navigate to `/portal/staff`.
3. Treat every non-success response as a generic invalid-password error. Do not add a browser fallback to `verifyStaff()` or `verifyStaffDb()`.
4. Retain the existing server endpoint, its Supabase service-role boundary, request validation, and rate limiting. No migration and no change to `staff_profiles` data is required.
5. Remove only the five top-of-dashboard aggregate cards: 總客戶, 進行中, 已完成, 總銷售額, 已收款. Leave the client list, filters, appointments, service actions, photos, CRM data, and logout behavior unchanged.

## Error Handling

- Network/server failures show a generic temporary-login-failure message without exposing Supabase details.
- Invalid credentials show the existing generic password-error message.
- The loading state disables the login button while the request is in progress.

## Verification

- Portal tests prove it calls the server endpoint, does not call the legacy helper, stores staff auth only after a successful response, and rejects an old-PIN response.
- Portal staff rendering tests prove all five aggregate labels are absent while normal client-management controls remain.
- Run the focused tests, then full test suite, lint, and production build.
- Confirm the deployed portal rejects the legacy PIN and accepts the Supabase PIN without submitting or changing CRM data.

## Scope Boundaries

- No CRM rows, client data, service data, Supabase schema, or login PIN values will be modified.
- No customer-facing homepage or assessment changes are included.
