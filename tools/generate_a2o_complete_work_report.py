"""Generate A2O's written-language menswear education report.

The guide pages intentionally share a small set of ReportLab primitives so the
educational pages retain the calm, editorial rhythm of the approved source
guide while remaining usable when its optional image directory is unavailable.
"""

from __future__ import annotations

import argparse
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence

from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader, simpleSplit
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


PAGE_WIDTH, PAGE_HEIGHT = A4
MARGIN = 42
FONT_NAME = "A2OCompleteReportCJK"
DEFAULT_ASSETS_DIR = Path(
    "/Users/terrylee/Documents/ig-content-research-system/output/pdf/"
    "a2o_menswear_fundamentals_assets_optimized"
)
DEFAULT_OUTPUT_PATH = Path("output/pdf/a2o-complete-work-image-report-sample.pdf")
FONT_FALLBACK_PATHS = (
    Path("/System/Library/Fonts/STHeiti Medium.ttc"),
    Path("/System/Library/Fonts/PingFang.ttc"),
    Path("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"),
    Path("/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc"),
    Path("C:/Windows/Fonts/msjh.ttc"),
)

# Original-guide visual tokens. Keep these colours centralised so every page
# uses the same printed-guide family rather than a dashboard/card treatment.
BG = HexColor("#F6F0E7")
INK = HexColor("#2C211B")
MUTED = HexColor("#756B62")
BURGUNDY = HexColor("#7A1F2B")
CREAM = HexColor("#FFF9EF")
LINE = HexColor("#A99D90")
GUIDE_IMAGE_TABLE_GAP = 16
GUIDE_IMAGE_CALLOUT_GAP = 14
GUIDE_CALLOUT_Y = 106
GUIDE_IMAGE_MIN_HEIGHT = 140
WORK_LOOK_PRODUCT_DIR = Path(__file__).resolve().parents[1] / "assets" / "work-look-products"


@dataclass(frozen=True)
class WorkLookProduct:
    category: str
    name: str
    price_hkd: int
    asset_name: str


WORK_LOOK_PRODUCTS: tuple[WorkLookProduct, ...] = (
    WorkLookProduct(
        "外套",
        "Massimo Dutti 棕色羊毛混紡修身西裝外套",
        2590,
        "blazer.png",
    ),
    WorkLookProduct(
        "上衣",
        "Polo Ralph Lauren 米白色經典棉質麻花針織衫",
        1990,
        "cable-knit.png",
    ),
    WorkLookProduct(
        "襯衫",
        "Polo Ralph Lauren 淺藍色細條紋牛津布襯衫",
        1290,
        "striped-oxford.png",
    ),
    WorkLookProduct(
        "長褲",
        "Massimo Dutti 卡其色棉麻混紡褶襇休閒褲",
        1190,
        "trousers.png",
    ),
    WorkLookProduct(
        "鞋履",
        "Massimo Dutti 深棕色麂皮便士樂福鞋",
        1490,
        "loafers.png",
    ),
    WorkLookProduct(
        "皮帶",
        "Polo Ralph Lauren 編織皮革飾邊腰帶",
        790,
        "belt.png",
    ),
    WorkLookProduct(
        "配件",
        "Polo Ralph Lauren 深棕色皮革卡夾",
        550,
        "card-holder.png",
    ),
)

PROGRAMME_SERVICES = (
    ("個人身形比例及形象定位", "按工作角色、鏡頭場合與個人目標，找出最值得優先調整的方向。"),
    ("三個實際可穿的搭配方向", "建立見客、日常與正式會議可重複使用的完整搭配邏輯。"),
    ("髮型及儀容整理方向", "整理髮型、鬍鬚、眼鏡與日常打理細節，令形象更一致。"),
    ("購物清單與衣櫃優先次序", "先補足最有影響力的單品，避免再次購入難以配搭的衣服。"),
    ("WhatsApp 跟進建議", "就實際穿搭照片提供重點回饋，協助在日常中作出微調。"),
    ("諮詢後的實用執行支援", "把建議落地，確認剪裁、比例與場合感是否一致。"),
)


def resolve_assets_dir(explicit: str | Path | None = None) -> Path:
    """Return a readable asset directory from an argument, environment, or default."""
    if explicit is not None:
        candidate = Path(explicit).expanduser()
        source = "--assets-dir"
    elif configured := os.environ.get("A2O_GUIDE_ASSETS_DIR"):
        candidate = Path(configured).expanduser()
        source = "A2O_GUIDE_ASSETS_DIR"
    else:
        candidate = DEFAULT_ASSETS_DIR
        source = "the default asset directory"

    if candidate.is_dir():
        return candidate
    raise FileNotFoundError(
        f"Unable to find A2O guide assets from {source}: {candidate}. "
        "Set A2O_GUIDE_ASSETS_DIR or pass --assets-dir with a readable directory."
    )


