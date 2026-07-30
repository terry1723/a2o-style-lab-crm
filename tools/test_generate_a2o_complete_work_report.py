"""Tests for the complete A2O work-image report foundation."""

from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

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
