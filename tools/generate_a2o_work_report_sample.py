"""Generate an illustrative A2O Style Lab work-image report sample.

The PDF deliberately uses abstract vector garments and colour blocks.  It is a
service-direction sample, not a current catalogue, quotation, or product list.
"""

from __future__ import annotations

import argparse
import os
from pathlib import Path

from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.lib.utils import simpleSplit


PAGE_WIDTH, PAGE_HEIGHT = A4
MARGIN = 42
FONT_NAME = "A2OHeiti"
# Set A2O_REPORT_FONT_PATH to an installed CJK-capable .ttf/.ttc font when the
# standard system locations below are not applicable.  The fallback order covers
# current macOS, common Linux Noto installs, and Windows CJK installs.
FONT_FALLBACK_PATHS = (
    Path("/System/Library/Fonts/STHeiti Medium.ttc"),
    Path("/System/Library/Fonts/PingFang.ttc"),
    Path("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"),
    Path("/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc"),
    Path("C:/Windows/Fonts/msjh.ttc"),
)

INK = HexColor("#11161D")
PAPER = HexColor("#F4F0E8")
MUTED = HexColor("#A8B1B8")
LINE = HexColor("#36404A")
NAVY = HexColor("#182B43")
CHARCOAL = HexColor("#2A2D31")
CREAM = HexColor("#E5DCCB")
BLUE = HexColor("#9EB7CD")
GOLD = HexColor("#C8A26A")
SLATE = HexColor("#596675")


def resolve_cjk_font_path() -> Path:
    """Select an explicitly configured or known CJK-capable system font."""
    configured_path = os.environ.get("A2O_REPORT_FONT_PATH")
    if configured_path:
        font_path = Path(configured_path).expanduser()
        if font_path.is_file():
            return font_path
        raise RuntimeError(
            "A2O_REPORT_FONT_PATH does not point to a readable CJK font: "
            f"{font_path}. Set it to a .ttf or .ttc font file."
        )

    for font_path in FONT_FALLBACK_PATHS:
        if font_path.is_file():
            return font_path

    locations = ", ".join(str(path) for path in FONT_FALLBACK_PATHS)
    raise RuntimeError(
        "No CJK font was found for the A2O report. Install a CJK font or set "
        "A2O_REPORT_FONT_PATH to a readable .ttf/.ttc file. Checked: " + locations
    )


def _register_font() -> None:
    """Register the selected Traditional-Chinese-capable font once."""
    if FONT_NAME not in pdfmetrics.getRegisteredFontNames():
        font_path = resolve_cjk_font_path()
        pdfmetrics.registerFont(TTFont(FONT_NAME, str(font_path), subfontIndex=0))


def _text(
    pdf: canvas.Canvas,
    value: str,
    x: float,
    y: float,
    size: float,
    color=white,
    font: str = FONT_NAME,
) -> None:
    pdf.setFont(font, size)
    pdf.setFillColor(color)
    pdf.drawString(x, y, value)


def _wrapped_text(
    pdf: canvas.Canvas,
    value: str,
    x: float,
    y: float,
    width: float,
    size: float,
    leading: float | None = None,
    color=white,
) -> float:
    leading = leading or size * 1.45
    lines = simpleSplit(value, FONT_NAME, size, width)
    pdf.setFont(FONT_NAME, size)
    pdf.setFillColor(color)
    for line in lines:
        pdf.drawString(x, y, line)
        y -= leading
    return y


def _pill(pdf: canvas.Canvas, label: str, x: float, y: float, width: float) -> None:
    pdf.setFillColor(GOLD)
    pdf.roundRect(x, y, width, 20, 10, fill=1, stroke=0)
    pdf.setFillColor(INK)
    pdf.setFont(FONT_NAME, 8.5)
    pdf.drawCentredString(x + width / 2, y + 6.2, label)


def _footer(pdf: canvas.Canvas) -> None:
    pdf.setStrokeColor(LINE)
    pdf.setLineWidth(0.5)
    pdf.line(MARGIN, 29, PAGE_WIDTH - MARGIN, 29)
    _text(pdf, "A2O Style Lab · Work Image Report Sample", MARGIN, 16, 8.3, MUTED)