def resolve_cjk_font_path() -> Path:
    """Select an explicitly configured or known CJK-capable system font."""
    configured = os.environ.get("A2O_REPORT_FONT_PATH")
    if configured:
        font_path = Path(configured).expanduser()
        if font_path.is_file():
            return font_path
        raise RuntimeError(
            "A2O_REPORT_FONT_PATH does not point to a readable CJK font: "
            f"{font_path}. Set it to a .ttf or .ttc font file."
        )

    for font_path in FONT_FALLBACK_PATHS:
        if font_path.is_file():
            return font_path
    checked_locations = ", ".join(str(path) for path in FONT_FALLBACK_PATHS)
    raise RuntimeError(
        "No CJK font was found for the A2O report. Install a CJK font or set "
        "A2O_REPORT_FONT_PATH to a readable .ttf/.ttc file. Checked: "
        + checked_locations
    )


def _register_font() -> None:
    if FONT_NAME not in pdfmetrics.getRegisteredFontNames():
        pdfmetrics.registerFont(TTFont(FONT_NAME, str(resolve_cjk_font_path()), subfontIndex=0))


def _text(pdf: canvas.Canvas, value: str, x: float, y: float, size: float, colour=INK) -> None:
    pdf.setFillColor(colour)
    pdf.setFont(FONT_NAME, size)
    pdf.drawString(x, y, value)


def _wrapped_text(
    pdf: canvas.Canvas,
    value: str,
    x: float,
    y: float,
    width: float,
    size: float,
    leading: float | None = None,
    colour=INK,
) -> float:
    leading = leading or size * 1.42
    pdf.setFillColor(colour)
    pdf.setFont(FONT_NAME, size)
    for line in simpleSplit(value, FONT_NAME, size, width):
        pdf.drawString(x, y, line)
        y -= leading
    return y


def draw_page_background(pdf: canvas.Canvas) -> None:
    pdf.setFillColor(BG)
    pdf.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)


def draw_title(pdf: canvas.Canvas, title: str, subtitle: str, y: float = 770) -> None:
    _text(pdf, title, MARGIN, y, 25, INK)
    pdf.setFillColor(BURGUNDY)
    pdf.rect(MARGIN, y - 13, 62, 3, fill=1, stroke=0)
    _wrapped_text(pdf, subtitle, MARGIN, y - 33, PAGE_WIDTH - 2 * MARGIN, 10, 14, MUTED)


def draw_cta_button(
    pdf: canvas.Canvas, x: float, y: float, label: str = "WhatsApp 免費了解形象問題"
) -> None:
    pdf.setFillColor(BURGUNDY)
    pdf.roundRect(x, y, 154, 24, 4, fill=1, stroke=0)
    _text(pdf, label, x + 13, y + 7.5, 7.5, colors.white)


def draw_footer(pdf: canvas.Canvas, page_number: int) -> None:
    pdf.setStrokeColor(LINE)
    pdf.setLineWidth(0.45)
    pdf.line(MARGIN, 31, PAGE_WIDTH - MARGIN, 31)
    _text(pdf, "A2O Style Lab", MARGIN, 18, 7.5, MUTED)
    _text(pdf, f"{page_number:02d}", PAGE_WIDTH - 196, 18, 7.5, MUTED)
    draw_cta_button(pdf, PAGE_WIDTH - 196, 42)


def fit_image_contain(
    source_width: float, source_height: float, frame_width: float, frame_height: float
) -> tuple[float, float]:
    """Return dimensions that show an entire source image inside a frame."""
    scale = min(frame_width / source_width, frame_height / source_height)
    return source_width * scale, source_height * scale


@dataclass(frozen=True)
class GuideImageLayout:
    """A full-width image frame and its contained image dimensions."""

    x: float
    y: float
    width: float
    height: float
    draw_width: float
    draw_height: float
    callout_y: float


