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
    from tools.generate_a2o_complete_work_report import (
        build_report,
        main,
        resolve_assets_dir,
        resolve_cjk_font_path,
    )
except ModuleNotFoundError:
    from generate_a2o_complete_work_report import (
        build_report,
        main,
        resolve_assets_dir,
        resolve_cjk_font_path,
    )


class CompleteWorkReportTests(unittest.TestCase):
    def test_first_page_embeds_the_approved_work_image_when_available(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            temporary_path = Path(temporary_directory)
            output_path = temporary_path / "report.pdf"
            assets_directory = temporary_path / "assets"
            assets_directory.mkdir()
            Image.new("RGB", (12, 12), color=(122, 31, 43)).save(
                assets_directory / "page03_real_before_after.jpg"
            )

            build_report(output_path, assets_dir=assets_directory)

            reader = PdfReader(str(output_path))
            x_objects = reader.pages[0]["/Resources"].get("/XObject", {})
            self.assertTrue(x_objects)

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
            self.assertIn("你的工作形象檢測報告", text)
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

    def test_first_two_pages_describe_the_sample_assessment_and_service_plan(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            temporary_path = Path(temporary_directory)
            output_path = temporary_path / "report.pdf"
            assets_directory = temporary_path / "assets"
            assets_directory.mkdir()

            build_report(output_path, assets_dir=assets_directory)

            reader = PdfReader(str(output_path))
            first_page = reader.pages[0].extract_text() or ""
            second_page = reader.pages[1].extract_text() or ""
            self.assertIn("你的工作形象檢測報告", first_page)
            self.assertIn("工作形象先建立信任", first_page)
            self.assertIn("示範品牌／示範預算", first_page)
            self.assertIn("HK$1,900", first_page)
            self.assertIn("三套", first_page)
            self.assertIn("可按個人預算、更換頻率與現有衣櫃替換", first_page)
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
