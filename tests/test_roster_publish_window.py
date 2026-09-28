"""Publish window stays on real today; extra Excel sheets become dept cards."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from roster_app.cache_io import publish_month_keys  # noqa: E402
from roster_app.settings import ordered_department_sheets  # noqa: E402


class PublishMonthKeysTests(unittest.TestCase):
    def test_october_file_in_september_keeps_september_and_adds_october(self):
        keys = publish_month_keys(2026, 9, "2026-10")
        self.assertEqual(keys, ["2026-08", "2026-09", "2026-10", "2026-11"])

    def test_same_month_file_is_today_window(self):
        keys = publish_month_keys(2026, 9, "2026-09")
        self.assertEqual(keys, ["2026-08", "2026-09", "2026-10"])

    def test_two_months_ahead_is_included(self):
        keys = publish_month_keys(2026, 5, "2026-07")
        self.assertIn("2026-05", keys)
        self.assertIn("2026-07", keys)
        self.assertEqual(keys[0], "2026-04")
        self.assertEqual(keys[-1], "2026-08")


class ExtraDeptSheetTests(unittest.TestCase):
    def test_includes_security_and_absences_after_known_depts(self):
        names = [
            "Setting ",
            "master",
            "Full staffs as per JD",
            "Officers",
            "Supervisors",
            "Load Control",
            "Export Checker",
            "Export Operators",
            "Absences",
            "الأمن",
            "Acceptance",
        ]
        hidden = {"Setting ", "master", "Acceptance"}
        out = ordered_department_sheets(names, hidden=hidden)
        depts = [dept for _, dept in out]
        self.assertEqual(depts[:5], [
            "Officers",
            "Supervisors",
            "Load Control",
            "Export Checker",
            "Export Operators",
        ])
        self.assertIn("Absences", depts)
        self.assertIn("الأمن", depts)
        self.assertNotIn("Full staffs as per JD", depts)
        self.assertNotIn("Acceptance", depts)
        self.assertNotIn("master", depts)


if __name__ == "__main__":
    unittest.main()