def guide_image_layout(
    table_bottom: float, source_width: float, source_height: float
) -> GuideImageLayout:
    """Fit a guide image beneath its table without colliding with the callout."""
    if source_width <= 0 or source_height <= 0:
        raise ValueError("Guide image dimensions must be positive.")

    width = PAGE_WIDTH - 2 * MARGIN
    image_top = table_bottom - GUIDE_IMAGE_TABLE_GAP
    image_bottom = GUIDE_CALLOUT_Y + GUIDE_IMAGE_CALLOUT_GAP
    available_height = image_top - image_bottom
    ideal_height = width * source_height / source_width
    height = min(available_height, max(GUIDE_IMAGE_MIN_HEIGHT, ideal_height))
    if height <= 0:
        raise ValueError("Guide table leaves no room for an image banner.")
    draw_width, draw_height = fit_image_contain(source_width, source_height, width, height)
    return GuideImageLayout(
        x=MARGIN,
        y=image_top - height,
        width=width,
        height=height,
        draw_width=draw_width,
        draw_height=draw_height,
        callout_y=GUIDE_CALLOUT_Y,
    )


def _image_size(assets_dir: Path, image_name: str) -> tuple[float, float]:
    """Return an asset's dimensions, with a neutral landscape fallback."""
    image_path = assets_dir / image_name
    if not image_path.is_file():
        return 3, 2
    try:
        return ImageReader(str(image_path)).getSize()
    except (OSError, ValueError):
        return 3, 2


def draw_image_cover(
    pdf: canvas.Canvas,
    assets_dir: Path,
    image_name: str,
    x: float,
    y: float,
    width: float,
    height: float,
) -> None:
    """Draw an entire asset on a warm neutral panel, or a placeholder panel."""
    image_path = assets_dir / image_name
    if not image_path.is_file():
        pdf.setFillColor(HexColor("#E5DBCE"))
        pdf.rect(x, y, width, height, fill=1, stroke=0)
        pdf.setStrokeColor(BURGUNDY)
        pdf.setLineWidth(1)
        pdf.line(x + 16, y + 16, x + width - 16, y + height - 16)
        pdf.line(x + 16, y + height - 16, x + width - 16, y + 16)
        _text(pdf, "A2O 服裝示意", x + 16, y + 14, 7.5, MUTED)
        return
    try:
        image = ImageReader(str(image_path))
        source_width, source_height = image.getSize()
    except (OSError, ValueError):
        return draw_image_cover(pdf, Path("/nonexistent"), image_name, x, y, width, height)

    pdf.setFillColor(HexColor("#E5DBCE"))
    pdf.rect(x, y, width, height, fill=1, stroke=0)
    draw_width, draw_height = fit_image_contain(source_width, source_height, width, height)
    pdf.drawImage(
        image,
        x - (draw_width - width) / 2,
        y - (draw_height - height) / 2,
        draw_width,
        draw_height,
        mask="auto",
    )


def draw_product_image_contain(
    pdf: canvas.Canvas,
    product: WorkLookProduct,
    x: float,
    y: float,
    width: float,
    height: float,
) -> None:
    """Draw one supplied product on a cream panel without cropping it."""
    pdf.setFillColor(HexColor("#EDE2D2"))
    pdf.rect(x, y, width, height, fill=1, stroke=0)
    pdf.setStrokeColor(HexColor("#D3C3B0"))
    pdf.setLineWidth(0.35)
    pdf.rect(x, y, width, height, fill=0, stroke=1)

    image_path = WORK_LOOK_PRODUCT_DIR / product.asset_name
    if not image_path.is_file():
        _text(pdf, product.category, x + 8, y + 8, 7, MUTED)
        return
    image = ImageReader(str(image_path))
    source_width, source_height = image.getSize()
    inset = 6
    draw_width, draw_height = fit_image_contain(
        source_width, source_height, width - 2 * inset, height - 2 * inset
    )
    pdf.drawImage(
        image,
        x + (width - draw_width) / 2,
        y + (height - draw_height) / 2,
        draw_width,
        draw_height,
        mask="auto",
    )


def draw_product_collage(
    pdf: canvas.Canvas,
    products: Sequence[WorkLookProduct],
    x: float,
    y: float,
    width: float,
    height: float,
) -> None:
    """Draw the seven-product work look, prioritising the blazer and trousers."""
    products_by_asset = {product.asset_name: product for product in products}
    panels = (
        ("blazer.png", x, y + 106, 153, height - 106),
        ("trousers.png", x + 158, y + 106, width - 158, height - 106),
        ("cable-knit.png", x, y, 70, 101),
        ("striped-oxford.png", x + 75, y, 70, 101),
        ("loafers.png", x + 150, y, 82, 101),
        ("belt.png", x + 237, y + 51, width - 237, 50),
        ("card-holder.png", x + 237, y, width - 237, 46),
    )
    for asset_name, panel_x, panel_y, panel_width, panel_height in panels:
        draw_product_image_contain(
            pdf,
            products_by_asset[asset_name],
            panel_x,
            panel_y,
            panel_width,
            panel_height,
        )


