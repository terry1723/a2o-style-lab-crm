# Portable Consultation Funnel Builder Skill Design

## Goal

Turn the proven A2O interactive image-assessment homepage into a portable,
shareable Codex skill that can be reused for Terry AI Lab and other consulting
businesses.

The skill must help a user define, build, integrate, test, and hand off an
advertising-to-consultation funnel consisting of:

1. an advertisement or campaign link;
2. a mobile-first interactive website;
3. sequential video-led qualification questions;
4. optional photo or file collection;
5. contact and consent capture;
6. private storage and Google Sheet delivery;
7. WhatsApp conversion and human follow-up.

It is a reusable operating method, not a copy of the A2O website.

## Intended Users

- Terry AI Lab, when building consultation funnels for its own services;
- Codex users building a new funnel for another company;
- consultants, agencies, and service businesses that need to educate or
  qualify a lead before a human consultation;
- developers taking over an existing funnel implementation.

## Selected Storage Model

Use a hybrid source-of-truth model.

### Versioned project record

The A2O repository will contain a human-readable playbook recording the
business model, architecture, decision history, failures, fixes, security
boundaries, and launch process. This preserves the evidence behind the method.

### Portable Codex skill

The repository will also contain the source of a self-contained skill package.
Its folder can be copied to another project, installed in a user's Codex skills
directory, or sent to another person. All knowledge required for ordinary use
must travel inside the skill package.

The repository copy is the authoritative editable source. An installed copy is
a distribution of that source, not a second place to edit independently.

## Skill Package

Working name: `consultation-funnel-builder`.

Proposed structure:

```text
skills/consultation-funnel-builder/
├── SKILL.md
├── agents/
│   └── openai.yaml
├── references/
│   ├── intake-and-discovery.md
│   ├── funnel-blueprint.md
│   ├── media-and-browser-playback.md
│   ├── data-privacy-and-integrations.md
│   ├── failure-patterns.md
│   ├── verification-and-launch.md
│   └── a2o-case-study.md
└── assets/
    ├── new-funnel-brief.yaml
    ├── content-and-media-manifest.yaml
    └── handoff-checklist.md
```

The skill will contain no live customer information, credentials, downloaded
client photos, production database exports, or A2O-owned media.

## Trigger and User Experience

The skill description will trigger when a user asks to create, adapt, diagnose,
or launch an interactive consultation, assessment, or lead-qualification
funnel, especially one using video, Google Sheets, private uploads, or
WhatsApp.

When invoked for a new business, the skill will not immediately copy the A2O
implementation. It will:

1. inspect the destination repository and existing systems;
2. identify what is already available and what must remain untouched;
3. interview the user one decision at a time;
4. produce a confirmed funnel brief and architecture;
5. create an implementation plan;
6. build and test the funnel using the destination project's conventions;
7. connect the approved integrations;
8. deploy only within the authority granted by the user;
9. produce a handoff record that can be reused later.

## Intake Contract

The skill will collect only information that materially changes the funnel.
The reusable brief will cover:

### Business and conversion

- company, offer, audience, and target market;
- campaign source and landing-page objective;
- who should qualify or be filtered out;
- promised next step and response time;
- primary conversion channel and WhatsApp destination.

### Consultation experience

- presenter or brand character;
- number and order of scenes;
- video, image, audio, and poster assets;
- questions, approved options, scoring, and result logic;
- whether answers appear only after each video's genuine completion;
- fresh-session, resume, restart, accessibility, and fallback behaviour.

### Lead capture and operations

- required contact fields;
- photo or document upload requirements;
- consent and privacy wording;
- Google Sheet ownership, tab, and columns;
- storage provider and private-access policy;
- idempotency key, retry behaviour, staff handoff, and retention;
- existing CRM/authentication boundaries that must not change.

### Technical delivery

- existing repository, framework, package manager, and hosting provider;
- supported browsers and devices;
- analytics and attribution requirements;
- preview, approval, production, rollback, and ownership arrangements.

The skill will recommend sensible defaults but will obtain confirmation for
choices that affect personal data, external services, production deployment,
or an existing CRM.

## Reusable Funnel Architecture

The default reference architecture separates the public assessment from
trusted integrations:

```text
Campaign
   ↓
Interactive consultation website
   ↓
Qualification answers + consent
   ↓
Private upload using a short-lived signed token
   ↓
Trusted server endpoint
   ├── Google Sheet row
   ├── private storage path
   └── attribution / operational status
   ↓
WhatsApp CTA and human consultation
```

The browser must not receive service-role keys, Google authorization
credentials, or shared webhook secrets. Success must not be shown until every
required operation has succeeded or an idempotent duplicate has been safely
recognized.

This architecture is a default, not a mandatory technology lock-in. The skill
must first reuse the destination project's existing stack where safe and
appropriate.

## Lessons Preserved from A2O

The A2O case study will preserve both successful decisions and failure modes.
The reusable rules include:

### Media playback

- Use stable, browser-compatible media URLs and encode portrait videos as
  H.264/AAC MP4 with fast-start-compatible metadata.
- Do not treat preloading metadata as proof that a decoded first frame is
  visible.
