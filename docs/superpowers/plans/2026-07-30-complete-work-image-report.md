# Complete Work Image Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a polished 14-page A2O work-image report PDF that combines two personalised work-image pages with the rewritten, original-style men's styling guide pages.

**Architecture:** Extend the existing standalone ReportLab generator instead of modifying the website or CRM. Keep page content as explicit Python data, keep shared original-guide visual primitives in one module, and reuse only the approved original guide assets through a configurable source directory. A unittest module validates document structure and copy; Poppler renders every page for visual QA.

**Tech Stack:** Python 3, ReportLab, pypdf, Pillow, Poppler (`pdfinfo`, `pdftoppm`).

---

## File structure

- `tools/generate_a2o_complete_work_report.py` — the 14-page ReportLab generator, visual tokens, rewritten copy, CLI and asset resolution.
- `tools/test_generate_a2o_complete_work_report.py` — isolated unit and CLI tests for page count, required text, asset resolution and output generation.
- `output/pdf/a2o-complete-work-image-report-sample.pdf` — generated review artefact; not committed unless repository policy later requests exports in version control.
- `output/pdf/a2o-complete-work-image-report-sample-page-01.png` through `page-14.png` — visual QA renders; not committed.

The read-only source asset directory is `/Users/terrylee/Documents/ig-content-research-system/output/pdf/a2o_menswear_fundamentals_assets_optimized`. It provides the guide's already-approved illustration and garment image assets. The generator must also allow `A2O_GUIDE_ASSETS_DIR` to point to a copied asset directory on another machine.

## Task 1: Define report data, file boundaries and testable contract

**Files:**

- Create: `tools/generate_a2o_complete_work_report.py`
- Create: `tools/test_generate_a2o_complete_work_report.py`

- [ ] **Step 1: Write the failing document contract tests**

Create a unittest class that generates a report into a temporary directory and extracts text with `pypdf.PdfReader`:

```python
class CompleteWorkReportTests(unittest.TestCase):
    def test_build_report_creates_fourteen_readable_pages(self):
        output = Path(self.temp_dir.name) / "report.pdf"
        build_report(output, assets_dir=fixture_assets_dir())
        reader = PdfReader(str(output))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
        self.assertEqual(len(reader.pages), 14)
        self.assertIn("你的工作形象檢測報告", text)
        self.assertIn("先看場合，再選擇搭配", text)
        self.assertIn("簡單但實用的衣櫃系統", text)
        self.assertNotIn("唔同場合", text)
        self.assertNotIn("啱身", text)
```

Add tests that assert an invalid configured asset path raises `FileNotFoundError` containing `A2O_GUIDE_ASSETS_DIR`, and that `--output` creates a nested output directory.

- [ ] **Step 2: Run tests to verify RED**

Run: `python3 -m unittest -v tools.test_generate_a2o_complete_work_report`

Expected: `ModuleNotFoundError` because the generator does not exist yet.

- [ ] **Step 3: Implement the minimum data model and command-line interface**

Implement these public functions and types before page drawing code:

```python
def resolve_assets_dir(explicit: Path | None = None) -> Path:
    configured = explicit or Path(os.environ.get("A2O_GUIDE_ASSETS_DIR", DEFAULT_ASSETS_DIR))
    if not configured.is_dir():
        raise FileNotFoundError(
            "Guide assets directory is unavailable. Set A2O_GUIDE_ASSETS_DIR "
            f"to the approved assets folder: {configured}"
        )
    return configured

def build_report(output_path: Path, assets_dir: Path | None = None) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    # configure canvas and write all 14 pages
    return output_path

def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path,
                        default=Path("output/pdf/a2o-complete-work-image-report-sample.pdf"))
    parser.add_argument("--assets-dir", type=Path, default=None)
    return parser.parse_args(argv)
```

Define `PAGE_COPY` with only Traditional Chinese written-language strings. Keep work-report sample labels explicit: `示範品牌／示範預算`, `可替換`, and `示範內容及價格，並非目前報價`.

- [ ] **Step 4: Run the first implementation tests**

