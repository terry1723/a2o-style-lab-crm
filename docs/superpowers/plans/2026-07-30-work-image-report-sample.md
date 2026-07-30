# 工作形象個人檢測報告範例：製作計劃

> **For Codex:** Required execution skill: use `executing-plans` for inline execution, or `subagent-driven-development` for delegated execution.

**Goal:** 製作一份可供 A2O 審閱的兩頁「工作／見客」個人形象檢測報告 PDF 範例；內容採用可替換的示範品牌、穿搭與價格，不連接網站，也不合併現有男士穿搭指南。

**Architecture:** 在 CRM 專案內新增一個獨立的 ReportLab 產生器與輕量驗證程式。產生器以深炭灰、暖灰及克制粉色建立 A2O 深色 editorial 版面，輸出固定兩頁 PDF；驗證程式使用 PDF 文字擷取確認頁數和關鍵內容，最後將 PDF 渲染成 PNG 作逐頁視覺檢查。

**Tech Stack:** Python 3、ReportLab、pypdf、Poppler `pdftoppm`、Arial Unicode 字型。

**Output:** `output/pdf/a2o-work-image-report-sample.pdf`

---

## Task 1：以測試先定義兩頁報告的固定內容與輸出契約

**Files:**

- Create: `tools/test_generate_a2o_work_report_sample.py`
- Create: `tools/generate_a2o_work_report_sample.py`

**Step 1: Write the failing test**

建立驗證程式，匯入尚未存在的 `build_report`，輸出至臨時 PDF，並以 `pypdf.PdfReader` 驗證：

```python
assert len(reader.pages) == 2
assert "你的工作形象穿搭方向" in text
assert "A2O 男士形象提升計劃" in text
assert "示範內容" in text
```

**Step 2: Run test to verify it fails**

Run: `python3 tools/test_generate_a2o_work_report_sample.py`

Expected: 失敗，原因為產生器模組或 `build_report` 尚未建立。

**Step 3: Implement the smallest production generator**

建立 `build_report(output_path: Path) -> Path`，並使用 Unicode 字型和兩張 Letter/A4 portrait 頁面：

- Page 1: `你的工作形象穿搭方向`、副標「工作形象先建立信任」、三組示範穿搭卡、每組的搭配重點、示範品牌和預算範圍。
- Page 2: `A2O 男士形象提升計劃`、`示範內容及價格，並非目前報價` 提示、HK$5,980 示範價格、六項服務、WhatsApp CTA。
- 使用抽象服裝輪廓、色卡與版面元素取代第三方商品圖片，使其可自由更換而不會誤導為真實庫存。
- 每頁頁腳標記 `A2O Style Lab · Work Image Report Sample`。

**Step 4: Run test to verify it passes**

Run: `python3 tools/test_generate_a2o_work_report_sample.py`

Expected: 結束碼 0，測試 PDF 含兩頁及所有指定文字。

## Task 2：輸出、檢查與交付 PDF

**Files:**

- Create: `output/pdf/a2o-work-image-report-sample.pdf`
- Create: `output/pdf/a2o-work-image-report-sample-page-1.png`
- Create: `output/pdf/a2o-work-image-report-sample-page-2.png`

**Step 1: Generate the review PDF**

Run:

```bash
python3 tools/generate_a2o_work_report_sample.py \
  output/pdf/a2o-work-image-report-sample.pdf
```

Expected: 產生非空白的兩頁 PDF，且不修改網站、CRM、Google Sheet 或原始男士指南 PDF。

**Step 2: Verify the final PDF structure**

Run:

```bash
pdfinfo output/pdf/a2o-work-image-report-sample.pdf
python3 tools/test_generate_a2o_work_report_sample.py \
  output/pdf/a2o-work-image-report-sample.pdf
```

Expected: `Pages: 2`；文字驗證通過。

**Step 3: Render pages for visual QA**

Run:

```bash
pdftoppm -png -r 150 output/pdf/a2o-work-image-report-sample.pdf \
  output/pdf/a2o-work-image-report-sample-page
```

檢查兩張 PNG：中文字沒有缺字或截斷、價格提示清晰、示範內容標示明確、深色 editorial 風格一致、WhatsApp CTA 完整可讀。

**Step 4: Deliver the review artefact**

交付 PDF 和兩張預覽圖的本地連結，並說明目前所有品牌、價格及穿搭均為可替換的示範內容；待 A2O 提供真實品牌／三套搭配後，再進行正式版本與指南合併。

---

## Scope guardrails

- 不修改 A2O 網站首頁、CRM、登入、Supabase、Google Sheets、Apps Script 或 Vercel。
- 不改動原始 `a2o_menswear_guide.pdf`。
- 不引用或暗示任何真實庫存、官方品牌合作或目前服務定價。
- 尚不製作「約會」和「未能明確分類」兩個版本。
