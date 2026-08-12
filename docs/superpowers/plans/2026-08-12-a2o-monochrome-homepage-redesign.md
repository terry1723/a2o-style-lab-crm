# A2O Monochrome Homepage Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorder and restyle the public A2O homepage as the approved monochrome menswear experience without changing assessment or backend behaviour.

**Architecture:** Keep the current `Home` composition and assessment state machine, but add stable section anchors and a presentation shell around the assessment. Replace generic homepage icons with a scoped SVG icon family, and rewrite the existing homepage content component around monochrome tokens and approved content. Tests assert page order, removed sections, CTA targets, safe outcome copy, and preserved assessment actions.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Framer Motion, React Router, Vitest, Testing Library, Vite.

---

### Task 1: Lock the page structure with failing tests

**Files:**
- Create: `app/src/pages/Home.test.tsx`
- Create: `app/src/features/homepage/components/A2OHomepageContent.test.tsx`

- [ ] Write a `Home` test that mocks `AssessmentEngine` and `A2OHomepageContent`, then asserts the hero/content renders before the assessment and that the assessment wrapper has `id="assessment"`.
- [ ] Write homepage tests inside a `MemoryRouter` that assert `形象，是你最值得投資的長期資產`, `客戶常見轉變`, all four outcome headings, and the `#assessment` / `#a2o-method` CTA targets.
- [ ] Assert `服務流程`, the old authorised-feedback placeholder, and testimonial quotations are absent.
- [ ] Run `npm test -- src/pages/Home.test.tsx src/features/homepage/components/A2OHomepageContent.test.tsx` and confirm the new assertions fail for the missing design.

### Task 2: Add the monochrome SVG icon family

**Files:**
- Create: `app/src/features/homepage/components/A2OEditorialIcons.tsx`
- Test: `app/src/features/homepage/components/A2OHomepageContent.test.tsx`

- [ ] Add a failing assertion for labelled method and service icon containers rendered by the homepage.
- [ ] Run the targeted homepage test and confirm it fails.
- [ ] Implement typed inline SVG components for proportion, colour, grooming, style, consultation, wardrobe, shopping, photography, professional, and founder concepts. Use one shared `IconProps` contract, `currentColor`, consistent `viewBox`, `strokeWidth`, caps, and joins.
- [ ] Render decorative SVGs with `aria-hidden="true"`; rely on adjacent text for accessible meaning.
- [ ] Run the targeted test and confirm it passes.

### Task 3: Rebuild the homepage content component

**Files:**
- Modify: `app/src/features/homepage/components/A2OHomepageContent.tsx`
- Modify: `app/src/features/homepage/data/services.ts`
- Test: `app/src/features/homepage/components/A2OHomepageContent.test.tsx`

- [ ] Extend the failing homepage tests to cover the transparent-logo image, custom method cards, service explanation, audiences, About statement, FAQ, and final CTA.
- [ ] Run the test and confirm the additional assertions fail.
- [ ] Replace the light-grey component design with scoped black, charcoal, border-grey, and warm-white Tailwind classes.
- [ ] Implement the editorial Hero with transparent logo, approved headline/copy, six-person strip, and working anchor CTAs.
- [ ] Preserve real transformation data, carousel keyboard operation, analytics, and reduced-motion behaviour while restyling its UI.
- [ ] Implement Method, Services, Audiences, Common Outcomes, About, FAQ, and final CTA in the confirmed order.
- [ ] Remove the process data and process section. Remove the testimonial import and empty testimonial placeholder.
- [ ] Run the targeted homepage tests and confirm they pass.

### Task 4: Move and frame the assessment

**Files:**
- Modify: `app/src/pages/Home.tsx`
- Create: `app/src/features/assessment/components/AssessmentSection.tsx`
- Test: `app/src/pages/Home.test.tsx`

- [ ] Expand the failing `Home` test to assert the desktop left/right case copy and `A2O STYLE LAB` labels exist around the assessment.
- [ ] Run the test and confirm it fails.
- [ ] Implement `AssessmentSection` with a centred portrait assessment and `lg`-only side panels using approved transformation imagery, dark overlays, and the confirmed copy.
- [ ] Render `A2OHomepageContent` first and `AssessmentSection` second in `Home`.
- [ ] Ensure the section has `id="assessment"`, black background, no horizontal overflow, and side panels hidden below desktop.
- [ ] Run `Home.test.tsx` and confirm it passes.

### Task 5: Apply monochrome assessment controls

**Files:**
- Modify: `app/src/features/assessment/components/AssessmentEngine.tsx`
- Modify: `app/src/features/assessment/components/QuestionOverlay.tsx`
- Modify: `app/src/features/assessment/components/AssessmentLeadForm.tsx`
- Modify: `app/src/features/assessment/components/AssessmentResult.tsx`
- Test: existing assessment component tests

- [ ] Add focused class assertions that the start, answer, submit, and WhatsApp actions use warm-white/black states and no `a2o-pink` class.
- [ ] Run the four assessment component test files and confirm the new assertions fail.
- [ ] Replace pink focus, selected, icon, upload, and CTA classes with warm-white/black/neutral classes while preserving handlers, URLs, labels, validation, and media logic.
- [ ] Keep both result actions at equal warm-white visual hierarchy.
- [ ] Run the assessment component tests and confirm they pass.

### Task 6: Verify responsive design and regressions

**Files:**
- Modify only files required by failures discovered during verification.

- [ ] Run targeted homepage and assessment tests.
- [ ] Run `npm test`.
- [ ] Run `npm run lint` and record any pre-existing warnings separately from new errors.
- [ ] Run `npm run build`.
- [ ] Launch the local Vite server and inspect 375×667, 390×844, 768×1024, 1280×800, and 1440×900 screenshots.
- [ ] Verify no horizontal overflow, intentional Chinese wrapping, visible focus states, desktop-only assessment wings, and uncut assessment controls.
- [ ] Verify Chrome assessment progression and perform a Safari-oriented playback regression through the existing automated suite plus local Safari smoke test if browser control is available.
- [ ] Review `git diff --check` and confirm only homepage/assessment presentation, tests, icons, plan, and spec are staged; leave existing lead-sync edits untouched.

### Task 7: Commit and present local approval build

**Files:**
- Stage only the files listed in Tasks 1–6 and the approved spec/plan.

- [ ] Commit the tested implementation with a focused message.
- [ ] Provide the local preview URL and summarise verified desktop/mobile behaviour.
- [ ] Do not deploy until the user reviews and explicitly approves the implemented preview.
