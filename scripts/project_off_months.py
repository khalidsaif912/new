#!/usr/bin/env python3
"""Project Off-Day-only months forward when the official roster is not published yet.

For each employee schedule JSON (export + import), detect the recent work/OFF
cycle and fill target months with OFF days only. Non-OFF days stay absent so
the calendar cell stays empty until the real roster arrives.

Re-run after generate_employee_schedules / rebuild_import_schedules.
Official month data (any non-OFF day) is never overwritten.
"""
from __future__ import annotations

import argparse
import json
import sys
from calendar import monthrange
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

OFF_GROUPS = {"Off Day"}
OFF_CODES = {"OFF", "O"}
LEAVE_GROUPS = {"Annual Leave", "Sick Leave"}
LEAVE_CODES = {"LV", "SL", "AL", "A/L", "S/L"}

DAY_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
DAY_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

DEFAULT_TARGETS = ("2026-10", "2026-11", "2026-12")


def is_off(row: dict) -> bool:
    g = str(row.get("shift_group") or "")
    c = str(row.get("shift_code") or "").upper()
    return g in OFF_GROUPS or c in OFF_CODES


def is_leave(row: dict) -> bool:
    g = str(row.get("shift_group") or "")
    c = str(row.get("shift_code") or "").upper()
    return g in LEAVE_GROUPS or c in LEAVE_CODES


def ym_key(d: date) -> str:
    return f"{d.year}-{d.month:02d}"


def parse_ym(ym: str) -> tuple[int, int]:
    y, m = ym.split("-")
    return int(y), int(m)


def month_is_official(rows: list) -> bool:
    """True if the month looks like a published roster (not OFF-only projection)."""
    if not rows:
        return False
    if any(r.get("projected") for r in rows):
        return False
    # Any non-OFF day means real roster content.
    return any(not is_off(r) for r in rows)


def month_is_projected(rows: list) -> bool:
    if not rows:
        return False
    return all(is_off(r) and r.get("projected") for r in rows) or (
        all(is_off(r) for r in rows) and any(r.get("projected") for r in rows)
    )


def iter_month_days(schedules: dict) -> list[tuple[date, dict]]:
    out: list[tuple[date, dict]] = []
    for ym in sorted(k for k in schedules.keys() if isinstance(k, str) and len(k) == 7):
        rows = schedules.get(ym) or []
        if not isinstance(rows, list) or not month_is_official(rows):
            continue
        y, m = parse_ym(ym)
        by_day = {}
        for r in rows:
            try:
                day = int(r.get("day") or 0)
            except (TypeError, ValueError):
                continue
            if day:
                by_day[day] = r
        dim = monthrange(y, m)[1]
        for day in range(1, dim + 1):
            if day in by_day:
                out.append((date(y, m, day), by_day[day]))
    return out


def wo_suffix(timeline: list[tuple[date, dict]]) -> tuple[list[int], date] | None:
    """Last contiguous work/OFF run (no leave). Returns (0/1 seq, last_date)."""
    if not timeline:
        return None
    # If schedule ends on leave, cannot safely project return-to-work phase.
    if is_leave(timeline[-1][1]):
        return None

    seq_rev: list[int] = []
    last_date = timeline[-1][0]
    for d, row in reversed(timeline):
        if is_leave(row):
            break
        if is_off(row):
            seq_rev.append(1)
        else:
            seq_rev.append(0)
    seq = list(reversed(seq_rev))
    if len(seq) < 4 or 1 not in seq:
        return None
    return seq, last_date