Run: `python3 -m unittest -v tools.test_generate_a2o_complete_work_report`

Expected: tests still fail only because drawing functions have not yet written 14 pages.

- [ ] **Step 5: Commit the contract foundation**

```bash
git add tools/generate_a2o_complete_work_report.py tools/test_generate_a2o_complete_work_report.py
git commit -m "feat: add complete work report foundation"
```

## Task 2: Build shared original-guide visual primitives and the rewritten guide pages

**Files:**

- Modify: `tools/generate_a2o_complete_work_report.py`
- Modify: `tools/test_generate_a2o_complete_work_report.py`

- [ ] **Step 1: Add failing copy and sequence tests**

Add assertions for all rewritten guide headings and bookends:

```python
expected_headings = [
    "先看場合，再選擇搭配",
    "一週 Clean Fit 配色",
    "近似色系夏日配色",
    "不同材質的上下裝搭配",
    "男士衣長基本功",
    "男士褲長基本功",
    "鞋褲連貫",
    "T-shirt／襯衫合身原則",
    "褲型基本功",
    "香港夏季穿搭",
    "香港男士常見的扣分位",
    "簡單但實用的衣櫃系統",
]
for heading in expected_headings:
    self.assertIn(heading, text)
```

Run: `python3 -m unittest -v tools.test_generate_a2o_complete_work_report`

Expected: FAIL because the guide pages are not generated.

- [ ] **Step 2: Implement shared original-guide components**

Implement reusable functions using the original guide's documented system:

```python
BG = colors.HexColor("#F6F0E7")
INK = colors.HexColor("#2C211B")
MUTED = colors.HexColor("#756B62")
BURGUNDY = colors.HexColor("#7A1F2B")
CREAM = colors.HexColor("#FFF9EF")

def draw_page_background(canvas):
    canvas.setFillColor(BG)
    canvas.rect(0, 0, *A4, fill=1, stroke=0)

def draw_title(canvas, title: str, subtitle: str, y: float = 770) -> None:
    canvas.setFillColor(INK)
    canvas.setFont("A2O-Bold", 25)
    canvas.drawString(42, y, title)
    canvas.setFillColor(BURGUNDY)
    canvas.rect(42, y - 13, 62, 3, fill=1, stroke=0)
    canvas.setFillColor(MUTED)
    canvas.setFont("A2O", 10)
    canvas.drawString(42, y - 32, subtitle)

def draw_footer(canvas, page_number: int) -> None:
    draw_cta_button(canvas, A4[0] - 194, 38)
    canvas.setFillColor(MUTED)
    canvas.setFont("A2O", 7)
    canvas.drawString(42, 26, "A2O Style Lab")
    canvas.drawRightString(A4[0] - 42, 26, f"{page_number:02d}")

def draw_cta_button(canvas, x: float, y: float) -> None:
    canvas.setFillColor(BURGUNDY)
    canvas.roundRect(x, y, 144, 24, 4, fill=1, stroke=0)
    canvas.setFillColor(colors.white)
    canvas.setFont("A2O-Bold", 8)
    canvas.drawCentredString(x + 72, y + 7.5, "WhatsApp 免費了解形象問題")

def draw_table(canvas, x: float, top_y: float, widths: list[float], rows: list[list[str]]) -> None:
    for row_index, row in enumerate(rows):
        row_y = top_y - (row_index + 1) * 28
        canvas.setFillColor(BURGUNDY if row_index == 0 else CREAM)
        canvas.rect(x, row_y, sum(widths), 28, fill=1, stroke=0)
        current_x = x
        for cell, width in zip(row, widths):
            canvas.setStrokeColor(colors.HexColor("#A99D90"))
            canvas.rect(current_x, row_y, width, 28, fill=0, stroke=1)
            canvas.setFillColor(colors.white if row_index == 0 else INK)
            canvas.setFont("A2O-Bold" if row_index == 0 else "A2O", 8)
            canvas.drawCentredString(current_x + width / 2, row_y + 9, cell)
            current_x += width

def draw_image_cover(canvas, assets_dir: Path, image_name: str,
                     x: float, y: float, width: float, height: float) -> None:
    image = ImageReader(str(assets_dir / image_name))
    source_width, source_height = image.getSize()
    scale = max(width / source_width, height / source_height)
    canvas.saveState()
    path = canvas.beginPath()
    path.rect(x, y, width, height)
    canvas.clipPath(path, stroke=0, fill=0)
    canvas.drawImage(image, x - (source_width * scale - width) / 2,
                     y - (source_height * scale - height) / 2,
                     source_width * scale, source_height * scale, mask="auto")
    canvas.restoreState()
```

