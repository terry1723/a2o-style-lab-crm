---
name: consultation-funnel-builder
description: Use when creating, adapting, diagnosing, or launching an interactive consultation, assessment, or lead-qualification website, especially when the journey uses static images or presenter videos, sequential questions, private uploads, Google Sheets, WhatsApp conversion, or an existing CRM that must remain isolated.
---

# Consultation Funnel Builder

## Purpose

Build a reusable campaign-to-consultation journey that qualifies a lead before
human follow-up. Treat the A2O implementation as a proven case study, never as
a brand template to copy.

## Non-Negotiable Rules

1. Inspect the destination repository, instructions, framework, routes,
   integrations, authentication, CRM boundaries, and deployment configuration
   before proposing implementation.
2. Ask one material intake question at a time. Maintain a private ledger of
   confirmed decisions, assumptions, missing inputs, and risks.
3. Confirm the visual-material mode first, then the business objective,
   qualification outcome, and conversion action before designing the interface.
4. Present a funnel brief and architecture for user approval before changing
   code or external systems.
5. Never request secrets in chat, expose them to browser code, or commit them.
6. Never copy A2O customer data, contact details, media, branding, Sheet IDs, or
   credentials into another business.
7. Preserve existing CRM, authentication, customer data, and production routes
   unless the user explicitly authorizes a defined change.
8. Do not claim an upload, Sheet write, WhatsApp send, or deployment succeeded
   without direct verification.

## Workflow

### 1. Discover the Existing Environment

- Read repository instructions and relevant documentation completely.
- Detect framework, package manager, hosting, API boundaries, storage, Sheets,
  analytics, authentication, and CRM code.
- Record systems that must remain unchanged.
- If no repository exists, record the approved greenfield stack instead of
  silently choosing one.

Read [intake-and-discovery.md](references/intake-and-discovery.md) for the
ordered interview and decision gates.

### 2. Interview One Decision at a Time

Orient the user briefly: the build will eventually need company/offer and target
customer information, approved questions and answers, one image or video,
capture fields and consent, Google Sheet ownership/schema, WhatsApp destination
and message, plus hosting, preview, production, and day-to-day operational
owners. This is orientation, not a batch questionnaire.

Always ask this first question:

> 你而家可以提供邊一種主要視覺素材？如果未有影片，一張代表公司、顧問或服務嘅相片已經可以開始。

Offer these stable choices:

- `single-image` — 一張主視覺相片（推薦，最快）
- `question-images` — 每條問題一張相片
- `presenter-video` — 已有問題影片
- `no-assets` — 暫時未有素材，先用示範圖片

After the visual choice, ask which audience or lead should qualify and which
observable answers make that lead worth human follow-up. Then proceed through
offer, campaign promise, questions, capture fields, consent, integrations,
WhatsApp, browser support, deployment, and ownership. Do not send the user a
long questionnaire unless they explicitly ask for a form.

Copy [new-funnel-brief.yaml](assets/new-funnel-brief.yaml) into the destination
project and update it after each confirmed answer.

### 3. Confirm the Funnel Design

Define:

```text
campaign → opening → visual question sequence → qualification result
→ upload/contact → trusted submission → WhatsApp handoff → human follow-up
```

Separate facts from recommendations and open questions. Confirm the question
order, answer options, qualification/scoring, completion condition, response
promise, and treatment of unqualified leads.

Read [funnel-blueprint.md](references/funnel-blueprint.md) for the state model,
responsive experience, accessibility, and reference architecture.

### 4. Prepare Content and Media

- Assign stable asset, scene, and question IDs before naming public files.
- Record asset type, source, mapping, dimensions, and relevant browser checks in
  [content-and-media-manifest.yaml](assets/content-and-media-manifest.yaml).
- Default `single-image` to one approved persistent visual across every question.
  It may use subtle CSS fade, light, or slow scale effects that disappear under
  reduced motion. It does not need autoplay, soundtrack, a video completion
  gate, or Safari playback recovery.
- For `question-images`, preload stable image/question mappings and crossfade
  without unmounting the current stage or exposing a blank/wrong fallback.
- For `presenter-video`, convert to a browser-compatible format, keep the active
  visual stable, reveal a question only after its active video's genuine
  completion, and provide accessible playback recovery.
