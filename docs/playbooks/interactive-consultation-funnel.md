# Interactive Consultation Funnel Playbook

## What This Is

`consultation-funnel-builder` packages the process learned from building A2O's
interactive image assessment into a reusable Codex skill. It helps a new
business move from campaign traffic to an immediate qualification experience,
trusted lead delivery, WhatsApp conversion, and human follow-up.

It is not an A2O website clone. Every company must confirm its own audience,
offer, questions, media, consent, data fields, Sheet schema, WhatsApp message,
branding, browser support, and production authority.

## Funnel Pattern

```text
Facebook / Instagram / Google campaign
  → mobile-first interactive consultation
  → presenter scenes and qualification questions
  → optional private upload and contact consent
  → trusted, idempotent Google Sheet delivery
  → WhatsApp CTA
  → owned human follow-up
```

This may replace a static lead form when interactive education and qualification
add value. It does not replace the advertising platform itself.

## Deliverables in the Skill

- one-question-at-a-time discovery workflow;
- reusable funnel and state blueprint;
- Safari/Chrome media and soundtrack guidance;
- private upload, Sheet, idempotency, privacy, CRM, and WhatsApp guidance;
- failure library based on the A2O build;
- preview, production, rollback, and handoff checklist;
- new-funnel brief and media-manifest templates;
- evidence-based A2O case study with no customer data or credentials.

The approved design is recorded in
`docs/superpowers/specs/2026-07-20-portable-consultation-funnel-skill-design.md`.

## How to Invoke It

After installation, use a request such as:

```text
用 $consultation-funnel-builder 幫 Terry AI Lab 規劃一個由廣告去AI顧問諮詢、Google Sheet同WhatsApp轉化嘅漏斗。
```

The skill first inspects the destination project and asks one material question
at a time. It creates a confirmed brief before implementation and does not
assume that A2O content or technology applies.

## Source, Project Copy, and Personal Installation

The authoritative editable source is:

```text
skills/consultation-funnel-builder/
```

To make a project-local copy, place that complete folder in the destination
repository's supported skills directory and keep `SKILL.md`, `agents/`,
`references/`, and `assets/` together. Follow the destination repository's
agent instructions if its discovery path differs.

For a personal Codex installation, copy the complete folder into the user's
Codex skills directory, normally:

```text
~/.codex/skills/consultation-funnel-builder/
```

Restart or refresh the Codex environment so the skill catalogue is reloaded.
The packaged `dist/consultation-funnel-builder.skill` archive can be sent to
another person; extract it so the top-level skill folder remains intact.

## Updating the Skill

1. Edit the repository source, not an installed copy.
2. Add or update a realistic baseline/forward-test scenario for the new lesson.
3. Keep detailed knowledge in the relevant reference, not in an oversized
   `SKILL.md`.
4. Run the official validator, secret scan, and archive extraction test.
5. Commit the source and rebuild the `.skill` archive.
6. Replace installed copies only after the repository source passes tests.

## What Must Never Be Shared

- customer names, phone numbers, photos, measurements, answers, or reports;
- CRM exports or screenshots containing client information;
- service-role keys, webhook secrets, Google credentials, environment files;
- live signed upload links;
- A2O videos, soundtrack, posters, branding, phone number, or Sheet identifiers
  unless the owner separately authorizes that distribution;
- claims that an integration or deployment succeeded without verification.

## A2O Lessons Preserved

- audio can start before picture if hidden playback is sequenced incorrectly;
- unmounting or stale posters can flash an old homepage between scenes;
- Safari may skip later videos if a missing paused-frame callback advances the
  state machine;
- only the active video's genuine completion should reveal its question;
- browser-compatible codecs and stable public URLs matter when media is replaced;
- fresh/resume semantics and fallback visuals must be explicit configuration;
- private uploads, trusted validation, Session-ID idempotency, and CRM isolation
  must be designed before connecting providers;
- automation scrolling can look like a real mobile defect;
- operator documentation must change with runtime settings;
- promote the exact reviewed preview commit, not an unreviewed rebuild.

The detailed evidence is bundled in
`skills/consultation-funnel-builder/references/a2o-case-study.md`.

## Ownership

Every deployed funnel needs named owners for media, hosting, storage, Sheet,
WhatsApp follow-up, privacy/deletion requests, incidents, and production
rollback. A technically working form without owned follow-up is not a complete
conversion system.
