#!/usr/bin/env python3
"""Rebuild Import schedule JSON: merge all months; keep fullest data per month."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IMPORT_ROOT = ROOT / "docs" / "import"
SCHED_DIR = IMPORT_ROOT / "schedules"

ISO_DIR_RE = re.compile(r"^(\d{4}-\d{2}-\d{2})$")

EMP_ROW_RE = re.compile(
    r'<div class="empRow\b[^"]*"[^>]*\bdata-emp-name="([^"]+)"[^>]*>(.*?)</div>',
    re.DOTALL | re.IGNORECASE,
)
LEGACY_EMP_RE = re.compile(
    r'class="emp-name">([^<]+)</span>\s*<span class="emp-code"[^>]*>([^<]+)</span>',
    re.IGNORECASE,
)


def code_to_group(code: str) -> str:
    sys.path.insert(0, str(ROOT))
    from generate_and_send_import import shift_bucket

    return shift_bucket(code)[0]


def extract_emp_status_inner(row_html: str) -> str:
    """empStatus may contain nested <span> for FROM/TO ranges."""
    m = re.search(r'class="empStatus"[^>]*>', row_html, re.IGNORECASE)
    if not m:
        return ""
    i = m.end()
    depth = 0
    pos = i
    n = len(row_html)
    while pos < n:
        chunk = row_html[pos : pos + 6].lower()
        if chunk.startswith("<span"):
            depth += 1
            close = row_html.find(">", pos)
            if close < 0:
                break
            pos = close + 1
            continue
        if chunk.startswith("</span"):
            if depth == 0:
                return row_html[i:pos]
            depth -= 1
            close = row_html.find(">", pos)
            pos = (close + 1) if close >= 0 else pos + 7
            continue
        pos += 1
    return ""


def parse_code(raw: str) -> str:
    s = re.sub(r"<[^>]+>", "", raw or "").strip()
    s = s.split("(")[0].strip()
    return s.split()[0] if s else ""


def parse_name_id(label: str) -> tuple[str, str]:
    s = label.replace("&middot;", "·").strip()
    for sep in ("·", " - ", " – "):
        if sep in s:
            name, eid = s.rsplit(sep, 1)
            return name.strip(), eid.strip()
    return s, ""


def days_to_schedule_rows(days: list) -> list[dict]:
    rows = []
    for d in days:
        code = (d.get("code") or d.get("shift_code") or "").strip()
        if not code:
            continue
        rows.append(
            {
                "day": int(d["day"]),
                "shift_code": code,
                "shift_group": d.get("shift_group") or code_to_group(code),
            }
        )
    return rows


def load_existing(path: Path) -> tuple[dict[str, list], dict]:
    if not path.is_file():
        return {}, {}
    data = json.loads(path.read_text(encoding="utf-8"))
    schedules: dict[str, list] = {}
    if isinstance(data.get("schedules"), dict):
        for ym, rows in data["schedules"].items():
            if isinstance(rows, list):
                schedules[str(ym)] = list(rows)
    if data.get("days") and data.get("month"):
        ym = str(data["month"])
        converted = days_to_schedule_rows(data["days"])
        if len(converted) >= len(schedules.get(ym, [])):
            schedules[ym] = converted
    return schedules, data


def merge_month_rows(a: list, b: list) -> list:
    by_day: dict[int, dict] = {}
    for row in a + b:
        by_day[int(row["day"])] = row
    return [by_day[d] for d in sorted(by_day.keys())]


def parse_day_html(html: str, day: int) -> list[dict]:
    rows: list[dict] = []
    for name_raw, row_html in EMP_ROW_RE.findall(html):
        name, eid = parse_name_id(name_raw)
        if not eid:
            continue
        code = parse_code(extract_emp_status_inner(row_html))
        if not code:
            continue
        rows.append({"id": eid, "name": name, "code": code, "day": day})
    if rows:
        return rows
    for name_raw, status_raw in LEGACY_EMP_RE.findall(html):
        name, eid = parse_name_id(name_raw)
        if not eid:
            continue
        code = parse_code(status_raw)
        if not code:
            continue
        rows.append({"id": eid, "name": name, "code": code, "day": day})
    return rows


def iso_from_page(path: Path) -> str | None:
    for part in path.parts:
        m = ISO_DIR_RE.match(part)
        if m:
            return m.group(1)
    return None


def discover_day_pages() -> list[tuple[str, Path]]:
    by_iso: dict[str, Path] = {}
    skip_dirs = {"now", "my-schedules", "schedules"}
    for path in sorted(IMPORT_ROOT.rglob("index.html")):
        if path.parent.name in skip_dirs or path.parent == IMPORT_ROOT:
            continue
        iso = iso_from_page(path)
        if not iso:
            continue
        prev = by_iso.get(iso)
        p = path.as_posix()
        if not prev:
            by_iso[iso] = path
        elif "/date/" in p and "/date/" not in prev.as_posix():
            by_iso[iso] = path
    return sorted(by_iso.items())


def main() -> int:
    scraped: dict[str, dict] = {}
    pages = discover_day_pages()
    for iso, path in pages:
        ym = iso[:7]
        day = int(iso[8:10])
        try:
            html = path.read_text(encoding="utf-8")
        except OSError:
            continue
        for row in parse_day_html(html, day):
            emp = scraped.setdefault(
                row["id"],
                {"id": row["id"], "name": row["name"], "department": "", "schedules": {}},
            )
            if row["name"]:
                emp["name"] = row["name"]
            month_map = emp["schedules"].setdefault(ym, {})
            month_map[day] = {
                "day": day,
                "shift_code": row["code"],
                "shift_group": code_to_group(row["code"]),
            }

    all_ids = set(scraped.keys())
    for path in SCHED_DIR.glob("*.json"):
        all_ids.add(path.stem)

    sys.path.insert(0, str(ROOT))
    from generate_and_send_import import discover_import_roster_catalog

    allowed_months = set(discover_import_roster_catalog(IMPORT_ROOT)["available_months"])

    written = 0
    for eid in sorted(all_ids):
        out_path = SCHED_DIR / f"{eid}.json"
        existing_schedules, existing_meta = load_existing(out_path)
        merged: dict[str, list] = dict(existing_schedules)

        scraped_emp = scraped.get(eid, {})
        for ym, days_map in scraped_emp.get("schedules", {}).items():
            if allowed_months and ym not in allowed_months:
                continue
            scraped_rows = [days_map[d] for d in sorted(days_map.keys())]
            merged[ym] = merge_month_rows(merged.get(ym, []), scraped_rows)

        merged = {ym: rows for ym, rows in merged.items() if not allowed_months or ym in allowed_months}
        if not merged:
            continue

        name = (
            scraped_emp.get("name")
            or existing_meta.get("name")
            or ""
        )
        dept = existing_meta.get("department") or scraped_emp.get("department") or ""
        latest = sorted(merged.keys())[-1]
        payload = {
            "id": eid,
            "name": name,
            "department": dept,
            "schedules": merged,
            "month": latest,
            "monthLabel": latest,
        }
        out_path.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        written += 1

    months = sorted({iso[:7] for iso, _ in pages})
    print(f"Merged {len(pages)} day pages across {len(months)} months: {', '.join(months)}")
    print(f"Wrote {written} schedule files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
