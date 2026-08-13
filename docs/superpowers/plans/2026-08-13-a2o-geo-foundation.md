# A2O GEO Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the A2O homepage crawlable, entity-rich, locally trustworthy, and easier for search and AI systems to understand and cite without altering the conversion funnel.

**Architecture:** Static discovery files and meaningful fallback HTML provide crawler access before React runs. A single JSON-LD graph describes the verified business and services, while a small client-side route metadata controller prevents internal application views from advertising indexable homepage metadata. The visible footer mirrors the structured NAP facts.

**Tech Stack:** Vite, React 18, TypeScript, Vitest, static XML/text assets, JSON-LD, Vercel.

---

### Task 1: Lock the GEO contract with failing tests

**Files:**
- Create: `app/src/features/seo/geoAssets.test.ts`
- Modify: `app/src/features/homepage/components/A2OHomepageContent.test.tsx`

- [ ] Write tests that read `index.html`, `public/robots.txt`, and `public/sitemap.xml`, parse the JSON-LD graph, and assert the confirmed business facts.
- [ ] Add a homepage component test for the visible address, phone, hours, appointment note, and Instagram link.
- [ ] Run `npm test -- --run src/features/seo/geoAssets.test.ts src/features/homepage/components/A2OHomepageContent.test.tsx` from `app/` and confirm the new tests fail because the assets and footer facts are absent.

### Task 2: Add crawl, metadata, structured-data, and raw-HTML assets

**Files:**
- Create: `app/public/robots.txt`
- Create: `app/public/sitemap.xml`
- Modify: `app/index.html`

- [ ] Add crawler rules and the production sitemap URL to `robots.txt`.
- [ ] Add the canonical homepage with accurate `lastmod` to `sitemap.xml`.
- [ ] Add canonical, robots, Open Graph, Twitter, locale, JSON-LD graph, and semantic fallback content to `index.html`.
- [ ] Run the focused GEO tests and confirm the static-asset assertions pass.

### Task 3: Add visible local-business signals

**Files:**
- Modify: `app/src/features/homepage/components/A2OHomepageContent.tsx`
- Modify: `app/src/features/homepage/components/A2OHomepageContent.test.tsx`

- [ ] Replace the minimal footer with a responsive footer that shows the confirmed NAP, hours, appointment requirement, and Instagram link.
- [ ] Keep the current monochrome design and ensure external links use safe target/rel attributes.
- [ ] Run the focused homepage tests and confirm the footer contract passes.

### Task 4: Protect internal routes from indexing metadata

**Files:**
- Create: `app/src/features/seo/RouteSeoMetadata.tsx`
- Create: `app/src/features/seo/RouteSeoMetadata.test.tsx`
- Modify: `app/src/App.tsx`

- [ ] Write a failing test that changes MemoryRouter routes and verifies the homepage is indexable while application routes are noindex.
- [ ] Implement a metadata controller using `useLocation` that updates or removes robots and canonical tags for the active route.
- [ ] Mount the controller once above the route list.
- [ ] Run the focused route metadata tests and confirm they pass.

### Task 5: Validate and release

**Files:**
- Modify only files from Tasks 1–4 if verification finds a defect.

- [ ] Run `npm test -- --run` and require zero failing tests.
- [ ] Run `npm run build` and require exit code 0.
- [ ] Run `npm run lint` and require zero errors and no new warnings.
- [ ] Run `git diff --check`.
- [ ] Start the local production preview and visually inspect desktop and 390px mobile layouts, including the footer.
- [ ] Commit only GEO files and tests, preserving unrelated CRM/Slack/Supabase worktree changes.
- [ ] Push `codex/homepage-expansion-audit` to GitHub.
- [ ] Deploy a clean archive of the committed revision to the linked Vercel production project.
- [ ] Verify production `/`, `/robots.txt`, and `/sitemap.xml` return 200 and confirm raw production HTML contains canonical, JSON-LD, and fallback business content.

