"""SharePoint download URL variants and HTML file-link extraction."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from roster_app.cache_io import (  # noqa: E402
    absence_sibling_urls,
    extract_sharepoint_file_urls,
    looks_like_absence_filename,
    sharepoint_download_aspx_candidates,
    sharepoint_download_candidates,
)


class CandidateTests(unittest.TestCase):
    def test_original_guest_link_is_tried_before_download_param(self):
        url = "https://omanair-my.sharepoint.com/:x:/p/8715_hq/IQCexample?e=lY4drC"
        cands = sharepoint_download_candidates(url, now_ms=123)
        self.assertEqual(cands[0], url)
        self.assertIn("ga=1", cands[1])
        download_idx = next(i for i, u in enumerate(cands) if "download=1" in u)
        self.assertGreater(download_idx, 1)

    def test_xlsx_guest_link_gets_download_aspx_before_download_param(self):
        url = "https://omanair-my.sharepoint.com/:x:/p/8715_hq/IQCexample?e=lY4drC"
        cands = sharepoint_download_candidates(url, now_ms=123)
        aspx = [u for u in cands if "download.aspx" in u]
        self.assertTrue(aspx)
        self.assertIn("8715_hq_omanair_com", aspx[0])
        download_idx = next(i for i, u in enumerate(cands) if "download=1" in u)
        aspx_idx = next(i for i, u in enumerate(cands) if "download.aspx" in u)
        self.assertLess(aspx_idx, download_idx)

    def test_download_aspx_from_colon_x_personal_alias(self):
        url = "https://omanair-my.sharepoint.com/:x:/p/8715_hq/IQCexample?e=lY4drC"
        aspx = sharepoint_download_aspx_candidates(url)
        self.assertTrue(any("download.aspx?share=IQCexample" in u for u in aspx))
        self.assertTrue(any("/:u:/p/8715_hq/IQCexample" in u for u in aspx))


class HtmlExtractTests(unittest.TestCase):
    def test_extracts_direct_xlsb_and_json_download_url(self):
        html = """
        <html><body>
        <a href="https://omanair-my.sharepoint.com/personal/8715_hq_omanair_com/Documents/AbsenceReports/absence-report.xlsb?ga=1">file</a>
        <script>
        var x = {"downloadUrl":"https:\\/\\/omanair-my.sharepoint.com\\/personal\\/file.xlsx"};
        </script>
        <a href="/personal/8715_hq_omanair_com/Documents/sec-report.xlsb">rel</a>
        </body></html>
        """
        urls = extract_sharepoint_file_urls(
            html, "https://omanair-my.sharepoint.com/:x:/p/8715_hq/abc"
        )
        self.assertTrue(any(u.endswith("absence-report.xlsb?ga=1") or "absence-report.xlsb?ga=1" in u for u in urls))
        self.assertTrue(any(u.endswith("file.xlsx") for u in urls))
        self.assertTrue(any(u.endswith("sec-report.xlsb") for u in urls))


class AbsenceSiblingTests(unittest.TestCase):
    def test_siblings_from_roster_uploads(self):
        url = "https://omanair-my.sharepoint.com/personal/8715_hq_omanair_com/Documents/ROSTER_UPLOADS/latest.xlsx?ga=1"
        sibs = absence_sibling_urls(url)
        self.assertTrue(any("ROSTER_UPLOADS/absence-report.xlsb" in u for u in sibs))
        self.assertTrue(any("AbsenceReports/absence-report.xlsb" in u for u in sibs))
        self.assertTrue(any("ABSENCE_UPLOADS/absence-report.xlsb" in u for u in sibs))

    def test_absence_filename_filter(self):
        self.assertTrue(looks_like_absence_filename("absence-report.xlsb"))
        self.assertTrue(looks_like_absence_filename("Unauthorize Leave Report.xlsx"))
        self.assertTrue(looks_like_absence_filename("report.xlsb"))
        self.assertTrue(looks_like_absence_filename("absence-report.xlsb"))
        self.assertFalse(looks_like_absence_filename("latest.xlsx"))
        self.assertFalse(looks_like_absence_filename("Export New Roster OCTOBER 2026.xlsx"))


if __name__ == "__main__":
    unittest.main()
