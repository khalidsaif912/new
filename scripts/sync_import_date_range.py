#!/usr/bin/env python3
"""Set Import datePicker min/max to span all published Import dates."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IMPORT_ROOT = ROOT / "docs" / "import"

ISO_RE = re.compile(r"^(\d{4}-\d{2}-\d{2})$")
PICKER_RE = re.compile(
    r'(<input\s+id="datePicker"\s+type="date"\s+value="[^"]*")\s+min="[^"]*"\s+max="[^"]*"',
    re.IGNORECASE,
)


def discover_range() -> tuple[str, str, list[str], list[str]]:
    sys.path.insert(0, str(ROOT))
    from generate_and_send_import import discover_import_roster_catalog

    catalog = discover_import_roster_catalog(IMPORT_ROOT)
    months = catalog["available_months"]
    published = catalog["published_dates"]
    if not published:
        return "2026-03-01", "2026-05-31", months or ["2026-03", "2026-04", "2026-05"], []
    return catalog["date_min"], catalog["date_max"], months, published


def update_meta(min_date: str, max_date: str, months: list[str], published_dates: list[str]) -> None:
    import json

    meta_path = IMPORT_ROOT / "import_meta.json"
    meta: dict = {}
    if meta_path.is_file():
        try:
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass
    meta["date_min"] = min_date
    meta["date_max"] = max_date
    meta["available_months"] = months
    if published_dates:
        meta["published_dates"] = published_dates
    meta_path.write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")


def patch_file(path: Path, min_date: str, max_date: str) -> bool:
    text = path.read_text(encoding="utf-8")
    if 'id="datePicker"' not in text:
        return False
    new_text, n = PICKER_RE.subn(rf'\1 min="{min_date}" max="{max_date}"', text, count=1)
    if n and new_text != text:
        path.write_text(new_text, encoding="utf-8", newline="\n")
        return True
    return False


def main() -> int:
    min_date, max_date, months, published_dates = discover_range()
    update_meta(min_date, max_date, months, published_dates)
    print(f"Import date range: {min_date} .. {max_date} ({len(months)} months)")
    changed = 0
    for path in sorted(IMPORT_ROOT.rglob("index.html")):
        if patch_file(path, min_date, max_date):
            changed += 1
    print(f"patched {changed} files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
