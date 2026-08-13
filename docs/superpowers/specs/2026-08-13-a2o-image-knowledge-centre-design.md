# A2O Image Knowledge Centre Design

Date: 2026-08-13
Status: Approved design, pending implementation plan

## 1. Objective

Create a public A2O Style Lab image knowledge centre from the two supplied
client-report PDFs. The centre must turn the reports' useful teaching material
into crawlable, answer-oriented web pages that can be discovered and cited by
search engines and AI assistants.

The centre should support these business outcomes:

- attract Hong Kong searches about men's image improvement, styling, smart
  casual, workwear, dating outfits, proportion, colour, and wardrobes;
- demonstrate A2O's practical expertise before asking for an enquiry;
- move readers primarily into the free interactive image assessment;
- offer WhatsApp one-to-one consultation as a secondary action; and
- preserve the complete PDFs as a post-assessment client deliverable rather
  than a public download.

## 2. Approved Source Material

The source documents are:

- `/Users/terrylee/Downloads/a2o-complete-work-image-report.pdf`
- `/Users/terrylee/Downloads/a2o-complete-dating-image-report.pdf`

Both documents have 14 A4 pages. The work and dating versions have different
scenario-specific first pages and share the service and educational material
that follows.

Approved use of the source material:

- reuse the supplied outfit, product, colour, proportion, and comparison
  imagery;
- rewrite PDF text as semantic HTML instead of publishing page screenshots;
- publish common educational material once rather than duplicating it across
  work and dating pages;
- present branded products and prices as styling and budget examples; and
- show this disclaimer wherever branded prices appear:
  `造型及預算僅供參考，實際價格以品牌當時售價為準。`

The complete PDFs must not be publicly downloadable from the knowledge centre.

## 3. Scope

### 3.1 In scope

- one public knowledge-centre index page;
- five substantive topic pages;
- a new homepage section linking to the centre and selected articles;
- extraction and web optimisation of reusable PDF images;
- responsive desktop, tablet, and mobile layouts;
- page-specific metadata, canonical URLs, social preview data, and structured
  data;
- sitemap, AI-readable discovery assets, and internal-link updates;
- primary and secondary conversion actions; and
- automated and manual verification of public pages and existing protected
  flows.

### 3.2 Out of scope

- a CMS or staff article editor;
- public PDF downloads;
- live product prices, stock status, or retailer purchase links;
- changes to the assessment questions, submission APIs, CRM, portal login,
  Supabase, Google Sheets, or Slack synchronisation; and
- creating many thin pages for small keyword variations.

## 4. Information Architecture

The approved architecture is one hub plus five topic pages:

1. `/image-guide/`
   - title: `A2O 男士形象知識中心`
   - purpose: introduce the knowledge library, help visitors choose a relevant
     situation, and link to all five topic pages.

2. `/image-guide/work-smart-casual/`
   - title: `香港男士工作場合 Smart Casual 指南`
   - source: the work report's scenario page plus relevant shared material;
   - intent: work image, client-facing outfits, professional menswear, smart
     casual, example garments, and reference budgets.

3. `/image-guide/dating-style/`
   - title: `男士約會穿搭與第一印象指南`
   - source: the dating report's scenario page plus relevant shared material;
   - intent: dating outfits, relaxed refinement, first impressions, colour,
     proportion, example garments, and reference budgets.

4. `/image-guide/colour-summer-style/`
   - title: `香港男士配色與夏季穿搭指南`
   - source: occasion selection, one-week clean-fit colour combinations,
     analogous summer colours, mixed textures, and Hong Kong summer styling;
   - intent: men's colour matching, clean fit, smart casual, summer outfits,
     and dressing for Hong Kong weather.

5. `/image-guide/fit-proportion/`
   - title: `男士身形比例與服裝版型指南`
   - source: top length, trouser length, shoe-trouser continuity, T-shirt and
     shirt fit, and trouser silhouettes;
   - intent: men's body proportions, clothing fit, trouser length, top length,
     and silhouette.

6. `/image-guide/wardrobe-system/`
   - title: `簡單實用的男士衣櫃系統`
   - source: common image-damaging mistakes and the practical wardrobe system;
   - intent: men's wardrobe basics, wardrobe planning, common styling mistakes,
     and long-term image management.

The homepage must add a visible `形象知識中心` section containing a short
introduction, selected article cards, and a link to the hub. It must fit the
existing monochrome editorial design and must not displace or change the
interactive assessment flow.

## 5. Article Experience

Each topic page uses one shared editorial article template with page-specific
content. The required order is:

1. global A2O header and breadcrumb;
2. clear H1 and a 50–80 Chinese-character summary;
3. a prominent source-derived visual;
4. a concise direct-answer panel;
5. a visible contents list;
6. three to five substantial teaching sections;
7. properly captioned diagrams, comparisons, or outfit images;
8. scenario-specific product and budget examples where applicable;
9. a short visible FAQ when the article genuinely answers those questions;
10. related-article links;
11. primary free-assessment CTA;
12. secondary WhatsApp consultation CTA; and
13. A2O business details and footer.

Copy must use natural Traditional Chinese in a calm, professional, written
style. It must answer the reader's question before expanding into explanation.
Keywords should arise naturally from useful content; exact-match variants must
not be repeated unnaturally.

## 6. Visual Design

The centre extends the approved A2O website system:

- predominantly black background, warm-white type, and warm-white primary
  buttons with black text;
