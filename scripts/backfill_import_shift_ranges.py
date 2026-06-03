#!/usr/bin/env python3
"""Backfill (FROM x TO y) on Import duty pages using import/schedules/*.json."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IMPORT = ROOT / "docs" / "import"
SCHEDULES = IMPORT / "schedules"

sys.path.insert(0, str(ROOT))
from roster_app.text_utils import RANGE_SUFFIX_GROUPS, append_range_suffix  # noqa: E402

SHIFT_RANGE_CSS = """    .empStatus .shiftRange {
      font-size: 0.88em;
      opacity: 0.95;
      white-space: nowrap;
    }
    .empStatus .shiftRangeLabel {
      font-size: 0.78em;
      opacity: 0.85;
      font-weight: 600;
    }
"""

EMP_ROW_RE = re.compile(
    r'(<details class="shiftCard" data-shift="([^"]+)"[^>]*>.*?'
    r'<div class="empRow[^"]*" data-emp-name="[^"]*-\s*(\d{3,})[^"]*"[^>]*>\s*'
    r'<span class="empName">[^<]*</span>\s*'
    r'<span class="empStatus" style="color:([^"]+);">)(.*?)(</span>\s*'
    r"</div>)",
    re.S,
)

DATE_RE = re.compile(r"(\d{4}-\d{2}-\d{2})")


def _schedule_map(emp_id: str, ym: str) -> dict[int, str] | None:
    path = SCHEDULES / f"{emp_id}.json"
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None
    rows = (data.get("schedules") or {}).get(ym)
    if not rows and data.get("month") == ym:
        rows = data.get("days") or []
    if not rows:
        return None
    out: dict[int, str] = {}
    for row in rows:
        d = row.get("day")
        code = row.get("shift_code") or row.get("code") or ""
        if d and code:
            out[int(d)] = str(code).strip()
    return out or None


def _status_plain_code(inner: str) -> str:
    plain = re.sub(r"<[^>]+>", " ", inner)
    plain = re.sub(r"\s+", " ", plain).strip()
    return plain.split()[0] if plain else ""


def patch_html(html: str, day: int, ym: str) -> tuple[str, int]:
    changes = 0

    def repl(m: re.Match[str]) -> str:
        nonlocal changes
        prefix, group_key, emp_id, _color, inner, suffix = m.groups()
        if group_key not in RANGE_SUFFIX_GROUPS:
            return m.group(0)
        code = _status_plain_code(inner)
        if not code or "FROM" in inner.upper() or "shiftRange" in inner:
            return m.group(0)
        shifts = _schedule_map(emp_id, ym)
        if not shifts or day not in shifts:
            return m.group(0)
        raw = shifts.get(day, "")
        if not raw:
            return m.group(0)
        new_inner = append_range_suffix(code, day, shifts, raw, group_key=group_key)
        if new_inner == inner or new_inner == code:
            return m.group(0)
        changes += 1
        return f"{prefix}{new_inner}{suffix}"

    html = EMP_ROW_RE.sub(repl, html)
    return html, changes


def inject_css(html: str) -> str:
    if ".shiftRangeLabel" in html:
        return html
    if "</style>" not in html:
        return html
    return html.replace("</style>", SHIFT_RANGE_CSS + "\n  </style>", 1)


def main() -> int:
    total_files = 0
    total_rows = 0
    for path in sorted(IMPORT.rglob("index.html")):
        if "my-schedule" in str(path):
            continue
        m = DATE_RE.search(str(path))
        if not m:
            continue
        iso = m.group(1)
        ym = iso[:7]
        day = int(iso[8:10])
        text = path.read_text(encoding="utf-8")
        new_text, n = patch_html(text, day, ym)
        new_text = inject_css(new_text)
        if n or new_text != text:
            path.write_text(new_text, encoding="utf-8")
            total_files += 1
            total_rows += n
            print(f"{path.relative_to(ROOT)}: {n} row(s)")
    print(f"Updated {total_files} file(s), {total_rows} employee row(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
