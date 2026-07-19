# Consultation Funnel Handoff Checklist

## Source and Release

- [ ] Editable source repository and branch recorded
- [ ] Production commit and deployment ID recorded
- [ ] Preview URL and production URL recorded
- [ ] Rollback commit and authorized rollback owner recorded
- [ ] Unrelated user changes excluded from the release

## Content and Media

- [ ] Business owns or has permission to use every presenter, image, video, font,
  soundtrack, transcript, and testimonial
- [ ] Master-media owner and replacement procedure recorded
- [ ] Stable media manifest updated with checksums and browser evidence
- [ ] Opening, fallbacks, questions, options, results, consent, and WhatsApp copy
  approved

## Accounts and Data

- [ ] Hosting owner recorded
- [ ] Private-storage owner, retention, deletion, and staff access recorded
- [ ] Google Sheet owner, tab, schema, idempotency column, and follow-up owner
  recorded
- [ ] WhatsApp number owner, approved message, and response-time promise recorded
- [ ] Credential names and owners recorded without storing secret values
- [ ] CRM/auth protected boundaries and any approved integration recorded

## Verification Evidence

- [ ] Targeted and full relevant tests passed
- [ ] Type check, lint, build, and diff check completed
- [ ] Mobile, tablet, and desktop layout checked
- [ ] Safari and Chrome full sequences checked independently
- [ ] Playback rejection, stall, and manual recovery checked
- [ ] Private upload, Sheet write, retry, and duplicate Session ID checked
- [ ] Synthetic storage/Sheet records removed when authorized
- [ ] CRM and login routes smoke-tested read-only
- [ ] WhatsApp destination inspected without sending a live message
- [ ] Analytics inspected for absence of personal data

## Operations

- [ ] Customer follow-up owner and working hours recorded
- [ ] Report/service delivery owner recorded
- [ ] Incident owner and escalation path recorded
- [ ] Monitoring metrics and review date recorded
- [ ] Known limitations and unresolved risks recorded
- [ ] Staff know how to access private files after expiring links lapse
- [ ] Data access and deletion request process communicated

## Sign-off Record

```yaml
funnel_id: ""
source_commit: ""
preview_deployment: ""
production_deployment: ""
rollback_commit: ""
approved_by: ""
approved_at: ""
post_launch_owner: ""
next_review_date: ""
known_risks: []
```
