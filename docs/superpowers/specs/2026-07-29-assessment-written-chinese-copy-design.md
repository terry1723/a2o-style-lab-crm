# Assessment Written Chinese Copy Design

## Goal

Restore the public A2O interactive assessment landing flow to natural Traditional
Chinese written language. Keep the existing calm, personal A2O tone without
using overly formal terms such as `閣下` or `閣下的`.

## Scope

Only customer-facing copy in the public assessment flow will change:

- Landing-screen heading and supporting text
- Four question captions, questions, and answer options
- Final lead-form heading, labels, validation errors, upload guidance, and
  submission confirmation

The CRM, staff portal, appointment calendar, Google Sheet integration, field
names, API contracts, and stored lead data remain unchanged.

## Copy Rules

- Use Traditional Chinese written language suitable for Hong Kong customers.
- Prefer `你`, `你的`, `目前`, `我們`, and `可以`.
- Replace colloquial particles and wording such as `而家`, `依家`, `我哋`,
  `嘅`, `喺`, `揀`, and `噉` where they appear in public assessment copy.
- Do not use `閣下`, `閣下的`, or stiff bureaucratic language.
- Preserve factual promises, including the 1–2 working-day WhatsApp follow-up.
- Preserve existing questions, options, required fields, and user actions.

## Implementation

Update only the assessment configuration and lead-form/result components. Add
tests that assert representative written-language copy appears in the landing,
question, and form states, while the existing behaviour remains unchanged.

## Validation

- Targeted component tests cover the rewritten public copy.
- Existing assessment tests and a production build pass.
- Inspect the changed strings for banned formal terms and remaining colloquial
  wording in the public assessment files.
