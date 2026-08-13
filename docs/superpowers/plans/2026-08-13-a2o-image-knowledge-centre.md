# A2O Image Knowledge Centre Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish one crawlable A2O image-knowledge hub and five substantive Traditional Chinese topic pages based on the approved work and dating reports, then link them from the homepage without changing the assessment or CRM flows.

**Architecture:** Keep the current React `HashRouter` application unchanged for the homepage, assessment, and portal. Add a deterministic build-time static-page generator that renders complete HTML files under `/image-guide/`, backed by a validated content module and shared editorial CSS. Specific Vercel rewrites serve the six clean public URLs before the existing SPA fallback.

**Tech Stack:** Vite 5, React 18, TypeScript, Node ESM generator, Vitest, semantic static HTML, CSS, JSON-LD, Pillow/PDF rendering for source-image crops.

---

## File Map

- Create `app/knowledge/content.mjs`: single source of truth for hub and article copy, metadata, tables, FAQs, related links, and images.
- Create `app/knowledge/render.mjs`: escaping, validation, structured-data, hub rendering, and article rendering.
- Create `app/scripts/generate-knowledge-pages.mjs`: validates content and writes six HTML documents plus AI-readable markdown.
- Create `app/scripts/extract-knowledge-images.py`: deterministic crop manifest for reusable PDF visuals.
- Create `app/public/image-guide/knowledge-centre.css`: responsive monochrome editorial design.
- Create `app/public/a2o/knowledge/*.webp`: source-derived web images.
- Create `app/src/features/seo/knowledgePages.test.ts`: content, route-output, metadata, canonical, structured-data, image, and link tests.
- Modify `app/package.json`: run image/content generation before the existing production build.
- Modify `app/vercel.json`: add six exact clean-route rewrites before the SPA fallback.
- Modify `app/src/features/homepage/components/A2OHomepageContent.tsx`: add the visible knowledge-centre entry section.
- Modify `app/src/features/homepage/components/A2OHomepageContent.test.tsx`: protect homepage link and assessment order.
- Modify `app/public/sitemap.xml`, `app/public/robots.txt`, and create `app/public/llms.txt`, `app/public/llms-full.txt`, `app/public/sitemap.md`: advertise all public knowledge pages.
- Modify `app/src/features/seo/geoAssets.test.ts`: verify all public discovery assets.

### Task 1: Lock the content contract with failing tests

**Files:**
- Create: `app/src/features/seo/knowledgePages.test.ts`
- Modify: `app/src/features/seo/geoAssets.test.ts`

- [ ] **Step 1: Write a test importing the knowledge content module and asserting one hub plus five unique article slugs, titles, descriptions, direct answers, sections, hero images, alt text, and related links.**
- [ ] **Step 2: Add output tests that expect six generated `public/image-guide/**/index.html` files containing a unique canonical, visible H1, Traditional Chinese answer copy, `Article` or `CollectionPage`, `BreadcrumbList`, both approved CTAs, and no public PDF link.**
- [ ] **Step 3: Update GEO tests to expect the homepage plus six knowledge URLs in the XML and markdown sitemaps, and meaningful headings and links in `llms.txt` and `llms-full.txt`.**
- [ ] **Step 4: Run `npm test -- --run src/features/seo/knowledgePages.test.ts src/features/seo/geoAssets.test.ts` from `app/` and verify failure because the content module and generated files do not yet exist.**

### Task 2: Extract and validate the PDF-derived image set

**Files:**
- Create: `app/scripts/extract-knowledge-images.py`
- Create: `app/public/a2o/knowledge/*.webp`

- [ ] **Step 1: Encode a crop manifest for work look, dating look, occasions, clean-fit colours, analogous colours, textures, top length, trouser length, shoe continuity, top fit, trouser silhouettes, Hong Kong summer, common mistakes, and wardrobe system.**
- [ ] **Step 2: Render the supplied PDFs at web-quality resolution, crop only the useful visual regions, preserve colour and aspect ratio, and export WebP files with stable kebab-case names.**
- [ ] **Step 3: Add script checks for missing PDFs, invalid crop bounds, zero-byte output, and unexpectedly small dimensions; failures must exit non-zero with the affected asset name.**
- [ ] **Step 4: Inspect a contact sheet of all exported images and correct any clipping, embedded footer CTA, or unreadable crop.**

### Task 3: Implement structured content and static rendering

**Files:**
- Create: `app/knowledge/content.mjs`
- Create: `app/knowledge/render.mjs`
- Create: `app/scripts/generate-knowledge-pages.mjs`
- Create: `app/public/image-guide/knowledge-centre.css`
- Modify: `app/package.json`

