"""Absence Excel parsing and publish-skip when records are unchanged."""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from process_absence import (  # noqa: E402
    clean_date,
    existing_records_match,
    extract_sheet_rows,
    find_header_columns,
    parse_absence_sheets,
)


class CleanDateTests(unittest.TestCase):
    def test_nbsp_jul_string(self):
        self.assertEqual(clean_date("\xa0\xa0\xa0 01-JUL-2026\xa0\xa0 "), "2026-07-01")

    def test_excel_serial(self):
        serial = (datetime(2026, 8, 15) - datetime(1899, 12, 30)).days
        self.assertEqual(clean_date(float(serial)), "2026-08-15")

    def test_datetime_object(self):
        self.assertEqual(clean_date(datetime(2026, 9, 28, 8, 0, 0)), "2026-09-28")


class HeaderAndParseTests(unittest.TestCase):
    def test_finds_english_header(self):
        row = [None, "Employee No", "Name", "Section", "Request Date"]
        cols = find_header_columns(row)
        self.assertEqual(cols["emp"], 1)
        self.assertEqual(cols["name"], 2)
        self.assertEqual(cols["section"], 3)
        self.assertEqual(cols["date"], 4)

    def test_parses_security_sheet_and_cargo_sheet(self):
        cargo = [
            [None, "OA Custom OTL - Unauthorize Leave Report"],
            [],
            [None, "Employee No", "Name", "Section", "Request Date"],
            [None, 81034, "Mr. Abid Al Zadjali", "Cargo - Exp/Imp Operation", "01-SEP-2026"],
        ]
        security = [
            [None, "Employee No", "Name", "Section", "Request Date"],
            [None, 80235, "Mr. Rodolfo Magcaling", "Cargo - Security", "02-SEP-2026"],
            [None, 80235, "Mr. Rodolfo Magcaling", "الأمن", "03-SEP-2026"],
        ]
        processed, records = parse_absence_sheets(
            [("Sheet1", cargo), ("Security", security)]
        )
        self.assertEqual(processed, 3)
        by_date = {r["date"]: r for r in records}
        self.assertEqual(by_date["2026-09-01"]["empNos"], ["81034"])
        self.assertEqual(by_date["2026-09-02"]["sections"], ["Cargo - Security"])
        self.assertEqual(by_date["2026-09-03"]["sections"], ["الأمن"])

    def test_existing_archive_xlsb_range(self):
        path = ROOT / "absence-archive" / "absence-report.xlsb"
        if not path.is_file() or path.stat().st_size < 100:
            self.skipTest("archived absence xlsb not present")
        sheets = extract_sheet_rows(path.read_bytes(), "application/vnd.ms-excel.sheet.binary.spreadsheetml.sheet")
        processed, records = parse_absence_sheets(sheets)
        self.assertGreaterEqual(processed, 1)
        self.assertEqual(records[0]["date"], "2026-05-05")
        self.assertEqual(records[-1]["date"], "2026-07-31")


class UnchangedJsonTests(unittest.TestCase):
    def test_skips_generated_at_only_rewrite(self):
        records = [
            {
                "date": "2026-09-01",
                "names": ["Abid Al Zadjali"],
                "empNos": ["81034"],
                "sections": ["Cargo - Exp/Imp Operation"],
            }
        ]
        payload = {
            "generated_at": "2026-09-01T00:00:00",
            "total_records": 1,
            "records": records,
        }
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "absence-data.json"
            path.write_text(json.dumps(payload), encoding="utf-8")
            self.assertTrue(existing_records_match(str(path), 1, records))
            self.assertFalse(existing_records_match(str(path), 2, records))


if __name__ == "__main__":
    unittest.main()
