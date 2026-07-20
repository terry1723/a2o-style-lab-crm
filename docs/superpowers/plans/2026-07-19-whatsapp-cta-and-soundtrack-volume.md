# WhatsApp CTA and Soundtrack Volume Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove normal assessment restart controls, replace them with the approved WhatsApp actions, and raise soundtrack gain targets to 20%/32% without touching lead or CRM systems.

**Architecture:** Store the exact WhatsApp destination and label in one assessment configuration module shared by the header and result card. Keep analytics context in `AssessmentEngine`, pass the result click callback into `AssessmentResult`, and preserve the internal fatal-error retry cleanup while removing normal restart UI. Change only the two soundtrack target constants so the existing Web Audio/fallback/fade lifecycle remains intact.

**Tech Stack:** Vite, React 18, TypeScript, Vitest, Testing Library, Lucide icons, Vercel.

---

## File Map

- Create `app/src/features/assessment/config/assessmentWhatsApp.ts`: exact destination URL and CTA label.
- Create `app/src/features/assessment/config/assessmentWhatsApp.test.ts`: immutable URL/label regression.
- Modify `app/src/features/assessment/components/AssessmentResult.tsx`: replace result restart with full WhatsApp CTA.
- Modify `app/src/features/assessment/components/AssessmentResult.test.tsx`: result CTA before/after submission and callback tests.
- Modify `app/src/features/assessment/components/AssessmentEngine.tsx`: header WhatsApp action, analytics, result callback, and 0.20/0.32 soundtrack constants.
- Modify `app/src/features/assessment/components/AssessmentEngine.test.tsx`: header visibility/href/analytics, no restart UI, and new gain targets.
- Do not modify lead form, API, CRM, authentication, Google Sheet, Supabase, media assets, or soundtrack file.

### Task 1: Centralize the WhatsApp Destination and Replace the Result CTA

**Files:**
- Create: `app/src/features/assessment/config/assessmentWhatsApp.ts`
- Create: `app/src/features/assessment/config/assessmentWhatsApp.test.ts`
- Modify: `app/src/features/assessment/components/AssessmentResult.tsx`
- Modify: `app/src/features/assessment/components/AssessmentResult.test.tsx`

- [ ] **Step 1: Write failing configuration and result tests**

Add exact constant assertions:

```ts
expect(ASSESSMENT_WHATSAPP_LABEL).toBe('WhatsApp 免費了解我的形象問題')
expect(ASSESSMENT_WHATSAPP_URL).toBe(
  'https://wa.me/85254077240?text=%E4%BD%A0%E5%A5%BD%EF%BC%8C%E6%88%91%E5%95%B1%E5%95%B1%E5%AE%8C%E6%88%90%E5%92%97%E7%B6%B2%E7%AB%99%E4%B8%8A%E5%98%85%E5%BD%A2%E8%B1%A1%E5%88%86%E6%9E%90%EF%BC%8C%E6%83%B3%E4%BA%86%E8%A7%A3%E4%B8%80%E4%B8%8B%E8%87%AA%E5%B7%B1%E5%8F%AF%E4%BB%A5%E9%BB%9E%E6%A8%A3%E6%94%B9%E5%96%84%E5%BD%A2%E8%B1%A1%E3%80%82',
)
```

Update the result test API from `onRestart` to `onWhatsAppClick`, then assert:

```ts
const onWhatsAppClick = vi.fn()
render(<AssessmentResult submitted={false} submitting={false} onSubmit={onSubmit} onWhatsAppClick={onWhatsAppClick} />)
const link = screen.getByRole('link', { name: ASSESSMENT_WHATSAPP_LABEL })
expect(link).toHaveAttribute('href', ASSESSMENT_WHATSAPP_URL)
expect(link).toHaveAttribute('target', '_blank')
expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
expect(screen.queryByRole('button', { name: '重新開始檢測' })).not.toBeInTheDocument()
await user.click(link)
expect(onWhatsAppClick).toHaveBeenCalledOnce()
```

Render `submitted={true}` separately and verify the same link remains present.

- [ ] **Step 2: Run the result/config tests and verify RED**