- [ ] **Step 1: Define the six approved records with complete written-Chinese copy, tables, examples, price disclaimer, FAQ entries, related slugs, and image metadata.**
- [ ] **Step 2: Implement validation for duplicate or unsafe slugs, missing metadata, empty sections, missing alt text, nonexistent assets, and broken related links.**
- [ ] **Step 3: Render the hub as `CollectionPage` and the five topics as `Article` pages with `BreadcrumbList`, organisation identity, canonical, Open Graph, Twitter, and complete initial HTML.**
- [ ] **Step 4: Implement the approved responsive black/warm-white article system, normal-colour images, direct-answer cards, accessible tables, visible focus, primary assessment CTA, and secondary WhatsApp CTA.**
- [ ] **Step 5: Generate article markdown mirrors under `public/image-guide/markdown/` and expose them through the AI discovery files without publishing the complete PDFs.**
- [ ] **Step 6: Add `generate:knowledge` to `package.json` and make the existing `build` command generate and validate the static pages before TypeScript and Vite build.**
- [ ] **Step 7: Run the focused knowledge tests and verify they pass.**

### Task 4: Serve clean public URLs without disturbing the SPA

**Files:**
- Modify: `app/vercel.json`
- Test: `app/src/features/seo/knowledgePages.test.ts`

- [ ] **Step 1: Add exact rewrites for `/image-guide` and all five article URLs to their generated `index.html` files before the existing catch-all rewrite.**
- [ ] **Step 2: Add tests asserting exact rewrites exist, asset paths are not captured, and the final SPA fallback remains present for homepage and hash-routed portal use.**
- [ ] **Step 3: Run the focused test and a local production preview; request every clean URL and verify its response contains the page-specific H1 before JavaScript.**

### Task 5: Add the homepage knowledge-centre entry

**Files:**
- Modify: `app/src/features/homepage/components/A2OHomepageContent.tsx`
- Modify: `app/src/features/homepage/components/A2OHomepageContent.test.tsx`

- [ ] **Step 1: Add a failing homepage test for a `形象知識中心` heading, hub link, three selected article links, and unchanged hero → marquee → assessment order.**
- [ ] **Step 2: Add a black editorial knowledge section after the A2O system section and before FAQ, with one lead card and four compact topic links using regular clean URLs rather than hash routes.**
- [ ] **Step 3: Add homepage analytics events containing only article slug, CTA type, and placement.**
- [ ] **Step 4: Run homepage tests and verify the assessment, WhatsApp, colour-image, and knowledge-entry assertions all pass.**

### Task 6: Complete GEO discovery files

**Files:**
- Modify: `app/public/sitemap.xml`
- Modify: `app/public/robots.txt`
- Create: `app/public/llms.txt`
- Create: `app/public/llms-full.txt`
- Create: `app/public/sitemap.md`
- Modify: `app/src/features/seo/geoAssets.test.ts`

- [ ] **Step 1: List the homepage and six canonical knowledge URLs with the approved publication date, excluding all portal, CRM, debug, PDF, and markdown-mirror URLs from XML indexing.**
- [ ] **Step 2: Publish concise AI-readable descriptions and direct markdown links for the business, services, knowledge hub, and five topics.**
- [ ] **Step 3: Keep Googlebot, Bingbot, and OAI-SearchBot allowed while preserving private-route disallows.**
- [ ] **Step 4: Run GEO tests and verify URL count, headings, direct links, business facts, and exclusion rules.**

### Task 7: Full verification, conflict audit, and commits

**Files:**
- All feature files above
- Do not stage the pre-existing ad-lead/Slack files shown in the worktree status.

- [ ] **Step 1: Run `npm test -- --run src/features/seo/knowledgePages.test.ts src/features/seo/geoAssets.test.ts src/features/homepage/components/A2OHomepageContent.test.tsx` and correct all failures.**
- [ ] **Step 2: Run `npm run test`, `npm run lint`, and `npm run build`; distinguish and report only genuinely pre-existing warnings.**
- [ ] **Step 3: Start the production preview and verify homepage plus all six clean URLs with HTTP and page-content checks.**
- [ ] **Step 4: Visually inspect homepage, hub, work, dating, colour, proportion, and wardrobe pages at mobile and desktop widths, correcting crop, overflow, contrast, or CTA problems.**
- [ ] **Step 5: Audit `git diff`, `git diff --check`, and staged paths to confirm no ad-lead, CRM, Supabase, Google Apps Script, or Slack changes enter the feature commits.**
- [ ] **Step 6: Commit focused implementation changes and push `codex/homepage-expansion-audit` to GitHub.**

### Task 8: Production deployment and live verification

**Files:**
- No new source scope unless live verification exposes a defect.

- [ ] **Step 1: Deploy the verified `app/` build to the linked A2O Vercel production project.**
- [ ] **Step 2: Verify the production homepage, all six knowledge URLs, sitemap, robots, llms files, canonical metadata, structured data, assessment CTA, and WhatsApp CTA.**
- [ ] **Step 3: Test representative mobile and desktop rendering against production and repair any Vercel rewrite, caching, asset, or layout issue discovered.**
- [ ] **Step 4: Re-run targeted tests and production build after any repair, redeploy, and repeat live checks until no blocking defect remains.**
- [ ] **Step 5: Report the production links, Git commit, pushed branch, test evidence, and any non-blocking limitation without claiming search ranking guarantees.**
