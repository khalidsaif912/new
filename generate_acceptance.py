#!/usr/bin/env python3
"""Build the Acceptance department roster page from the ACCEPTANCE_ROSTER Excel file."""

from __future__ import annotations

import argparse
import calendar
import datetime as dt
import json
import os
import re
import sys
import warnings
from pathlib import Path

import openpyxl

warnings.filterwarnings("ignore", message="Unknown extension*")
warnings.filterwarnings("ignore", message="Conditional Formatting extension*")

ROOT = Path(__file__).resolve().parent
OUT_DIR = ROOT / "docs" / "acceptance"
OUT_FILE = OUT_DIR / "index.html"

NAME_RE = re.compile(r"^(.+?)\s*[-–]\s*(\d{3,})$")

AR_NAMES = {
    "JAYANTHA": "جاينثا",
    "MUNA AL AMRI": "منى العامري",
    "AHMED AL HARRASI": "أحمد الحراصي",
    "SAID AL LUWAIHI": "سعيد اللويهي",
    "NASMA AL FARSI": "نسمة الفارسي",
    "WALEED AL KHARUSI": "وليد الخروصي",
    "ZAINAB AL HASHIMI": "زينب الهاشمي",
    "KHALIL AL MAZROEI": "خليل المزروعي",
    "OMAR AL HARTHY": "عمر الحارثي",
    "MUDREK AL HARTHY": "مدرك الحارثي",
    "ALMUHANNAD AL ABRI": "المهند العبري",
    "ALI AL MAQBALI": "علي المقبالي",
    "AHMED AL QURAINI": "أحمد القريني",
    "MOHD AL BALUSHI": "محمد البلوشي",
    "JIHAD AL SARMI": "جهاد الصارمي",
    "MAZIN AL HOUTI": "مازن الحوطي",
}


def _as_day(value) -> int | None:
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, (int, float)):
        num = float(value)
        if num.is_integer() and 1 <= int(num) <= 31:
            return int(num)
        return None
    text = str(value).strip()
    if text.isdigit() and 1 <= int(text) <= 31:
        return int(text)
    return None


def _parse_month_title(title: str) -> tuple[int, int] | None:
    match = re.match(r"^\s*([A-Za-z]+)\s+(\d{4})\s*$", title or "")
    if not match:
        return None
    month_name = match.group(1).lower()
    year = int(match.group(2))
    for month in range(1, 13):
        full = calendar.month_name[month].lower()
        abbr = calendar.month_abbr[month].lower()
        if month_name in (full, abbr):
            return year, month
    return None


def _find_day_row(ws) -> tuple[int, dict[int, int]] | None:
    for row in range(1, min(10, ws.max_row) + 1):
        cols: dict[int, int] = {}
        for col in range(1, ws.max_column + 1):
            day = _as_day(ws.cell(row=row, column=col).value)
            if day is not None and day not in cols:
                cols[day] = col
        if len(cols) >= 20 and 1 in cols:
            return row, cols
    return None


def _find_employee_column(ws, start_row: int) -> int | None:
    best_col = None
    best_hits = 0
    for col in range(1, min(ws.max_column, 8) + 1):
        hits = 0
        for row in range(start_row, ws.max_row + 1):
            value = ws.cell(row=row, column=col).value
            if value and NAME_RE.match(str(value).strip()):
                hits += 1
        if hits > best_hits:
            best_hits = hits
            best_col = col
    return best_col if best_hits >= 2 else None


def _merged_lookup(ws) -> dict[tuple[int, int], object]:
    """Expand merged cells so multi-day leave blocks (LV over several days) keep their value."""
    lookup: dict[tuple[int, int], object] = {}
    for rng in ws.merged_cells.ranges:
        value = ws.cell(row=rng.min_row, column=rng.min_col).value
        if value is None:
            continue
        for row in range(rng.min_row, rng.max_row + 1):
            for col in range(rng.min_col, rng.max_col + 1):
                lookup[(row, col)] = value
    return lookup


def _cell_value(ws, merged: dict[tuple[int, int], object], row: int, col: int):
    value = ws.cell(row=row, column=col).value
    if value is None:
        value = merged.get((row, col))
    return value


def _extract_month(ws) -> tuple[int, int, list[dict]] | None:
    parsed = _parse_month_title(ws.title)
    if not parsed:
        return None
    found = _find_day_row(ws)
    if not found:
        return None
    day_row, day_cols = found
    emp_col = _find_employee_column(ws, day_row + 1)
    if not emp_col:
        return None
    merged = _merged_lookup(ws)

    employees: list[dict] = []
    seen: set[str] = set()
    for row in range(day_row + 1, ws.max_row + 1):
        raw_name = _cell_value(ws, merged, row, emp_col)
        if raw_name is None:
            continue
        match = NAME_RE.match(" ".join(str(raw_name).split()))
        if not match:
            continue
        name = " ".join(match.group(1).split())
        emp_id = match.group(2)
        key = f"{name.upper()}|{emp_id}"
        if key in seen:
            continue
        seen.add(key)

        shifts: dict[str, str] = {}
        for day, col in day_cols.items():
            value = _cell_value(ws, merged, row, col)
            if value is None:
                continue
            code = " ".join(str(value).split())
            if code:
                shifts[str(day)] = code

        employees.append(
            {
                "name": name,
                "id": emp_id,
                "ar": AR_NAMES.get(name.upper(), ""),
                "shifts": shifts,
            }
        )

    year, month = parsed
    return year, month, employees