```bash
cd app
npm test -- src/features/assessment/config/assessmentWhatsApp.test.ts src/features/assessment/components/AssessmentResult.test.tsx
```

Expected: FAIL because the constants and `onWhatsAppClick` result CTA do not yet
exist and the restart button is still rendered.

- [ ] **Step 3: Add the shared WhatsApp constants**

Create:

```ts
export const ASSESSMENT_WHATSAPP_LABEL = 'WhatsApp 免費了解我的形象問題'
export const ASSESSMENT_WHATSAPP_URL = 'https://wa.me/85254077240?text=%E4%BD%A0%E5%A5%BD%EF%BC%8C%E6%88%91%E5%95%B1%E5%95%B1%E5%AE%8C%E6%88%90%E5%92%97%E7%B6%B2%E7%AB%99%E4%B8%8A%E5%98%85%E5%BD%A2%E8%B1%A1%E5%88%86%E6%9E%90%EF%BC%8C%E6%83%B3%E4%BA%86%E8%A7%A3%E4%B8%80%E4%B8%8B%E8%87%AA%E5%B7%B1%E5%8F%AF%E4%BB%A5%E9%BB%9E%E6%A8%A3%E6%94%B9%E5%96%84%E5%BD%A2%E8%B1%A1%E3%80%82'
```

- [ ] **Step 4: Replace the result restart control**

Change `AssessmentResult` props to receive `onWhatsAppClick: () => void`. Remove
the `RotateCcw` import and result restart button. Add a full-width pink link:

```tsx
<a
  href={ASSESSMENT_WHATSAPP_URL}
  target="_blank"
  rel="noopener noreferrer"
  onClick={onWhatsAppClick}
  className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-a2o-pink px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
>
  <MessageCircle className="h-4 w-4" />
  {ASSESSMENT_WHATSAPP_LABEL}
</a>
```

- [ ] **Step 5: Run targeted tests and verify GREEN**

```bash
cd app
npm test -- src/features/assessment/config/assessmentWhatsApp.test.ts src/features/assessment/components/AssessmentResult.test.tsx
```

Expected: all new configuration and result CTA tests pass.

- [ ] **Step 6: Commit Task 1**

```bash
git add app/src/features/assessment/config/assessmentWhatsApp.ts app/src/features/assessment/config/assessmentWhatsApp.test.ts app/src/features/assessment/components/AssessmentResult.tsx app/src/features/assessment/components/AssessmentResult.test.tsx
git commit -m "feat: replace result restart with WhatsApp CTA"
```

### Task 2: Replace the Header Restart, Track Clicks, and Raise Soundtrack Gain

**Files:**
- Modify: `app/src/features/assessment/components/AssessmentEngine.tsx`
- Modify: `app/src/features/assessment/components/AssessmentEngine.test.tsx`

- [ ] **Step 1: Write failing header and analytics tests**

Add tests that verify:

```ts
expect(screen.queryByRole('link', { name: ASSESSMENT_WHATSAPP_LABEL })).not.toBeInTheDocument()
fireEvent.click(screen.getByRole('button', { name: '開始形象檢測' }))
const headerLink = screen.getByRole('link', { name: ASSESSMENT_WHATSAPP_LABEL })
expect(headerLink).toHaveAttribute('href', ASSESSMENT_WHATSAPP_URL)
expect(headerLink).toHaveAttribute('target', '_blank')
expect(headerLink).toHaveAttribute('rel', 'noopener noreferrer')
expect(screen.queryByRole('button', { name: '重新開始診斷' })).not.toBeInTheDocument()
```

Listen for `a2o:analytics`, click the header link without following navigation,
and assert one event with:

```ts
expect(detail).toMatchObject({
  event: 'whatsapp_clicked',
  source: 'header',
})
```

Advance to the completed result, click its CTA, and assert the same event with
`source: 'result'`.

- [ ] **Step 2: Update existing soundtrack assertions to the approved levels**

Change all engine expectations that represent the scene/prompt targets from
`0.10`/`0.18` to `0.20`/`0.32` for both `fadeAudioParam` and
`fadeAudioVolume`. Retain Web Audio, fallback, restart, unmount, mute, and stale
resume coverage.