def draw_work_look_summary(
    pdf: canvas.Canvas, x: float, y: float, width: float, height: float, total: int
) -> None:
    """Draw the burgundy context panel for the recommended work look."""
    pdf.setFillColor(BURGUNDY)
    pdf.rect(x, y, width, height, fill=1, stroke=0)
    _text(pdf, "一套完整工作造型", x + 15, y + height - 28, 14, colors.white)
    summary_y = y + height - 76
    _text(pdf, "適合見客、商務午餐，", x + 15, y + height - 52, 8.5, CREAM)
    _text(pdf, "及需建立專業感的場合。", x + 15, y + height - 64, 8.5, CREAM)
    pdf.setFillColor(HexColor("#B96D75"))
    pdf.rect(x + 15, summary_y - 6, width - 30, 0.8, fill=1, stroke=0)
    _text(pdf, f"HK${total:,}", x + 15, summary_y - 30, 20, colors.white)
    analysis_y = summary_y - 55
    for line in (
        "深棕外套定下成熟基調。",
        "米白針織與淺藍襯衫提亮面色。",
        "卡其褲承接柔和層次。",
        "深棕鞋履與配件收束全身。",
    ):
        _text(pdf, line, x + 15, analysis_y, 7.8, CREAM)
        analysis_y -= 13


def draw_work_look_budget_list(
    pdf: canvas.Canvas, products: Sequence[WorkLookProduct], top_y: float
) -> None:
    """Draw seven distinct product-and-price rows for the work-look budget."""
    _text(pdf, "造型單品與預算分配", MARGIN, top_y, 11.5, BURGUNDY)
    row_top = top_y - 11
    total_width = PAGE_WIDTH - 2 * MARGIN
    category_width = 48
    price_width = 72
    name_width = total_width - category_width - price_width
    for index, product in enumerate(products):
        row_height = 31
        row_y = row_top - row_height
        pdf.setFillColor(CREAM if index % 2 == 0 else HexColor("#F0E7DB"))
        pdf.rect(MARGIN, row_y, total_width, row_height, fill=1, stroke=0)
        pdf.setStrokeColor(HexColor("#D3C3B0"))
        pdf.setLineWidth(0.3)
        pdf.rect(MARGIN, row_y, total_width, row_height, fill=0, stroke=1)
        pdf.line(MARGIN + category_width, row_y, MARGIN + category_width, row_y + row_height)
        pdf.line(
            MARGIN + category_width + name_width,
            row_y,
            MARGIN + category_width + name_width,
            row_y + row_height,
        )
        _text(pdf, product.category, MARGIN + 7, row_y + 11, 7.7, BURGUNDY)
        _text(pdf, product.name, MARGIN + category_width + 8, row_y + 11, 8.1, INK)
        price = f"HK${product.price_hkd:,}"
        pdf.setFont(FONT_NAME, 8.1)
        pdf.setFillColor(BURGUNDY)
        pdf.drawRightString(MARGIN + total_width - 7, row_y + 11, price)
        row_top = row_y


def draw_table(
    pdf: canvas.Canvas, x: float, top_y: float, widths: list[float], rows: list[list[str]]
) -> float:
    """Draw a readable burgundy-header table and return its lower edge."""
    current_top = top_y
    for row_index, row in enumerate(rows):
        font_size = 7.5 if row_index else 7.8
        line_counts = [max(1, len(simpleSplit(cell, FONT_NAME, font_size, width - 10))) for cell, width in zip(row, widths)]
        row_height = max(25, max(line_counts) * 10 + 10)
        row_y = current_top - row_height
        pdf.setFillColor(BURGUNDY if row_index == 0 else CREAM)
        pdf.rect(x, row_y, sum(widths), row_height, fill=1, stroke=0)
        cell_x = x
        for cell, width in zip(row, widths):
            pdf.setStrokeColor(LINE)
            pdf.setLineWidth(0.35)
            pdf.rect(cell_x, row_y, width, row_height, fill=0, stroke=1)
            lines = simpleSplit(cell, FONT_NAME, font_size, width - 10)
            text_y = row_y + row_height - 11
            for line in lines:
                _text(pdf, line, cell_x + 5, text_y, font_size, colors.white if row_index == 0 else INK)
                text_y -= 10
            cell_x += width
        current_top = row_y
    return current_top


