# A2O Monochrome Homepage Redesign

## Objective

Redesign the public A2O Style Lab homepage as a premium monochrome menswear
experience while preserving the existing four-video assessment, submission
integration, CRM routes, Portal routes, and backend behaviour.

The redesign must make the homepage feel more confident, masculine, editorial,
and visually considered without reducing readability or introducing decorative
colour. The public page will use black, charcoal, warm white, photography,
typographic weight, borders, and spacing to create hierarchy.

## Confirmed Design Direction

- Use a **Monochrome Menswear** visual system.
- Main colours are black, charcoal, warm white, and neutral greys only.
- Do not use the current pink accent in the redesigned public homepage or
  assessment controls.
- Use heavier Traditional Chinese typography to create a more confident male
  editorial character.
- Use custom monochrome icons based on the approved Image 2.0 concept board.
- Make the editorial introduction the first section.
- Move the interactive assessment to the second section.
- Keep the assessment as a central portrait experience on desktop.
- Use darkened real A2O transformation cases in the desktop side panels.
- Hide the side panels on mobile and keep the assessment focused and readable.
- Remove the duplicate service-process section.
- Replace the unapproved testimonial area with factual, non-quoted customer
  outcome themes.
- Keep the FAQ and final conversion section.

## Out of Scope

- Changing the four assessment questions, answers, scoring, videos, or order.
- Changing Google Sheet, Supabase Storage, Slack, CRM, or lead-sync behaviour.
- Changing Portal, CRM, staff-login, booking, or API routes.
- Publishing invented customer quotations, identities, job titles, or results.
- Generating new transformation cases that could be mistaken for real clients.
- Replacing the current React, Vite, TypeScript, Tailwind, or Framer Motion
  architecture.
- Deploying before responsive and regression checks have passed.

## Page Order

The public homepage will use this sequence:

1. Editorial Hero
2. Interactive Image Assessment
3. Real Transformations
4. A2O Image Method
5. Services
6. Suitable Audiences
7. Common Customer Outcomes
8. About A2O / Image System Statement
9. FAQ
10. Final CTA

The existing standalone service-process section will be deleted because its
content repeats the method and services sections.

## 1. Editorial Hero

### Desktop

- Present the hero before the assessment.
- Use a near-black background with warm-white type.
- Show the transparent A2O logo once. Remove the repeated A2O brand label
  currently displayed directly underneath the logo.
- Primary headline:
  `形象，是你最值得投資的長期資產`
- Supporting copy should explain that A2O builds men's image through body
  proportion, personal colour, hairstyle, clothing, and positioning.
- Use the existing approved six-person angled editorial strip as the main
  visual. Treat it in black and white or very low saturation so that silhouette
  and styling remain the focus.
- Target a substantial editorial opening, approximately 85–95% of the desktop
  viewport, without forcing text or imagery below the fold on shorter screens.
- Primary CTA: `開始形象檢測`.
- Secondary CTA: `了解 A2O 形象方法`.
- The primary CTA scrolls to the assessment section.
- The secondary CTA scrolls to the A2O Method section.

### Mobile

- Stack the logo, headline, copy, CTAs, and editorial image vertically.
- Do not force the section to 100vh.
- Preserve generous spacing while ensuring the primary CTA is visible without
  excessive scrolling on common phone heights.
- Keep the image large enough to recognise the clients; do not crop it into a
  thin decorative strip.

## 2. Interactive Assessment

### Behaviour

- Preserve the existing assessment state machine, video buffering, soundtrack,
  Safari handling, question flow, result calculation, form validation, upload,
  and submission behaviour.
- Starting a new page visit continues to begin from question one.
- The user must still press the start button before video and audio playback.
- All changes in this section are presentation-layer changes unless a small
  semantic wrapper or scroll target is required.

### Desktop Composition

- Keep the existing portrait assessment in the centre.
- Extend the section across the desktop viewport with left and right case-study
  panels instead of plain black empty space.
- Use existing approved A2O transformation images only.
- Darken, desaturate, and slightly soften the side imagery so it supports rather
  than competes with Martin's assessment video.
- The centre assessment must remain the brightest and most legible element.
- Both side panels show `A2O STYLE LAB`.
- Left panel title: `真實形象改造案例`.
- Left panel copy:
  `從髮型、比例、色彩到穿搭，讓每一項改變都服務於你的個人形象。`
