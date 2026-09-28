"""Stable absence URL resolution (no UniqueId hardcoding)."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from roster_app.absence_source import (  # noqa: E402
    resolve_absence_source_urls,
    stable_absence_urls_from_export,
)


class StablePathTests(unittest.TestCase):
    def test_stable_paths_from_roster_uploads_export(self):
        export = (
            "https://omanair-my.sharepoint.com/personal/8715_hq_omanair_com/"
            "Documents/ROSTER_UPLOADS/latest.xlsx?ga=1"
        )
        urls = stable_absence_urls_from_export(export)
        self.assertTrue(any("ROSTER_UPLOADS/absence-report.xlsb" in u for u in urls))
        self.assertTrue(any("AbsenceReports/absence-report.xlsb" in u for u in urls))
        self.assertTrue(any("ABSENCE_UPLOADS/absence-report.xlsb" in u for u in urls))

    def test_resolve_order_stable_before_secret_unique_id(self):
        export = (
            "https://omanair-my.sharepoint.com/personal/8715_hq_omanair_com/"
            "Documents/ROSTER_UPLOADS/latest.xlsx?ga=1"
        )
        secret = "https://omanair-my.sharepoint.com/:x:/p/8715_hq/OLDUNIQUEID?e=dead"
        payload = "https://omanair-my.sharepoint.com/:x:/p/8715_hq/NEWID?e=fresh"
        urls = resolve_absence_source_urls(
            absence_url=secret,
            export_url=export,
            payload_url=payload,
        )
        secret_idx = urls.index(secret)
        payload_idx = urls.index(payload)
        stable_idx = next(i for i, u in enumerate(urls) if "absence-report.xlsb" in u and ":x:" not in u)
        self.assertLess(stable_idx, payload_idx)
        self.assertLess(payload_idx, secret_idx)


if __name__ == "__main__":
    unittest.main()