- [ ] **Step 3: Run the engine tests and verify RED**

```bash
cd app
npm test -- src/features/assessment/components/AssessmentEngine.test.tsx
```

Expected: FAIL because header/result analytics and new target constants are not
implemented and the header restart is still visible.

- [ ] **Step 4: Implement shared WhatsApp analytics in the engine**

Import the shared label/URL and `MessageCircle`. Add:

```ts
const trackWhatsAppClick = (source: 'header' | 'result') => {
  trackAssessmentEvent('whatsapp_clicked', {
    session_id: state.sessionId,
    source,
  })
}
```

Replace the normal header restart button with an active-assessment link using
the exact href, label, `_blank`, `noopener noreferrer`, circular styling, and
`onClick={() => trackWhatsAppClick('header')}`. Keep it hidden on opening and
completed states. Pass `onWhatsAppClick={() => trackWhatsAppClick('result')}`
to `AssessmentResult` instead of `onRestart`.

- [ ] **Step 5: Raise only the soundtrack target constants**

Set:

```ts
const SOUNDTRACK_SCENE_VOLUME = 0.2
const SOUNDTRACK_PROMPT_VOLUME = 0.32
```

Do not alter the fade duration, Web Audio setup, failure isolation, mute state,
or supplied media assets.

- [ ] **Step 6: Preserve internal fatal-error retry but remove normal restart UI**

Keep `restart()` for the fatal-error `重新嘗試` path and its cleanup safeguards.
Update tests that clicked the removed normal restart control: where they verify
unmount/stale cleanup, use unmount/remount or the existing fatal-error retry
path; remove tests that exist only to prove a normal restart button. Do not add a
hidden or test-only restart control.

- [ ] **Step 7: Run targeted and full tests**

```bash
cd app
npm test -- src/features/assessment/components/AssessmentEngine.test.tsx src/features/assessment/components/AssessmentResult.test.tsx src/features/assessment/config/assessmentWhatsApp.test.ts
npm test
```

Expected: all tests pass, no visible normal restart controls remain, and Safari
playback/soundtrack lifecycle regressions remain green.

- [ ] **Step 8: Commit Task 2**

```bash
git add app/src/features/assessment/components/AssessmentEngine.tsx app/src/features/assessment/components/AssessmentEngine.test.tsx
git commit -m "feat: add assessment WhatsApp action and raise soundtrack"
```

### Task 3: Verification and Deployment

**Files:**
- Verify the completed assessment-only diff; do not stage `app/tsconfig.tsbuildinfo`.

- [ ] **Step 1: Run fresh repository verification**

```bash
cd app
git diff --check
npm test
npm run build
npm run lint
```

Expected: tests and build pass, lint has no new errors, and only previously
recorded unrelated warnings may remain.

- [ ] **Step 2: Confirm scope boundaries**

Use `git diff --name-only e51590d..HEAD` and verify the implementation changes
are confined to WhatsApp config/tests, assessment result/engine/tests, and plan
documentation. Confirm no CRM, API, lead form, Google Sheet, Supabase, media, or
package files changed.

- [ ] **Step 3: Push the reviewed commit to both deployment branches**

Push `codex/assessment-lead-pipeline`, then push the same HEAD to
`feature/interactive-video-assessment` so Vercel builds the exact reviewed
source.

- [ ] **Step 4: Smoke-test the Vercel preview**

On mobile and desktop verify:

- Opening has no WhatsApp header action.
- Active assessment has the circular WhatsApp link and no restart control.
- Link href/target/rel are exact without opening or sending WhatsApp.
- Completed result has the full CTA before lead submission.
- Reload starts at the opening cover.
- Existing four-video flow still advances in order.
- CRM login route remains readable and browser console has no errors.

- [ ] **Step 5: Promote and verify production**

Promote the exact Ready preview to `https://a2o-style-lab.vercel.app/`, then
repeat the public CTA/reset and read-only CRM checks. Do not submit a lead or
send a WhatsApp message.

- [ ] **Step 6: Report evidence**

Report the production URL and commit, test/build/lint results, CTA locations,
exact 20%/32% soundtrack targets, WhatsApp href verification, and unchanged CRM
boundary.
