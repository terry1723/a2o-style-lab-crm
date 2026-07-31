# Work Look Product Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the first page's before/after visual with a real seven-product work-look recommendation, price summary and itemised budget list.

**Architecture:** Convert the supplied AVIF/WebP/JPG product files into stable PNG assets inside the report worktree, then use a page-specific product collage renderer in the existing ReportLab generator. Keep image placement data and product data in explicit constants so future real product replacements do not affect pages 2–14.

**Tech Stack:** Python 3, Pillow with AVIF support, ReportLab, pypdf, Poppler.

---

### Task 1: Prepare stable product assets and product data

**Files:**

- Create: `assets/work-look-products/blazer.png`
- Create: `assets/work-look-products/cable-knit.png`
- Create: `assets/work-look-products/striped-oxford.png`
- Create: `assets/work-look-products/trousers.png`
- Create: `assets/work-look-products/loafers.png`
- Create: `assets/work-look-products/belt.png`
- Create: `assets/work-look-products/card-holder.png`
- Modify: `tools/generate_a2o_complete_work_report.py`
- Test: `tools/test_generate_a2o_complete_work_report.py`

- [ ] **Step 1: Write a failing product-data test**

Add a test that imports `WORK_LOOK_PRODUCTS` and asserts the seven expected categories, total and asset names:

```python
self.assertEqual([product.category for product in WORK_LOOK_PRODUCTS], [
    "外套", "上衣", "襯衫", "長褲", "鞋履", "皮帶", "配件",
])
self.assertEqual(sum(product.price_hkd for product in WORK_LOOK_PRODUCTS), 9890)
for product in WORK_LOOK_PRODUCTS:
    self.assertTrue((WORK_LOOK_PRODUCT_DIR / product.asset_name).is_file())
```

- [ ] **Step 2: Run the targeted test to verify RED**

Run: `python3 -m unittest -v tools.test_generate_a2o_complete_work_report.CompleteWorkReportTests.test_work_look_product_data_is_complete`

Expected: failure because `WORK_LOOK_PRODUCTS` and converted assets do not exist.

- [ ] **Step 3: Convert the supplied files into report-owned PNG assets**

Use Pillow to convert the three AVIF sources and preserve the existing JPG/WebP product images as PNG with white backgrounds. Use these destination names exactly:

```python
PRODUCT_ASSETS = {
    "blazer.png": "Massimo Dutti 棕色羊毛混紡修身西裝外套 .webp",
    "cable-knit.png": "Polo Ralph Lauren 米白色經典棉質麻花針織衫.avif",
    "striped-oxford.png": "Polo Ralph Lauren 淺藍色細條紋牛津布襯衫.avif",
    "trousers.png": "Massimo Dutti 卡其色棉麻混紡褶襇休閒褲.jpg",
    "loafers.png": "Massimo Dutti 深棕色流蘇麂皮樂福鞋.webp",
    "belt.png": "Polo Ralph Lauren 編織皮革飾邊腰帶.avif",
    "card-holder.png": "Polo Ralph Lauren 深棕色皮革卡夾.webp",
}
```

Use `Image.open(source).convert("RGBA")`, composite transparent pixels onto white, then save as lossless PNG.

- [ ] **Step 4: Add typed product data**

Implement:

```python
@dataclass(frozen=True)
class WorkLookProduct:
    category: str
    name: str
    price_hkd: int
    asset_name: str

WORK_LOOK_PRODUCT_DIR = Path(__file__).resolve().parents[1] / "assets" / "work-look-products"
```

Populate `WORK_LOOK_PRODUCTS` with the exact names and prices from the approved spec.

- [ ] **Step 5: Run targeted test to verify GREEN and commit**

Run: `python3 -m unittest -v tools.test_generate_a2o_complete_work_report.CompleteWorkReportTests.test_work_look_product_data_is_complete`

Expected: PASS.

```bash
git add assets/work-look-products tools/generate_a2o_complete_work_report.py tools/test_generate_a2o_complete_work_report.py
git commit -m "feat: add work look product assets"
```

### Task 2: Replace the first-page visual and itemised content

**Files:**

- Modify: `tools/generate_a2o_complete_work_report.py`
- Modify: `tools/test_generate_a2o_complete_work_report.py`

- [ ] **Step 1: Write failing first-page assertions**

Add assertions for real products and the removed before/after content:

```python
page_one = reader.pages[0]
text = page_one.extract_text() or ""
self.assertIn("造型單品與預算分配", text)
self.assertIn("HK$9,890", text)
self.assertIn("Massimo Dutti 棕色羊毛混紡修身西裝外套", text)
self.assertIn("Polo Ralph Lauren 米白色經典棉質麻花針織衫", text)
self.assertNotIn("三個可按需要調整的工作穿搭方向", text)
self.assertGreaterEqual(len(page_one.images), 7)
```

- [ ] **Step 2: Run the targeted test to verify RED**

Run: `python3 -m unittest -v tools.test_generate_a2o_complete_work_report.CompleteWorkReportTests.test_first_page_uses_real_work_look_products`

Expected: FAIL because page 1 still embeds the old before/after image and sample table.

- [ ] **Step 3: Implement the guide-style product collage and summary**

Replace only `draw_work_report_page` with three sections:

```python
draw_title(pdf, "你的工作造型建議", "以深棕、米白與淺藍建立成熟而可信的工作形象。")
draw_product_collage(pdf, WORK_LOOK_PRODUCTS, x=MARGIN, y=470, width=330, height=260)
draw_work_look_summary(pdf, x=390, y=470, width=163, height=260, total=9890)
draw_work_look_budget_list(pdf, WORK_LOOK_PRODUCTS, top_y=430)
```

`draw_product_collage` must use contain placement with a warm cream background: the blazer and trousers occupy two large positions; knit, Oxford shirt, loafers, belt and card holder occupy five smaller positions. It must not crop product images.

`draw_work_look_summary` must show:

```text
一套完整工作造型
適合見客、商務午餐及需要建立專業感的場合。
HK$9,890
```

It must explain the brown blazer, cream knit, pale-blue Oxford, khaki trousers and dark-brown accessories as one coherent colour system.

`draw_work_look_budget_list` must show seven individual lines, not a merged accessories row, using the exact customer-provided names/prices.

- [ ] **Step 4: Run tests and generate the PDF**

Run:

```bash
python3 -m unittest -v tools.test_generate_a2o_complete_work_report
python3 tools/generate_a2o_complete_work_report.py \
  --assets-dir /Users/terrylee/Documents/ig-content-research-system/output/pdf/a2o_menswear_fundamentals_assets_optimized \
  --output output/pdf/a2o-complete-work-image-report-sample.pdf
pdfinfo output/pdf/a2o-complete-work-image-report-sample.pdf | rg '^Pages|^Page size'
```

Expected: all tests pass; 14 A4 pages.

- [ ] **Step 5: Render and visually inspect the changed first page**

Run:

```bash
pdftoppm -f 1 -l 1 -png -r 180 output/pdf/a2o-complete-work-image-report-sample.pdf \
  tmp/work-look-product-page
```

Check: all seven product images are recognisable and uncropped; blazer/trousers have visual priority; price summary is clear; all seven list rows are readable; first-page content does not overlap the CTA/footer; pages 2–14 remain intact.

- [ ] **Step 6: Commit source and assets only**

```bash
git add assets/work-look-products tools/generate_a2o_complete_work_report.py tools/test_generate_a2o_complete_work_report.py
git commit -m "feat: add work look product page"
```
