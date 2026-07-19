# Data, Privacy, and Integrations

## Default Trust Boundary

```text
public browser
  ├── requests short-lived upload authorization
  ├── uploads directly to private object storage
  └── submits approved fields and storage path
trusted server endpoint
  ├── validates and normalizes
  ├── creates time-limited staff access when needed
  └── performs idempotent Google Sheet write
```

The browser must never receive service-role keys, Google credentials, webhook
shared secrets, or unrestricted storage access.

## Data-Minimization Record

For every field, record:

```yaml
field_id:
purpose:
required:
validation:
destination:
retention:
staff_access:
deletion_process:
analytics_allowed: false
```

If a field does not change qualification, fulfilment, safety, or follow-up,
remove it. Avoid sensitive free text when approved options are sufficient.

## Private Uploads

- Allowlist MIME type, extension, and maximum size at both authorization and
  upload boundaries.
- Generate paths from date partition, Session ID, and random identifier.
- Never use customer name, phone, company, or email in an object name.
- Keep the bucket private. Store a durable object path as the source of truth.
- Generate short-lived staff links only on a trusted server and record expiry.
- Define deletion, orphan cleanup, access owner, and retention before launch.
- Do not commit real photos or use them as fixtures.

## Server Validation

- Trim and normalize contact values; validate locale-specific phone rules only
  after the target market is confirmed.
- Accept answer IDs only from the deployed configuration allowlist.
- Validate exact question coverage and reject unknown or duplicate IDs.
- Require affirmative consent when personal data or uploads are collected.
- Validate the object path belongs to the expected session and bucket prefix.
- Return customer-safe errors; keep provider detail out of the browser and
  personal data out of logs.

## Idempotency and Partial Failure

Use a stable, random Session ID as the submission key.

- A repeated final request with the same Session ID returns the prior successful
  outcome instead of appending a second Sheet row.
- A failed upload leaves the selected file and form values available for retry.
- A completed upload followed by a failed Sheet write reuses the verified object
  path rather than creating unnecessary duplicates.
- Never show success after storage-only or Sheet-only completion when both are
  required.
- Track orphaned uploads privately for bounded cleanup without putting client
  data in application logs.

## Google Sheet Contract

Define and freeze a schema before implementation:

```yaml
spreadsheet_owner:
spreadsheet_id_environment_variable:
tab_name:
idempotency_column: session_id
columns:
  - submitted_at
  - session_id
  - approved_contact_fields
  - approved_answer_fields
  - qualification_result
  - private_storage_path
  - expiring_staff_link
  - attribution
  - operational_status
```

Use a trusted connector or server-to-server webhook, serialize concurrent row
writes where necessary, and verify structured success. Do not expose the Sheet
as an anonymous public write surface without authentication, validation, rate
limits, and abuse review.

## WhatsApp Conversion

Confirm:

- owning business number;
- exact prefilled message and language;
- whether the visitor initiates contact or staff sends first;
- qualified and unqualified experience;
- response-time promise and staff owner;
- privacy implications of moving the conversation to WhatsApp;
- click analytics containing no personal data.

A `wa.me` CTA is a conversion action, not evidence that a message was sent or a
booking was completed. Open external links safely and never send a smoke-test
message to a live number.

## CRM and Authentication Isolation

Default to a separate public assessment submission path. Before implementation:

1. list protected routes, tables, services, migrations, and login files;
2. add boundary tests that fail if the funnel imports or calls CRM write logic;
3. avoid schema migrations when private storage and Sheet delivery satisfy the
   approved requirement;
4. smoke-test login and CRM routes read-only after preview and production;
5. require explicit user approval for any later CRM sync or customer merge.

## Secrets and Environments

- Store secrets only in encrypted hosting/environment configuration.
- Use separate preview and production values where practical.
- Document variable names and owners, never secret values.
- Do not echo credentials into terminal output, screenshots, test records, or
  generated documentation.
- Rotate a credential if exposure is suspected; do not merely delete it from a
  later commit.