`draw_footer` must show `A2O Style Lab`, a two-digit page number and the same burgundy WhatsApp CTA button. Font resolution must follow the robust configurable CJK strategy already used in `generate_a2o_work_report_sample.py`.

- [ ] **Step 3: Implement pages 3–14 with rewritten written-language copy**

Create page functions named `draw_occasions_page` through `draw_wardrobe_page`. Use source assets by their existing file names where available: `page03_real_before_after.jpg`, `page04_cleanfit.jpg`, `page05_similar_colors.jpg`, `page06_materials.jpg`, `page07_top_length.jpg`, `page08_pants_length.jpg`, `page09_shoes.jpg`, `page10_top_fit.jpg`, `page11_trouser_fit.jpg`, `page12_summer.jpg`, `page13_mistakes.jpg`, `page14_wardrobe.jpg`.

Required written-language replacements include:

```python
WRITTEN_LANGUAGE_REPLACEMENTS = {
    "不同場合，整潔感的標準不同": "不同場合，整潔感的標準不同",
    "材質不是隨意混搭，厚薄與光澤需要平衡": "材質不是隨意混搭，厚薄與光澤需要平衡",
    "褲腳不堆積，整體造型便會更俐落": "褲腳不堆積，整體造型便會更俐落",
    "合身不等於貼身": "合身不等於貼身",
    "避免過度緊身": "避免過度緊身",
}
```

Use natural full sentences in every table and note. Keep `Clean Fit`, `Polo`, `T-shirt`, `Loafer`, `Overshirt`, and `smart casual` where they are useful fashion terms.

- [ ] **Step 4: Run guide-page tests to verify GREEN**

Run: `python3 -m unittest -v tools.test_generate_a2o_complete_work_report`

Expected: PASS; extracted PDF text contains all 12 guide headings and excludes the specified Cantonese expressions.

- [ ] **Step 5: Commit the unified guide**

```bash
git add tools/generate_a2o_complete_work_report.py tools/test_generate_a2o_complete_work_report.py
git commit -m "feat: rebuild written-language menswear guide"
```

## Task 3: Rebuild pages 1–2 in the original-guide style

**Files:**

- Modify: `tools/generate_a2o_complete_work_report.py`
- Modify: `tools/test_generate_a2o_complete_work_report.py`

- [ ] **Step 1: Add failing personalised-front-matter tests**

Add assertions that the first two pages contain the approved content:

```python
first_page = reader.pages[0].extract_text() or ""
second_page = reader.pages[1].extract_text() or ""
self.assertIn("你的工作形象檢測報告", first_page)
self.assertIn("工作形象先建立信任", first_page)
self.assertIn("示範品牌／示範預算", first_page)
self.assertIn("HK$1,900", first_page)
self.assertIn("A2O 男士形象提升計劃", second_page)
self.assertIn("示範內容及價格，並非目前報價", second_page)
self.assertIn("HK$5,980", second_page)
self.assertIn("WhatsApp 免費了解我的形象問題", second_page)
```

Run: `python3 -m unittest -v tools.test_generate_a2o_complete_work_report`

Expected: FAIL because pages 1–2 are absent or still use a dark-card layout.

- [ ] **Step 2: Implement page 1 as a guide-style report opener**

Create `draw_work_report_page(canvas, assets_dir)` using the same `BG`, burgundy underline, image area and table/card hierarchy as page 3. Display three work directions in a compact comparison table with sample content:

