# Image-First Funnel Onboarding Design

## Goal

Update `consultation-funnel-builder` so a new user does not need presenter
videos before starting. The skill must introduce the information and assets it
will eventually need, then ask about available visual material as its first
intake question.

The fastest recommended MVP uses one approved business, consultant, or service
image throughout the question journey. Multiple images and presenter videos
remain upgrade paths.

## First Interaction

After inspecting any destination repository and protected systems, the skill's
first user-facing response must briefly explain that the build will eventually
need:

- company, offer, and target-customer information;
- qualification questions and answer options;
- an approved image or video asset;
- required lead fields and consent wording;
- Google Sheet ownership/schema;
- WhatsApp destination and approved prefilled message;
- hosting, preview, production, and operational owners.

This list is orientation, not a batch questionnaire. The agent must still ask
only one material question at a time.

The first question is:

> 你而家可以提供邊一種主要視覺素材？如果未有影片，一張代表公司、顧問或服務嘅相片已經可以開始。

Use these stable choices:

| Option ID | User-facing choice | Meaning |
| --- | --- | --- |
| `single-image` | 一張主視覺相片（推薦，最快） | Reuse one approved image through the complete question flow. |
| `question-images` | 每條問題一張相片 | Map one approved image to each question or section. |
| `presenter-video` | 已有問題影片 | Use the existing browser-safe presenter-video workflow. |
| `no-assets` | 暫時未有素材，先用示範圖片 | Build a clearly labelled prototype with synthetic placeholders only. |

After this answer, the next question returns to business qualification: which
lead deserves human follow-up and which observable answers identify that lead.

## Visual Modes

### Single image — recommended default

- Use one approved photo as the persistent central visual.
- The same image may replace all four A2O-style presenter scenes; another
  business is not required to have four questions.
- Show questions and options sequentially over or beside the image.
- Optional motion is limited to subtle CSS fade, light, or slow scale effects.
- Respect `prefers-reduced-motion` by removing non-essential animation.
- No autoplay, media-completion gate, soundtrack, or Safari playback recovery
  is required unless audio/video is added separately.

### One image per question

- Give every image and question a stable ID and explicit mapping.
- Preload the next image, keep the current stage visible, then crossfade after
  answer selection.
- Use an approved fallback poster if an image cannot load.
- Never reveal an old homepage, unrelated brand asset, or blank stage.

### Presenter video

- Retain the existing same-gesture, visible-frame, no-hidden-audio, genuine
  `ended`, manual recovery, Safari/Chrome, soundtrack, and stable-buffer rules.
- Video is an enhancement, not the default entry requirement.

### No assets yet

- Use only clearly labelled synthetic placeholders in a local or explicitly
  non-production prototype.
- Do not copy A2O imagery, Martin, room scenes, videos, soundtrack, questions,
  or branding.
- Do not connect real personal-data collection, live Sheet, live WhatsApp, or
  production deployment until assets and privacy/integration inputs are
  approved.

## State and Architecture Effects

The data pipeline remains media-agnostic:

```text
campaign → opening → visual question sequence → qualification
→ optional private upload/contact → trusted Sheet write → WhatsApp handoff
```

Visual-mode state differs:

```text
image modes: opening → question → preparing-next-question → question
video mode: opening → scene-playing/recovery → question → preparing-next-scene
```

Both modes converge on the same qualification, capture, consent, private
storage, idempotent Google Sheet, WhatsApp, analytics, preview, and deployment
rules.

## Skill Changes

Update:

- `SKILL.md` trigger wording, first interaction, workflow, quick reference, and
  example;
- `references/intake-and-discovery.md` so media availability is first and
  qualification second;
- `references/funnel-blueprint.md` with media-agnostic and image-mode states;
- `references/media-and-browser-playback.md` with the four visual strategies;
- `assets/new-funnel-brief.yaml` with a stable visual-mode selection;
- `assets/content-and-media-manifest.yaml` with image/video asset types and
  optional question mapping;
- the human playbook with the image-first recommended MVP;
- forward-test records and the packaged `.skill` archive.

Do not change the live A2O homepage, videos, CRM, login, client data, private
storage, Google Sheet integration, WhatsApp URL, or deployed site.

## TDD and Forward Tests

### RED test

Run the current skill against a new-business request that has no videos but has
one approved consultant image. The current skill is expected to fail because it
asks qualification first and describes a video-led default instead of starting
with a visual-material choice.

### GREEN tests

1. **Single-image startup** — first response provides the short requirement
   orientation and asks only the exact visual-material question.
2. **Single-image architecture** — recommends one persistent image, sequential
   questions, reduced-motion-safe subtle effects, and no video-only gates.
3. **Question-images mode** — maps stable image/question IDs and crossfades
   without a blank or wrong fallback.
4. **Presenter-video mode** — retains the proven Safari no-skip rules.
5. **No-assets mode** — permits only a labelled synthetic prototype and blocks
   real data/integrations/production until approval.

Existing CRM-boundary, privacy, Sheet, WhatsApp, deployment, and Safari tests
must remain valid.

## Packaging and PR

- Run the official source validator.
- Confirm all references/assets remain linked and valid YAML.
- Scan source and archive for placeholders, secrets, customer data, A2O phone,
  and Sheet ID.
- Rebuild and validate the extracted `.skill` archive.
- Commit focused changes, push `codex/assessment-lead-pipeline`, and verify Draft
  PR #1 contains the new commit.

## Acceptance Criteria

- The first intake question is the approved visual-material question.
- One static image is clearly the recommended fastest mode.
- The skill no longer assumes a four-video or four-question funnel.
- The same single image may persist across the complete question flow.
- Image modes do not inherit unnecessary autoplay, `ended`, soundtrack, or
  Safari playback requirements.
- Video mode retains all proven playback safeguards.
- The website-to-Sheet-to-WhatsApp data and conversion architecture is unchanged.
- No A2O-specific asset or personal data enters the portable skill.
