# A2O Interactive Image Assessment Case Study

## Scope and Evidence

This case study distils the A2O Style Lab production build completed in July
2026. Confirmed facts come from the repository's assessment design specs, tests,
implementation, and commit history. It contains no lead records, uploaded
photos, credentials, service-role keys, or reusable A2O media.

## Business Problem

A2O received leads from Facebook/Instagram forms and Google Forms. Some visitors
submitted casually, forgot the enquiry, or lost motivation before next-day
follow-up. The selected response was an immediate, presenter-led website
experience that asked four image questions, collected a full-body photo plus
name and WhatsApp, promised a report within one to two working days, and
continued through WhatsApp.

The reusable principle is not “use four questions.” It is: give campaign traffic
an immediate, relevant consultation experience that creates commitment and
qualification before staff follow-up.

## Confirmed Experience

- The visitor presses the start CTA before the first Martin video plays.
- Four portrait question videos play sequentially with options after each video.
- The production version does not use authored transition videos.
- The desktop keeps a central portrait experience with dark ambient fill.
- Every visit starts fresh; incomplete progress is not restored.
- The opening and fallbacks use one dark consultation-room sofa visual family.
- After the questions, the visitor supplies a front-facing full-body photo,
  name, WhatsApp number, and consent.
- A WhatsApp enquiry CTA is available during the assessment and at result.
- Background music targets are 20% during presenter scenes and 32% during
  questions/results, with fades and global mute.

## Data Architecture

The public assessment is isolated from CRM writes and login changes.

```text
browser → signed one-time upload → private Supabase Storage
browser → Vercel trusted endpoint → validated Google Apps Script → Google Sheet
result → visitor-initiated WhatsApp CTA
```

The trusted path validates contact/answer data, uses a Session ID for
idempotency, stores a durable private object path, and may create an expiring
staff link. Browser code does not receive trusted provider credentials. Success
requires both required storage and Sheet operations.

## Failure Timeline and Learning

### First implementation

The interactive homepage, videos, questions, lead form, and CRM boundary were
created. Later iterations connected private photo storage and Sheet delivery.

### Cover and session inconsistency

Restored local progress allowed later-scene lifestyle posters to appear behind
the opening overlay. The fix made every visit a new session, removed resume
semantics, and used one canonical dark opening/fallback poster.

**Reusable lesson:** session semantics and fallback imagery are product
configuration, not incidental component state.

### Audio before picture and homepage flash

The hidden next buffer began audible playback before a decoded frame was
visually committed. Re-rendering/loading behaviour could also expose the old
homepage. The solution retained stable media layers, prepared the next source
silently, committed the visual layer first, and only then enabled audible
playback.

**Reusable lesson:** network preload and visual readiness are different; media
and overlay state must preserve visual continuity.

### Safari skipped q2–q4

Chrome completed the flow, while Safari could fail a paused-frame readiness
path and dispatch a fallback that revealed the next question without its video.
Regression tests reproduced the missing callback and playback rejection. The
final rule is that only the active video's genuine `ended` event reveals its
question. Safari receives a visible manual play/reload recovery path; a timeout
never advances to answer choices.

**Reusable lesson:** build browser-policy failure as a recoverable state, not a
content-skip state.

### Replacement media and soundtrack

Four MOV masters were converted to H.264/AAC MP4 under stable question URLs.
Soundtrack playback begins inside the opening gesture, uses state-based fading,
Web Audio gain with fallback, global mute, and stale-promise cleanup. Later CTA
feedback raised targets from 10%/18% to 20%/32%.

**Reusable lesson:** keep stable IDs/URLs, inspect real codecs, centralize audio
targets, and update operator documentation with runtime configuration.

### Mobile automation false positive

A semantic automation click auto-scrolled a lower target, making the header
appear off-screen. A real coordinate tap with scroll evidence showed the layout
was correct.

**Reusable lesson:** reproduce automation observations with user-like gestures
before diagnosing application layout.

## Verification Evidence

The final assessment branch recorded:

- 21 test files and 140 passing tests;
- successful TypeScript/Vite production build;
- lint with zero errors and unrelated existing warnings;
- clean scoped diff review;
- no changes to CRM pages, login, lead submission, Sheet, Storage, or media in
  the final WhatsApp/music adjustment;
- preview review followed by promotion of the same feature commit.

These counts describe the A2O repository at that release and are not generic
acceptance thresholds for future projects.

## What to Reuse

- business-first qualification and immediate value;
- one-question-at-a-time discovery for new implementations;
- stable state/config/media IDs;
- genuine video-completion gates and explicit recovery;
- private upload plus trusted idempotent Sheet delivery;
- default separation from established CRM/auth systems;
- synthetic cross-browser preview verification and exact-commit promotion;
- human handoff, response-time promise, and WhatsApp conversion ownership.

## What Not to Copy

- Martin, the room, posters, videos, music, A2O copy, colours, phone number, or
  Sheet schema;
- the assumption that every business needs four questions or a photo;
- Supabase/Vercel when the destination has a safe existing equivalent;
- claims that the experience replaces the advertising channel or guarantees
  more clients.

## Repository Evidence

- `docs/superpowers/specs/2026-07-19-assessment-lead-pipeline-design.md`
- `docs/superpowers/specs/2026-07-19-assessment-cover-playback-sync-design.md`
- `docs/superpowers/specs/2026-07-19-safari-video-and-soundtrack-design.md`
- `docs/superpowers/specs/2026-07-19-whatsapp-cta-and-soundtrack-volume-design.md`
- assessment feature history from `2dadb04` through `8fdcfe6`
