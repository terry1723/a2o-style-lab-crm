# Consultation Funnel Builder Baseline Test

## Purpose

Record what a capable fresh agent proposes without access to the A2O case
study, approved design, or `consultation-funnel-builder` skill. This is the RED
baseline for deciding what the skill must add.

## Scenario

```text
Terry AI Lab想由Facebook廣告帶人入一個AI顧問諮詢網站。網站會由顧問影片逐條問問題，收集答案、公司資料同WhatsApp，最後將資料放入Google Sheet，再叫合資格客人WhatsApp預約。請直接講你會點樣開始同需要我提供甚麼。
```

The test agent was instructed not to inspect the repository, local files,
other agents, or any skill/design documents.

## Response Summary

The agent correctly began with the qualification objective rather than visual
design. It proposed an MVP journey from Facebook advertising through a
video-led assessment, scoring, contact capture, Google Sheet delivery, and
WhatsApp booking. It asked for the service, audience, qualification criteria,
media format, questions, conversion destination, Sheet fields, brand assets,
analytics, hosting access, and privacy wording.

Its proposed process covered question and branch design, mobile-first UX,
video planning, Sheet fields, qualified and unqualified outcomes, analytics,
test data, and campaign optimisation.

However, it requested a batch of inputs rather than conducting a
one-question-at-a-time discovery. It also omitted repository inspection,
existing CRM/auth isolation, private upload architecture, video completion
gating, Safari-specific playback constraints, trusted credential boundaries,
exact preview promotion, and a complete idempotency rule.

## Score

| Behaviour | Score | Evidence |
| --- | --- | --- |
| `one_question_at_a_time_intake` | missing | Returned a long list of requested inputs and then asked for three groups together. |
| `existing_repository_discovery` | missing | Asked which platform exists but did not make repository and existing-system inspection the first technical step. |
| `business_qualification_goal` | present | Explicitly prioritised the target customer and qualification criteria before interface work. |
| `media_manifest_and_transcripts` | partial | Asked about presenter format, subtitles, tone, and duration but did not define stable asset mapping or a manifest. |
| `question_end_event_gate` | missing | Did not state that answers must remain hidden until the active question video genuinely ends. |
| `safari_and_chrome_strategy` | missing | Mentioned mobile testing but no browser-specific playback policy or recovery. |
| `private_upload_boundary` | missing | Did not define private storage, signed upload, or trusted server credentials. |
| `google_sheet_idempotency` | partial | Mentioned duplicate-data handling but did not define a stable session key or partial-failure retry semantics. |
| `whatsapp_conversion_definition` | present | Asked whether conversion is a WhatsApp conversation, booking link, or staff follow-up and proposed separate outcomes. |
| `crm_and_auth_isolation` | missing | Did not inspect or protect an existing CRM, login system, or customer data by default. |
| `consent_and_privacy` | present | Explicitly requested privacy policy and collection-consent wording. |
| `preview_and_exact_commit_promotion` | missing | Proposed testing and optimisation but no reviewed preview, exact-commit production promotion, or rollback record. |

## Required Skill Improvements

The skill must retain the baseline's strong business-first discovery while
adding these behaviours:

1. Inspect the destination repository and protected systems before proposing
   implementation.
2. Ask one material question at a time and maintain an intake ledger instead
   of presenting a large questionnaire.
3. Define a stable content and media manifest, real video-completion gates, and
   browser-specific playback recovery.
4. Separate public collection from private storage, trusted integrations,
   credentials, CRM, and authentication.
5. Define Session-ID idempotency and retry-safe partial-failure behaviour for
   private uploads and Google Sheets.
6. Verify Safari and Chrome separately and promote the exact reviewed preview
   commit to production with a rollback record.

## Baseline Result

`RED` — the general approach is commercially sensible, but the response does
not contain enough implementation, browser, data-integrity, or deployment
discipline to reproduce the proven A2O pattern safely in another project.
