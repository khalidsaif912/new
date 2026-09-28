"""SharePoint download URL variants and HTML file-link extraction."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from roster_app.cache_io import (  # noqa: E402
    extract_sharepoint_file_urls,
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


if __name__ == "__main__":
    unittest.main()
