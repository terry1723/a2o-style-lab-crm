# Intake and Discovery

## Outcome

Produce a confirmed funnel brief without overwhelming the user or inventing
missing business, content, privacy, or account details.

## First Inspect, Then Ask

When a repository exists, read its instructions and identify:

- framework, package manager, entry routes, and hosting;
- existing homepage and protected application routes;
- authentication, CRM, storage, APIs, analytics, and environment-variable use;
- reusable components, design tokens, schemas, tests, and deployment workflow;
- dirty files or user work that must be preserved.

Record confirmed facts before asking questions already answered by the project.

## One-Question Interview Order

Ask the highest-impact unanswered question only. Explain why it matters when the
trade-off is not obvious.

1. **Visual material** — Ask which approved material is available using the
   stable choices `single-image` (recommended fastest), `question-images`,
   `presenter-video`, or `no-assets`. One approved image is enough to begin.
2. **Qualification outcome** — Who deserves human follow-up, and what observable
   answers make that lead suitable?
3. **Offer and promise** — What service is offered, what immediate value does
   the visitor receive, and what must not be promised?
4. **Audience and campaign** — Source, segment, market, language, device mix,
   and message used in the advertisement.
5. **Conversion action** — Staff contact, customer-initiated WhatsApp, booking
   link, report delivery, or a combination; define response time.
6. **Experience details** — Presenter or brand image, number of questions,
   fresh versus resume, and treatment of unqualified leads.
7. **Questions and logic** — Exact wording, approved option IDs and labels,
   branches, scoring, and result explanations.
8. **Media** — Images or masters, mappings, posters, audio, transcripts,
   captions, ownership, aspect ratio, durations, and replacement workflow.
9. **Capture** — Minimum contact fields, optional photo/document, allowed file
   types and size, and what the visitor may retry.
10. **Consent and privacy** — Purpose, retention, staff access, deletion,
   marketing use, and approved customer-facing wording.
11. **Integrations** — Storage owner, Sheet owner/tab/columns, WhatsApp number
    and exact message, analytics, attribution, and notification owner.
12. **Protected systems** — CRM, login, client data, APIs, and routes that must
    not be changed.
13. **Delivery** — Browser/device support, preview reviewer, production owner,
    domain, rollback, monitoring, and handoff.

## Intake Ledger

Maintain four sections throughout discovery:

```yaml
confirmed_decisions: []
recommended_defaults: []
open_questions: []
risks_and_boundaries: []
```

Never record an assumption as confirmed. A recommended default must state why
it fits and what would change if rejected.

## Approval Gate

Before implementation, present a concise brief covering:

- campaign → experience → qualification → conversion journey;
- scenes, questions, answer logic, and result;
- contact/upload fields, consent, retention, and staff workflow;
- public frontend, trusted server, private storage, Sheet, and WhatsApp;
- systems explicitly out of scope;
- browser, testing, preview, production, and rollback acceptance criteria;
- missing inputs and actions requiring account authority.

Do not treat approval of the visual direction as approval to modify live data or
deploy. Keep those authority gates explicit.

## Suitable and Unsuitable Uses

Strong fit:

- the lead needs education before booking;
- answers materially change qualification or follow-up;
- a presenter builds trust;
- the business can follow up promptly;
- the experience offers genuine immediate value.

Weak fit:

- one contact field is sufficient and questions add no decision value;
- users need urgent support rather than qualification;
- the business cannot protect uploaded personal data;
- no staff member owns follow-up;
- long video creates friction without improving trust or selection.
