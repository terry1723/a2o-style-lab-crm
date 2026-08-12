# A2O Homepage Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the approved restrained motion system to the public A2O homepage without changing its content, visual palette, assessment behaviour, or CRM routes.

**Architecture:** Keep motion-specific UI in focused homepage components. Use Framer Motion for one-time viewport entrances and a small pointer-parallax hook for the desktop Hero; use CSS keyframes for the marquee. Pass reduced-motion state into continuous effects and preserve existing components' public behaviour.

**Tech Stack:** React 18, TypeScript, Framer Motion, Tailwind CSS, Vitest, Testing Library, Vite.

---

### Task 1: Motion primitives and marquee

**Files:**
- Create: `app/src/features/homepage/components/A2OMarquee.tsx`
- Create: `app/src/features/homepage/components/A2OMarquee.test.tsx`
- Modify: `app/src/index.css`

- [ ] Write a failing test asserting the approved phrase, duplicated track content, and a static state when `useReducedMotion()` is true.
- [ ] Run `npm test -- --run src/features/homepage/components/A2OMarquee.test.tsx`; expect failure because the component does not exist.
- [ ] Implement the warm-white marquee, four repeated phrases, CSS track class, hover slowdown, and reduced-motion static rendering.
- [ ] Re-run the focused test and expect all tests to pass.

### Task 2: Hero entrance and desktop parallax

**Files:**
- Create: `app/src/features/homepage/hooks/useHeroParallax.ts`
- Create: `app/src/features/homepage/hooks/useHeroParallax.test.tsx`
- Modify: `app/src/features/homepage/components/A2OHomepageContent.tsx`
- Modify: `app/src/features/homepage/components/A2OHomepageContent.test.tsx`

- [ ] Write failing tests proving reduced-motion and narrow viewports return zero parallax, while desktop pointer movement returns bounded offsets.
- [ ] Run the two focused test files and verify the new assertions fail for the missing hook/marquee placement.
- [ ] Implement the hook with pointer events and bounded transforms, update Hero entrance timing, and insert `<A2OMarquee />` immediately after Hero.
- [ ] Re-run focused tests and expect all tests to pass.

### Task 3: Assessment side-panel entrance

**Files:**
- Modify: `app/src/features/assessment/components/AssessmentSection.tsx`
- Create: `app/src/features/assessment/components/AssessmentSection.test.tsx`

- [ ] Write a failing test asserting the central assessment remains untransformed and only the desktop side panels receive one-time entrance wrappers.
- [ ] Run the focused test and verify failure.
- [ ] Add Framer Motion side wrappers with opposing small x offsets, delayed copy, `once: true`, and reduced-motion zero offsets.
- [ ] Re-run the focused test and expect pass.

### Task 4: Transformation and service entrances

**Files:**
- Modify: `app/src/features/homepage/components/A2OHomepageContent.tsx`
- Modify: `app/src/features/homepage/components/A2OHomepageContent.test.tsx`

- [ ] Write failing tests for one-time transformation/service motion groups and verify all client images still lack the `grayscale` class.
- [ ] Run the focused homepage test and verify failure for the missing motion metadata.
- [ ] Add one-time viewport entrance variants, staggered cards/service rows, image hover scale around 1.025, and arrow micro-translation.
- [ ] Re-run the focused homepage test and expect pass.

### Task 5: Regression and responsive verification

**Files:**
- Modify only if verification exposes a defect in the motion files above.

- [ ] Run `npm test`; expect all test files and tests to pass.
- [ ] Run `npm run build`; expect TypeScript and Vite build exit 0.
- [ ] Run `npm run lint`; expect 0 errors (existing unrelated warnings may remain documented).
- [ ] Verify desktop 1440×1000 and mobile 390×844 in the browser, including reduced-motion, Hero CTA, assessment start, case carousel and `/#/portal`.
- [ ] Stage only motion-related source, tests, spec and plan; inspect `git diff --cached --check` before committing.