def _draw_callout(pdf: canvas.Canvas, text: str, y: float) -> None:
    pdf.setFillColor(HexColor("#E9D8D0"))
    pdf.roundRect(MARGIN, y - 34, PAGE_WIDTH - 2 * MARGIN, 34, 4, fill=1, stroke=0)
    pdf.setFillColor(BURGUNDY)
    pdf.rect(MARGIN, y - 34, 5, 34, fill=1, stroke=0)
    _wrapped_text(pdf, text, MARGIN + 14, y - 13, PAGE_WIDTH - 2 * MARGIN - 24, 8.3, 10, INK)


def _guide_page(
    pdf: canvas.Canvas,
    assets_dir: Path,
    page_number: int,
    title: str,
    subtitle: str,
    image_name: str,
    rows: list[list[str]],
    widths: list[float],
    note: str,
) -> None:
    draw_page_background(pdf)
    draw_title(pdf, title, subtitle)
    table_bottom = draw_table(pdf, MARGIN, 675, widths, rows)
    source_width, source_height = _image_size(assets_dir, image_name)
    image_layout = guide_image_layout(table_bottom, source_width, source_height)
    draw_image_cover(
        pdf,
        assets_dir,
        image_name,
        image_layout.x,
        image_layout.y,
        image_layout.width,
        image_layout.height,
    )
    _draw_callout(pdf, note, image_layout.callout_y)
    draw_footer(pdf, page_number)


def draw_work_report_page(pdf: canvas.Canvas, assets_dir: Path) -> None:
    """Draw an A2O work-look recommendation using the seven supplied products."""
    draw_page_background(pdf)
    draw_title(
        pdf,
        "你的工作造型建議",
        "以深棕、米白與淺藍建立成熟而可信的工作形象。",
    )
    draw_product_collage(
        pdf,
        WORK_LOOK_PRODUCTS,
        x=MARGIN,
        y=470,
        width=330,
        height=260,
    )
    draw_work_look_summary(
        pdf,
        x=390,
        y=470,
        width=163,
        height=260,
        total=sum(product.price_hkd for product in WORK_LOOK_PRODUCTS),
    )
    draw_work_look_budget_list(pdf, WORK_LOOK_PRODUCTS, top_y=445)
    draw_footer(pdf, 1)


def draw_programme_page(pdf: canvas.Canvas, assets_dir: Path) -> None:
    """Draw the service next-step page with an approved guide image and service table."""
    draw_page_background(pdf)
    draw_title(
        pdf,
        "A2O 男士形象提升計劃",
        "從工作角色出發，建立可重複使用、自然可信的專業形象系統。",
    )
    pdf.setFillColor(HexColor("#E9D8D0"))
    pdf.roundRect(MARGIN, 678, PAGE_WIDTH - 2 * MARGIN, 39, 4, fill=1, stroke=0)
    _text(pdf, "示範內容及價格，並非目前報價", MARGIN + 12, 698, 9.2, BURGUNDY)
    _text(pdf, "HK$5,980", MARGIN + 12, 683, 14, INK)
    _text(pdf, "實際服務範圍與費用以確認前報價為準。", MARGIN + 107, 685, 8.2, MUTED)
    draw_image_cover(
        pdf,
        assets_dir,
        "page02_concept.jpg",
        MARGIN,
        106,
        PAGE_WIDTH - 2 * MARGIN,
        334,
    )
    table_bottom = draw_table(
        pdf,
        MARGIN,
        660,
        [175, 336],
        [["服務", "內容"]] + [list(service) for service in PROGRAMME_SERVICES],
    )
    _wrapped_text(
        pdf,
        "本頁服務內容及價格均為示範，可按個人需要調整；不代表現時報價或第三方商品。",
        MARGIN,
        max(128, table_bottom - 22),
        PAGE_WIDTH - 2 * MARGIN,
        8.1,
        10.5,
        MUTED,
    )
    draw_cta_button(pdf, MARGIN, 77, "WhatsApp 免費了解我的形象問題")
    draw_footer(pdf, 2)


