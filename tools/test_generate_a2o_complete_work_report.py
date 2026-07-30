"""Tests for the complete A2O work-image report foundation."""

from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from pypdf import PdfReader

from tools.generate_a2o_complete_work_report import build_report, main, resolve_assets_dir


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
            self.assertIn("先看場合，再選擇搭配", text)
            self.assertIn("簡單但實用的衣櫃系統", text)
            self.assertNotIn("唔同場合", text)
            self.assertNotIn("啱身", text)

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


if __name__ == "__main__":
    unittest.main()
