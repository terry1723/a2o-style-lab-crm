"""Regression test for the A2O work-image report sample PDF."""

import os
from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from pypdf import PdfReader

from tools import generate_a2o_work_report_sample as report_generator


build_report = report_generator.build_report


class A2OWorkReportSampleTests(unittest.TestCase):
    def test_build_report_creates_two_readable_pages(self) -> None:
        with TemporaryDirectory() as temporary_directory:
            output_path = Path(temporary_directory) / "nested" / "a2o-report.pdf"

            result = build_report(output_path)

            self.assertEqual(result, output_path)
            self.assertTrue(output_path.is_file())
            reader = PdfReader(str(output_path))
            self.assertEqual(len(reader.pages), 2)
            combined_text = "\n".join(page.extract_text() or "" for page in reader.pages)
            for expected_text in (
                "你的工作形象穿搭方向",
                "A2O 男士形象提升計劃",
                "示範內容",
            ):
                self.assertIn(expected_text, combined_text)

    def test_cli_accepts_an_explicit_output_path(self) -> None:
        with TemporaryDirectory() as temporary_directory:
            output_path = Path(temporary_directory) / "cli" / "report.pdf"
            script_path = Path(__file__).with_name("generate_a2o_work_report_sample.py")

            result = subprocess.run(
                [sys.executable, str(script_path), str(output_path)],
                check=True,
                capture_output=True,
                text=True,
            )

            self.assertEqual(result.stdout.strip(), str(output_path))
            self.assertTrue(output_path.is_file())

    def test_invalid_configured_font_path_has_actionable_error(self) -> None:
        with patch.dict(os.environ, {"A2O_REPORT_FONT_PATH": "/missing/a2o-cjk.ttf"}):
            with self.assertRaisesRegex(RuntimeError, "A2O_REPORT_FONT_PATH"):
                report_generator.resolve_cjk_font_path()

    def test_missing_cjk_font_has_actionable_error(self) -> None:
        with patch.dict(os.environ, {}, clear=True), patch.object(
            report_generator, "FONT_FALLBACK_PATHS", ()
        ):
            with self.assertRaisesRegex(RuntimeError, "Install a CJK font"):
                report_generator.resolve_cjk_font_path()


if __name__ == "__main__":
    unittest.main()