def extract_workbook(workbook) -> dict:
    months: dict[str, dict] = {}
    for ws in workbook.worksheets:
        extracted = _extract_month(ws)
        if not extracted:
            continue
        year, month, employees = extracted
        if not employees:
            continue
        key = f"{year}-{month:02d}"
        days = calendar.monthrange(year, month)[1]
        months[key] = {"days": days, "employees": employees}

    if not months:
        raise SystemExit("No roster months found in the workbook.")

    keys = sorted(months)
    first_year, first_month = (int(p) for p in keys[0].split("-"))
    last_year, last_month = (int(p) for p in keys[-1].split("-"))
    min_date = dt.date(first_year, first_month, 1).isoformat()
    max_date = dt.date(
        last_year, last_month, calendar.monthrange(last_year, last_month)[1]
    ).isoformat()

    modified = workbook.properties.modified
    if isinstance(modified, dt.datetime):
        modified = modified.replace(tzinfo=None).isoformat() + "Z"

    return {
        "min": min_date,
        "max": max_date,
        "modified": modified or "",
        "months": months,
    }


HTML_TEMPLATE = """<!doctype html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Acceptance Roster</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700;800&family=IBM+Plex+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  :root{
    --safe-top: env(safe-area-inset-top, 0px);
    --safe-bottom: env(safe-area-inset-bottom, 0px);
    --font-en: 'IBM Plex Sans', 'Segoe UI', system-ui, -apple-system, sans-serif;
    --font-ar: 'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, sans-serif;
  }
  html, body { width:100%; overflow-x:hidden; }
  body {
    margin:0; padding:0; min-height:100dvh;
    background:#eef1f7;
    font-family:var(--font-en);
    color:#0f172a;
    -webkit-font-smoothing:antialiased;
    touch-action:manipulation;
  }
  body.ar { font-family:var(--font-ar); }
  * { box-sizing:border-box; }

  .wrap { max-width:680px; margin:0 auto; padding:calc(16px + var(--safe-top)) 14px calc(28px + var(--safe-bottom)); }

  .header {
    background:linear-gradient(135deg, #1e40af 0%, #1976d2 50%, #0ea5e9 100%);
    color:#fff;
    padding:22px 16px 16px;
    border-radius:20px;
    text-align:center;
    box-shadow:0 4px 16px rgba(30,64,175,.14);
    position:relative;
    overflow:hidden;
  }
  .header::before {
    content:''; position:absolute; top:-30px; right:-40px;
    width:140px; height:140px; border-radius:50%;
    background:rgba(255,255,255,.08); pointer-events:none;
  }
  .header::after {
    content:''; position:absolute; bottom:-50px; left:-30px;
    width:160px; height:160px; border-radius:50%;
    background:rgba(255,255,255,.06); pointer-events:none;
  }
  .bannerTitle { margin:0; position:relative; z-index:1; line-height:1.1; color:#fff; }
  .bannerTitleEyebrow {
    display:block; font-size:11px; font-weight:700; letter-spacing:.22em;
    text-transform:uppercase; opacity:.88; margin-bottom:5px;
  }
  .bannerTitleMain {
    display:block; font-size:28px; font-weight:800; letter-spacing:-.03em;
  }
  body.ar .bannerTitleEyebrow { letter-spacing:.06em; text-transform:none; font-size:12px; }
  body.ar .bannerTitleMain { font-size:26px; letter-spacing:0; }

  .langToggle {
    position:absolute; top:10px; left:12px; z-index:30;
    background:transparent; border:none; padding:2px;
    display:inline-flex; flex-direction:column; align-items:center; justify-content:center;
    gap:1px; color:#fff; cursor:pointer;
    -webkit-tap-highlight-color:transparent;
    touch-action:manipulation;
  }
  body.ar .langToggle { left:auto; right:12px; }
  .langToggle svg { display:block; width:13px; height:13px; filter:drop-shadow(0 1px 2px rgba(0,0,0,.55)); }
  .langToggleLabel {
    font-size:9px; font-weight:800; line-height:1;
    text-shadow:0 1px 3px rgba(0,0,0,.65);
  }

  #banner-changer-btn {
    position:absolute; bottom:12px; top:auto; left:12px; z-index:30;
    background:transparent; border:none; border-radius:0;
    min-width:auto; min-height:auto; padding:2px;
    color:#fff; cursor:pointer; line-height:0;
    display:inline-flex; align-items:center; justify-content:center;
    -webkit-tap-highlight-color:transparent; touch-action:manipulation;
    transition:transform .2s ease, opacity .2s ease;
  }
  #banner-changer-btn:hover { background:transparent; transform:scale(1.08); opacity:.92; }
  #banner-changer-btn .banner-changer-icon svg {
    display:block; width:13px; height:13px;
    filter:drop-shadow(0 1px 2px rgba(0,0,0,.55));
  }

  /* Home-style split header: title row, then banner-btn / date / lang row */
  .header.homeDateSplit {
    display:grid;
    grid-template-columns:28px minmax(0,1fr) 28px;
    grid-template-rows:auto auto;
    align-items:center;
    direction:ltr;
    padding:26px 18px 12px;
    min-height:0;
  }
  .header.homeDateSplit .bannerTitle,
  .header.homeDateSplit > h1 { grid-column:1 / -1; grid-row:1; }
  .header.homeDateSplit #banner-changer-btn {
    grid-column:1; grid-row:2;
    position:relative !important; inset:auto !important;
    justify-self:center; align-self:center; transform:none !important;
    z-index:31; padding:2px; min-width:0; min-height:0; width:auto; height:auto;
  }
  .header.homeDateSplit .langToggle,
  .header.homeDateSplit #langToggle {
    grid-column:3; grid-row:2;
    position:relative !important; inset:auto !important;
    justify-self:center; align-self:center; transform:none !important;
    z-index:31; padding:2px; min-width:0; min-height:0; width:auto; height:auto;
  }
  .header.homeDateSplit .langToggle:hover,
  .header.homeDateSplit #banner-changer-btn:hover { transform:scale(1.08) !important; }
  .header.homeDateSplit .langToggle svg { width:13px; height:13px; }
  .header.homeDateSplit .langToggleLabel { font-size:8px; }
  .header.homeDateSplit .datePickerWrapper {
    grid-column:2; grid-row:2;
    position:relative; display:block;
    width:100%; max-width:100%; margin-top:0;
    z-index:20; min-height:56px;
    touch-action:manipulation; -webkit-tap-highlight-color:transparent;
  }
  .header.homeDateSplit .dateTag {
    display:flex; align-items:center; justify-content:center;
    min-height:56px; padding:0; border:none; border-radius:0;
    background:transparent; color:#fff; cursor:pointer;
    user-select:none; -webkit-user-select:none; text-align:center; line-height:1;
    position:relative; z-index:3; pointer-events:auto;
    -webkit-tap-highlight-color:transparent;
  }
  .header.homeDateSplit .dateTagMain {
    position:relative; display:flex; align-items:center; justify-content:center;
    gap:min(2.4vw, 12px); pointer-events:none; direction:ltr;
    width:max-content; max-width:100%; margin-inline:auto;
  }
  body.ar .header.homeDateSplit .dateTagMain { direction:rtl; }
  .header.homeDateSplit .dateTagDay,
  .header.homeDateSplit .dateTagWeek,
  .header.homeDateSplit .dateTagMonth {
    font-family:var(--font-en);
    color:rgba(255,255,255,.72);
    text-shadow:0 1px 2px rgba(0,0,0,.55), 0 0 1px rgba(255,255,255,.45);
    -webkit-text-stroke:.15px rgba(0,0,0,.28);
    paint-order:stroke fill;
  }
  body.ar .header.homeDateSplit .dateTagDay,
  body.ar .header.homeDateSplit .dateTagWeek,
  body.ar .header.homeDateSplit .dateTagMonth { font-family:var(--font-ar); }
  .header.homeDateSplit .dateTagSide {
    display:flex; flex-direction:column; align-items:flex-start; justify-content:center;
    gap:3px; line-height:1; flex:0 0 auto;
    padding-inline-start:min(1.8vw, 10px);
    border-inline-start:1px solid rgba(255,255,255,.35);
    direction:ltr; unicode-bidi:isolate; min-width:0; width:max-content;
  }
  body.ar .header.homeDateSplit .dateTagSide {
    align-items:flex-end; padding-inline-start:0;
    padding-inline-end:min(1.8vw, 10px);
    border-inline-start:none; border-inline-end:1px solid rgba(255,255,255,.35);
  }
  .header.homeDateSplit .dateTagDay {
    display:block; flex:0 0 auto;
    font-size:clamp(56px, 18vw, 88px); font-weight:800;
    letter-spacing:-.04em; line-height:.9; font-variant-numeric:tabular-nums;
    pointer-events:none;
  }
  body.ar .header.homeDateSplit .dateTagDay { letter-spacing:0; }
  .header.homeDateSplit .dateTagWeek {
    display:block; font-size:clamp(13px, 3.8vw, 17px); font-weight:700;
    letter-spacing:-.01em; line-height:1.05; text-align:left; white-space:nowrap;
    width:100%; pointer-events:none;
  }
  body.ar .header.homeDateSplit .dateTagWeek { letter-spacing:0; text-align:right; }
  .header.homeDateSplit .dateTagMonthWrap {
    display:block; line-height:1; text-align:left; width:100%;
  }
  body.ar .header.homeDateSplit .dateTagMonthWrap { text-align:right; }
  .header.homeDateSplit .dateTagMonth {
    display:block; font-size:clamp(22px, 7vw, 36px); font-weight:700;
    letter-spacing:-.02em; line-height:1; text-align:left; white-space:nowrap;
  }
  body.ar .header.homeDateSplit .dateTagMonth { letter-spacing:0; text-align:right; }
  .header.homeDateSplit #datePicker {
    position:absolute; inset:0; width:100%; height:100%; min-height:56px;
    margin:0; padding:0; opacity:0; cursor:pointer;
    font-size:16px; border:none; color:transparent; background:transparent;
    z-index:5; touch-action:manipulation;
  }

  .datePickerWrapper {
    position:relative; flex:1 1 auto; min-width:0;
    min-height:70px; z-index:3;
    touch-action:manipulation;
    -webkit-tap-highlight-color:transparent;
  }
  .dateTag {
    display:flex; align-items:center; justify-content:center;
    min-height:70px; padding:0; margin:0;
    border:none; background:transparent; color:#fff;
    cursor:pointer; user-select:none; -webkit-user-select:none;
    text-align:center; line-height:1; position:relative; z-index:3;
  }
  .dateTagMain {
    display:flex; align-items:center; justify-content:center;
    gap:min(2.4vw, 12px);
    direction:ltr; width:max-content; max-width:100%; margin-inline:auto;
    pointer-events:none;
  }
  body.ar .dateTagMain { direction:rtl; }
  .dateTagDay, .dateTagWeek, .dateTagMonth {
    font-family:var(--font-en);
    color:rgba(255,255,255,.78);
    text-shadow:0 1px 2px rgba(0,0,0,.55), 0 0 1px rgba(255,255,255,.45);
    -webkit-text-stroke:.15px rgba(0,0,0,.28);
    paint-order:stroke fill;
  }
  body.ar .dateTagDay, body.ar .dateTagWeek, body.ar .dateTagMonth { font-family:var(--font-ar); }
  .dateTagDay {
    display:block; flex:0 0 auto;
    font-size:clamp(54px, 17vw, 82px); font-weight:800;
    letter-spacing:-.04em; line-height:.9; font-variant-numeric:tabular-nums;
  }
  body.ar .dateTagDay { letter-spacing:0; }
  .dateTagSide {
    display:flex; flex-direction:column; align-items:flex-start; justify-content:center;
    gap:3px; line-height:1; flex:0 0 auto;
    padding-inline-start:min(1.8vw, 10px);
    border-inline-start:1px solid rgba(255,255,255,.35);
    direction:ltr; unicode-bidi:isolate;
  }
  body.ar .dateTagSide {
    align-items:flex-end;
    padding-inline-start:0;
    padding-inline-end:min(1.8vw, 10px);
    border-inline-start:none;
    border-inline-end:1px solid rgba(255,255,255,.35);
  }
  .dateTagWeek {
    display:block; font-size:clamp(13px, 3.8vw, 17px); font-weight:700;
    letter-spacing:-.01em; line-height:1.05; text-align:left; white-space:nowrap;
  }
  body.ar .dateTagWeek { letter-spacing:0; text-align:right; }
  .dateTagMonth {
    display:block; font-size:clamp(20px, 6.5vw, 30px); font-weight:700;
    letter-spacing:-.02em; line-height:1; text-align:left; white-space:nowrap;
  }
  body.ar .dateTagMonth { letter-spacing:0; text-align:right; }
  #datePicker {
    position:absolute; inset:0; width:100%; height:100%; min-height:70px;
    margin:0; padding:0; opacity:0; cursor:pointer;
    font-size:16px; border:none; color:transparent; background:transparent;
    z-index:5; touch-action:manipulation;
  }

  .todayBtn {
    position:relative; z-index:2;
    margin-top:8px;
    display:inline-flex; align-items:center; justify-content:center;
    padding:5px 14px; border-radius:999px;
    border:1px solid rgba(255,255,255,.38);
    background:rgba(255,255,255,.15);
    color:#fff; font-size:11px; font-weight:800; letter-spacing:.02em;
    cursor:pointer;
    -webkit-tap-highlight-color:transparent;
  }
  .todayBtn[hidden] { display:none; }
  .todayBtn:hover { background:rgba(255,255,255,.24); }

  .summaryBar {
    display:flex; justify-content:center; align-items:stretch;
    gap:8px; margin-top:14px; flex-wrap:nowrap;
  }
  .summaryChip {
    background:#fff;
    border:1px solid rgba(15,23,42,.1);
    border-radius:14px;
    padding:9px 4px;
    text-align:center;
    box-shadow:0 2px 8px rgba(15,23,42,.06);
    min-width:0; flex:1 1 0;
    display:flex; flex-direction:column; align-items:center; justify-content:flex-start;
  }
  .summaryChip .chipVal {
    font-size:22px; font-weight:900; color:#1e40af;
    height:26px; display:flex; align-items:center; justify-content:center; line-height:1;
    font-variant-numeric:tabular-nums;
  }
  .summaryChip .chipLabel {
    font-size:9.5px; font-weight:800; color:#334155;
    text-transform:uppercase; letter-spacing:.2px; margin-top:4px;
    line-height:1.1; white-space:nowrap;
  }
  body.ar .summaryChip .chipLabel { text-transform:none; letter-spacing:0; font-size:10px; }
  #chipOn .chipVal { color:#1e40af; }
  #chipOff .chipVal { color:#4338ca; }
  #chipLeave .chipVal { color:#059669; }
  #chipTraining .chipVal { color:#0284c7; }
  #chipTotal .chipVal { color:#334155; }

  .deptCard {
    margin-top:18px;
    background:#fff;
    border-radius:18px;
    overflow:hidden;
    border:1px solid rgba(15,23,42,.07);
    box-shadow:0 4px 18px rgba(15,23,42,.08);
  }
  .deptBar { height:5px; background:linear-gradient(to right, #2563eb, #2563ebcc); }
  .deptHead {
    display:flex; align-items:center; gap:12px;
    padding:14px 16px;
    background:#fff;
    border-bottom:2px solid #2563eb18;
  }
  .deptIcon {
    width:40px; height:40px; border-radius:12px;
    display:flex; align-items:center; justify-content:center;
    flex-shrink:0;
    background:#2563eb15; color:#2563eb;
  }
  .deptTitle { font-size:18px; font-weight:800; color:#1e293b; flex:1; letter-spacing:-.2px; }
  .deptBadge {
    min-width:48px; padding:6px 10px; border-radius:12px; text-align:center;
    background:#2563eb15; color:#2563eb; border:1px solid #2563eb18;
  }
  .deptBadgeLabel {
    font-size:10px; opacity:.7; display:block; margin-bottom:1px;
    text-transform:uppercase; letter-spacing:.5px;
  }
  .deptBadgeVal { font-size:17px; font-weight:900; }

  .shiftStack { padding:10px; display:flex; flex-direction:column; gap:8px; }
  .shiftCard { border-radius:14px; overflow:hidden; }
  .shiftSummary {
    display:flex; align-items:center; gap:10px;
    padding:11px 14px; cursor:pointer;
    list-style:none; -webkit-appearance:none; appearance:none; user-select:none;
  }
  .shiftSummary::-webkit-details-marker { display:none; }
  .shiftSummary::marker { display:none; }
  .shiftSummary::after {
    content:'▾'; font-size:14px; color:#94a3b8;
    transition:transform .2s; flex-shrink:0;
  }
  .shiftCard[open] .shiftSummary::after { transform:rotate(180deg); }
  .shiftIcon { font-size:20px; line-height:1; flex-shrink:0; }
  .shiftLabel { font-size:15px; font-weight:800; flex:1; letter-spacing:-.1px; }
  .shiftCount {
    font-size:13px; font-weight:800; padding:3px 10px; border-radius:20px; flex-shrink:0;
  }
  .shiftBody { background:rgba(255,255,255,.7); }

  .empRow {
    display:flex; align-items:center; justify-content:space-between; gap:10px;
    padding:9px 16px;
    border-top:1px solid rgba(15,23,42,.06);
  }
  .empRowAlt { background:rgba(15,23,42,.02); }
  .empRow.isMe { background:rgba(37,99,235,.08); }
  .empName { font-size:15px; font-weight:700; color:#1e293b; line-height:1.25; }
  .empRow.isMe .empName { color:#1e40af; }
  .empId { font-weight:600; color:#64748b; font-variant-numeric:tabular-nums; }
  .empRow.isMe .empId { color:#3b82f6; }
  .empStatus {
    font-size:13px; font-weight:600; flex-shrink:0;
    text-align:end; direction:ltr; unicode-bidi:isolate;
  }
  body.ar .empStatus { direction:rtl; }
  .youBadge {
    display:inline-block; padding:1px 6px; border-radius:999px;
    background:#2563eb; color:#fff; font-size:9px; font-weight:800;
    vertical-align:middle; margin-inline-start:4px;
  }
  .shiftRangeLabel { font-size:10px; opacity:.7; }

  .emptyCard {
    margin-top:18px; padding:30px 18px; text-align:center;
    background:#fff; border-radius:18px;
    border:1px solid rgba(15,23,42,.07);
    box-shadow:0 4px 18px rgba(15,23,42,.08);
    color:#64748b; font-size:14px; font-weight:600;
  }
  .emptyIcon { font-size:26px; margin-bottom:8px; }

  .footer {
    margin-top:20px; text-align:center;
    color:#64748b; font-size:12px; line-height:1.8;
  }
  body.ar .footer { direction:rtl; }
  .footerSource { direction:ltr; unicode-bidi:isolate; }
  .footer strong { color:#475569; }
  .footer .footerDate { color:#1e40af; }
  .footer .footerSource { color:#1e293b; word-break:break-word; }

  @media (max-width:380px){
    .summaryBar { gap:6px; }
    .summaryChip { padding:8px 2px; }
    .summaryChip .chipVal { font-size:19px; }
    .summaryChip .chipLabel { font-size:8.5px; letter-spacing:0; }
    body.ar .summaryChip .chipLabel { font-size:9px; }
    .empName { font-size:14px; }
    .deptTitle { font-size:16px; }
  }
</style>
</head>
<body>
<div class="wrap">

  <div class="header homeDateSplit">
    <button class="langToggle" id="langToggle" type="button" aria-label="Switch language">
      <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18"/><path d="M12 3a14 14 0 0 0 0 18"/></svg></span>
      <span class="langToggleLabel" id="langToggleLabel">ع</span>
    </button>
    <h1 class="bannerTitle">
      <span class="bannerTitleEyebrow" id="titleEyebrow">Acceptance</span>
      <span class="bannerTitleMain" id="titleMain">Duty Roster</span>
    </h1>
    <div class="datePickerWrapper">
      <label class="dateTag" id="dateTag" for="datePicker">
        <span class="dateTagMain">
          <span class="dateTagDay" id="dateTagDay"></span>
          <span class="dateTagSide">
            <span class="dateTagWeek" id="dateTagWeek"></span>
            <span class="dateTagMonthWrap">
              <span class="dateTagMonth" id="dateTagMonth"></span>
            </span>
          </span>
        </span>
      </label>
      <input id="datePicker" type="date" aria-label="Select roster date">
    </div>
  </div>

  <div class="summaryBar">
    <a href="../index.html" id="exportBtn" class="summaryChip exportChip" title="الذهاب إلى جدول الصادر" style="text-decoration:none;">
      <div class="chipVal"><svg class="chip-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#0ea5e9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M12 3v12"/><path d="M7 8l5-5 5 5"/></svg></div>
      <div class="chipLabel" id="exportLabel">Export</div>
    </a>
    <div class="summaryChip" id="chipOn">
      <div class="chipVal" id="onDutyVal">0</div>
      <div class="chipLabel" id="onDutyLabel">On Duty</div>
    </div>
    <div class="summaryChip" id="chipOff">
      <div class="chipVal" id="offVal">0</div>
      <div class="chipLabel" id="offLabel">Off</div>
    </div>
    <div class="summaryChip" id="chipLeave">
      <div class="chipVal" id="leaveVal">0</div>
      <div class="chipLabel" id="leaveLabel">Leave</div>
    </div>
    <div class="summaryChip" id="chipTraining">
      <div class="chipVal" id="trainingVal">0</div>
      <div class="chipLabel" id="trainingLabel">Training</div>
    </div>
    <div class="summaryChip" id="chipTotal">
      <div class="chipVal" id="totalVal">0</div>
      <div class="chipLabel" id="totalLabel">Total</div>
    </div>
  </div>

  <div id="rosterRoot"></div>

  <div class="footer">
    <strong id="updatedLabel">Last Updated:</strong> <span class="footerDate" id="updatedValue">—</span><br>
    <strong id="sourceLabel">Source:</strong> <span class="footerSource" id="sourceValue"></span>
  </div>

</div>

<script>
(function () {
  'use strict';

  var DATA = __DATA_JSON__;
  var SOURCE_NAME = __SOURCE_NAME__;
  var LANG = localStorage.getItem('rosterLang') || 'en';
  var AR = LANG === 'ar';

  var WEEK_EN = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var WEEK_AR = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  var MON_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var MON_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  var MON_SHORT_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  var GROUPS = ['Morning','Afternoon','Night','Standby','Off Day','Annual Leave','Sick Leave','Training','Other'];
  var META = {
    'Morning':     { bg:'#fef3c7', border:'#f59e0b44', summaryBorder:'#f59e0b33', label:'#92400e', countBg:'#f59e0b22', icon:'☀️', en:'Morning', ar:'صباحي' },
    'Afternoon':   { bg:'#ffedd5', border:'#f9731644', summaryBorder:'#f9731633', label:'#9a3412', countBg:'#f9731622', icon:'🌤️', en:'Afternoon', ar:'مسائي' },
    'Night':       { bg:'#ede9fe', border:'#8b5cf644', summaryBorder:'#8b5cf633', label:'#5b21b6', countBg:'#8b5cf622', icon:'🌙', en:'Night', ar:'ليلي' },
    'Standby':     { bg:'#f0f0f0', border:'#9e9e9e44', summaryBorder:'#9e9e9e33', label:'#555555', countBg:'#cccccc22', icon:'🧍', en:'Standby', ar:'احتياط' },
    'Off Day':     { bg:'#e0e7ff', border:'#6366f144', summaryBorder:'#6366f133', label:'#3730a3', countBg:'#6366f122', icon:'🛋️', en:'Off Day', ar:'يوم راحة' },
    'Annual Leave':{ bg:'#d1fae5', border:'#10b98144', summaryBorder:'#10b98133', label:'#065f46', countBg:'#10b98122', icon:'✈️', en:'Annual Leave', ar:'إجازة سنوية' },
    'Sick Leave':  { bg:'#ffedd5', border:'#f59e0b44', summaryBorder:'#f59e0b33', label:'#b45309', countBg:'#f59e0b22', icon:'🤒', en:'Sick Leave', ar:'إجازة مرضية' },
    'Training':    { bg:'#e0f2fe', border:'#0ea5e944', summaryBorder:'#0ea5e933', label:'#075985', countBg:'#0ea5e922', icon:'📚', en:'Training', ar:'تدريب' },
    'Other':       { bg:'#f1f5f9', border:'#94a3b844', summaryBorder:'#94a3b833', label:'#334155', countBg:'#94a3b822', icon:'📋', en:'Other', ar:'أخرى' }
  };

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function parseYmd(s) {
    var p = String(s || '').split('-');
    return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
  }
  function addDays(d, n) {
    var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() + n);
    return x;
  }
  function todayYmd() {
    var n = new Date();
    return ymd(new Date(n.getFullYear(), n.getMonth(), n.getDate()));
  }
  function clampYmd(s) {
    if (s < DATA.min) return DATA.min;
    if (s > DATA.max) return DATA.max;
    return s;
  }
  function groupFor(code) {
    var c = String(code || '').trim().toUpperCase();
    if (!c || c === '0') return 'Other';
    if (c === 'AL' || c === 'LV' || c.indexOf('ANNUAL') !== -1) return 'Annual Leave';
    if (c === 'SL' || c.indexOf('SICK') !== -1) return 'Sick Leave';
    if (c === 'TR' || c.indexOf('TRAINING') !== -1) return 'Training';
    if (c === 'ST' || c === 'STM' || c === 'STN' || c === 'STNE22' || c === 'STME06' || c === 'STMN06' || c === 'STAE14' || c.indexOf('STANDBY') !== -1) return 'Standby';
    if (c.indexOf('OT') === 0) return 'Standby';
    if (c === 'OFF' || c === 'O' || c === 'REST' || c.indexOf('OFF DAY') !== -1) return 'Off Day';
    var map = { MN06:'Morning', ME06:'Morning', ME07:'Morning', ME12:'Morning', MN12:'Afternoon', AN13:'Afternoon', AE14:'Afternoon', NN21:'Night', NE22:'Night' };
    if (map[c]) return map[c];
    if (c.indexOf('AE') === 0 || c.indexOf('AN') === 0) return 'Afternoon';
    if (c.indexOf('NN') === 0 || c.indexOf('NE') === 0 || c.indexOf('NT') === 0) return 'Night';
    if (c.indexOf('MN') === 0 || c.indexOf('ME') === 0) return 'Morning';
    return 'Other';
  }
  function ownId() {
    var q = '';
    try {
      q = new URLSearchParams(window.location.search).get('emp') || '';
    } catch (e) {}
    return q || localStorage.getItem('exportSavedEmpId') || localStorage.getItem('savedEmpId') || '';
  }
  function rangeSuffix(emp, day, group) {
    if (group !== 'Annual Leave' && group !== 'Sick Leave' && group !== 'Training') return '';
    var shifts = emp.shifts || {};
    var start = day;
    var end = day;
    while (shifts[String(start - 1)] && groupFor(shifts[String(start - 1)]) === group) start--;
    while (shifts[String(end + 1)] && groupFor(shifts[String(end + 1)]) === group) end++;
    if (start === end) return '';
    var from = AR ? 'من' : 'FROM';
    var to = AR ? 'إلى' : 'TO';
    return '(<span class="shiftRange"><span class="shiftRangeLabel">' + from + '</span> ' + start + ' <span class="shiftRangeLabel">' + to + '</span> ' + end + '</span>)';
  }

  var OWN = ownId();
  var current = clampYmd(todayYmd());

  function applyChrome() {
    document.documentElement.lang = AR ? 'ar' : 'en';
    document.documentElement.dir = AR ? 'rtl' : 'ltr';
    document.body.classList.toggle('ar', AR);
    document.title = AR ? 'روستر الأكسبتنس' : 'Acceptance Roster';
    document.getElementById('langToggleLabel').textContent = AR ? 'EN' : 'ع';
    document.getElementById('titleEyebrow').textContent = AR ? 'الأكسبتنس' : 'Acceptance';
    document.getElementById('titleMain').textContent = AR ? 'روستر الدوام' : 'Duty Roster';
    document.getElementById('onDutyLabel').textContent = AR ? 'على الدوام' : 'On Duty';
    document.getElementById('offLabel').textContent = AR ? 'راحة' : 'Off';
    document.getElementById('leaveLabel').textContent = AR ? 'إجازة' : 'Leave';
    document.getElementById('trainingLabel').textContent = AR ? 'تدريب' : 'Training';
    document.getElementById('totalLabel').textContent = AR ? 'الإجمالي' : 'Total';
    document.getElementById('updatedLabel').textContent = AR ? 'آخر تحديث:' : 'Last Updated:';
    document.getElementById('sourceLabel').textContent = AR ? 'المصدر:' : 'Source:';
    document.getElementById('exportLabel').textContent = AR ? 'الصادر' : 'Export';
    document.getElementById('exportBtn').setAttribute('title', AR ? 'الذهاب إلى جدول الصادر' : 'Go to the Export roster');
    document.getElementById('sourceValue').textContent = SOURCE_NAME;

    var updatedEl = document.getElementById('updatedValue');
    if (DATA.modified) {
      var m = new Date(DATA.modified.indexOf('Z') !== -1 ? DATA.modified : DATA.modified + 'Z');
      if (!isNaN(m.getTime())) {
        var parts;
        if (AR) {
          parts = String(m.getDate()).padStart(2, '0') + ' ' + MON_AR[m.getMonth()] + ' ' + m.getFullYear() + ' / ' + pad2(m.getHours()) + ':' + pad2(m.getMinutes());
        } else {
          parts = String(m.getDate()).padStart(2, '0') + ' ' + MON_SHORT_EN[m.getMonth()] + ' ' + m.getFullYear() + ' / ' + pad2(m.getHours()) + ':' + pad2(m.getMinutes());
        }
        updatedEl.textContent = parts;
        return;
      }
    }
    updatedEl.textContent = '—';
  }

  function render() {
    var date = parseYmd(current);
    var day = date.getDate();
    var monthKey = current.slice(0, 7);
    var month = DATA.months[monthKey];

    document.getElementById('dateTagDay').textContent = day;
    document.getElementById('dateTagWeek').textContent = (AR ? WEEK_AR : WEEK_EN)[date.getDay()];
    document.getElementById('dateTagMonth').textContent = (AR ? MON_AR : MON_EN)[date.getMonth()];

    var picker = document.getElementById('datePicker');
    picker.min = DATA.min;
    picker.max = DATA.max;
    picker.value = current;
    picker.setAttribute('aria-label', AR ? 'اختر تاريخ الروستر' : 'Select roster date');

    var root = document.getElementById('rosterRoot');
    if (!month) {
      document.getElementById('onDutyVal').textContent = '0';
      document.getElementById('offVal').textContent = '0';
      document.getElementById('leaveVal').textContent = '0';
      document.getElementById('trainingVal').textContent = '0';
      document.getElementById('totalVal').textContent = '0';
      root.innerHTML = '<div class="emptyCard"><div class="emptyIcon">🗓️</div>' +
        (AR ? 'لا يوجد روستر لهذا التاريخ' : 'No roster for this date') + '</div>';
      return;
    }

    var buckets = {};
    GROUPS.forEach(function (g) { buckets[g] = []; });
    var total = 0;
    var own = null;

    month.employees.forEach(function (emp) {
      var code = emp.shifts && emp.shifts[String(day)];
      if (!code) return;
      total++;
      var group = groupFor(code);
      buckets[group].push({ emp: emp, code: code });
      if (OWN && emp.id === OWN) own = { emp: emp, group: group };
    });

    function count(groups) {
      return groups.reduce(function (sum, g) { return sum + buckets[g].length; }, 0);
    }
    document.getElementById('onDutyVal').textContent = count(['Morning', 'Afternoon', 'Night']);
    document.getElementById('offVal').textContent = count(['Off Day']);
    document.getElementById('leaveVal').textContent = count(['Annual Leave', 'Sick Leave']);
    document.getElementById('trainingVal').textContent = count(['Training']);
    document.getElementById('totalVal').textContent = total;

    var html = '';
    html += '<div class="deptCard">';
    html += '<div class="deptBar"></div>';
    html += '<div class="deptHead">';
    html += '<div class="deptIcon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 22h20"/><path d="M3.77 10.77 2 9l2-4.5 1.1.55c.55.28.9.84.9 1.45s.35 1.17.9 1.45L8 8.5l3-6 1.05.53a2 2 0 0 1 1.09 1.52l.72 5.4a2 2 0 0 0 1.09 1.52l4.4 2.2c.42.22.78.55 1.01.96l.6 1.03c.49.88-.06 1.98-1.06 2.1l-1.18.15c-.47.06-.95-.02-1.37-.24L4.29 11.15a2 2 0 0 1-.52-.38Z"/></svg></div>';
    html += '<div class="deptTitle">' + (AR ? 'الأكسبتنس' : 'Acceptance') + '</div>';
    html += '<div class="deptBadge"><span class="deptBadgeLabel">' + (AR ? 'الإجمالي' : 'Total') + '</span><span class="deptBadgeVal">' + total + '</span></div>';
    html += '</div>';
    html += '<div class="shiftStack">';

    GROUPS.forEach(function (group) {
      var list = buckets[group];
      if (!list.length) return;
      var meta = META[group] || META.Other;
      html += '<details class="shiftCard" open style="border:1px solid ' + meta.border + '; background:' + meta.bg + '">';
      html += '<summary class="shiftSummary" style="background:' + meta.bg + '; border-bottom:1px solid ' + meta.summaryBorder + '">';
      html += '<span class="shiftIcon">' + meta.icon + '</span>';
      html += '<span class="shiftLabel" style="color:' + meta.label + '">' + (AR ? meta.ar : meta.en) + '</span>';
      html += '<span class="shiftCount" style="background:' + meta.countBg + '; color:' + meta.label + '">' + list.length + '</span>';
      html += '</summary>';
      html += '<div class="shiftBody">';
      list.forEach(function (item, index) {
        var emp = item.emp;
        var isMe = OWN && emp.id === OWN;
        var displayName = (AR && emp.ar) ? emp.ar : emp.name;
        var suffix = rangeSuffix(emp, day, group);
        html += '<div class="empRow' + (index % 2 ? ' empRowAlt' : '') + (isMe ? ' isMe' : '') + '">';
        html += '<span class="empName">' + esc(displayName) + ' <span class="empId">- ' + esc(emp.id) + '</span>' +
          (isMe ? ' <span class="youBadge">' + (AR ? 'أنت' : 'You') + '</span>' : '') + '</span>';
        html += '<span class="empStatus" style="color:' + meta.label + '">' + esc(item.code) + (suffix ? ' ' + suffix : '') + '</span>';
        html += '</div>';
      });
      html += '</div></details>';
    });

    if (!total) {
      html += '<div class="emptyCard"><div class="emptyIcon">🗓️</div>' + (AR ? 'لا يوجد دوام مسجل لهذا اليوم' : 'No shifts recorded for this date') + '</div>';
    }

    html += '</div></div>';
    root.innerHTML = html;

    if (own) {
      var meRow = root.querySelector('.empRow.isMe');
      if (meRow) meRow.setAttribute('data-group', own.group);
    }
  }

  function goTo(value) {
    current = clampYmd(value);
    render();
  }

  document.getElementById('datePicker').addEventListener('change', function () {
    if (this.value) goTo(this.value);
  });
  document.getElementById('langToggle').addEventListener('click', function () {
    LANG = AR ? 'en' : 'ar';
    AR = LANG === 'ar';
    localStorage.setItem('rosterLang', LANG);
    applyChrome();
    render();
  });

  applyChrome();
  render();

  // Load the shared homepage banner scripts (same photo + switcher as the home page).
  (function loadBannerEnhancements() {
    function siteRoot() {
      if (location.protocol === 'file:') return '';
      var path = location.pathname || '/';
      if (path.indexOf('/roster-site/') !== -1) return '/roster-site';
      if (location.hostname && location.hostname.endsWith('github.io')) {
        var segs = path.split('/').filter(Boolean);
        if (segs.length >= 2 && segs[1] === 'docs') return '/' + segs[0] + '/docs';
        return segs.length ? '/' + segs[0] : '';
      }
      return '';
    }
    var root = location.origin + siteRoot();
    function addScript(src) {
      if (document.querySelector('script[data-local-src="' + src + '"]')) return;
      var s = document.createElement('script');
      s.src = src;
      s.defer = true;
      s.setAttribute('data-local-src', src);
      document.body.appendChild(s);
    }
    addScript(root + '/banner-store.js?v=20261031a');
    addScript(root + '/banner-changer.js?v=20261031a');
    addScript(root + '/bg-texture-shuffle.js?v=20261031a');
  })();
})();
</script>
</body>
</html>
"""