- Right panel title: `看得見的形象轉變`.
- Right panel copy:
  `不是變成另一個人，而是令你的外在訊號更符合身份、目標與生活方式。`
- Text sits over a sufficiently dark overlay and must meet readable contrast.
- The side cases are contextual presentation, not separate primary links.

### Mobile Composition

- Hide both desktop side panels and their copy.
- Keep only the central portrait assessment.
- Maintain the current vertical interaction model and reachable controls.
- Avoid horizontal scrolling.

### Assessment Controls

- Replace pink accents with monochrome states.
- Primary buttons use warm-white background and black text.
- Hover and pressed states invert to black background, warm-white border, and
  warm-white text.
- Answer options use charcoal background and warm-white borders.
- Selected answer uses warm-white background and black text.
- Progress, loading, sound, upload, and status icons use warm-white linework.
- Inputs use charcoal surfaces and neutral focus rings with visible contrast.
- The final `提交並製作個人檢測報告` and
  `WhatsApp 免費了解我的形象問題` buttons use the same warm-white background
  and black-text hierarchy. Their purpose is distinguished by label, icon, and
  spacing rather than colour.
- Preserve the existing WhatsApp URL and submission actions.

## 3. Real Transformations

- Retain the current approved transformation cases and their navigation.
- Restyle the section to the monochrome system.
- Images may retain enough original information for before/after comparison,
  but surrounding UI, tags, controls, and backgrounds remain monochrome.
- Use stronger type weight for headings and case labels.
- Preserve keyboard navigation and carousel controls.
- Do not change the underlying case data in this redesign unless an existing
  asset reference is broken.

## 4. A2O Image Method

Use four method cards:

1. 比例 / Proportion
2. 色彩 / Colour
3. 儀容 / Grooming
4. 風格 / Style

### Icon System

- Use the approved Image 2.0 icon board as the visual reference.
- Recreate individual icons as clean SVG components rather than cropping the
  generated bitmap board.
- SVGs use warm-white strokes on dark surfaces and black strokes on light
  surfaces.
- Keep a consistent view box, stroke width, line caps, line joins, optical
  size, corner radius, and internal padding.
- Retain fashion-specific detail, but simplify shapes enough to remain clear at
  24–56 px.
- Recommended display sizes:
  - Method icons: 48–56 px
  - Service icons: 32–40 px
  - Audience and auxiliary icons: 20–24 px
- Icons must not depend on colour to communicate meaning.
- Provide accessible labels through surrounding text; decorative SVGs use
  `aria-hidden="true"`.

## 5. Services

- Retain the service content but convert the generic numbered tiles into a
  stronger editorial service list or card system.
- Add this explanatory line below the heading:
  `從初步分析到實際執行，按你的需要建立完整而可持續的形象方向。`
- Use the matching custom SVG icons for consultation, colour/style diagnosis,
  proportion/fit, grooming, wardrobe planning, accompanied shopping, and any
  retained service category.
- Use one warm-white reverse section as a controlled visual pause if it
  improves hierarchy; it must still remain strictly black and white.
- Keep link or affordance targets at least 44 × 44 CSS pixels.

## 6. Suitable Audiences

- Keep the confirmed audience groups from the current homepage data.
- Present them as monochrome outlined pills or compact cards.
- Use simplified icons from the approved icon family.
- Allow wrapping on desktop and mobile without clipping long Traditional
  Chinese labels.

## 7. Common Customer Outcomes

Do not publish invented customer testimonials as authentic evidence.

Replace the current empty testimonial state and the text
`客戶回饋將於獲得客戶授權後更新。` with four non-quoted outcome themes:

1. `方向更清晰` — 更了解適合自己的髮型、色彩與穿搭方向。
2. `專業感提升` — 工作、見客及拍攝時呈現更可信的外在訊號。
3. `減少錯誤購物` — 建立實用添置次序，不再反覆購買不合適單品。
4. `日常更容易執行` — 穿搭變得有系統，能夠長期維持。

These are service outcome categories, not quotations or promises. Do not show
customer names, occupations, star ratings, or numerical claims unless approved
real evidence is provided later.

Use alternating black and warm-white cards to create rhythm without adding
colour.

## 8. About A2O

- Keep this primary statement:
  `建立的不是一套造型，而是一套真正適合你的形象系統。`
