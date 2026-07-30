"""Generate the foundation PDF for A2O's complete work-image report.

This first version deliberately keeps the pages lightweight while preserving the
report contract: a 14-page Traditional-Chinese PDF with a stable command-line
interface. Later layout work can replace individual page renderers.
"""

from __future__ import annotations

import argparse
import os
from pathlib import Path
from typing import Sequence

from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


PAGE_WIDTH, PAGE_HEIGHT = A4
FONT_NAME = "A2OCompleteReportCJK"
DEFAULT_ASSETS_DIR = Path(
    "/Users/terrylee/Documents/ig-content-research-system/output/pdf/"
    "a2o_menswear_fundamentals_assets_optimized"
)
FONT_FALLBACK_PATHS = (
    Path("/System/Library/Fonts/STHeiti Medium.ttc"),
    Path("/System/Library/Fonts/PingFang.ttc"),
    Path("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"),
    Path("/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc"),
    Path("C:/Windows/Fonts/msjh.ttc"),
)

INK = HexColor("#11161D")
PAPER = HexColor("#F4F0E8")
MUTED = HexColor("#B8C0C7")
GOLD = HexColor("#C8A26A")

PAGES = (
    ("你的工作形象檢測報告", "建立清晰、可信而容易重複的專業形象。"),
    ("工作形象的第一個訊號", "衣著應先支持你的角色、場合與溝通方式。"),
    ("先看場合，再選擇搭配", "會議、見客、拍攝與日常工作的要求並不相同。"),
    ("比例比品牌更重要", "乾淨的肩線、合適的衣長與順直褲線會改善整體觀感。"),
    ("建立可信的色彩關係", "靠近面部的顏色應保持穩定，避免不必要的強烈對比。"),
    ("工作日的基本搭配", "以一件有質感的上衣、直筒褲與整潔鞋履建立可靠基礎。"),
    ("見客時的專業感", "重點是精神、秩序與細節一致，而不是過度正式。"),
    ("鏡頭中的形象", "在照片與視訊中，領口、肩線和明暗對比更容易被看見。"),
    ("用層次整理輪廓", "輕量外搭可以增加結構，同時保持自在和活動空間。"),
    ("鞋履與配件", "選擇比例合適、狀態整潔的鞋履與少量配件即可。"),
    ("簡單但實用的衣櫃系統", "先補足可互相配搭的核心單品，再處理個人風格細節。"),
    ("購物時的檢查清單", "確認布料、肩線、褲長、活動感與至少三種搭配可能。"),
    ("日常整理與維持", "定期檢查熨燙、鞋面、髮型與衣物狀態，讓形象維持一致。"),
    ("下一步行動", "本報告為示範建議；實際方向應按職業、身型、衣櫃與預算調整。"),
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


def _draw_page(pdf: canvas.Canvas, page_number: int, heading: str, detail: str) -> None:
    pdf.setFillColor(INK)
    pdf.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)
    pdf.setFillColor(HexColor("#1C3148"))
    pdf.circle(PAGE_WIDTH - 20, PAGE_HEIGHT - 25, 110, fill=1, stroke=0)
    pdf.setFillColor(GOLD)
    pdf.roundRect(46, PAGE_HEIGHT - 78, 172, 22, 11, fill=1, stroke=0)
    pdf.setFillColor(INK)
    pdf.setFont(FONT_NAME, 8)
    pdf.drawCentredString(132, PAGE_HEIGHT - 70, "A2O STYLE LAB · 示範報告")
    pdf.setFillColor(white)
    pdf.setFont(FONT_NAME, 27)
    pdf.drawString(46, PAGE_HEIGHT - 150, heading)
    pdf.setFillColor(MUTED)
    pdf.setFont(FONT_NAME, 12)
    pdf.drawString(46, PAGE_HEIGHT - 185, detail)
    pdf.setStrokeColor(HexColor("#3D4852"))
    pdf.line(46, 62, PAGE_WIDTH - 46, 62)
    pdf.setFillColor(MUTED)
    pdf.setFont(FONT_NAME, 8.5)
    pdf.drawString(46, 42, "本報告為教育及服務方向示範，並非產品清單、報價或結果保證。")
    pdf.drawRightString(PAGE_WIDTH - 46, 42, f"{page_number:02d} / {len(PAGES):02d}")


def build_report(output_path: str | Path, assets_dir: str | Path | None = None) -> Path:
    """Build the 14-page report and return its resolved output path."""
    resolve_assets_dir(assets_dir)
    destination = Path(output_path).expanduser()
    destination.parent.mkdir(parents=True, exist_ok=True)
    _register_font()

    pdf = canvas.Canvas(str(destination), pagesize=A4)
    pdf.setTitle("A2O 完整工作形象檢測報告")
    for page_number, (heading, detail) in enumerate(PAGES, start=1):
        _draw_page(pdf, page_number, heading, detail)
        pdf.showPage()
    pdf.save()
    return destination


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate the A2O complete work-image report.")
    parser.add_argument("--output", required=True, type=Path, help="Output PDF path.")
    parser.add_argument("--assets-dir", type=Path, help="Directory containing approved guide assets.")
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> Path:
    args = parse_args(argv)
    return build_report(args.output, assets_dir=args.assets_dir)


if __name__ == "__main__":
    main()