def detect_cycle(seq: list[int]) -> tuple[list[int], int] | None:
    """Return (cycle pattern aligned to seq end, period) or None."""
    n = len(seq)
    best_p = None
    best_score = -1.0
    for p in range(2, min(16, n // 2) + 1):
        possible = n - p
        if possible <= 0:
            continue
        matches = sum(1 for i in range(possible) if seq[i] == seq[i + p])
        score = matches / possible
        # Prefer higher score; on ties prefer smaller period (simpler cycle).
        if score > best_score + 1e-9 or (abs(score - best_score) < 1e-9 and best_p and p < best_p):
            if score >= 0.80:
                best_p, best_score = p, score
    if best_p is None:
        return None
    return seq[-best_p:], best_p


def project_off_days(
    last_date: date,
    cycle: list[int],
    targets: list[str],
    *,
    style: str,
) -> dict[str, list]:
    """Map ym -> OFF-only day rows for target months after last_date."""
    p = len(cycle)
    result: dict[str, list] = {ym: [] for ym in targets}
    # Next calendar day after last known official day.
    cursor = last_date + timedelta(days=1)
    step = 0
    # Walk until past last target month.
    last_ym = max(targets)
    ly, lm = parse_ym(last_ym)
    end = date(ly, lm, monthrange(ly, lm)[1])

    while cursor <= end:
        ym = ym_key(cursor)
        if ym in result and cycle[step % p] == 1:
            result[ym].append(make_off_row(cursor, style=style))
        step += 1
        cursor += timedelta(days=1)
    return result


def make_off_row(d: date, *, style: str) -> dict:
    dow = (d.weekday() + 1) % 7  # Sunday=0 to match existing export files
    if style == "import":
        return {
            "day": d.day,
            "shift_code": "O",
            "shift_group": "Off Day",
            "projected": True,
        }
    return {
        "date": d.isoformat(),
        "day": d.day,
        "day_name_ar": DAY_AR[dow],
        "day_name_en": DAY_EN[dow],
        "shift_code": "OFF",
        "shift_label": "🛌 Off Day",
        "shift_group": "Off Day",
        "projected": True,
    }


def ensure_target_months(
    schedules: dict,
    targets: list[str],
    projected: dict[str, list] | None,
) -> bool:
    """Write projected OFF rows (or empty lists) into target months. Never touch official months."""
    changed = False
    projected = projected or {}
    for ym in targets:
        existing = schedules.get(ym)
        if isinstance(existing, list) and month_is_official(existing):
            continue
        new_rows = list(projected.get(ym) or [])
        if existing != new_rows:
            schedules[ym] = new_rows
            changed = True
    return changed


def process_employee(path: Path, targets: list[str], style: str, dry_run: bool) -> str:
    data = json.loads(path.read_text(encoding="utf-8"))
    schedules = data.get("schedules")
    if not isinstance(schedules, dict):
        return "skip-no-schedules"

    timeline = iter_month_days(schedules)
    suffix = wo_suffix(timeline)
    projected: dict[str, list] | None = None
    status = "empty-months"

    if suffix:
        seq, last_date = suffix
        detected = detect_cycle(seq)
        if detected:
            cycle, _period = detected
            projected = project_off_days(last_date, cycle, targets, style=style)
            status = "updated"

    changed = ensure_target_months(schedules, targets, projected)
    if not changed:
        return "unchanged"

    if dry_run:
        return "would-update" if projected else "would-empty-months"

    data["schedules"] = schedules
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return status if projected else "empty-months"

def rebuild_export_index(sched_dir: Path) -> None:
    employees = []
    for path in sorted(sched_dir.glob("*.json")):
        if path.name == "index.json":
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        employees.append(
            {
                "id": path.stem,
                "name": data.get("name", ""),
                "department": data.get("department", ""),
                "months": sorted(
                    k for k, v in (data.get("schedules") or {}).items() if isinstance(v, list)
                ),
            }
        )
    employees.sort(key=lambda x: (x["department"], x["name"]))
    from datetime import datetime, timezone, timedelta

    tz = timezone(timedelta(hours=4))
    index = {
        "total": len(employees),
        "employees": employees,
        "last_updated": datetime.now(tz).isoformat(),
    }
    (sched_dir / "index.json").write_text(
        json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def process_dir(sched_dir: Path, targets: list[str], style: str, dry_run: bool) -> dict[str, int]:
    counts: dict[str, int] = {}
    for path in sorted(sched_dir.glob("*.json")):
        if path.name == "index.json":
            continue
        status = process_employee(path, targets, style, dry_run)
        counts[status] = counts.get(status, 0) + 1
    return counts


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--targets",
        default=",".join(DEFAULT_TARGETS),
        help="Comma-separated YYYY-MM months to project (default: 2026-10,11,12)",
    )
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--export-only", action="store_true")
    ap.add_argument("--import-only", action="store_true")
    args = ap.parse_args(argv)

    targets = [t.strip() for t in args.targets.split(",") if t.strip()]
    for t in targets:
        parse_ym(t)  # validate

    export_dir = ROOT / "docs" / "schedules"
    import_dir = ROOT / "docs" / "import" / "schedules"

    do_export = not args.import_only
    do_import = not args.export_only

    if do_export and export_dir.is_dir():
        c = process_dir(export_dir, targets, "export", args.dry_run)
        print(f"export {export_dir}: {c}")
        if not args.dry_run:
            rebuild_export_index(export_dir)
            print("export index.json refreshed")

    if do_import and import_dir.is_dir():
        c = process_dir(import_dir, targets, "import", args.dry_run)
        print(f"import {import_dir}: {c}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