def build_html(data: dict, source_name: str) -> str:
    data_json = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    data_json = data_json.replace("</", "<\\/")
    return (
        HTML_TEMPLATE.replace("__DATA_JSON__", data_json)
        .replace("__SOURCE_NAME__", json.dumps(source_name, ensure_ascii=False))
    )


def download_roster() -> bytes:
    url = (os.environ.get("ACCEPTANCE_ROSTER") or os.environ.get("ACCEPTANCE_ROSTER_URL") or "").strip()
    if not url:
        raise SystemExit("ACCEPTANCE_ROSTER is not set (expected the SharePoint share link).")
    sys.path.insert(0, str(ROOT / "scripts"))
    from download_excel import download_excel  # type: ignore

    return download_excel(url)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", help="Local .xlsx path (skips the ACCEPTANCE_ROSTER download)")
    parser.add_argument("--source-name", help="Source label shown in the page footer")
    parser.add_argument("--out", default=str(OUT_FILE), help="Output HTML path")
    args = parser.parse_args()

    if args.input:
        payload = Path(args.input).read_bytes()
        source_name = args.source_name or Path(args.input).name
    else:
        payload = download_roster()
        source_name = args.source_name or "Acceptance Roster / latest.xlsx"

    import io

    workbook = openpyxl.load_workbook(io.BytesIO(payload), data_only=True)
    data = extract_workbook(workbook)
    html = build_html(data, source_name)

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(html, encoding="utf-8")

    months = ", ".join(sorted(data["months"]))
    employees = sum(len(m["employees"]) for m in data["months"].values())
    print(f"Wrote {out_path} ({len(html):,} chars)")
    print(f"Months: {months}")
    print(f"Employee rows: {employees}")
    print(f"Range: {data['min']} -> {data['max']}")


if __name__ == "__main__":
    main()
