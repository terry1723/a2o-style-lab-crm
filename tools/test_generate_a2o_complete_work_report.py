"""Tests for the complete A2O work-image report foundation."""

from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image
from pypdf import PdfReader

try:
    from tools import generate_a2o_complete_work_report
    from tools.generate_a2o_complete_work_report import (
        build_report,
        main,
        resolve_assets_dir,
        resolve_cjk_font_path,
    )
except ModuleNotFoundError:
    import generate_a2o_complete_work_report
    from generate_a2o_complete_work_report import (
        build_report,
        main,
        resolve_assets_dir,
        resolve_cjk_font_path,
    )


class CompleteWorkReportTests(unittest.TestCase):
    def test_work_look_product_data_is_complete(self) -> None:
        products = getattr(generate_a2o_complete_work_report, "WORK_LOOK_PRODUCTS", ())
        product_directory = getattr(
            generate_a2o_complete_work_report, "WORK_LOOK_PRODUCT_DIR", None
        )

        self.assertEqual(
            [product.category for product in products],
            ["外套", "上衣", "襯衫", "長褲", "鞋履", "皮帶", "配件"],
        )
        self.assertEqual(
            [product.name for product in products],
            [
                "Massimo Dutti 棕色羊毛混紡修身西裝外套",
                "Polo Ralph Lauren 米白色經典棉質麻花針織衫",
                "Polo Ralph Lauren 淺藍色細條紋牛津布襯衫",
                "Massimo Dutti 卡其色棉麻混紡褶襇休閒褲",
                "Massimo Dutti 深棕色麂皮便士樂福鞋",
                "Polo Ralph Lauren 編織皮革飾邊腰帶",
                "Polo Ralph Lauren 深棕色皮革卡夾",
            ],
        )
        self.assertEqual(
            [product.asset_name for product in products],
            [
                "blazer.png",
                "cable-knit.png",
                "striped-oxford.png",
                "trousers.png",
                "loafers.png",
                "belt.png",
                "card-holder.png",
            ],
        )
        self.assertEqual(sum(product.price_hkd for product in products), 9890)
        self.assertIsNotNone(product_directory)
        for product in products:
            self.assertTrue((product_directory / product.asset_name).is_file())

    def test_guide_image_layout_places_a_large_full_width_banner_below_the_table(self) -> None:
        layout = generate_a2o_complete_work_report.guide_image_layout(
            table_bottom=520,
            source_width=1600,
            source_height=900,
        )

        self.assertEqual(layout.x, generate_a2o_complete_work_report.MARGIN)
        self.assertGreaterEqual(layout.width, 470)
        self.assertLess(layout.y + layout.height, 520)
        self.assertGreaterEqual(layout.height, 200)
        self.assertGreaterEqual(layout.draw_height, 200)
        self.assertGreaterEqual(layout.y, layout.callout_y + 14)

    def test_fit_image_contain_keeps_landscape_and_portrait_assets_inside_the_frame(self) -> None:
        fit_image_contain = getattr(generate_a2o_complete_work_report, "fit_image_contain", None)
        self.assertIsNotNone(fit_image_contain)

        landscape_width, landscape_height = fit_image_contain(1600, 900, 176, 196)
        self.assertEqual(landscape_width, 176)
        self.assertLessEqual(landscape_height, 196)

        portrait_width, portrait_height = fit_image_contain(900, 1600, 176, 196)
        self.assertEqual(portrait_height, 196)
        self.assertLessEqual(portrait_width, 176)

    def test_first_page_uses_real_work_look_products(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            temporary_path = Path(temporary_directory)
            output_path = temporary_path / "report.pdf"
            assets_directory = temporary_path / "assets"
            assets_directory.mkdir()

            build_report(output_path, assets_dir=assets_directory)

            reader = PdfReader(str(output_path))
            page_one = reader.pages[0]
            text = page_one.extract_text() or ""
            self.assertIn("你的工作造型建議", text)
            self.assertIn("造型單品與預算分配", text)
            self.assertIn("HK$9,890", text)
            for product in generate_a2o_complete_work_report.WORK_LOOK_PRODUCTS:
                self.assertIn(product.name, text)
            self.assertNotIn("三個可按需要調整的工作穿搭方向", text)
            self.assertGreaterEqual(len(page_one.images), 7)

    def test_build_report_creates_fourteen_pages_with_required_written_chinese(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            temporary_path = Path(temporary_directory)
            output_path = temporary_path / "report.pdf"
            assets_directory = temporary_path / "assets"
            assets_directory.mkdir()

            main(["--output", str(output_path), "--assets-dir", str(assets_directory)])

            reader = PdfReader(str(output_path))
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
            self.assertEqual(len(reader.pages), 14)
            self.assertIn("你的工作造型建議", text)
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
                "香港夏天穿搭",
                "香港男士常見扣分位",
                "簡單但實用的衣櫃系統",
            ]
            for heading in expected_headings:
                self.assertIn(heading, text)

            for oral_phrase in ("唔同場合", "啱身", "唔係", "著得", "褲腳唔"):
                self.assertNotIn(oral_phrase, text)

    def test_first_two_pages_describe_the_work_look_and_service_plan(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            temporary_path = Path(temporary_directory)
            output_path = temporary_path / "report.pdf"
            assets_directory = temporary_path / "assets"
            assets_directory.mkdir()

            build_report(output_path, assets_dir=assets_directory)

            reader = PdfReader(str(output_path))
            first_page = reader.pages[0].extract_text() or ""
            second_page = reader.pages[1].extract_text() or ""
            self.assertIn("你的工作造型建議", first_page)
            self.assertIn("一套完整工作造型", first_page)
            self.assertIn("HK$9,890", first_page)
            self.assertIn("造型單品與預算分配", first_page)
            self.assertNotIn("三套", first_page)
            self.assertIn("A2O 男士形象提升計劃", second_page)
            self.assertIn("示範內容及價格，並非目前報價", second_page)
            self.assertIn("HK$5,980", second_page)
            self.assertIn("WhatsApp 免費了解我的形象問題", second_page)
            for service in (
                "個人身形比例及形象定位",
                "三個實際可穿的搭配方向",
                "髮型及儀容整理方向",
                "購物清單與衣櫃優先次序",
                "WhatsApp 跟進",
                "諮詢後的實用執行支援",
            ):
                self.assertIn(service, second_page)

    def test_invalid_environment_asset_path_names_its_configuration_variable(self) -> None:
        missing_path = "/tmp/a2o-complete-work-report-assets-missing"
        with patch.dict(os.environ, {"A2O_GUIDE_ASSETS_DIR": missing_path}):
            with self.assertRaisesRegex(FileNotFoundError, "A2O_GUIDE_ASSETS_DIR"):
                resolve_assets_dir()

    def test_build_report_creates_nested_output_directories(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            temporary_path = Path(temporary_directory)
            output_path = temporary_path / "exports" / "client" / "report.pdf"
            assets_directory = temporary_path / "assets"
            assets_directory.mkdir()

            build_report(output_path, assets_dir=assets_directory)

            self.assertTrue(output_path.is_file())

    def test_zero_argument_cli_creates_the_standard_output_path(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            temporary_path = Path(temporary_directory)
            assets_directory = temporary_path / "assets"
            assets_directory.mkdir()
            previous_directory = Path.cwd()
            try:
                os.chdir(temporary_path)
                with patch.dict(os.environ, {"A2O_GUIDE_ASSETS_DIR": str(assets_directory)}):
                    main([])
            finally:
                os.chdir(previous_directory)

            self.assertTrue(
                (
                    temporary_path
                    / "output"
                    / "pdf"
                    / "a2o-complete-work-image-report-sample.pdf"
                ).is_file()
            )

    def test_invalid_configured_font_path_has_an_actionable_error(self) -> None:
        with patch.dict(os.environ, {"A2O_REPORT_FONT_PATH": "/tmp/missing-a2o-font.ttf"}):
            with self.assertRaisesRegex(RuntimeError, "A2O_REPORT_FONT_PATH"):
                resolve_cjk_font_path()

    def test_missing_fallback_fonts_has_an_actionable_error(self) -> None:
        with patch.dict(os.environ, {}, clear=True):
            with patch(f"{resolve_cjk_font_path.__module__}.FONT_FALLBACK_PATHS", ()):
                with self.assertRaisesRegex(RuntimeError, "No CJK font was found"):
                    resolve_cjk_font_path()


if __name__ == "__main__":
    unittest.main()
