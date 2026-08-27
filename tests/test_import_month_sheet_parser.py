"""Regression tests for flexible Import roster day-header detection."""

import datetime as dt
import os
import tempfile
import unittest

from openpyxl import Workbook

from generate_and_send_import import parse_month_sheet


def _weekday_cells(count: int = 31):
    weekdays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
    return [weekdays[i % len(weekdays)] for i in range(count)]


class ImportMonthSheetParserTests(unittest.TestCase):
    def _write_workbook(self, rows, sheet_name: str = "AUGUST 2026") -> str:
        workbook = Workbook()
        worksheet = workbook.active
        worksheet.title = sheet_name
        for row_idx, row in enumerate(rows, start=1):
            for col_idx, value in enumerate(row, start=1):
                worksheet.cell(row=row_idx, column=col_idx, value=value)

        handle = tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False)
        handle.close()
        workbook.save(handle.name)
        self.addCleanup(lambda: os.path.exists(handle.name) and os.remove(handle.name))
        return handle.name

    def test_accepts_day_numbers_written_as_text(self):
        rows = [
            ["Import roster"],
            [None, None, None] + _weekday_cells(),
            ["JD", "Name", "SN"] + [f"{day:02d}" for day in range(1, 32)],
            ["DOCS", "Alice Example", 1001] + ["MN"] + [""] * 30,
        ]
        parsed = parse_month_sheet(self._write_workbook(rows), "AUGUST 2026")

        self.assertEqual(parsed["date_cols"][1], 3)
        self.assertEqual(parsed["date_cols"][31], 33)
        self.assertEqual(len(parsed["employees"]), 1)
        self.assertEqual(parsed["employees"][0]["shifts"][1], "MN")

    def test_date_row_can_be_separate_from_jd_header_row(self):
        rows = [
            ["Import roster"],
            [None, None, None] + _weekday_cells(),
            [None, None, None] + list(range(1, 32)),
            ["JD", "Name", "SN"],
            ["CHKR", "Bob Example", 1002] + [""] * 14 + ["AN"] + [""] * 16,
        ]
        parsed = parse_month_sheet(self._write_workbook(rows), "AUGUST 2026")

        self.assertEqual([emp["name"] for emp in parsed["employees"]], ["Bob Example"])
        self.assertEqual(parsed["employees"][0]["shifts"][15], "AN")

    def test_accepts_excel_date_cells_as_day_numbers(self):
        rows = [
            ["Import roster"],
            [None, None, None] + _weekday_cells(),
            ["JD", "Name", "SN"],
            [None, None, None] + [dt.datetime(2026, 8, day) for day in range(1, 32)],
            ["RELC", "Carol Example", 1003] + [""] * 6 + ["NN"] + [""] * 24,
        ]
        parsed = parse_month_sheet(self._write_workbook(rows), "AUGUST 2026")

        self.assertEqual(parsed["date_cols"][7], 9)
        self.assertEqual(parsed["employees"][0]["name"], "Carol Example")
        self.assertEqual(parsed["employees"][0]["shifts"][7], "NN")


if __name__ == "__main__":
    unittest.main()
