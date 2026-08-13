# A2O Style Lab GEO Foundation Design

## Objective

Improve A2O Style Lab's eligibility to be discovered, understood, and cited by Google Search generative features, Bing/Copilot, and ChatGPT Search without changing the current homepage design, assessment funnel, CRM, Portal, Supabase, or Slack behavior.

This work improves technical and content foundations. It does not promise rankings, citations, traffic, or inclusion in any AI answer.

## Confirmed public business facts

- Brand: A2O Style Lab
- Business category: Hong Kong men's image consulting and styling service
- Telephone / WhatsApp: `+852 5407 7240`
- Address: 香港九龍荔枝角長沙灣道883號億利工業中心204A室
- English address: Room 204A, Elite Industrial Centre, 883 Cheung Sha Wan Road, Lai Chi Kok, Kowloon, Hong Kong
- Opening hours: daily, 12:00–20:00
- Access: appointment only
- Instagram: `https://www.instagram.com/a2o.stylelab/`
- Canonical site URL: `https://a2o-style-lab.vercel.app/`

No unconfirmed Facebook page, Google Business Profile, rating, review count, award, founder biography, or customer outcome may be added.

## Current audit findings

The homepage currently has a useful title and description, semantic headings, visible service copy, original case imagery, and responsive presentation. The main GEO gaps are:

1. No `robots.txt` or XML sitemap.
2. No canonical URL, Open Graph metadata, Twitter card metadata, or explicit locale.
3. No structured entity graph for the brand, local professional service, website, and offered services.
4. The raw HTML contains almost no meaningful business content before React executes.
5. Public NAP data is not visible in the footer.
6. Internal hash routes have no runtime `noindex` control.
7. There are no automated tests preventing structured data from drifting away from visible facts.

## Official-guidance principles

The design follows current official guidance rather than GEO hacks:

- Google states that normal SEO foundations remain the basis for AI Overviews and AI Mode; there is no special AI schema requirement.
- Important content must be crawlable and available as text, with structured data matching visible content.
- Unique, expert-led, locally relevant content is more useful than scaled generic AI pages.
- Google explicitly says an `llms.txt` file is unnecessary for its generative search features.
- OpenAI recommends allowing `OAI-SearchBot` to improve discovery and citation in ChatGPT Search.
- Bing recommends XML sitemaps and IndexNow. This phase adds the sitemap; IndexNow is deferred until the site has multiple frequently changing public URLs.
- FAQ rich results were deprecated by Google in 2026, so the visible FAQ remains but no ranking claim depends on `FAQPage` markup.

## Architecture

### 1. Crawl and discovery files

Create `public/robots.txt` that:

- allows ordinary crawlers, Googlebot, Bingbot, and OAI-SearchBot to crawl public content;
- references the production sitemap;
- lists defensive disallow rules for path-based `/crm/`, `/portal/`, and `/debug/` URLs without blocking the homepage.

Create `public/sitemap.xml` containing only the canonical homepage. Hash-fragment routes are not separate crawlable documents and must not be listed.

### 2. Head metadata

Extend `index.html` with:

- canonical URL;
- `robots` and `googlebot` index/snippet directives;
- `theme-color`;
- Open Graph title, description, URL, locale, site name, type, and image;
- Twitter summary-large-image card;
- geographically specific Traditional Chinese copy.

The existing title remains focused on Hong Kong men's image consulting. Metadata must be factual and must not claim guaranteed improvement.

### 3. Entity graph

Add one JSON-LD `@graph` to the homepage containing:

- `ProfessionalService` as the local business entity;
- `WebSite` linked to the business as publisher;
- individual `Service` entities for image consultation, body-proportion analysis, personal colour and style diagnosis, grooming and hairstyle direction, wardrobe planning, accompanied shopping, image photography, and ongoing image maintenance.

The business entity includes the confirmed name, URL, logo, telephone, postal address, Hong Kong service area, opening-hours specification, appointment requirement, Instagram `sameAs`, and service catalogue.

Every structured fact must also be visible or directly supported by visible homepage content. No aggregate rating or testimonial markup is permitted.

### 4. Raw HTML fallback

Place a concise, semantic fallback inside `#root` in `index.html`. It includes:

- the brand and primary service description;
- the four-part A2O method;
- service categories;
- address, telephone, hours, appointment requirement, and Instagram;
- a WhatsApp consultation link.

React replaces this fallback after loading, so the current interactive design remains unchanged. Crawlers or users without JavaScript still receive meaningful, usable content.

### 5. Visible trust and local signals

Upgrade the existing footer to display:

- A2O Style Lab;
- telephone / WhatsApp;
- full Hong Kong address;
- `每日 12:00–20:00｜只接受預約`;
- Instagram link.

The footer remains visually consistent with the monochrome editorial design and wraps cleanly on mobile.

### 6. Internal route indexing boundary

Add a small route metadata controller that observes the hash route:

- homepage `/` uses `index, follow` and the production canonical URL;
- CRM, Portal, and debug routes use `noindex, nofollow, noarchive` and remove the homepage canonical while active;
- public experience/product/booking routes remain `noindex` in this phase because they share a client-rendered shell and do not yet have unique raw HTML, metadata, or canonical URLs.

This is a defensive client-side measure. Search engines normally ignore fragment identifiers as separate documents, but the rule prevents accidental indexing if routing changes later.

## Content constraints

- Customer-facing copy is Traditional Chinese written language, not exaggerated sales copy.
- Keep the existing homepage hierarchy and assessment experience.
- Do not create generic blog pages or keyword variants.
- Do not publish invented testimonials, results, prices, qualifications, or staff biographies.
- Do not add hidden keyword text.
- Do not add `llms.txt`.
- Do not block `OAI-SearchBot`.

## Testing and acceptance criteria

Automated tests must prove:

1. `robots.txt` permits OAI-SearchBot and references the sitemap.
2. `sitemap.xml` contains only the canonical homepage.
3. `index.html` has canonical, robots, Open Graph, Twitter, locale, and JSON-LD.
4. JSON-LD parses and contains the exact confirmed telephone, address, hours, appointment requirement, Instagram URL, and service entities.
5. Raw HTML contains meaningful A2O service copy and a usable contact link.
6. The React footer displays the same NAP, hours, and Instagram facts.
7. Internal route metadata switches to `noindex` while the homepage remains indexable.
8. The full Vitest suite, TypeScript production build, and ESLint complete with no new errors.
9. Desktop and 390px mobile visual checks show no overflow or broken footer layout.
10. Production smoke tests return HTTP 200 for `/`, `/robots.txt`, and `/sitemap.xml`, and the deployed raw HTML contains the GEO metadata and fallback content.

## Deferred follow-up

- Verify and submit the sitemap in Google Search Console and Bing Webmaster Tools.
- Create or confirm a Google Business Profile and connect it consistently to the same NAP data.
- Add IndexNow only when A2O publishes multiple changing public pages.
- Build an expert-led knowledge centre using real A2O analysis and case insights, not generic AI content.
- Measure ChatGPT referrals using `utm_source=chatgpt.com` and monitor Google generative-search performance in Search Console when available.

