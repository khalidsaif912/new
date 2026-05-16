#!/usr/bin/env python3
"""Rebuild March Import day pages with the current Export-style UI theme."""

from __future__ import annotations

import calendar
import datetime as dt
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IMPORT_ROOT = ROOT / "docs" / "import"

ISO_RE = re.compile(r"^2026-03-(\d{2})$")
LEGACY_MARKERS = ("class=\"dept-card\"", "class=\"summary-bar\"")
EMP_ROW_RE = re.compile(
    r'class="emp-row"[^>]*>\s*<span class="emp-name">([^<]+)</span>\s*'
    r'<span class="emp-code"[^>]*>([^<]+)</span>',
    re.IGNORECASE,
)
SHIFT_BLOCK_RE = re.compile(
    r'<details class="shift-card" data-shift="[^"]*"[^>]*>.*?'
    r'<motion class="shift-body">(.*?)</div>\s*</details>',
    re.DOTALL | re.IGNORECASE,
)
SHIFT_BLOCK_RE2 = re.compile(
    r'<details class="shift-card" data-shift="[^"]*"[^>]*>.*?'
    r'<div class="shift-body">(.*?)</div>\s*</details>',
    re.DOTALL | re.IGNORECASE,
)
DEPT_CHUNK_RE = re.compile(
    r'<div class="dept-card"[^>]*>(.*?)</motion>\s*</div>\s*(?=\s*<div class="dept-card"|\s*<div class="cta-wrap"|\s*<div class="page-footer")',
    re.DOTALL | re.IGNORECASE,
)
DEPT_CHUNK_RE2 = re.compile(
    r'<div class="dept-card"[^>]*>(.*?)</motion>\s*</div>\s*(?=\s*<div class="dept-card"|\s*<div class="cta-wrap"|\s*<div class="page-footer")',
    re.DOTALL,
)
FOOTER_SOURCE_RE = re.compile(r"MARCH[^<]*\.xlsx|ROSTER[^<]*\.xlsx", re.IGNORECASE)


def is_legacy_march_page(text: str) -> bool:
    return all(m in text for m in LEGACY_MARKERS) and "class=\"deptCard\"" not in text


def parse_name_id(raw: str) -> tuple[str, str]:
    s = raw.replace("&middot;", "·").replace("&amp;", "&").strip()
    for sep in ("·", " - ", " – "):
        if sep in s:
            name, eid = s.rsplit(sep, 1)
            return name.strip(), eid.strip()
    return s, ""


def parse_legacy_day(html: str) -> list[dict]:
    rows: list[dict] = []
    chunks = re.split(r'<div class="dept-card"', html, flags=re.IGNORECASE)[1:]
    for chunk in chunks:
        dept_m = re.search(r'class="dept-title">([^<]+)', chunk, re.IGNORECASE)
        dept = (dept_m.group(1) if dept_m else "Unknown").strip()
        bodies: list[str] = []
        bodies.extend(SHIFT_BLOCK_RE.findall(chunk))
        bodies.extend(SHIFT_BLOCK_RE2.findall(chunk))
        for body in bodies:
            for name_raw, code in EMP_ROW_RE.findall(body):
                name, eid = parse_name_id(name_raw)
                if not eid:
                    continue
                rows.append(
                    {
                        "dept_name": dept,
                        "name": name,
                        "id": eid,
                        "code": code.strip(),
                    }
                )
    return rows


def extract_source_filename(html: str) -> str:
    m = FOOTER_SOURCE_RE.search(html)
    return m.group(0).strip() if m else "MARCH ROSTER MID.xlsx"


def aggregate_march() -> tuple[dict, str]:
    employees: dict[str, dict] = {}
    source = "MARCH ROSTER MID.xlsx"
    for path in sorted(IMPORT_ROOT.iterdir()):
        if not path.is_dir():
            continue
        m = ISO_RE.match(path.name)
        if not m:
            continue
        html_path = path / "index.html"
        if not html_path.is_file():
            continue
        html = html_path.read_text(encoding="utf-8")
        if not is_legacy_march_page(html):
            continue
        source = extract_source_filename(html) or source
        day = int(m.group(1))
        for row in parse_legacy_day(html):
            emp = employees.setdefault(
                row["id"],
                {
                    "id": row["id"],
                    "name": row["name"],
                    "dept_name": row["dept_name"],
                    "shifts": {},
                },
            )
            if row["dept_name"]:
                emp["dept_name"] = row["dept_name"]
            emp["shifts"][day] = row["code"]

    parsed = {
        "year": 2026,
        "month": 3,
        "sheet": source,
        "source_filename": source,
        "employees": list(employees.values()),
    }
    return parsed, source


def main() -> int:
    sys.path.insert(0, str(ROOT))
    import generate_and_send_import as gen

    parsed, source = aggregate_march()
    if not parsed["employees"]:
        print("No legacy March roster data found to migrate.")
        return 1

    print(f"Aggregated {len(parsed['employees'])} employees from March legacy pages ({source})")

    repo_root = ROOT
    style, export_script = gen.load_export_ui_template(repo_root)
    export_script = gen.prepare_export_script_for_import(export_script)

    min_date, max_date = gen.discover_import_date_range(IMPORT_ROOT)
    _, days_in_month = calendar.monthrange(2026, 3)
    gen_start = "2026-03-01"
    gen_end = f"2026-03-{days_in_month:02d}"
    if gen_start < min_date:
        min_date = gen_start
    if gen_end > max_date:
        max_date = gen_end

    date_root = IMPORT_ROOT / "date"
    written = 0
    for day in range(1, days_in_month + 1):
        d = dt.date(2026, 3, day)
        iso = d.isoformat()
        day_html = gen.build_duty_html(
            style,
            export_script,
            parsed,
            d,
            repo_base_path="/import",
            min_date=min_date,
            max_date=max_date,
        )
        for dest in (IMPORT_ROOT / iso / "index.html", date_root / iso / "index.html"):
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text(day_html, encoding="utf-8", newline="\n")
        written += 1
        if written <= 3 or "--verbose" in sys.argv:
            print(f"  {iso}")

    print(f"rebuilt {written} March pages with new theme")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