- Retain the explanation of hairstyle, proportion, colour, clothing, and
  overall positioning.
- Use an approved A2O client collage or case composition treated in black and
  white or very low saturation.
- Use a strong split editorial layout on desktop and a single-column flow on
  mobile.

## 9. FAQ

- Preserve the current FAQ data and accordion behaviour.
- Restyle the accordion in monochrome with heavier labels and clear plus/minus
  or chevron states.
- Preserve `aria-expanded`, `aria-controls`, keyboard operation, and reduced
  motion support.

## 10. Final CTA

- Use a near-black closing section with warm-white type.
- Primary CTA uses warm-white background and black text.
- Secondary CTA uses black background, warm-white border, and warm-white text.
- Keep the intended actions: return to/start assessment and book consultation.
- Ensure the final CTA does not visually compete with the assessment form's two
  final actions.

## Colour System

The production palette should be defined as semantic tokens rather than many
unrelated literal greys. The exact values may be tuned during implementation,
but the roles are fixed:

| Token | Purpose |
| --- | --- |
| `mono-black` | Main page background and deepest surfaces |
| `mono-charcoal` | Cards, inputs, secondary dark surfaces |
| `mono-panel` | Raised dark panels |
| `mono-line` | Borders and separators |
| `mono-warm-white` | Primary light text and CTA surface |
| `mono-soft-white` | Secondary text on dark backgrounds |
| `mono-muted` | Tertiary metadata only |

- Do not introduce pink, navy, burgundy, green, or camel accents.
- Avoid large areas of mid-grey. The design should feel black and white, not
  washed-out grey.
- Hierarchy comes from contrast, surface elevation, image treatment, borders,
  scale, and whitespace.

## Typography

- Headings use an available Traditional Chinese editorial serif with weight
  800–900 where the font supports it. Select a tested system/repository font
  stack rather than adding an unverified remote dependency.
- Navigation, UI labels, buttons, cards, and body copy use a Traditional Chinese
  sans-serif at weight 600–900 depending on hierarchy.
- Avoid the current light, delicate appearance.
- Suggested hierarchy:
  - Hero: 800–900
  - Section heading: 800–900
  - Card heading and buttons: 750–900
  - Body: 550–650
  - Metadata / English eyebrow: 700–900 with restrained tracking
- Check actual rendering on Safari and Chrome because synthetic bolding and
  Traditional Chinese font fallback can differ.
- Maintain comfortable line height and do not use weight as a substitute for
  adequate font size.

## Motion

- Keep restrained entrance motion and carousel movement where already useful.
- Do not add decorative animation that competes with the assessment video.
- Respect `prefers-reduced-motion` for scrolling, entrances, accordion
  transitions, and case navigation.
- Avoid large parallax effects on the side case panels.

## Responsive Requirements

Validate at minimum:

- 375 × 667 phone
- 390 × 844 phone
- 768 × 1024 tablet
- 1280 × 800 desktop
- 1440 × 900 desktop

At each size verify:

- No horizontal overflow.
- Chinese headings wrap intentionally.
- CTAs remain at least 44 px high.
- Assessment video and controls are not clipped.
- Desktop assessment side panels disappear below the intended breakpoint.
- Hero imagery remains recognisable.
- Service and outcome cards maintain readable order.
- FAQ controls are keyboard and touch accessible.

## Accessibility

- Target WCAG AA contrast for text and controls.
- Warm-white-on-black and black-on-warm-white are the primary high-contrast
  pairs.
- Provide meaningful alt text for approved case and editorial images.
- Decorative case textures and SVG icons use empty alt text or `aria-hidden`.
- Preserve semantic headings in page order.
- Preserve visible focus states without relying on pink.
- Do not communicate selection using colour alone; use inversion, border,
  weight, and state attributes.
- Preserve labels and error messaging in the assessment form.

## Asset Strategy

- Reuse approved repository assets before creating new visuals.
- Use the existing six-person editorial strip and transformation cases.
- The A2O logo must use a transparent asset. If only a flattened JPG is
  available, create and visually verify a transparent derivative without
  altering the logo design.
- Do not commit real client source photographs outside the repository's
  existing approved public asset structure.
- Generate no new client identity or fabricated before/after proof.
- Export custom icons as separate optimised SVG files or typed SVG React
  components with predictable names.