```python
WORK_LOOKS = [
    ("見客 Smart Casual", "海軍藍針織 Polo + 米白直筒褲 + 黑色樂福鞋", "UNIQLO、G.H.BASS", "HK$1,900"),
    ("日常專業造型", "炭灰 Overshirt + 白色 T-shirt + 深灰直筒褲", "COS、UNIQLO", "HK$2,800"),
    ("正式會議造型", "深色輕量西裝外套 + 淺藍襯衫 + 深色修身直筒褲", "Massimo Dutti、UNIQLO", "HK$3,600"),
]
```

Include a burgundy-accented note: `以下為示範搭配方向；所有示範品牌、單品與預算均可替換，並非現時產品、庫存或價格。`

- [ ] **Step 3: Implement page 2 as a guide-style A2O programme page**

Create `draw_programme_page(canvas, assets_dir)` using a full-width lifestyle image, burgundy service table and clear note. Use the six approved services:

1. 個人身形比例及形象定位
2. 三個實際可穿的搭配方向
3. 髮型及儀容整理方向
4. 購物清單與衣櫃優先次序
5. WhatsApp 跟進建議
6. 諮詢後的實用執行支援

Show `HK$5,980` only next to `示範內容及價格，並非目前報價`.

- [ ] **Step 4: Run front-matter tests to verify GREEN**

Run: `python3 -m unittest -v tools.test_generate_a2o_complete_work_report`

Expected: PASS; first two pages contain all specified copy and continue the original-guide visual primitives.

- [ ] **Step 5: Commit the completed report source**

```bash
git add tools/generate_a2o_complete_work_report.py tools/test_generate_a2o_complete_work_report.py
git commit -m "feat: add work image report front matter"
```

## Task 4: Generate, inspect and package the 14-page review PDF

**Files:**

- Create: `output/pdf/a2o-complete-work-image-report-sample.pdf`
- Create: `output/pdf/a2o-complete-work-image-report-sample-page-01.png` through `output/pdf/a2o-complete-work-image-report-sample-page-14.png`

- [ ] **Step 1: Generate the report from the repository root**

Run:

```bash
python3 tools/generate_a2o_complete_work_report.py \
  --output output/pdf/a2o-complete-work-image-report-sample.pdf
```

Expected: exit code 0 and a non-empty PDF. The command must not modify the original `a2o_menswear_guide.pdf`, website files, CRM files or external systems.

- [ ] **Step 2: Run structural and textual validation**

Run:

```bash
python3 -m unittest -v tools.test_generate_a2o_complete_work_report
pdfinfo output/pdf/a2o-complete-work-image-report-sample.pdf | rg '^Pages|^Page size'
```

Expected: all tests pass; `Pages: 14`; `Page size: 595.276 x 841.89 pts (A4)`.

- [ ] **Step 3: Render every page for visual QA**

Run:

```bash
pdftoppm -png -r 150 output/pdf/a2o-complete-work-image-report-sample.pdf \
  output/pdf/a2o-complete-work-image-report-sample-page
```

Inspect page 1, page 2, pages 3–5, pages 6–10 and pages 11–14. Confirm all of the following before delivery:

- No clipped Traditional Chinese text, blank image block, overlapping table text or missing page number.
- Pages 1–2 use the same warm background, burgundy accents and table rhythm as pages 3–14.
- Every CTA is fully visible and legible.
- Every sample price is explicitly marked as sample/replaceable.
- The guide starts on page 3 and ends on page 14; pages from the original guide 1, 2, 15 and 16 are absent.

- [ ] **Step 4: Commit source changes only and deliver review links**

```bash
git add tools/generate_a2o_complete_work_report.py tools/test_generate_a2o_complete_work_report.py
git commit -m "test: verify complete work image report"
```

Do not stage `output/`, `tools/__pycache__/` or the pre-existing `app/tsconfig.tsbuildinfo`. Deliver the PDF link and explain that the three category variants, real brands/prices and website automation are deliberately not part of this report-mother-template task.