def draw_occasions_page(pdf: canvas.Canvas, assets_dir: Path) -> None:
    _guide_page(
        pdf, assets_dir, 3, "先看場合，再選擇搭配", "不同場合，整潔感的標準不同；先確定角色，再決定服裝的正式程度。",
        "page03_real_before_after.jpg",
        [["場合", "搭配方向"], ["工作", "選擇乾淨領口、直筒褲與低對比色彩，讓專業感更穩定。"], ["見客", "以針織 Polo、襯衫或輕量外套建立可信度，避免過多圖案。"], ["約會", "保留個人感：有質感上衣、合身褲型與整潔鞋履已足夠。"], ["朋友聚會", "可以加入一個色彩或材質重點，但全身保持兩至三個主色。"], ["週末", "以舒適、順直的輪廓為先；寬鬆不等於沒有結構。"]],
        [72, 258], "先把場合讀準，才能讓造型看起來自然，而不是刻意打扮。",
    )


def draw_cleanfit_page(pdf: canvas.Canvas, assets_dir: Path) -> None:
    _guide_page(
        pdf, assets_dir, 4, "一週 Clean Fit 配色", "七組低難度配色，適合工作日與日常見面，亦容易從現有衣櫃開始。",
        "page04_cleanfit.jpg",
        [["日子", "配色建議"], ["星期一", "海軍藍上衣＋米白直筒褲：穩定而清爽。"], ["星期二", "炭灰上衣＋深灰褲：低對比且俐落。"], ["星期三", "白色 T-shirt＋卡其褲：明亮但不浮誇。"], ["星期四", "淺藍襯衫＋深藍褲：適合會議與見客。"], ["星期五", "橄欖綠 Polo＋米色褲：成熟而有層次。"], ["星期六", "燕麥色針織＋棕色褲：柔和且適合社交。"], ["星期日", "黑色上衣＋深靛藍牛仔褲：簡單、乾淨、易重複。"]],
        [72, 258], "Clean Fit 的關鍵不是單品昂貴，而是色彩、剪裁與鞋履保持同一個節奏。",
    )


def draw_similar_colours_page(pdf: canvas.Canvas, assets_dir: Path) -> None:
    _guide_page(
        pdf, assets_dir, 5, "近似色系夏日配色", "使用明度接近、飽和度柔和的顏色，夏天也能穿得清爽而有層次。",
        "page05_similar_colors.jpg",
        [["近似色組合", "穿著感覺"], ["米白＋燕麥", "柔和、明亮，適合針織與棉質單品。"], ["淺藍＋霧藍", "乾淨、冷靜，適合襯衫與直筒褲。"], ["卡其＋沙棕", "自然、成熟，適合週末 smart casual。"], ["灰綠＋橄欖綠", "低調、有質感，適合 Polo 或 Overshirt。"], ["淺灰＋中灰", "簡約、現代，適合工作日層次。"], ["淺棕＋朱古力棕", "溫暖、穩重，適合鞋履呼應。"], ["海軍藍＋深藍", "專業、修長，適合見客或會議。"], ["白色＋淺卡其", "乾爽、易穿，適合炎熱日子。"]],
        [98, 232], "近似色並非全身一樣；用材質、深淺與鞋履製造細緻差異。",
    )


def draw_materials_page(pdf: canvas.Canvas, assets_dir: Path) -> None:
    _guide_page(
        pdf, assets_dir, 6, "不同材質的上下裝搭配", "材質不是隨意混搭，厚薄與光澤需要平衡，才能讓輪廓保持乾淨。",
        "page06_materials.jpg",
        [["上裝材質", "下裝材質", "平衡效果"], ["棉質 T-shirt", "斜紋棉褲", "日常清爽，避免兩者都過於貼身。"], ["薄針織 Polo", "羊毛混紡直筒褲", "上柔下挺，適合見客。"], ["麻質襯衫", "棉質寬直褲", "透氣自然，保留清楚腰線。"], ["麂皮 Overshirt", "深色丹寧褲", "質感對比明確，適合較涼日子。"], ["平滑襯衫", "有紋理長褲", "讓視覺焦點集中在上半身。"]],
        [95, 108, 127], "原則：一件有紋理，另一件保持平整；一件輕薄，另一件提供穩定垂感。",
    )


def draw_top_length_page(pdf: canvas.Canvas, assets_dir: Path) -> None:
    _guide_page(
        pdf, assets_dir, 7, "男士衣長基本功", "上衣下擺的位置會直接影響腿部視覺比例；先看身形，再選擇衣長。",
        "page07_top_length.jpg",
        [["上衣類型", "理想下擺位置", "檢查方法"], ["T-shirt", "落在褲頭下方約三至六厘米。", "抬手後不應長時間露出腰部。"], ["Polo", "覆蓋褲頭，但避免接近大腿中段。", "側面線條應平順，不向外翻。"], ["襯衫", "外穿時略長於褲頭；紮入時保持平整。", "扣起後胸腹位置仍可自然活動。"], ["外套", "大致落在臀部上方或中段。", "過長會壓縮腿部比例。"]],
        [88, 125, 117], "衣長合適會令下半身更完整；過長的下擺通常比過寬的肩線更容易破壞比例。",
    )


