"""Regression tests for roster month detection from export filenames."""

import unittest

from roster_app.cache_io import looks_like_roster_month_filename, month_key_from_filename


class MonthKeyFromFilenameTests(unittest.TestCase):
    def test_july_without_space(self):
        self.assertEqual(month_key_from_filename("EXPORT Roster July2026.xlsx"), "2026-07")

    def test_july_with_space(self):
        self.assertEqual(month_key_from_filename("EXPORT Roster July 2026.xlsx"), "2026-07")

    def test_june_versioned(self):
        self.assertEqual(
            month_key_from_filename("Export Roster June 2026 Version5.xlsx"),
            "2026-06",
        )

    def test_yyyy_mm_in_name(self):
        self.assertEqual(month_key_from_filename("roster_2026-07.xlsx"), "2026-07")

    def test_unrelated_file(self):
        self.assertIsNone(month_key_from_filename("absence-report.xlsb"))

    def test_looks_like_roster_month(self):
        self.assertTrue(looks_like_roster_month_filename("EXPORT Roster July2026.xlsx"))
        self.assertFalse(looks_like_roster_month_filename("absence-report.xlsb"))


if __name__ == "__main__":
    unittest.main()
