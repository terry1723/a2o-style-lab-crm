# WhatsApp CTA and Soundtrack Volume Design

## Goal

Replace every assessment restart control with a WhatsApp enquiry action and
raise the soundtrack to the approved levels without changing the fresh-session
behaviour, lead form, CRM, Google Sheet, or Supabase integrations.

## WhatsApp Destination

Both new actions use this exact URL:

```text
https://wa.me/85254077240?text=%E4%BD%A0%E5%A5%BD%EF%BC%8C%E6%88%91%E5%95%B1%E5%95%B1%E5%AE%8C%E6%88%90%E5%92%97%E7%B6%B2%E7%AB%99%E4%B8%8A%E5%98%85%E5%BD%A2%E8%B1%A1%E5%88%86%E6%9E%90%EF%BC%8C%E6%83%B3%E4%BA%86%E8%A7%A3%E4%B8%80%E4%B8%8B%E8%87%AA%E5%B7%B1%E5%8F%AF%E4%BB%A5%E9%BB%9E%E6%A8%A3%E6%94%B9%E5%96%84%E5%BD%A2%E8%B1%A1%E3%80%82
```

The actions open WhatsApp in a new tab with `noopener noreferrer` protection.
Every click records the existing `whatsapp_clicked` assessment analytics event.

## Header Action

- Remove the circular restart button from the assessment header.
- While the assessment is active (questions 1–4), render a circular WhatsApp
  button in the same position.
- Use a WhatsApp/message icon consistent with the existing header controls.
- Its accessible name is `WhatsApp 免費了解我的形象問題`.
- Do not show this header action on the opening cover or completed result layer;
  the result layer has its own full-width action.

## Result Action

- Remove the bottom `重新開始檢測` text button from the completed assessment
  result component.
- Replace it in the same location with a prominent pink full-width link button.
- Visible text and accessible name are both
  `WhatsApp 免費了解我的形象問題`.
- The CTA remains available both before and after successful lead submission.
- The existing photo/contact form remains unchanged.

## Restart Behaviour

- Remove all customer-facing assessment restart controls.
- The internal fresh-session behaviour remains unchanged: opening or reloading
  the public page creates a new assessment at question 1.
- Keep internal restart-safe cleanup code where it is required by unmount or
  stale asynchronous test coverage; do not expose a restart UI.

## Soundtrack Levels

- Increase the soundtrack scene/dialogue target from `0.10` to `0.20`.
- Increase the question/submitting/result target from `0.18` to `0.32`.
- Keep the existing 240 ms fade, reduced-motion handling, Web Audio gain path,
  iOS Safari safety, mute synchronization, restart-safe lifecycle, and failure
  isolation.
- Do not modify the supplied soundtrack file or Martin's video audio.

## Scope Boundaries

Do not change:

- Assessment questions, answer options, scoring, or video ordering
- Photo upload or contact fields
- Lead submission API
- CRM routes, authentication, or customer records
- Google Sheet integration
- Supabase Storage or database logic
- The WhatsApp phone number or encoded message supplied by the user

## Testing

Add or update tests to prove:

- No `重新開始診斷` or `重新開始檢測` control is rendered.
- The active assessment header contains the circular WhatsApp link with the
  exact accessible name and URL.
- The opening cover does not show the header WhatsApp action.
- The result layer contains the full CTA before and after lead submission.
- Both links open a new tab safely and emit `whatsapp_clicked`.
- Web Audio and element-volume fallback paths use `0.20` for scenes and `0.32`
  for prompts/results.
- Existing Safari no-skip, soundtrack lifecycle, fresh-session, submission, and
  CRM-boundary tests remain green.

Run targeted tests, the full test suite, production build, lint, and diff check.
Smoke-test the Vercel preview on mobile and desktop, verify the WhatsApp href
without sending a message, and visit the CRM login route read-only before
promoting the exact reviewed deployment to production.

## Acceptance Criteria

- Customers cannot restart the assessment from any visible control.
- Active questions show a circular WhatsApp action in the former restart
  position.
- The result card shows the approved full WhatsApp CTA.
- Both actions use the exact supplied link and record analytics.
- Soundtrack levels are 20% during Martin videos and 32% during
  questions/results.
- Reloading still starts a completely fresh assessment.
- CRM and lead data systems remain unchanged.