def draw_pants_length_page(pdf: canvas.Canvas, assets_dir: Path) -> None:
    _guide_page(
        pdf, assets_dir, 8, "男士褲長基本功", "褲腳不堆積，整體造型便會更俐落；褲長應配合鞋面高度與褲型。",
        "page08_pants_length.jpg",
        [["褲型", "建議褲長", "視覺效果"], ["直筒西褲", "輕觸鞋面或只有一次自然折痕。", "褲線順直，適合工作場合。"], ["微寬鬆長褲", "覆蓋鞋面上緣，不拖地。", "保留垂感，不顯臃腫。"], ["丹寧褲", "剛好落在鞋面，必要時小幅反摺。", "休閒但保持乾淨。"], ["九分褲", "露出少量腳踝或襪子，長度一致。", "適合夏季與低筒鞋。"]],
        [88, 135, 107], "試穿時請從正面和側面確認褲腳；走動後仍能保持乾淨線條，才是合適長度。",
    )


def draw_shoes_page(pdf: canvas.Canvas, assets_dir: Path) -> None:
    _guide_page(
        pdf, assets_dir, 9, "鞋褲連貫", "下半身的完成度，取決於鞋型、褲腳寬度與襪子是否使用同一種視覺語言。",
        "page09_shoes.jpg",
        [["組合", "建議", "避免"], ["直筒褲＋Loafer", "褲腳自然輕觸鞋面，露出少量襪口。", "褲腳堆在鞋面形成皺褶。"], ["寬直褲＋皮鞋", "鞋頭有適度份量，承托褲管垂感。", "鞋型過窄，令下半身失衡。"], ["丹寧褲＋皮革球鞋", "褲長乾淨，鞋面保持整潔。", "過厚鞋底與過多顏色。"], ["短褲＋低筒鞋", "襪子高度與鞋型保持簡潔。", "高對比長襪切斷腿部線條。"]],
        [101, 143, 86], "鞋履不必搶眼；當鞋與褲的比例一致，整個人看起來便更完整。",
    )


def draw_top_fit_page(pdf: canvas.Canvas, assets_dir: Path) -> None:
    _guide_page(
        pdf, assets_dir, 10, "T-shirt／襯衫合身原則", "合身不等於貼身。保留活動空間，才能讓上衣的肩線與下擺更自然。",
        "page10_top_fit.jpg",
        [["位置", "合身重點"], ["肩線", "接近肩峰，避免明顯垂落或向內拉扯。"], ["胸位", "扣起或抬手時仍有自然空間，不出現拉扯橫紋。"], ["袖長", "短袖約落在上臂中段；長袖可在手腕位置自然收束。"], ["下擺", "覆蓋褲頭即可，避免過長令腿部比例縮短。"]],
        [72, 258], "試穿後先看肩線，再看胸腹與下擺；三者順暢，衣服便會顯得有精神。",
    )


def draw_trouser_fit_page(pdf: canvas.Canvas, assets_dir: Path) -> None:
    _guide_page(
        pdf, assets_dir, 11, "褲型基本功", "直筒與微寬鬆褲型，較能保留成熟比例與自然垂感，亦更容易重複搭配。",
        "page11_trouser_fit.jpg",
        [["褲型", "適合方向", "注意事項"], ["直筒褲", "日常工作與見客，建立順直腿線。", "腰臀保留活動空間，不要過度收窄。"], ["微寬鬆褲", "想增加現代感或平衡上身份量。", "褲腳要有垂感，避免過度堆積。"], ["錐形褲", "需要較乾淨的腳踝線條時使用。", "大腿不可太緊，否則破壞舒適度。"], ["避免過度緊身", "讓布料自然垂落，比緊貼更顯成熟。", "不以臀腿線條作為視覺焦點。"]],
        [80, 134, 116], "先找到褲腰、褲檔與褲腳都能順暢活動的褲型，再處理顏色和細節。",
    )