## Technical Boundaries

The redesign should be scoped primarily to:

- `app/src/pages/Home.tsx`
- `app/src/features/homepage/**`
- Presentation classes/components in `app/src/features/assessment/components/**`
- Public A2O visual assets under the existing public asset convention
- Theme tokens or shared public-page styling only where required

Do not modify:

- Assessment business logic and state transitions
- Assessment configuration and scoring
- Submission repositories and APIs
- Google Sheet, Supabase, Slack, or CRM sync code
- CRM and Portal routes or styles unless a shared token change would otherwise
  leak into them; prefer homepage-scoped tokens to avoid this
- Existing CRM data or authentication

## Analytics

- Preserve existing homepage scroll, case-view, case-swipe, assessment-return,
  and final-CTA events.
- Add or rename no analytics event without confirming that downstream reports
  will remain compatible.
- Hero CTAs may reuse existing events or add scoped events only if tests and
  documentation are updated.

## Testing and Verification

### Automated

- Add or update component tests for the new page order.
- Verify hero CTAs scroll to the correct section IDs.
- Verify the service-process section is absent.
- Verify the common-outcomes content is present and contains no fabricated
  attribution.
- Verify the desktop assessment side-panel copy renders at desktop breakpoints
  and is hidden on mobile through class/layout assertions where practical.
- Verify assessment buttons and final form actions retain their existing
  handlers and URLs.
- Preserve and run existing assessment tests, especially Safari video playback,
  form validation, optional photo upload, and submission failure preservation.
- Run TypeScript checking, relevant Vitest suites, lint, and the production
  build.

### Visual

- Compare desktop and mobile screenshots against the approved monochrome
  visual companion.
- Check the complete page in Chrome and Safari.
- Inspect every custom SVG at its smallest and largest production sizes.
- Check logo transparency on true black and warm-white surfaces.
- Check all case images for unintended cropping.
- Verify that black surfaces remain distinguishable without turning the page
  into a flat grey field.
- Verify that bold Traditional Chinese type does not clip or substitute poorly.

### Regression

- Complete all four questions in Chrome and Safari.
- Confirm sound, soundtrack, video-to-question timing, and video transitions.
- Submit a synthetic assessment without a photo.
- Submit a synthetic assessment with an allowed photo.
- Confirm the WhatsApp link remains correct.
- Smoke-test `#/portal`, `#/portal/ad-leads`, CRM login, booking, and other
  existing public routes to confirm the homepage redesign did not affect them.

## Implementation Sequence

1. Add scoped monochrome tokens and typography rules.
2. Prepare the transparent logo and monochrome editorial image treatments.
3. Implement the Hero and move the assessment to section two without changing
   assessment state logic.
4. Add responsive desktop case-study wings around the assessment.
5. Recreate the approved Image 2.0 icon family as consistent SVG components.
6. Restyle transformations, method, services, audiences, outcomes, About, FAQ,
   and final CTA.
7. Remove the duplicate process section and unapproved testimonial placeholder.
8. Apply monochrome states to assessment questions, form, upload, completion,
   WhatsApp, and submission controls.
9. Add or update automated tests.
10. Run responsive visual QA, Chrome/Safari assessment regression, typecheck,
    lint, tests, and production build.
11. Present local desktop and mobile previews for final approval.
12. Deploy only after explicit approval and then run production smoke tests.

## Acceptance Criteria

The redesign is complete only when:

- The Hero is first and the assessment is second.
- The public homepage uses only the approved monochrome palette.
- Pink no longer appears in the redesigned homepage or assessment UI.
- Typography has the confirmed heavier male editorial character.
- Desktop assessment wings show darkened approved A2O cases and confirmed copy.
- Mobile hides the assessment wings and retains a clean portrait experience.
- All approved custom icon categories are implemented as consistent SVGs.
- Both final assessment actions use warm-white backgrounds and black text.
- No invented testimonial is presented as real customer evidence.
- The duplicate service-process section is removed.
- FAQ and final CTA remain functional.
- Existing assessment behaviour, lead submission, WhatsApp URL, CRM, Portal,
  and backend integrations remain unchanged.
- Automated checks and targeted Chrome/Safari regression tests pass.
- Desktop, tablet, and mobile screenshots receive final visual approval before
  production deployment.
