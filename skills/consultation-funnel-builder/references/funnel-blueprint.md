# Funnel Blueprint

## Journey

```text
campaign
  → opening promise
  → sequential visual questions
  → qualification result
  → upload/contact and consent
  → trusted submission
  → WhatsApp handoff
  → human follow-up
```

The advertising channel supplies intent and attribution. The website replaces a
static lead form when an interactive consultation adds education, trust, or
qualification value; it does not replace the advertising platform itself.

## Visual-Mode State Models

Image modes:

```text
opening → question → preparing-next-question → question
```

Video mode:

```text
opening → scene-playing ↔ playback-recovery → question
→ preparing-next-scene → scene-playing
```

Both modes then converge:

```text
question → upload-and-contact → submitting ↔ submission-error
→ success → whatsapp-handoff
```

Allowed shared transitions:

- image mode may show the first question after the opening action without a
  media-completion event;
- `single-image` keeps one approved image mounted for every question;
- `question-images` preloads and commits the mapped next image before replacing
  the question, without a blank stage;
- video `opening → scene-playing` begins from a start gesture;
- video `scene-playing → question` requires the active video's genuine `ended`;
- video `scene-playing ↔ playback-recovery` handles rejection, stall, or error;
- final `question → upload-and-contact` after answer validation;
- `upload-and-contact → submitting` after local validation and consent;
- `submitting → success` only after every required operation succeeds or an
  idempotent duplicate is confirmed;
- `submitting → submission-error → submitting` without losing retryable inputs;
- `success → whatsapp-handoff` when the visitor chooses the approved CTA.

Do not apply video `ended` or playback recovery to static-image mode. In video
mode, never create `timeout → question`; it silently skips consultation content.

## Configuration as Source of Truth

Keep stable IDs and customer copy in one typed/configured source:

```yaml
funnel_id:
visual_strategy:
opening:
assets:
questions:
  - question_id:
    prompt:
    options:
results:
capture_fields:
consent:
whatsapp:
audio_targets:
```

Tests, analytics, Sheet mapping, and media manifests should use stable IDs, not
localized labels as identifiers.

## Experience Rules

- Start the chosen experience only after the visitor presses the opening CTA.
- Keep the stage mounted and visually stable across scene changes.
- Disable repeated answer selection while preparing the next question/scene.
- Show clear progress without implying saved cross-visit progress unless resume
  is intentionally implemented.
- Decide fresh-start, resume, and restart independently. If every visit is
  fresh, remove misleading resume/restart controls and obsolete persistence.
- Preserve selected file and contact values after retryable submission failure.
- Provide honest recovery states rather than jumping ahead.

## Responsive Layout

- Mobile: portrait stage, readable options, keyboard-safe form, visible primary
  CTA, and no hover-only controls.
- Desktop: preserve the portrait experience centrally; use a restrained ambient
  background rather than stretching portrait media.
- Tablet: verify both orientations and avoid controls trapped below the fold.
- Keep Chinese labels readable and allow long option text to wrap.

## Accessibility

- Semantic buttons, links, headings, form labels, errors, and progress.
- Visible keyboard focus and logical tab order.
- Accessible names for icon-only audio, playback, and WhatsApp actions.
- Sufficient contrast and touch targets.
- Respect reduced motion; never encode qualification only by colour.
- Captions or equivalent transcript support for spoken content where required.

## Measurement

Useful events use non-personal stable IDs:

```text
funnel_opened
assessment_started
scene_play_started
scene_play_recovered
question_answered
capture_started
submission_succeeded
submission_failed
whatsapp_clicked
```

Measure completion, qualified-lead rate, submission rate, WhatsApp click rate,
booked consultation rate, and attended consultation rate. Never log names,
phone numbers, photos, free text, or signed file URLs in analytics.
