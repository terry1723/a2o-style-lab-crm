# Image-First Visual Modes GREEN Test

## Scenario

```text
我想幫一間顧問公司整篩選網站，暫時冇影片，但有一張已批准使用嘅顧問相。請用 $consultation-funnel-builder 開始。
```

The test agent read the updated Skill and relevant bundled references/assets.
It simulated all four visual choices without modifying files or external
systems.

## Observed First Response

The agent briefly oriented the user to company/service, target customer,
questions/answers, capture and consent, Google Sheet, WhatsApp, and preview/
production ownership. It then asked only:

> 你而家可以提供邊一種主要視覺素材？如果未有影片，一張代表公司、顧問或服務嘅相片已經可以開始。

It offered:

- `single-image` — 一張主視覺相片（推薦，最快）
- `question-images` — 每條問題一張相片
- `presenter-video` — 已有問題影片
- `no-assets` — 暫時未有素材，先用示範圖片

After a choice, the next question asks which lead should qualify and which
observable answers make that lead worth human follow-up.

## Visual-Mode Results

### `single-image` — PASS

- Uses `opening → question → preparing-next-question → question → result`.
- Keeps the same approved image and stage mounted for any question count.
- Allows subtle CSS fade/light/slow-scale effects with reduced-motion removal.
- Adds no autoplay, soundtrack, buffering, `ended`, or Safari video recovery.
- Is explicitly the recommended fastest MVP.

### `question-images` — PASS

- Uses stable image/question IDs and explicit mappings.
- Preloads the next mapped image before crossfade.
- Keeps the current stage mounted and an approved fallback visible on failure.
- Cannot flash a blank stage, old homepage, or unrelated image.

### `presenter-video` — PASS

- Starts audible playback from a real user gesture.
- Commits the intended visible active layer before sound.
- Reveals questions only after the active video's genuine `ended`.
- Rejection, stall, error, and timeout stay in manual recovery instead of
  skipping.
- Requires separate Safari and Chrome full-flow verification.

### `no-assets` — PASS

- Uses clearly labelled neutral synthetic prototype content only.
- Copies no A2O assets.
- Collects no real personal data and connects no live Storage, Sheet, WhatsApp,
  or production environment.
- Requires approved content, privacy, accounts, and authority before production.

## Shared Invariants — PASS

Every mode retains:

- a separate public submission path and protected CRM/auth boundary;
- private short-lived upload authorization when file capture is required;
- server validation, consent, non-identifying paths, and secret isolation;
- Session-ID idempotent Google Sheet writes and no partial success;
- approved WhatsApp destination/message/owner without fake send confirmation;
- data minimization, retention, deletion, and non-personal analytics;
- retry-safe form/upload behaviour;
- responsive, accessible, reduced-motion-aware verification;
- exact-preview promotion, rollback, monitoring, and authority gates.

## Final Score

| Criterion | Result |
| --- | --- |
| Short requirements orientation | PASS |
| Exact visual-material question first | PASS |
| Four stable choices | PASS |
| Only one first question | PASS |
| Persistent single-image fastest mode | PASS |
| Image modes omit video-only rules | PASS |
| Question-image mapping and continuity | PASS |
| Presenter-video Safari safeguards | PASS |
| Synthetic-only no-assets mode | PASS |
| Qualification asked second | PASS |
| CRM/data/Sheet/WhatsApp/deployment invariants | PASS |

## Skill Change Resulting from Test

None. The initial GREEN run satisfied every approved image-first requirement.