def _garment_silhouette(
    pdf: canvas.Canvas, x: float, y: float, colour, trouser_colour
) -> None:
    """Draw a deliberately abstract, non-product-specific outfit silhouette."""
    pdf.setFillColor(colour)
    pdf.roundRect(x + 18, y + 50, 42, 62, 5, fill=1, stroke=0)
    pdf.circle(x + 39, y + 126, 12, fill=1, stroke=0)
    pdf.setStrokeColor(PAPER)
    pdf.setLineWidth(1.2)
    pdf.line(x + 39, y + 112, x + 39, y + 99)
    pdf.setFillColor(trouser_colour)
    pdf.roundRect(x + 21, y + 8, 16, 47, 3, fill=1, stroke=0)
    pdf.roundRect(x + 41, y + 8, 16, 47, 3, fill=1, stroke=0)
    pdf.setFillColor(INK)
    pdf.roundRect(x + 18, y + 4, 22, 7, 3, fill=1, stroke=0)
    pdf.roundRect(x + 41, y + 4, 22, 7, 3, fill=1, stroke=0)


def _outfit_card(
    pdf: canvas.Canvas,
    x: float,
    y: float,
    title: str,
    outfit: str,
    note: str,
    top_colour,
    trouser_colour,
) -> None:
    width, height = 511, 126
    pdf.setFillColor(HexColor("#1B232C"))
    pdf.roundRect(x, y, width, height, 12, fill=1, stroke=0)
    _garment_silhouette(pdf, x + 15, y - 2, top_colour, trouser_colour)
    _text(pdf, title, x + 106, y + 95, 12.2, white)
    _wrapped_text(pdf, outfit, x + 106, y + 71, 356, 9.7, 14, PAPER)
    _wrapped_text(pdf, note, x + 106, y + 34, 356, 8.5, 11.5, MUTED)


def _page_one(pdf: canvas.Canvas) -> None:
    pdf.setFillColor(INK)
    pdf.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)
    pdf.setFillColor(NAVY)
    pdf.circle(PAGE_WIDTH - 36, PAGE_HEIGHT - 58, 100, fill=1, stroke=0)
    pdf.setFillColor(HexColor("#213953"))
    pdf.circle(PAGE_WIDTH - 1, PAGE_HEIGHT - 131, 52, fill=1, stroke=0)

    _pill(pdf, "A2O · WORK IMAGE SAMPLE", MARGIN, PAGE_HEIGHT - 67, 154)
    _text(pdf, "你的工作形象穿搭方向", MARGIN, PAGE_HEIGHT - 116, 26, white)
    _text(pdf, "工作形象先建立信任", MARGIN, PAGE_HEIGHT - 145, 14, GOLD)
    _wrapped_text(
        pdf,
        "先把輪廓、質感與角色感整理好；讓人見到你的第一眼，已經感受到穩定與專業。",
        MARGIN,
        PAGE_HEIGHT - 177,
        455,
        10.2,
        15,
        MUTED,
    )

    cards = (
        (
            "01 · CLIENT-FACING SMART CASUAL",
            "海軍藍針織 Polo + 米白直筒褲 + 黑色樂福鞋",
            "柔和對比令上半身更聚焦；適合見客、簡報及商務午餐。",
            NAVY,
            CREAM,
        ),
        (
            "02 · MODERN LAYERING",
            "炭灰 Overshirt + 白 T-shirt + 深灰直筒褲",
            "以乾淨層次取代貼身剪裁，保留成熟感，同時不顯拘束。",
            CHARCOAL,
            SLATE,
        ),
        (
            "03 · POLISHED PROFESSIONAL",
            "深色輕量西裝外套 + 淺藍襯衫 + 深色修身直筒褲",
            "需要更正式時，重點是俐落肩線與順直褲線，而不是過度收窄。",
            BLUE,
            INK,
        ),
    )
    for index, card in enumerate(cards):
        _outfit_card(pdf, MARGIN, 466 - index * 141, *card)

    _wrapped_text(
        pdf,
        "以上為示範穿搭方向；品牌、單品與預算只作說明用途，可按你的職業、身型、現有衣櫥及可用預算調整，並非現時產品、庫存或價格。",
        MARGIN,
        76,
        511,
        8.2,
        11.5,
        MUTED,
    )
    _footer(pdf)


