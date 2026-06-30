#!/usr/bin/env python3
"""
Fail CI when export roster pages were generated empty for a known month.

Usage:
  python scripts/validate_roster_publish.py --month 2026-07
  python scripts/validate_roster_publish.py --filename "EXPORT Roster July2026.xlsx"
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from roster_app.cache_io import month_key_from_filename  # noqa: E402

EMPTY_MONTH_MARKERS = (
    "لا يوجد روستر لهذا الشهر بعد",
    "لا يوجد روستر للشهر الحالي محفوظ بعد",
)


def validate_month(month_key: str) -> list[str]:
    errors: list[str] = []
    xlsx = ROOT / "rosters" / f"{month_key}.xlsx"
    if not xlsx.is_file():
        errors.append(f"Missing cached roster file: {xlsx.relative_to(ROOT)}")

    for rel in (
        Path("docs") / "date" / f"{month_key}-01" / "index.html",
        Path("docs") / "date" / f"{month_key}-15" / "index.html",
    ):
        page = ROOT / rel
        if not page.is_file():
            errors.append(f"Missing generated page: {rel}")
            continue
        text = page.read_text(encoding="utf-8")
        if any(marker in text for marker in EMPTY_MONTH_MARKERS):
            errors.append(f"Empty roster notice still present in {rel}")
        if 'id="summarySwitchVal">0<' in text.replace(" ", ""):
            errors.append(f"Zero employees published in {rel}")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--month", help="YYYY-MM month key")
    parser.add_argument("--filename", help="Source roster filename")
    args = parser.parse_args()

    month_key = (args.month or "").strip()
    if not month_key and args.filename:
        month_key = month_key_from_filename(args.filename) or ""

    if not month_key:
        print("::error::validate_roster_publish: month key is required")
        return 1

    errors = validate_month(month_key)
    if errors:
        for err in errors:
            print(f"::error::{err}")
        return 1

    print(f"✅ Roster publish validation passed for {month_key}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