- Never allow the next video's audio to begin while the previous visual layer
  remains visible.
- Keep stable video layers during scene changes to avoid flashing the original
  homepage or an unrelated poster.
- Safari playback must stay inside a user gesture where required.
- Do not use hidden audible playback as a permission workaround.
- A preparation timeout or rejected `play()` must not skip the video and reveal
  the answer choices.
- Reveal a question only after its own active video's genuine `ended` event.
- Provide a visible manual play recovery action for browser-policy rejection,
  stalls, and recoverable media errors.
- Test Safari and Chrome separately; a Chrome success does not prove Safari
  behaviour.

### Soundtrack

- Start audio from a user gesture.
- Keep dialogue and prompt volume targets in one configuration source.
- Fade volume between speaking and answering states.
- Synchronize global mute across video and soundtrack.
- Treat soundtrack failure as non-blocking and clean up stale asynchronous
  playback on unmount.

### Session and visual continuity

- Make fresh-start versus resume behaviour an explicit product decision.
- Clear obsolete persistence when changing session semantics.
- Use one canonical opening and fallback visual family.
- Do not expose restart controls when every page visit intentionally begins a
  new assessment.

### Lead pipeline

- Keep public lead submission isolated from an existing CRM unless integration
  is explicitly approved.
- Store uploads privately with non-identifying object paths.
- Put credentials only on trusted server boundaries.
- Normalize and validate contact data server-side.
- Use a stable session ID for idempotency.
- Preserve entered data after retryable failures.
- Never report partial photo/Sheet completion as a successful submission.

### Testing and deployment

- Reproduce browser-specific failures with regression tests before fixing.
- Distinguish test-automation scrolling artefacts from real mobile layout
  defects.
- Verify mobile, tablet, desktop, Safari, and Chrome in proportion to the
  audience risk.
- Inspect CTA destinations without sending real messages.
- Use synthetic test leads and remove them after verification.
- Smoke-test existing CRM/login routes read-only.
- Promote the exact reviewed preview commit instead of rebuilding an
  unreviewed version for production.

## A2O-Specific Versus Reusable Material

The skill may cite A2O as a case study, but it must not assume that another
business uses:

- four questions;
- Martin as presenter;
- image consulting language;
- A2O colours, rooms, posters, music, or videos;
- the A2O WhatsApp number;
- the A2O Sheet schema;
- Supabase and Vercel when the destination already has safe equivalents.

All brand content, questions, data fields, providers, and conversion messages
must be supplied or confirmed for the new business.

## Skill Testing Strategy

Skill development will follow a baseline-and-forward-test workflow.

### Baseline without the skill

Run a realistic new-business request without access to the skill and record
important omissions or weak assumptions. The baseline must contain no real
credentials or customer data.

### Forward tests with the skill

Test at least these scenarios:

1. **Terry AI Lab greenfield funnel** — confirms the skill asks for the right
   business, content, media, integration, and conversion inputs before
   proposing a build.
2. **Existing CRM boundary** — confirms it detects an established login and
   customer database, then isolates the new public funnel unless integration
   is explicitly authorized.
3. **Safari media failure** — confirms it applies the no-skip, visible-frame,
   user-gesture, and recovery rules instead of exposing questions early.
4. **Incomplete source material** — confirms it clearly lists missing media,
   copy, consent, Sheet, storage, and WhatsApp inputs without fabricating them.

After each test, revise the skill only where the test exposes ambiguity,
missing guidance, or an unsafe default.

## Deliverables

The completed work will include:

- the portable `consultation-funnel-builder` skill folder;
- the installable skill metadata;
- a concise human-readable playbook;
- the detailed A2O case study and failure library;
- reusable intake, media-manifest, and handoff templates;
- validation results from the forward-test scenarios;
- instructions for copying or installing the skill in another project or
  another person's Codex environment;
- a distributable archive that contains no secrets or client assets.

## Acceptance Criteria

- Copying or installing the skill is sufficient for another Codex session to
  discover and use the method.
- Invoking it for a new company starts a structured, one-question-at-a-time
  discovery process.
- It can guide an end-to-end website, Google Sheet, private upload, and
  WhatsApp conversion implementation without assuming A2O branding.
- It protects existing CRM, authentication, data, and production systems by
  default.
- It preserves the key Safari, playback synchronization, session, storage,
  idempotency, privacy, and deployment lessons from the A2O build.
- It clearly separates confirmed facts, recommended defaults, missing inputs,
  and actions requiring user authorization.
- Its reference material and templates are usable by both a human developer
  and another Codex agent.

## Scope Boundaries

This work packages the method and operating knowledge. It does not, by itself:

- build the Terry AI Lab funnel;
- copy or redistribute A2O media;
- migrate A2O customer or CRM data;
- grant another user access to Google, Supabase, Vercel, or WhatsApp accounts;
- guarantee that every consulting business should replace its existing
  advertising or lead form;
- deploy a new client website without an approved brief and the required
  account access.

The funnel should be positioned as an interactive qualification and conversion
experience that may replace a static lead form for suitable campaigns. It does
not replace the advertising channel itself.