- For `no-assets`, use labelled synthetic placeholders only. Do not collect real
  personal data or connect live integrations/production until approved.

Read [media-and-browser-playback.md](references/media-and-browser-playback.md)
for the selected visual mode and load its video sections only when needed.

### 5. Build with Tests First

- Model allowed states and transitions before UI components.
- Write failing tests for question order, completion gates, retries, duplicate
  submission, CRM boundaries, and browser-specific regressions.
- Implement the smallest change that passes each test.
- Reuse the destination project's architecture and components where sensible.
- Keep opening, assessment, submission, success, and recovery states accessible
  on mobile, tablet, and desktop.

For a reported defect, reproduce the symptom before proposing a fix. Consult
[failure-patterns.md](references/failure-patterns.md) for known symptoms,
evidence, corrective patterns, and regression tests.

### 6. Connect Data Safely

Default trusted flow:

```text
browser → short-lived upload authorization → private object storage
browser → validated server endpoint → idempotent Google Sheet write
success → approved WhatsApp CTA or staff handoff
```

- Put service credentials only in trusted server environment variables.
- Use non-identifying private object paths and a stable Session ID.
- Normalize and allowlist all fields server-side.
- Preserve inputs after retryable failures.
- Show success only when every required operation succeeds or a verified
  idempotent duplicate is recognized.
- Keep the public funnel outside existing CRM writes by default.

Read [data-privacy-and-integrations.md](references/data-privacy-and-integrations.md)
before implementing storage, Sheets, personal data, consent, CRM, or WhatsApp.

### 7. Verify and Launch

- Run targeted tests, full relevant tests, type checks, lint, and build.
- Verify mobile, tablet, desktop, Safari, and Chrome in proportion to audience
  risk.
- Use synthetic leads and non-personal media; remove test records afterwards.
- Inspect WhatsApp destinations without sending a real message.
- Smoke-test protected CRM and login routes read-only.
- Review a preview deployment, then promote that exact commit to production.
- Record rollback commit, account owners, known risks, and post-launch owner in
  [handoff-checklist.md](assets/handoff-checklist.md).

Read [verification-and-launch.md](references/verification-and-launch.md) before
claiming completion or deploying.

## Authority Gates

Stop and request direction before any of these actions if authority is absent:

- modifying CRM or authentication logic or data;
- creating or changing storage access policies;
- editing a live Google Sheet or Apps Script;
- changing a production WhatsApp number or prefilled message;
- adding or rotating credentials;
- sending external messages;
- promoting a preview to production;
- deleting test or production data.

Read [a2o-case-study.md](references/a2o-case-study.md) only when historical
evidence or the origin of a rule is useful. Do not load it for a simple intake.

## Quick Reference

| Need | Load |
| --- | --- |
| Start a new business funnel | `intake-and-discovery.md` + `new-funnel-brief.yaml` |
| Design journey and states | `funnel-blueprint.md` |
| Choose images/video and prepare assets | `media-and-browser-playback.md` + media manifest |
| Debug a known symptom | `failure-patterns.md` |
| Add uploads, Sheets, consent, CRM, WhatsApp | `data-privacy-and-integrations.md` |
| Test, deploy, or hand off | `verification-and-launch.md` + handoff checklist |
| Understand the proven source case | `a2o-case-study.md` |

## Example

**User:** 用 `$consultation-funnel-builder` 幫 Terry AI Lab 整一個AI顧問篩選網站。

**Agent:** 我會先檢查現有專案同需要保留嘅系統。之後需要公司／服務、目標客人、問題、視覺素材、收集資料、Google Sheet、WhatsApp，以及hosting、preview、production同日常營運負責人。第一條問題：你而家可以提供邊一種主要視覺素材？如果未有影片，一張代表公司、顧問或服務嘅相片已經可以開始。

Offer `single-image`, `question-images`, `presenter-video`, and `no-assets`.
After the user chooses, ask which lead deserves human follow-up and which
observable answers identify that lead.

After each answer, ask the next highest-impact question, update the brief, and
continue until business, content, data, conversion, and delivery inputs are
confirmed. Then present the journey and architecture for approval. Build with
tests, connect only authorized accounts, verify a preview with synthetic data,
and hand off the source, configuration record, deployment, and rollback path.
Never pretend missing media, consent, credentials, or account access exists.
