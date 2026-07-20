# Verification and Launch

## Test Layers

### Configuration and state

- stable scene/question/option IDs and approved order;
- scoring/qualification and result mapping;
- allowed state transitions only;
- fresh/resume/restart behaviour;
- question hidden until its active video completes.

### Media

- container, codecs, dimensions, duration, progressive metadata, checksum;
- opening and fallback poster continuity;
- sound-before-picture regression;
- Safari recovery and no-skip behaviour;
- soundtrack targets, fades, mute, and cleanup.

### Data and security

- file type/size, contact normalization, consent, answer allowlist;
- storage path ownership and private access;
- credentials absent from browser/source/logs;
- Session-ID duplicate handling and partial-failure retry;
- Sheet mapping and structured upstream failure;
- CRM/auth boundary test.

### Interface

- mobile, tablet, and desktop layouts;
- Chinese wrapping, keyboard, form errors, touch targets, focus, contrast;
- reduced motion, captions/transcript policy, accessible recovery and icon names;
- CTA URL, safe new-tab attributes, and non-personal analytics.

## Browser Matrix

At minimum, verify the browsers used by the target campaign. For a Hong Kong
mobile consumer funnel, include current iPhone Safari and Android/desktop Chrome.
Do not infer Safari success from Chrome.

For every browser, complete:

1. fresh page load and opening poster;
2. start gesture and q1 playback;
3. every answer-to-next-video transition;
4. deliberate playback recovery where feasible;
5. final upload/contact validation;
6. retry after a simulated safe failure;
7. success and WhatsApp CTA inspection.

## Synthetic End-to-End Test

- Use a generated non-person photo or explicitly marked fixture.
- Use a synthetic name and reserved test contact format accepted by the test
  environment.
- Record the Session ID and expected Sheet/storage entries.
- Verify exactly one private object and one row.
- Verify no CRM record or auth change.
- Retry the same Session ID and confirm no duplicate row.
- Remove the synthetic row/object after evidence is recorded when authorized.

Never use an actual client, send a live WhatsApp message, or leave test personal
data in production.

## Preview Gate

Before production:

- targeted and full relevant tests pass;
- type check, lint, build, and diff check complete;
- the preview identifies its exact commit;
- reviewer completes mobile and desktop full flow;
- Safari and Chrome evidence is recorded;
- WhatsApp `href`, target, and safety attributes are inspected without sending;
- CRM login and protected routes receive a read-only smoke test;
- personal data, secrets, and unrelated dirty files are absent from the diff;
- rollback commit and owner are known.

## Production Promotion

Promote the exact reviewed preview commit. Do not rebuild an unreviewed working
tree and assume equivalence. After promotion:

- verify production commit/deployment ID;
- load the public opening page and complete a non-destructive smoke path;
- verify protected routes read-only;
- confirm monitoring/analytics receives no personal fields;
- record production URL, timestamp, deployment owner, and rollback path.

Deployment permission does not authorize CRM mutations, external messages, or
test-data deletion beyond the approved scope.

## Rollback and Monitoring

Define rollback triggers such as video skip, submission loss, duplicate rows,
public upload access, broken CRM/login route, or wrong WhatsApp destination.

Monitor:

- start-to-question and question-to-question completion;
- playback recovery/error rate by browser family;
- submission success/failure without personal payloads;
- duplicate detection and orphan-upload count;
- WhatsApp click and booked/attended consultation outcomes;
- response-time compliance.

## Handoff Evidence

Record:

- editable source and authoritative configuration;
- media master owner and replacement procedure;
- hosting, Sheet, storage, WhatsApp, analytics, and credential owners;
- data retention/deletion owner;
- preview and production URLs and commits;
- tests actually run and limitations;
- outstanding risks and next review date;
- who handles customer follow-up and incident response.
