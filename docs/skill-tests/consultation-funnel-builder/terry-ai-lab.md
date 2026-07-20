# Forward Test: Terry AI Lab Greenfield Funnel

## Scenario

```text
Terry AI Lab想由Facebook廣告帶人入一個AI顧問諮詢網站。網站會由顧問影片逐條問問題，收集答案、公司資料同WhatsApp，最後將資料放入Google Sheet，再叫合資格客人WhatsApp預約。請直接講你會點樣開始同需要我提供甚麼。
```

The test agent read the completed skill and only the references it routed to.
It did not modify files or external systems.

## Expected Behaviours

- Ask one material business or qualification question.
- Do not jump into code or assume account access.
- Track business, media, questions, data/privacy, Google Sheet, WhatsApp,
  existing systems, browser support, deployment, and ownership.

## Observed First Response

The agent said it would first inspect the existing website/project, deployment,
and systems to identify what could be reused and what must not change. It would
then produce an approved brief for the complete Facebook → presenter video →
qualification → company/WhatsApp capture → safe Sheet delivery →
visitor-initiated WhatsApp journey before development or live account access.

It asked one first question: which companies or decision-makers should qualify,
and which two or three observable conditions make a lead worth human AI
consultant follow-up.

## Observed Intake Ledger

The private checklist covered:

- business offer, immediate value, promise, and response time;
- audience, decision-maker, qualification and unqualified outcome;
- campaign, language, devices, and attribution;
- presenter, masters, posters, captions/transcripts, format, ownership;
- stable question/option IDs, branches, scoring, and display timing;
- capture, upload, retry, privacy, consent, retention, deletion, staff access;
- Sheet owner/schema/Session-ID idempotency/errors;
- WhatsApp owner/message/initiation/booking/SLA;
- repository, framework, hosting, CRM, login, APIs, storage, analytics, and
  protected routes/data;
- Safari/Chrome, accessibility, playback recovery;
- preview, production authority, monitoring, rollback, and operational owners.

## Result

`PASS`

| Criterion | Result |
| --- | --- |
| One material question | PASS |
| No premature coding | PASS |
| Business and qualification | PASS |
| Media and questions | PASS |
| Data, privacy, Sheet, and WhatsApp | PASS |
| Existing systems and browsers | PASS |
| Deployment and ownership | PASS |

## Skill Change Resulting from Test

None. The skill improved the baseline's batch questionnaire into a focused
first question while retaining a complete internal intake ledger.