def _service_card(pdf: canvas.Canvas, x: float, y: float, number: str, title: str, detail: str) -> None:
    pdf.setFillColor(HexColor("#1B232C"))
    pdf.roundRect(x, y, 246, 73, 10, fill=1, stroke=0)
    pdf.setFillColor(GOLD)
    pdf.circle(x + 21, y + 50, 11, fill=1, stroke=0)
    pdf.setFillColor(INK)
    pdf.setFont("Helvetica-Bold", 7.4)
    pdf.drawCentredString(x + 21, y + 47.3, number)
    _text(pdf, title, x + 42, y + 48, 10.2, white)
    _wrapped_text(pdf, detail, x + 42, y + 30, 182, 8.1, 10.8, MUTED)


def _page_two(pdf: canvas.Canvas) -> None:
    pdf.setFillColor(INK)
    pdf.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)
    pdf.setFillColor(HexColor("#213953"))
    pdf.circle(PAGE_WIDTH - 5, PAGE_HEIGHT - 5, 125, fill=1, stroke=0)
    pdf.setStrokeColor(GOLD)
    pdf.setLineWidth(1.4)
    pdf.circle(PAGE_WIDTH - 5, PAGE_HEIGHT - 5, 89, fill=0, stroke=1)

    _pill(pdf, "A2O · CONSULTATION SAMPLE", MARGIN, PAGE_HEIGHT - 67, 160)
    _text(pdf, "A2O 男士形象提升計劃", MARGIN, PAGE_HEIGHT - 115, 25, white)
    _text(pdf, "由工作角色出發，建立可重複的專業形象系統。", MARGIN, PAGE_HEIGHT - 144, 10.5, MUTED)

    pdf.setFillColor(HexColor("#263342"))
    pdf.roundRect(MARGIN, 616, 511, 65, 10, fill=1, stroke=0)
    _text(pdf, "示範內容及價格，並非目前報價", MARGIN + 17, 654, 12.5, GOLD)
    _text(pdf, "HK$5,980", MARGIN + 17, 631, 20, white)
    _text(pdf, "示例方案：實際服務範圍與費用以確認前報價為準", MARGIN + 135, 636, 8.7, MUTED)

    services = (
        ("1", "身型比例與形象定位", "按職業、鏡頭場合及個人目標找出優先調整。"),
        ("2", "三個穿搭方向", "建立可見客、日常及較正式的完整搭配邏輯。"),
        ("3", "髮型與 Grooming 方向", "整理髮型、鬍鬚、眼鏡與日常打理的可行建議。"),
        ("4", "購物清單與衣櫥優次", "先補足最有影響力的單品，避免再次買到難配的衣服。"),
        ("5", "WhatsApp 跟進", "就實際穿搭照片提供重點回饋及微調方向。"),
        ("6", "試穿與執行支援", "協助把建議落地，確認剪裁、比例與場合是否一致。"),
    )
    for index, service in enumerate(services):
        column, row = index % 2, index // 2
        _service_card(pdf, MARGIN + column * 265, 495 - row * 86, *service)

    pdf.setFillColor(GOLD)
    pdf.roundRect(MARGIN, 159, 511, 44, 10, fill=1, stroke=0)
    _text(pdf, "想知道哪個方向最適合你？", MARGIN + 18, 180, 10.5, INK)
    _text(pdf, "WhatsApp A2O：傳一張全身工作照，先做初步評估。", MARGIN + 18, 165, 9.2, INK)
    _wrapped_text(pdf, "本頁服務內容、品牌、預算與價格皆為示範，可替換；不代表現時報價或任何第三方商品。", MARGIN, 130, 511, 8.1, 11, MUTED)
    _footer(pdf)


def build_report(output_path: Path) -> Path:
    """Create the two-page A4 PDF and return its requested output path."""
    _register_font()
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    pdf = canvas.Canvas(str(output_path), pagesize=A4, pageCompression=1)
    pdf.setTitle("A2O Work Image Report Sample")
    pdf.setAuthor("A2O Style Lab")
    _page_one(pdf)
    pdf.showPage()
    _page_two(pdf)
    pdf.showPage()
    pdf.save()
    return output_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate the A2O work-image report sample PDF.")
    parser.add_argument(
        "output_path",
        nargs="?",
        type=Path,
        default=Path("output/pdf/a2o-work-image-report-sample.pdf"),
        help="PDF path to create (default: output/pdf/a2o-work-image-report-sample.pdf)",
    )
    args = parser.parse_args()
    print(build_report(args.output_path))


if __name__ == "__main__":
    main()
