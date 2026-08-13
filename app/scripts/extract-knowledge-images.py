#!/usr/bin/env python3
"""Extract approved A2O knowledge-centre visuals from supplied report PDFs."""

from pathlib import Path
import sys

import pdfplumber
from PIL import Image, ImageDraw


APP_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = APP_ROOT / "public" / "a2o" / "knowledge"
QA_DIR = APP_ROOT.parent / "tmp" / "knowledge-qa"
DEFAULT_WORK_PDF = Path("/Users/terrylee/Downloads/a2o-complete-work-image-report.pdf")
DEFAULT_DATING_PDF = Path("/Users/terrylee/Downloads/a2o-complete-dating-image-report.pdf")

# Coordinates use PDF points: (x0, top, x1, bottom).
CROPS = [
    ("work-look", "work", 1, (78, 140, 550, 408)),
    ("dating-look", "dating", 1, (42, 140, 330, 410)),
    ("occasion-style", "work", 3, (42, 333, 553, 618)),
    ("clean-fit-colours", "work", 4, (43, 383, 552, 722)),
    ("summer-analogous-colours", "work", 5, (62, 408, 533, 722)),
    ("texture-matrix", "work", 6, (42, 333, 553, 674)),
    ("top-length", "work", 7, (42, 308, 553, 649)),
    ("trouser-length", "work", 8, (42, 308, 553, 649)),
    ("shoe-trouser-continuity", "work", 9, (42, 308, 553, 717)),
    ("top-fit", "work", 10, (42, 308, 553, 649)),
    ("trouser-silhouettes", "work", 11, (42, 308, 553, 649)),
    ("hong-kong-summer", "work", 12, (42, 333, 553, 635)),
    ("common-image-mistakes", "work", 13, (42, 358, 553, 699)),
    ("wardrobe-system", "work", 14, (42, 333, 553, 674)),
]


def resolve_pdfs() -> dict[str, Path]:
    args = sys.argv[1:]
    work = Path(args[0]).expanduser() if args else DEFAULT_WORK_PDF
    dating = Path(args[1]).expanduser() if len(args) > 1 else DEFAULT_DATING_PDF
    missing = [str(path) for path in (work, dating) if not path.is_file()]
    if missing:
        raise SystemExit(f"Missing source PDF: {', '.join(missing)}")
    return {"work": work, "dating": dating}


def extract() -> list[Path]:
    pdf_paths = resolve_pdfs()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    opened = {name: pdfplumber.open(path) for name, path in pdf_paths.items()}
    outputs: list[Path] = []

    try:
        for asset, source, page_number, bounds in CROPS:
            page = opened[source].pages[page_number - 1]
            x0, top, x1, bottom = bounds
            if x0 < 0 or top < 0 or x1 > page.width or bottom > page.height or x1 <= x0 or bottom <= top:
                raise SystemExit(f"Invalid crop bounds for {asset}: {bounds}")

            image = page.within_bbox(bounds).to_image(resolution=180, antialias=True).original.convert("RGB")
            if image.width < 300 or image.height < 150:
                raise SystemExit(f"Unexpectedly small crop for {asset}: {image.size}")

            output = OUTPUT_DIR / f"{asset}.webp"
            image.save(output, "WEBP", quality=88, method=6)
            if not output.is_file() or output.stat().st_size == 0:
                raise SystemExit(f"Failed to write {asset}")
            outputs.append(output)
    finally:
        for document in opened.values():
            document.close()

    return outputs


def write_contact_sheet(outputs: list[Path]) -> Path:
    thumbs: list[tuple[str, Image.Image]] = []
    for output in outputs:
        image = Image.open(output).convert("RGB")
        image.thumbnail((420, 260))
        canvas = Image.new("RGB", (440, 310), "#f4f0e7")
        canvas.paste(image, ((440 - image.width) // 2, 34))
        ImageDraw.Draw(canvas).text((12, 10), output.stem, fill="#111111")
        thumbs.append((output.stem, canvas))

    cols = 2
    rows = (len(thumbs) + cols - 1) // cols
    sheet = Image.new("RGB", (440 * cols, 310 * rows), "#dddddd")
    for index, (_, thumb) in enumerate(thumbs):
        sheet.paste(thumb, ((index % cols) * 440, (index // cols) * 310))

    QA_DIR.mkdir(parents=True, exist_ok=True)
    output = QA_DIR / "knowledge-contact-sheet.jpg"
    sheet.save(output, "JPEG", quality=88)
    return output


if __name__ == "__main__":
    files = extract()
    contact = write_contact_sheet(files)
    print(f"Extracted {len(files)} knowledge images to {OUTPUT_DIR}")
    print(f"Contact sheet: {contact}")