- bold masculine headings with editorial spacing;
- normal-colour photography, never blanket greyscale;
- restrained borders, labels, and large photographic or diagram moments;
- strong contrast and visible focus states; and
- limited motion that respects `prefers-reduced-motion`.

Desktop pages may use asymmetric editorial grids. Mobile pages must become a
single reading column with full-width visuals, comfortable Chinese wrapping,
and CTAs that remain easy to tap.

## 7. Image Processing

The PDFs are source material, not the final page renderer. Implementation must:

- extract individual useful visuals instead of embedding whole PDF pages;
- crop without cutting off garments, people, comparison markers, or important
  diagram labels;
- preserve original colour and aspect ratio;
- export web assets to WebP at sizes appropriate for their rendered use;
- use stable kebab-case filenames grouped under a knowledge-centre asset
  directory;
- add descriptive Traditional Chinese alt text;
- add a visible caption when context or attribution is necessary; and
- lazy-load below-the-fold images while allowing the lead image to load with
  appropriate priority.

Table content and teaching copy must be recreated as HTML. Text must not remain
locked inside a raster image when it is important to understanding the answer.
A missing required image or metadata record must fail validation rather than
silently produce a broken page.

## 8. Content Model and Rendering Architecture

Knowledge content must be stored separately from presentation. Each article
record should expose a stable interface containing at least:

- slug;
- title and navigation label;
- description and direct answer;
- category and intended search topics;
- hero image and alt text;
- ordered content sections;
- optional tables, examples, and FAQ entries;
- related article slugs;
- canonical URL and social image metadata; and
- published and updated dates.

A shared template renders the index and article pages from these records.
Public knowledge routes must have complete text and links in the initial HTML
response. They must not rely solely on the current `HashRouter`, because the
existing `#/...` portal pattern is intended for application routes rather than
public search content.

The implementation plan must select the smallest change compatible with the
current Vite build, preferably deterministic static generation during the
normal build. The existing hash-routed homepage, assessment, and portal routes
must continue to work unchanged.

## 9. Discovery and GEO Requirements

Every public page must have:

- a unique title and meta description;
- one canonical URL;
- Open Graph and Twitter metadata;
- crawlable internal links to the hub, related articles, homepage, and CTA;
- `Article` and `BreadcrumbList` structured data where appropriate;
- consistent A2O organisation and local-business identity;
- a valid entry in `sitemap.xml`; and
- an AI-readable markdown mirror or equivalent text representation referenced
  from the existing discovery assets.

The existing `robots.txt`, `llms.txt`, `llms-full.txt`, sitemap markdown, and
homepage discovery content must be updated to include the centre. No design
may promise rankings or AI recommendations; success means making the content
eligible, understandable, sourceable, and internally well connected.

## 10. Conversion Behaviour

The primary CTA on every hub and article page is `開始免費形象檢測`. It must
return the visitor to the homepage assessment section using a stable link and
then focus or reveal the appropriate start action without resetting unrelated
site state.

The secondary CTA is `WhatsApp 預約一對一諮詢`. It must open the approved A2O
WhatsApp number with the concise consultation message already used by the
homepage booking CTA.

CTA interactions should use the existing homepage analytics conventions with
page slug, article category, CTA type, and placement as non-personal event
properties.

## 11. Error Handling and Fallbacks

- Unknown knowledge-centre URLs must offer clear links back to the centre and
  homepage rather than exposing a blank app shell.
- Build-time content validation must reject duplicate slugs, broken related
  links, missing titles, missing alt text, and unavailable required images.
- A single optional image may be omitted only when the layout has an explicit
  text fallback.
- Broken PDF extraction or asset conversion must stop the asset-generation
  step with an actionable message.
- No error path may expose CRM data, environment variables, client records, or
  private report delivery URLs.

## 12. Testing and Acceptance Criteria

### 12.1 Automated verification

- schema/content tests for all six page records;
- route/output tests proving every clean URL emits meaningful initial HTML;
- metadata and canonical uniqueness tests;
- sitemap and internal-link integrity tests;
- structured-data parsing tests;
- image-manifest tests for filename, alt text, and file presence;
- CTA destination and analytics tests;
- homepage regression tests;
- existing assessment and portal route tests; and
- production build.

### 12.2 Manual visual verification

Check at representative mobile, tablet, and desktop widths:

- no clipped Chinese copy or horizontal overflow;
- no incomplete or distorted images;
- normal-colour photography;
- readable tables and comparison diagrams;
- visible keyboard focus and sufficient contrast;
- sensible loading order and no disruptive layout shift; and
- working hub, related-article, assessment, and WhatsApp links.

### 12.3 Definition of done

The feature is complete only when:

- all six public URLs can be opened directly and return complete HTML content;
- all five articles contain substantive, non-duplicated teaching material;
- the homepage visibly links to the knowledge centre;
- all selected source images render correctly at all target sizes;
- discovery files and sitemap include every public page;
- the primary and secondary CTA journeys work;
- the existing assessment and CRM behaviour is unchanged; and
- the relevant automated checks and production build pass.

## 13. Privacy, Rights, and Editorial Integrity

The published pages must not expose client names, phone numbers, private report
links, or assessment submissions. Product images and brand names are presented
only as editorial styling examples supplied for this project. No copy may imply
brand endorsement, live availability, or guaranteed pricing.

The centre must not publish invented testimonials or guarantee that appearance
will produce career, sales, or dating outcomes. Recommendations should remain
practical, supportable, and aligned with A2O's men's image-consulting expertise.
