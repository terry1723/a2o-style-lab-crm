# Image-First Onboarding RED Test

## Scenario

```text
我想幫一間顧問公司整篩選網站，暫時冇影片，但有一張已批准使用嘅顧問相。請用 $consultation-funnel-builder 開始。
```

The test agent read the committed Skill before any image-first changes and did
not modify files or external systems.

## Expected Behaviours

```yaml
first_question_is_visual_material_choice: true
single_image_is_recommended_fastest_mode: true
one_image_can_persist_across_all_questions: true
image_mode_omits_video_completion_gate: true
asks_only_one_question: true
```

## Observed First Response

The current Skill said it would inspect the project and protected CRM/auth
boundaries, record the approved consultant image, and wait for an approved
brief. Its first question asked which customers should qualify and which
observable answers make them worth human follow-up.

## Observed Architecture

The current Skill allows `video / image / text / mixed / confirm` as a format,
but its blueprint remains:

```text
opening → scene-playing → question → preparing-next-scene → scene-playing
```

It does not define a dedicated image-only state model, recommend one image as
the fastest default, keep the same consultant image mounted throughout the
questions, or remove the video `ended` gate from image mode.

## Result

`FAIL` — expected RED.

| Criterion | Result |
| --- | --- |
| First question is visual-material choice | FAIL |
| Single image is recommended fastest | FAIL |
| One image persists across all questions | FAIL |
| Image mode omits video completion gate | FAIL |
| Only one question asked | PASS |

## Required GREEN Change

Add a first visual-material choice with four stable modes, make `single-image`
the recommended MVP, define media-agnostic state routing, and apply video-only
playback requirements only when `presenter-video` is selected.