def draw_summer_page(pdf: canvas.Canvas, assets_dir: Path) -> None:
    _guide_page(
        pdf, assets_dir, 12, "香港夏天穿搭", "香港炎熱潮濕，優先選擇透氣、易整理並能在室內保持精神的單品。",
        "page12_summer.jpg",
        [["單品", "實用建議"], ["短袖襯衫", "選擇有肩線、透氣且可單穿或外搭的款式。"], ["針織 Polo", "以薄身棉或混紡為主，見客時比普通 T-shirt 更完整。"], ["麻質襯衫", "以柔和色彩配棉褲，接受自然紋理而保持整潔。"], ["乾淨 T-shirt", "選擇不透、領口穩定的棉質；配直筒褲便足夠。"], ["輕量長褲", "選擇棉、麻或薄羊毛混紡，避免緊貼小腿。"]],
        [92, 238], "夏季造型的重點是空氣感與秩序感：材質透氣，剪裁仍要清楚。",
    )


def draw_mistakes_page(pdf: canvas.Canvas, assets_dir: Path) -> None:
    _guide_page(
        pdf, assets_dir, 13, "香港男士常見扣分位", "不需要一次更換整個衣櫃；先修正最容易影響比例與整潔感的六個細節。",
        "page13_mistakes.jpg",
        [["扣分位", "立即調整"], ["過長上衣", "把下擺調整至褲頭下方，讓腿部比例更清楚。"], ["過緊褲型", "改用直筒或微寬鬆輪廓，保留自然垂感。"], ["褲腳堆積", "修改褲長，讓褲腳只輕觸鞋面。"], ["鞋履狀態凌亂", "清潔鞋面和鞋底邊緣，選擇比例合適的鞋型。"], ["顏色過多", "先限制為兩至三個主色，再用材質增加層次。"], ["衣物缺乏整理", "熨平領口與下擺，讓最基本的線條保持清楚。"]],
        [92, 238], "一套造型通常不是敗在單件衣服，而是敗在褲長、鞋履與整潔度沒有一起完成。",
    )


def draw_wardrobe_page(pdf: canvas.Canvas, assets_dir: Path) -> None:
    _guide_page(
        pdf, assets_dir, 14, "簡單但實用的衣櫃系統", "先建立互相配搭的基礎矩陣，再按個人角色、色彩與生活節奏補充變化。",
        "page14_wardrobe.jpg",
        [["類別", "基礎單品", "優先色彩"], ["上衣", "白色 T-shirt、針織 Polo、淺藍襯衫。", "白、灰、海軍藍、淺藍。"], ["下裝", "卡其直筒褲、深灰長褲、深靛藍丹寧褲。", "米白、卡其、灰、深藍。"], ["外搭", "炭灰 Overshirt、輕量外套或西裝外套。", "炭灰、海軍藍、橄欖綠。"], ["鞋履", "黑色 Loafer、白色皮革球鞋、深棕皮鞋。", "黑、白、深棕。"], ["維護", "合身修改、熨燙與鞋面清潔。", "保持低對比與一致質感。"]],
        [70, 156, 104], "每件基礎單品至少能配搭三次，衣櫃才會真正減少選擇壓力並提高使用率。",
    )


def build_report(output_path: str | Path, assets_dir: str | Path | None = None) -> Path:
    """Build the 14-page report and return its resolved output path."""
    source_assets = resolve_assets_dir(assets_dir)
    destination = Path(output_path).expanduser()
    destination.parent.mkdir(parents=True, exist_ok=True)
    _register_font()
    pdf = canvas.Canvas(str(destination), pagesize=A4, pageCompression=1)
    pdf.setTitle("A2O 完整工作形象檢測報告")
    pdf.setAuthor("A2O Style Lab")
    draw_work_report_page(pdf, source_assets)
    pdf.showPage()
    draw_programme_page(pdf, source_assets)
    pdf.showPage()
    page_renderers = (
        draw_occasions_page,
        draw_cleanfit_page, draw_similar_colours_page, draw_materials_page,
        draw_top_length_page, draw_pants_length_page, draw_shoes_page,
        draw_top_fit_page, draw_trouser_fit_page, draw_summer_page,
        draw_mistakes_page, draw_wardrobe_page,
    )
    for renderer in page_renderers:
        renderer(pdf, source_assets)
        pdf.showPage()
    pdf.save()
    return destination


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate the A2O complete work-image report.")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT_PATH, help=f"Output PDF path (default: {DEFAULT_OUTPUT_PATH}).")
    parser.add_argument("--assets-dir", type=Path, help="Directory containing approved guide assets.")
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> Path:
    args = parse_args(argv)
    return build_report(args.output, assets_dir=args.assets_dir)


if __name__ == "__main__":
    main()
