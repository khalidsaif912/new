#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generate Import roster pages under docs/import/ using the same UI as Export.

Key points:
- Reads Excel from env: IMPORT_EXCEL_URL (SharePoint/OneDrive share link is OK).
- DOES NOT touch Export outputs (docs/*), only docs/import/*.
- Treats each month as a sheet, and departments are in the first column (JD codes).
- Uses an editable mapping dict (DEPT_FULL) to show full department names.

Outputs:
- docs/import/index.html         (today, Muscat time)
- docs/import/now/index.html     (alias to today's duty roster page for "Now")
- docs/import/schedules/<id>.json  (per-employee month schedule for Import My Schedule page)
- docs/import/my-schedules/index.html (simple My Schedule viewer)

Note: You can integrate this with your existing My Schedule UI later.
"""

from __future__ import annotations

import os
import re
import json
import hashlib
import argparse
import calendar
import datetime as dt
from pathlib import Path
from typing import Dict, Any, List, Tuple

import requests
import pandas as pd
from html import escape as html_escape


CANONICAL_IMPORT_BASE = "https://khalidsaif912.github.io/new/docs/import/"

LEGACY_ROSTER_SITE_IMPORT_REDIRECT = f"""
  <script>
  (function () {{
    var path = location.pathname || '';
    if (path.indexOf('/roster-site/import') === -1) return;
    var base = '{CANONICAL_IMPORT_BASE}';
    var rest = path.replace(/^.*\\/roster-site\\/import\\/?/, '');
    if (rest) {{
      rest = rest.replace(/\\/?$/, '/');
      location.replace(base + rest + location.search + location.hash);
    }} else {{
      location.replace(base + location.search + location.hash);
    }}
  }})();
  </script>
"""

IMPORT_PWA_HEAD_SNIPPET = """
  <meta name="theme-color" content="#f4354b">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="mobile-web-app-capable" content="yes">
  <script>
  (function () {
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
    var p = siteRoot();
    var base = location.origin + p + (p && p.charAt(p.length - 1) !== '/' ? '/' : '');
    if (!p) base = location.origin + '/';
    var pv = '12';
    var imp = (location.pathname || '').indexOf('/import/') !== -1;
    var man = base + (imp ? 'import/manifest.json' : 'manifest.json') + '?v=' + pv;
    var mlinks = document.querySelectorAll('link[rel="manifest"]');
    var link = mlinks.length ? mlinks[0] : null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'manifest';
      document.head.appendChild(link);
    }
    link.href = man;
    for (var i = 1; i < mlinks.length; i++) mlinks[i].remove();
    var touch = document.querySelector('link[rel="apple-touch-icon"][data-pwa-touch="1"]');
    if (!touch) {
      touch = document.createElement('link');
      touch.rel = 'apple-touch-icon';
      touch.setAttribute('data-pwa-touch', '1');
      document.head.appendChild(touch);
    }
    touch.href = base + 'assets/icons/icon-192.png';
  })();
  </script>
"""


# =========================
# CONFIG
# =========================
MUSCAT_UTC_OFFSET_HOURS = 4

# Department code -> full name (EDIT THIS)
DEPT_FULL: Dict[str, str] = {
    "SUPV": "Supervisors",
    "FLTI": "Flight Dispatch (Import)",
    "FLTE": "Flight Dispatch (Export)",
    "CHKR": "Import Checkers",
    "OPTR": "Import Operators",
    "DOCS": "Documentation",
    "RELC": "Release Control",
}

# If you want Arabic display names too, you can extend this dict later.
# DEPT_FULL_AR = {...}


# =========================
# HELPERS
# =========================
def muscat_today() -> dt.date:
    now_utc = dt.datetime.utcnow().replace(tzinfo=dt.timezone.utc)
    muscat = now_utc.astimezone(dt.timezone(dt.timedelta(hours=MUSCAT_UTC_OFFSET_HOURS)))
    return muscat.date()


def download_excel(url: str) -> bytes:
    # Allow SharePoint links, the existing Export script already supports share links,
    # but we keep it simple here.
    r = requests.get(url, timeout=90)
    r.raise_for_status()
    data = r.content
    if not data.startswith(b"PK"):
        raise ValueError("Downloaded content does not look like an XLSX (missing PK header).")
    return data


def find_sheet_for_date(xlsx_path: str, d: dt.date) -> str:
    xls = pd.ExcelFile(xlsx_path)
    target = d.strftime("%B %Y").upper()
    # Try exact match
    for s in xls.sheet_names:
        if s.strip().upper() == target:
            return s
    # Try contains month/year
    for s in xls.sheet_names:
        if d.strftime("%B").upper() in s.upper() and str(d.year) in s:
            return s
    # Fallback to first sheet
    return xls.sheet_names[0]


def shift_bucket(code: str) -> Tuple[str, str, str, str, str]:
    """Return (bucket, icon, accent, bg, text_color)"""
    s = (code or "").strip().upper()
    if not s:
        return ("Other", "•", "#64748b", "#f1f5f9", "#334155")

    if s in {"O", "OFF", "OFFDAY", "OFF DAY"}:
        return ("Off Day", "🛋️", "#6366f1", "#e0e7ff", "#3730a3")
    if s.startswith(("MN", "ME")):
        return ("Morning", "☀️", "#f59e0b", "#fef3c7", "#92400e")
    if s.startswith(("AN", "AE")):
        return ("Afternoon", "🌤️", "#f97316", "#ffedd5", "#9a3412")
    if s.startswith(("NN", "NE")):
        return ("Night", "🌙", "#8b5cf6", "#ede9fe", "#5b21b6")
    if s.startswith(("ST", "SB")):
        return ("Standby", "🧍", "#9e9e9e", "#f0f0f0", "#555555")
    if "SICK" in s or s.startswith(("SL",)):
        return ("Sick Leave", "🤒", "#ef4444", "#fee2e2", "#991b1b")
    if s in {"LV"} or "ANNUAL" in s or s.startswith(("AL",)):
        return ("Annual Leave", "✈️", "#10b981", "#d1fae5", "#065f46")
    if "TR" in s or "TRAIN" in s:
        return ("Training", "🎓", "#0ea5e9", "#e0f2fe", "#075985")
    return ("Other", "•", "#64748b", "#f1f5f9", "#334155")


def _norm_cell(val: Any) -> str:
    return str(val or "").strip()


def range_suffix_for_day(day: int, daynum_to_raw: dict, code_key: str) -> str:
    """If day is part of a contiguous leave/training block, return (FROM x TO y)."""
    sorted_days = sorted(daynum_to_raw.keys())
    if day not in sorted_days:
        return ""

    up_key = _norm_cell(code_key).upper()
    acceptable_codes: List[str] = []
    if up_key in ["AL", "LV"] or "ANNUAL" in up_key:
        acceptable_codes = ["AL", "LV", "ANNUAL LEAVE"]
    elif up_key == "SL" or "SICK" in up_key:
        acceptable_codes = ["SL", "SICK LEAVE"]
    elif up_key == "TR" or "TRAINING" in up_key:
        acceptable_codes = ["TR", "TRAINING"]
    else:
        acceptable_codes = [up_key]

    def is_same_type(val: str) -> bool:
        if not val:
            return False
        val_upper = val.upper()
        return any(code in val_upper or val_upper == code for code in acceptable_codes)

    start = day
    end = day
    current = day - 1
    while current in sorted_days:
        val = _norm_cell(daynum_to_raw.get(current, ""))
        if is_same_type(val):
            start = current
            current -= 1
        else:
            break
    current = day + 1
    while current in sorted_days:
        val = _norm_cell(daynum_to_raw.get(current, ""))
        if is_same_type(val):
            end = current
            current += 1
        else:
            break

    if start == end:
        return ""
    return (
        f"(<span style='font-size:0.75em;opacity:0.8;'>FROM</span> {start} "
        f"<span style='font-size:0.75em;opacity:0.8;'>TO</span> {end})"
    )


CAPTURE_DOM_HTML = """
<div id="captureBusy" class="captureBusy">Preparing image...</div>
<div id="captureSheet" class="captureSheet" aria-hidden="true">
  <div class="captureSheetCard">
    <div class="captureSheetTitle">Share or save image</div>
    <img id="capturePreview" class="capturePreviewImg" alt="Snapshot preview" />
    <div class="captureSheetActions">
      <button id="captureShareBtn" class="captureSheetBtn captureShareBtn" type="button">Share</button>
      <button id="captureSaveBtn" class="captureSheetBtn captureSaveBtn" type="button">Save</button>
    </div>
    <button id="captureCancelBtn" class="captureSheetBtn captureCancelBtn" type="button">Cancel</button>
  </div>
</div>
"""


def parse_month_sheet(xlsx_path: str, sheet_name: str) -> Dict[str, Any]:
    df = pd.read_excel(xlsx_path, sheet_name=sheet_name, header=None)

    # Find day header row
    day_row = None
    for i in range(min(60, len(df))):
        row = df.iloc[i].astype(str).str.upper().tolist()
        if any("SUN" == str(c).strip() for c in row) and any("MON" == str(c).strip() for c in row) and any("SAT" == str(c).strip() for c in row):
            day_row = i
            break
    if day_row is None:
        raise ValueError("Could not find day header row (SUN/MON/..).")

    # Find JD header row and column dynamically (JD col may not be col 0)
    header_row = day_row + 1
    jd_col = None
    for j in range(day_row, min(day_row + 6, len(df))):
        for c in range(df.shape[1]):
            if str(df.iloc[j, c]).strip().upper() == "JD":
                header_row = j
                jd_col = c
                break
        if jd_col is not None:
            break
    if jd_col is None:
        jd_col = 0  # fallback

    name_col = jd_col + 1
    sn_col = jd_col + 2

    # Detect date columns (ints 1..31)
    date_cols: Dict[int, int] = {}
    for c in range(df.shape[1]):
        v = df.iloc[header_row, c]
        if isinstance(v, (int, float)) and not pd.isna(v) and float(v).is_integer():
            day = int(v)
            if 1 <= day <= 31:
                date_cols[day] = c
    if not date_cols:
        raise ValueError("Could not detect date columns (1..31).")

    # Employees start after header_row
    employees: List[Dict[str, Any]] = []
    for r in range(header_row + 1, len(df)):
        dept = df.iloc[r, jd_col]
        name = df.iloc[r, name_col] if df.shape[1] > name_col else None
        sn = df.iloc[r, sn_col] if df.shape[1] > sn_col else None

        # skip empty
        if pd.isna(dept) and pd.isna(name) and pd.isna(sn):
            continue

        # skip staffing rows like "17 | MORNING | ..."
        if isinstance(name, str) and name.strip().upper() == "MORNING" and (pd.isna(sn) or str(sn).strip() == ""):
            continue

        if pd.isna(name) or str(name).strip() == "" or pd.isna(sn) or str(sn).strip() == "":
            continue

        dept_s = str(dept).strip() if not pd.isna(dept) else ""
        if not dept_s or re.fullmatch(r"\d+", dept_s):
            continue

        emp_id = str(int(sn)) if isinstance(sn, (int, float)) and not pd.isna(sn) else str(sn).strip()

        shifts: Dict[int, str] = {}
        for day, c in date_cols.items():
            cell = df.iloc[r, c] if c < df.shape[1] else None
            if pd.isna(cell):
                continue
            s = str(cell).strip()
            if s:
                shifts[day] = s

        employees.append({
            "dept_code": dept_s,
            "dept_name": DEPT_FULL.get(dept_s, dept_s),
            "name": str(name).strip(),
            "id": emp_id,
            "shifts": shifts,
        })

    # Parse month/year from sheet name
    m = re.search(r"(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\s+(\d{4})", sheet_name.upper())
    if m:
        month_name = m.group(1).title()
        year = int(m.group(2))
        month_num = ["January","February","March","April","May","June","July","August","September","October","November","December"].index(month_name) + 1
    else:
        # fallback to today
        t = muscat_today()
        year, month_num, month_name = t.year, t.month, t.strftime("%B")

    return {"sheet": sheet_name, "year": year, "month": month_num, "month_name": month_name, "employees": employees, "date_cols": date_cols}


def load_export_ui_template(repo_root: Path) -> Tuple[str, str]:
    """
    Reuse Export roster CSS and the main inline script bundle from docs/index.html.
    Skips the small PWA <head> script; takes the largest inline <script> block (roster UX).
    """
    candidates = [
        repo_root / "docs" / "index.html",
        repo_root / "index.html",
    ]
    for c in candidates:
        if c.exists():
            html = c.read_text(encoding="utf-8", errors="ignore")
            style_m = re.search(r"<style>(.*?)</style>", html, re.DOTALL)
            inline_scripts = re.findall(
                r"<script(?![^>]*\ssrc=)[^>]*>(.*?)</script>",
                html,
                flags=re.DOTALL | re.IGNORECASE,
            )
            if style_m and inline_scripts:
                return style_m.group(1), max(inline_scripts, key=len)

    style = "body{font-family:system-ui;background:#eef1f7;color:#0f172a}"
    return style, ""


_EXPORT_WELCOME_CHIP_RE = re.compile(
    r"\r?\n// ?═+\r?\n"
    r"// ?رسالة الترحيب[^\r\n]+\r?\n"
    r"// ?═+\r?\n"
    r"\(function\(\) \{[\s\S]*?\}\)\(\);\s*\r?\n"
    r"(?=function goToMySchedule)",
)


def sanitize_export_script_for_import(script: str) -> str:
    """
    Import uses the same floating UI as export via change-alert.js (shift + absence in one card).
    Do not load absence-alert.js here — it would duplicate the absence FAB.
    Strip the export-only welcome chip IIFE (exportSavedEmpId + /schedules/); import pages use
    showWelcomeChip with importSavedEmpId + /import/schedules/ in the appended override block.
    """
    script = re.sub(r"addScript\(root \+ ['/\\\"]\/absence-alert\.js['/\\\"]\);\s*", "", script)
    script, n = _EXPORT_WELCOME_CHIP_RE.subn("\n", script, count=1)
    if not n:
        # Older templates: drop by unique getExportEmpId marker
        script = re.sub(
            r"\r?\n\(function\(\) \{\s*function getExportEmpId\(\) \{[\s\S]*?\}\)\(\);\s*\r?\n(?=function goToMySchedule)",
            "\n",
            script,
            count=1,
        )
    return script


def prepare_export_script_for_import(script: str) -> str:
    """Adapt export roster JS for /import/ paths and schedules."""
    script = sanitize_export_script_for_import(script)
    subs = [
        ("getSiteRootUrl() + '/schedules/'", "getSiteRootUrl() + '/import/schedules/'"),
        (
            "var pathMatch = (location.pathname || '').match(/\\/date\\/(\\d{4}-\\d{2}-\\d{2})\\//);",
            "var pathMatch = (location.pathname || '').match(/\\/(?:import\\/date|import)\\/(\\d{4}-\\d{2}-\\d{2})\\//);",
        ),
        (
            "if (pathMatch) return pathMatch[1];\n    var now = new Date();",
            "if (pathMatch) return pathMatch[1];\n    var picker = document.getElementById('datePicker');\n    if (picker && picker.value) return picker.value;\n    var now = new Date();",
        ),
        (
            "path.match(/\\/date\\/(\\d{4})-(\\d{2})-(\\d{2})\\//)",
            "path.match(/\\/(?:import\\/date|import)\\/(\\d{4})-(\\d{2})-(\\d{2})\\//)",
        ),
        (
            "var isRootLike = !path.includes('/date/');",
            "var isRootLike = !path.includes('/date/') && !path.match(/\\/import\\/\\d{4}-\\d{2}-\\d{2}\\//);",
        ),
        (
            ".replace(/\\/date\\/\\d{4}-\\d{2}-\\d{2}\\/.*$/, '/')\n      .replace(/\\/now\\/",
            ".replace(/\\/date\\/\\d{4}-\\d{2}-\\d{2}\\/.*$/, '/')\n      .replace(/\\/\\d{4}-\\d{2}-\\d{2}\\/.*$/, '/')\n      .replace(/\\/now\\/",
        ),
        (
            "var m = (location.pathname || '').match(/\\/date\\/(\\d{4}-\\d{2}-\\d{2})\\//);",
            "var m = (location.pathname || '').match(/\\/(?:import\\/date|import)\\/(\\d{4}-\\d{2}-\\d{2})\\//);",
        ),
    ]
    for old, new in subs:
        script = script.replace(old, new)

    # Import schedules use { month, days: [{day, code}] } not export schedules{} shape.
    flatten_old = """  function flattenFutureShifts(data, fromIso) {
    var out = [];
    if (!data || !data.schedules) return out;"""
    flatten_new = """  function flattenFutureShifts(data, fromIso) {
    var out = [];
    if (!data) return out;
    if (Array.isArray(data.days) && data.month) {
      var mp = String(data.month).match(/^(\\d{4})-(\\d{2})$/);
      if (mp) {
        var y = mp[1], mo = mp[2];
        data.days.forEach(function(d) {
          if (!d || !d.day) return;
          var iso = y + '-' + mo + '-' + String(d.day).padStart(2, '0');
          if (iso >= fromIso) out.push({ date: iso, shift_code: String(d.code || '').trim() });
        });
        out.sort(function(a, b) { return String(a.date).localeCompare(String(b.date)); });
        return out.slice(0, 5);
      }
    }
    if (!data.schedules) return out;"""
    if flatten_old in script:
        script = script.replace(flatten_old, flatten_new, 1)

    schedules_loop_old = """      rows.forEach(function(r) {
        var d = String(r && r.date || '');
        if (!d) return;
        if (d >= fromIso) out.push(r);
      });"""
    schedules_loop_new = """      rows.forEach(function(r) {
        if (!r) return;
        var iso = String(r.date || '').trim();
        if (!iso && r.day != null && r.day !== '') {
          iso = monthKey + '-' + String(r.day).padStart(2, '0');
        }
        if (!iso || iso < fromIso) return;
        out.push({ date: iso, shift_code: String(r.shift_code || r.code || '').trim() });
      });"""
    if schedules_loop_old in script:
        script = script.replace(schedules_loop_old, schedules_loop_new)

    script = script.replace("titleEyebrow:'Export'", "titleEyebrow:'Import'")
    script = script.replace("titleEyebrow:'الصادر'", "titleEyebrow:'الوارد'")

    script += """

// Import roster catalog: only months/dates with a published roster file (import_meta.json).
window.importDateIsPublished = function(iso) {
  if (!iso) return false;
  var dates = window.__importPublishedDates;
  if (Array.isArray(dates) && dates.length) return dates.indexOf(iso) >= 0;
  var months = window.__importAvailableMonths;
  if (Array.isArray(months) && months.length) return months.indexOf(String(iso).slice(0, 7)) >= 0;
  return true;
};

(function applyImportDateRange() {
  var picker = document.getElementById('datePicker');
  if (!picker) return;
  function base() {
    if (typeof _importBase === 'function') return _importBase();
    var path = window.location.pathname || '/';
    return path
      .replace(/\\/date\\/\\d{4}-\\d{2}-\\d{2}\\/.*$/, '/')
      .replace(/\\/\\d{4}-\\d{2}-\\d{2}\\/.*$/, '/')
      .replace(/\\/now\\/.*$/, '/')
      .replace(/\\/+$/, '');
  }
  fetch(base() + '/import_meta.json', { cache: 'no-store' })
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(meta) {
      if (!meta) return;
      if (meta.date_min) picker.min = meta.date_min;
      if (meta.date_max) picker.max = meta.date_max;
      if (Array.isArray(meta.published_dates)) window.__importPublishedDates = meta.published_dates.slice();
      if (Array.isArray(meta.available_months) && meta.available_months.length) {
        window.__importAvailableMonths = meta.available_months.slice();
        window._avail = meta.available_months.slice();
      }
    })
    .catch(function() {});
})();

(function guardImportDateChange() {
  var picker = document.getElementById('datePicker');
  if (!picker || picker.dataset.importGuard === '1') return;
  picker.dataset.importGuard = '1';
  picker.addEventListener('change', function(ev) {
    if (!picker.value) return;
    if (typeof importDateIsPublished === 'function' && !importDateIsPublished(picker.value)) {
      ev.stopImmediatePropagation();
      var ar = (document.documentElement.lang || '') === 'ar';
      alert(ar ? 'لا يوجد ملف روستر منشور لهذا التاريخ.' : 'No published roster file for this date.');
      var m = (location.pathname || '').match(/(\\d{4}-\\d{2}-\\d{2})/);
      if (m) picker.value = m[1];
      return false;
    }
  }, true);
})();
"""

    return script


SOURCE_NAME_RE = re.compile(r'id="importSourceName"[^>]*>([^<]+)<', re.IGNORECASE)
SOURCE_XLSX_RE = re.compile(r"Source:\s*<strong[^>]*>([^<]+\.xlsx)\s*</strong>", re.IGNORECASE)
MIN_ROSTER_DAYS = 15


def _read_page_roster_source(html: str) -> str:
    m = SOURCE_NAME_RE.search(html)
    if m:
        return m.group(1).strip()
    m = SOURCE_XLSX_RE.search(html)
    if m:
        return m.group(1).strip()
    return ""


def _month_has_roster_file(day_count: int, source: str) -> bool:
    if day_count < MIN_ROSTER_DAYS:
        return False
    src = (source or "").strip()
    if not src:
        return False
    low = src.lower()
    if low.endswith(".xlsx") or "roster" in low:
        return True
    # Excel sheet tab name (e.g. Sheet1) — require nearly full month on disk.
    if low.startswith("sheet") and day_count >= 28:
        return True
    return day_count >= 28


def discover_import_roster_catalog(import_root: Path) -> Dict[str, Any]:
    """Months/dates that have a published Import roster (source file + enough day pages)."""
    dates_by_month: Dict[str, List[str]] = {}
    for iso in sorted(set(_discover_import_dates(import_root))):
        dates_by_month.setdefault(iso[:7], []).append(iso)

    available_months: List[str] = []
    month_sources: Dict[str, str] = {}
    published_dates: List[str] = []

    for ym in sorted(dates_by_month.keys()):
        dates = sorted(dates_by_month[ym])
        sample = import_root / "date" / f"{dates[len(dates) // 2]}" / "index.html"
        if not sample.is_file():
            sample = import_root / dates[0] / "index.html"
        source = ""
        if sample.is_file():
            try:
                source = _read_page_roster_source(sample.read_text(encoding="utf-8"))
            except OSError:
                source = ""
        if not _month_has_roster_file(len(dates), source):
            continue
        available_months.append(ym)
        month_sources[ym] = source
        published_dates.extend(dates)

    if not published_dates:
        today = muscat_today().isoformat()
        return {
            "available_months": [],
            "month_sources": {},
            "published_dates": [],
            "date_min": today,
            "date_max": today,
        }

    return {
        "available_months": available_months,
        "month_sources": month_sources,
        "published_dates": published_dates,
        "date_min": published_dates[0],
        "date_max": published_dates[-1],
    }


def discover_import_date_range(import_root: Path) -> Tuple[str, str]:
    """Earliest/latest ISO among published roster dates."""
    catalog = discover_import_roster_catalog(import_root)
    return catalog["date_min"], catalog["date_max"]


def discover_import_months(import_root: Path) -> List[str]:
    """YYYY-MM months that have a published Import roster file."""
    return list(discover_import_roster_catalog(import_root)["available_months"])


def _discover_import_dates(import_root: Path) -> List[str]:
    iso_re = re.compile(r"^(\d{4}-\d{2}-\d{2})$")
    found: List[str] = []
    for base in (import_root / "date", import_root):
        if not base.is_dir():
            continue
        for child in base.iterdir():
            if not child.is_dir():
                continue
            m = iso_re.match(child.name)
            if m and (child / "index.html").is_file():
                found.append(m.group(1))
    return found


def build_duty_html(
    style: str,
    script: str,
    parsed: Dict[str, Any],
    date_obj: dt.date,
    repo_base_path: str,
    min_date: str = "",
    max_date: str = "",
) -> str:
    day = date_obj.day
    date_label = date_obj.strftime("%d %B %Y")
    date_iso = date_obj.strftime("%Y-%m-%d")
    if not min_date:
        min_date = f"{parsed['year']}-{parsed['month']:02d}-01"
    if not max_date:
        _, days_in_month = calendar.monthrange(parsed["year"], parsed["month"])
        max_date = f"{parsed['year']}-{parsed['month']:02d}-{days_in_month:02d}"

    # dept -> bucket -> rows
    dept_map: Dict[str, Dict[str, Dict[str, Any]]] = {}
    total_emp = 0

    for emp in parsed["employees"]:
        code = emp["shifts"].get(day, "")
        if not code:
            continue
        total_emp += 1
        dept = emp["dept_name"]
        bucket, icon, accent, bg, text = shift_bucket(code)
        dept_map.setdefault(dept, {}).setdefault(bucket, {"icon": icon, "accent": accent, "bg": bg, "text": text, "rows": []})
        dept_map[dept][bucket]["rows"].append(
            {"name": emp["name"], "id": emp["id"], "code": code, "shifts": emp["shifts"]}
        )

    # Strict Import department order requested by product owner.
    import_order = [
        "supervisors",
        "documentation",
        "import checkers",
        "release control",
        "import operators",
        "flight dispatch (import)",
        "flight dispatch (export)",
    ]
    order_idx = {name: i for i, name in enumerate(import_order)}

    def dept_sort_key(item):
        name = (item[0] or "").strip().lower()
        return (order_idx.get(name, 10_000), name)

    depts = sorted(dept_map.items(), key=dept_sort_key)
    dept_count = len(depts)

    summary = f"""
  <div class="summaryBar">
    <div class="summaryChip">
      <div class="chipVal">{total_emp}</div>
      <div class="chipLabel" data-key="employees">Employees</div>
    </div>
    <div class="summaryChip">
      <div class="chipVal" style="color:#059669;">{dept_count}</div>
      <div class="chipLabel" data-key="departments">Departments</div>
    </div>
    <a href="{{BASE}}/my-schedules/index.html" id="myScheduleBtn" class="summaryChip" style="cursor:pointer;text-decoration:none;" onclick="goToMySchedule(event)">
      <div class="chipVal">🗓️</div>
      <div class="chipLabel" data-key="mySchedule">My Schedule</div>
    </a>
    <a href="#" id="exportBtn" class="summaryChip" style="cursor:pointer;text-decoration:none;" onclick="goToExport(event)">
      <div class="chipVal"><img class="chipIcon flightSwitchIcon" alt="Export" src="" /></div>
      <div class="chipLabel" data-key="exportRoster">Export</div>
    </a>
    <a href="#" id="welcomeChip" class="summaryChip welcomeChip" onclick="goToMySchedule(event)" title="Go to your schedule">
      <div class="chipVal"><span class="waveHand">👋</span></div>
      <div class="chipLabel" id="welcomeName"></div>
    </a>
  </div>
"""

    palette = ["#2563eb","#0891b2","#059669","#dc2626","#7c3aed","#f59e0b","#0ea5e9","#a855f7"]
    order = ["Morning","Afternoon","Night","Standby","Off Day","Annual Leave","Sick Leave","Training","Other"]

    cards = []
    for i, (dept, buckets) in enumerate(depts):
        color = palette[i % len(palette)]
        total_in_dept = sum(len(v["rows"]) for v in buckets.values())
        shift_blocks = []
        for key in order:
            if key not in buckets:
                continue
            info = buckets[key]
            rows = info["rows"]
            emp_rows = []
            for idx, row in enumerate(rows):
                name, empid, code = row["name"], row["id"], row["code"]
                label = f"{name} - {empid}"
                suffix = range_suffix_for_day(day, row["shifts"], code)
                status_html = f"{code} {suffix}" if suffix else code
                name_attr = html_escape(label, quote=True)
                alt = " empRowAlt" if idx % 2 == 1 else ""
                emp_rows.append(f"""<div class="empRow{alt}" data-emp-name="{name_attr}" role="button" tabindex="0">
       <span class="empName">{label}</span>
       <span class="empStatus" style="color:{info['text']};">{status_html}</span>
     </div>""")
            shift_blocks.append(f"""
    <details class="shiftCard" data-shift="{key}" style="border:1px solid {info['accent']}44; background:{info['bg']}">
      <summary class="shiftSummary" style="background:{info['bg']}; border-bottom:1px solid {info['accent']}33;">
        <span class="shiftIcon">{info['icon']}</span>
        <span class="shiftLabel" style="color:{info['text']};">{key}</span>
        <span class="shiftCount" style="background:{info['accent']}22; color:{info['text']};">{len(rows)}</span>
      </summary>
      <div class="shiftBody">
        {''.join(emp_rows)}
      </div>
    </details>
""")
        cards.append(f"""
    <div class="deptCard">
      <div style="height:5px; background:linear-gradient(to right, {color}, {color}cc);"></div>

      <div class="deptHead" style="border-bottom:2px solid {color}18;">
        <div class="deptIcon" style="background:{color}15; color:{color};">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 21h18M3 10h18M5 21V10l7-6 7 6v11"/>
            <rect x="9" y="14" width="2" height="3"/>
            <rect x="13" y="14" width="2" height="3"/>
          </svg>
        </div>
        <div class="deptTitle">{dept}</div>
        <div class="deptBadge" style="background:{color}15; color:{color}; border:1px solid {color}18;">
          <span style="font-size:10px;opacity:.7;display:block;margin-bottom:1px;text-transform:uppercase;letter-spacing:.5px;">Total</span>
          <span style="font-size:17px;font-weight:900;">{total_in_dept}</span>
        </div>
      </div>

      <div class="shiftStack">
        {''.join(shift_blocks)}
      </div>
    </div>
""")

    footer = f"""
  <div class="footer">
    <strong style="color:#475569;font-size:13px;">Last Updated:</strong> <strong id="importLastUpdated" style="color:#1e40af;">{dt.datetime.now().strftime('%d%b%Y / %H:%M').upper()}</strong>
    <br>Total: <strong id="importTotalEmployees">{total_emp} employees</strong>
     &nbsp;·&nbsp; Source: <strong id="importSourceName">{parsed.get('source_filename') or parsed['sheet']}</strong>
  </div>
"""

    # Use same language toggle mechanism, but update base paths for Import
    # repo_base_path example: "/roster-site/import" or "/import" depending on hosting.
    # We'll compute BASE in JS at runtime to work in both local + GitHub Pages.
    html = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="x-apple-disable-message-reformatting">
  <title>Import Duty Roster</title>
  {LEGACY_ROSTER_SITE_IMPORT_REDIRECT}
  <style>{style}</style>
  <style>
    html, body {{ min-height: 100%; width:100%; overflow-x:hidden; }}
    body {{ min-height: 100dvh; }}
    .wrap {{
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      padding-bottom: 28px;
    }}
    .importBottom {{
      margin-top: auto;
      padding-top: 14px;
    }}
    .importBottom .quickActions {{
      margin-bottom: 6px;
      display: flex;
      justify-content: center;
      gap: 10px;
      flex-wrap: wrap;
    }}
    .footer {{
      margin-top: 0;
      padding: 10px 12px;
      background: rgba(238,241,247,.96);
      border-top: 1px solid rgba(148,163,184,.25);
    }}
    .summaryBar .summaryChip {{
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
    }}
    .summaryBar .summaryChip .chipVal {{
      height: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }}
    .summaryBar .summaryChip .chipLabel {{
      margin-top: 4px;
      line-height: 1.1;
    }}
    .summaryChip .chipIcon {{
      width: 26px;
      height: 26px;
      object-fit: contain;
      display: block;
      margin: 0 auto;
    }}
    .welcomeChip {{
      display: none;
      text-decoration: none;
      cursor: pointer;
    }}
    .welcomeChip.visible {{
      display: flex;
    }}
    .welcomeChip .chipLabel {{
      max-width: 88px;
      overflow: hidden;
      text-overflow: ellipsis;
    }}
    .waveHand {{
      display: inline-block;
      transform-origin: 70% 70%;
      animation: waveHand 1.8s ease-in-out infinite;
    }}
    @keyframes waveHand {{
      0%, 50%, 100% {{ transform: rotate(0deg); }}
      10% {{ transform: rotate(16deg); }}
      20% {{ transform: rotate(-10deg); }}
      30% {{ transform: rotate(16deg); }}
      40% {{ transform: rotate(-6deg); }}
    }}
  </style>{IMPORT_PWA_HEAD_SNIPPET}
</head>
<body>
<div class="wrap">

  <div class="header">
    <button class="langToggle" id="langToggle" onclick="toggleLang()">ع</button>
    <h1 id="pageTitle" class="bannerTitle">
      <span class="bannerTitleEyebrow" id="pageTitleEyebrow">Import</span>
      <span class="bannerTitleMain" id="pageTitleMain">Duty Roster</span>
    </h1>
    <div class="datePickerWrapper">
      <span class="dateTag" id="dateTag">📅 {date_label}</span>
      <input id="datePicker" type="date" value="{date_iso}" min="{min_date}" max="{max_date}" aria-label="Select roster date" title="Pick day" />
    </div>
  </div>

  {summary}

  {''.join(cards)}

  <div class="importBottom">
    <div class="quickActions">
      <a class="btn" id="ctaBtn" href="{{BASE}}/now/">📋 Full Roster</a>
      <a class="btn" id="compareBtn" href="#" onclick="goToRosterDiff(event)">📊 Compare</a>
    </div>
    {footer}
  </div>

</div>

{CAPTURE_DOM_HTML}
<script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>

<script>
// Hard-guaranteed import page behavior (independent from other scripts).
(function() {{
  var IMPORT_DEPT_ORDER = [
    'supervisors',
    'documentation',
    'import checkers',
    'release control',
    'import operators',
    'flight dispatch (import)',
    'flight dispatch (export)'
  ];

  function deptTitleNorm(card) {{
    var t = card.querySelector('.deptTitle');
    return (t && t.textContent ? t.textContent : '').trim().toLowerCase();
  }}

  function findDeptCardByName(deptName) {{
    var target = String(deptName || '').trim().toLowerCase();
    if (!target) return null;
    var cards = Array.from(document.querySelectorAll('.deptCard'));
    return cards.find(function(c) {{ return deptTitleNorm(c) === target; }}) || null;
  }}

  function pinDepartmentCardFirst(deptName) {{
    var card = findDeptCardByName(deptName);
    if (!card) return false;
    var cards = Array.from(document.querySelectorAll('.deptCard'));
    if (!cards.length || cards[0] === card) return true;
    var parent = card.parentElement;
    if (parent) parent.insertBefore(card, cards[0]);
    return true;
  }}

  function reorderImportDepartments(preferredDept) {{
    var cards = Array.from(document.querySelectorAll('.deptCard'));
    if (!cards.length) return;
    var parent = cards[0].parentElement;
    if (!parent) return;
    var bottom = document.querySelector('.importBottom');
    var preferred = String(preferredDept || '').trim().toLowerCase();

    if (preferred) {{
      pinDepartmentCardFirst(preferred);
      cards = Array.from(document.querySelectorAll('.deptCard'));
    }}

    var order = IMPORT_DEPT_ORDER.slice();
    if (preferred && order.indexOf(preferred) === -1) {{
      order.unshift(preferred);
    }}

    order.forEach(function(dep) {{
      if (preferred && dep === preferred) return;
      var card = cards.find(function(c) {{ return deptTitleNorm(c) === dep; }});
      if (card) {{
        if (bottom) parent.insertBefore(card, bottom);
        else parent.appendChild(card);
      }}
    }});

    if (preferred) pinDepartmentCardFirst(preferred);
  }}

  function applySavedEmployeeDepartmentFirst() {{
    var empId = localStorage.getItem('importSavedEmpId');
    if (!empId) {{
      reorderImportDepartments();
      return;
    }}
    var base = (function() {{
      if (typeof getSiteRootUrl === 'function') return getSiteRootUrl();
      var p = location.pathname || '';
      if (p.indexOf('/roster-site/') !== -1) return location.origin + '/roster-site';
      if (location.hostname && location.hostname.endsWith('github.io')) {{
        var segs = p.split('/').filter(Boolean);
        if (segs.length >= 2 && segs[1] === 'docs') return location.origin + '/' + segs[0] + '/docs';
        return location.origin + (segs.length ? '/' + segs[0] : '');
      }}
      return location.origin + '/';
    }})();
    fetch(base + '/import/schedules/' + encodeURIComponent(empId) + '.json')
      .then(function(r) {{ return r.ok ? r.json() : null; }})
      .then(function(d) {{
        if (d && d.department) reorderImportDepartments(d.department);
        else reorderImportDepartments();
      }})
      .catch(function() {{ reorderImportDepartments(); }});
  }}

  function repartitionLeaveRowsInDeptCards() {{
    document.querySelectorAll('.deptCard').forEach(function(card) {{
      var other = card.querySelector('details.shiftCard[data-shift="Other"]');
      if (!other) return;
      var toMove = [];
      other.querySelectorAll('.empRow').forEach(function(row) {{
        var st = row.querySelector('.empStatus');
        if (!st) return;
        var raw = (st.textContent || '').trim().toUpperCase();
        var code = raw.split(/\\s+/)[0];
        if (code === 'LV' || code === 'AL' || raw.indexOf('ANNUAL') >= 0) toMove.push(row);
      }});
      if (!toMove.length) return;
      var annual = card.querySelector('details.shiftCard[data-shift="Annual Leave"]');
      if (!annual) {{
        var template = card.querySelector('details.shiftCard[data-shift="Off Day"]');
        if (!template) return;
        annual = template.cloneNode(true);
        annual.setAttribute('data-shift', 'Annual Leave');
        annual.style.border = '1px solid #10b98144';
        annual.style.background = '#d1fae5';
        var sum = annual.querySelector('.shiftSummary');
        if (sum) {{ sum.style.background = '#d1fae5'; sum.style.borderBottom = '1px solid #10b98133'; }}
        var label = annual.querySelector('.shiftLabel');
        if (label) {{ label.textContent = 'Annual Leave'; label.style.color = '#065f46'; }}
        var icon = annual.querySelector('.shiftIcon');
        if (icon) icon.textContent = '✈️';
        var emptyBody = annual.querySelector('.shiftBody');
        if (emptyBody) emptyBody.innerHTML = '';
        other.parentNode.insertBefore(annual, other);
      }}
      var body = annual.querySelector('.shiftBody');
      toMove.forEach(function(row) {{ body.appendChild(row); }});
      var oc = other.querySelector('.shiftCount');
      var left = other.querySelectorAll('.empRow').length;
      if (oc) oc.textContent = String(left);
      if (!left) other.remove();
      var ac = annual.querySelector('.shiftCount');
      if (ac) ac.textContent = String(annual.querySelectorAll('.empRow').length);
    }});
  }}

  // Match Export roster logic (Muscat UTC+4): Night 21:00–04:59, Afternoon from 13:00, else Morning.
  function getImportCurrentShiftGroup() {{
    var now = new Date();
    var muscat = new Date(now.getTime() + (4 * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
    var t = muscat.getHours() * 60 + muscat.getMinutes();
    if (t >= 21 * 60 || t < 5 * 60) return 'Night';
    if (t >= 13 * 60) return 'Afternoon';
    return 'Morning';
  }}

  function syncImportShiftDetailsOpen() {{
    var shift = getImportCurrentShiftGroup();
    document.querySelectorAll('details.shiftCard').forEach(function(d) {{
      d.removeAttribute('open');
    }});
    document.querySelectorAll('details.shiftCard[data-shift="' + shift + '"]').forEach(function(d) {{
      d.setAttribute('open', '');
    }});
  }}

  window.reorderImportDepartments = reorderImportDepartments;
  window.applySavedEmployeeDepartmentFirst = applySavedEmployeeDepartmentFirst;

  repartitionLeaveRowsInDeptCards();
  applySavedEmployeeDepartmentFirst();
  syncImportShiftDetailsOpen();

  window.addEventListener('storage', function(e) {{
    if (e.key === 'importSavedEmpId' && typeof applySavedEmployeeDepartmentFirst === 'function') {{
      applySavedEmployeeDepartmentFirst();
    }}
  }});

  // Keep footer "Last Updated" fresh on page load.
  var lastUpdatedEl = document.getElementById('importLastUpdated');
  if (lastUpdatedEl) {{
    var now = new Date();
    var muscat = new Date(now.getTime() + (4 * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
    var day = String(muscat.getDate()).padStart(2, '0');
    var mon = muscat.toLocaleString('en-US', {{ month: 'short' }}).toUpperCase();
    var year = muscat.getFullYear();
    var hh = String(muscat.getHours()).padStart(2, '0');
    var mm = String(muscat.getMinutes()).padStart(2, '0');
    lastUpdatedEl.textContent = (day + mon + year + ' / ' + hh + ':' + mm).toUpperCase();
  }}
}})();
</script>

<script>
{script}

/* ===== Import path overrides ===== */
function getSiteRootPath() {{
  var path = location.pathname || '/';
  if (path.includes('/roster-site/')) return '/roster-site';
  if (location.hostname && location.hostname.endsWith('github.io')) {{
    var segs = path.split('/').filter(Boolean);
    if (segs.length >= 2 && segs[1] === 'docs') return '/' + segs[0] + '/docs';
    return segs.length ? '/' + segs[0] : '';
  }}
  return '';
}}

function getSiteRootUrl() {{
  return location.origin + getSiteRootPath();
}}

function _importBase() {{
  return getSiteRootUrl() + '{repo_base_path}';
}}

function goToMySchedule(event) {{
  if(event) event.preventDefault();
  var id = localStorage.getItem('importSavedEmpId');
  var base = _importBase() + '/my-schedules/index.html';
  location.href = id ? base + '?emp=' + encodeURIComponent(id) : base;
}}

function goToEmployeeSchedule(empName) {{
  var s = String(empName || '').trim();
  var base = _importBase() + '/my-schedules/index.html';
  var m = s.match(/-\\s*(\\d+)\\s*$/);
  if (m) {{
    location.href = base + '?emp=' + encodeURIComponent(m[1]);
  }} else {{
    location.href = base + '?name=' + encodeURIComponent(s);
  }}
}}

function goToExport(event) {{
  if (event) event.preventDefault();
  location.href = getSiteRootUrl() + '/';
}}

function goToRosterDiff(event) {{
  if (event) event.preventDefault();
  var target = getSiteRootUrl() + '/roster-diff/index.html';
  location.href = target;
}}

(function bindFlightSwitchIcons() {{
  var root = getSiteRootUrl();
  var iconUrl = root + '/assets/icons/flight.png?v=20260428d';
  document.querySelectorAll('.flightSwitchIcon').forEach(function(img) {{
    img.src = iconUrl;
  }});
}})();

(function loadLocalEnhancements() {{
  var root = getSiteRootUrl();
  function addScript(src) {{
    if (document.querySelector('script[data-local-src="' + src + '"]')) return;
    var s = document.createElement('script');
    s.src = src;
    s.defer = true;
    s.setAttribute('data-local-src', src);
    document.body.appendChild(s);
  }}
  var ver = '20260514b';
  addScript(root + '/install-pwa.js?v=' + ver);
  addScript(root + '/change-alert.js?v=' + ver);
  addScript(root + '/banner-changer.js');
  var eidDays = ['2026-03-30', '2026-03-31', '2026-04-01', '2026-04-02', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19'];
  var m = (location.pathname || '').match(/\/(?:import\/date|import)\/(\d{{4}}-\d{{2}}-\d{{2}})\//);
  var activeIso = m ? m[1] : (new Date()).toISOString().slice(0, 10);
  if (eidDays.indexOf(activeIso) !== -1) {{
    addScript(root + '/eid-overlayxx.js');
  }}
}})();

(function showWelcomeChip() {{
  var empId = localStorage.getItem('importSavedEmpId');
  if (!empId) return;
  var chip = document.getElementById('welcomeChip');
  var nameEl = document.getElementById('welcomeName');
  var base = getSiteRootUrl() + '/';
  fetch(base + 'import/schedules/' + empId + '.json')
    .then(function(r) {{ return r.ok ? r.json() : null; }})
    .then(function(d) {{
      if (!d || !d.name) return;
      if (chip && nameEl) {{
        nameEl.textContent = d.name.split(' ')[0];
        chip.classList.add('visible');
      }}
      if (d.department && typeof window.reorderImportDepartments === 'function') {{
        window.reorderImportDepartments(d.department);
      }}
    }})
    .catch(function() {{}});
}})();

// Override the BASE placeholder for links that were hardcoded in Export HTML
(function() {{
  var base = _importBase();
  document.querySelectorAll('a[href*="{{BASE}}"], a[href*="{{{{BASE}}}}"]').forEach(function(a) {{
    var href = a.getAttribute('href') || '';
    a.href = href.replaceAll('{{{{BASE}}}}', base).replaceAll('{{BASE}}', base);
  }});
}})();

// Import banner labels (export script uses titleEyebrow + titleMain).
(function() {{
  if (typeof T !== 'undefined') {{
    if (T.en) {{ T.en.titleEyebrow = 'Import'; T.en.titleMain = 'Duty Roster'; }}
    if (T.ar) {{ T.ar.titleEyebrow = 'الوارد'; T.ar.titleMain = 'جدول المناوبات'; }}
  }}
  if (typeof applyLang === 'function' && typeof LANG !== 'undefined') {{
    applyLang(LANG);
  }}
}})();

</script>

</body>
</html>
"""
    return html


def build_my_schedule_html(style: str, repo_base_path: str) -> str:
    """
    Full-featured Import My Schedule page — same design as Export my-schedule.
    Uses docs/import/schedules/<id>.json
    Template: templates/import_my_schedule.html (synced from docs after UI edits).
    """
    tpl = Path(__file__).resolve().parent / "templates" / "import_my_schedule.html"
    if not tpl.is_file():
        tpl = Path(__file__).resolve().parent / "docs" / "import" / "my-schedules" / "index.html"
    html = tpl.read_text(encoding="utf-8")
    return html.replace("{IMPORT_PWA_HEAD_SNIPPET}", IMPORT_PWA_HEAD_SNIPPET.strip())



def build_employee_json(
    parsed: Dict[str, Any],
    emp: Dict[str, Any],
    existing: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    year = parsed["year"]
    month = parsed["month"]
    month_key = f"{year}-{month:02d}"
    month_label = f"{parsed['month_name']} {year}"
    schedule_rows: List[Dict[str, Any]] = []
    legacy_days: List[Dict[str, Any]] = []
    for d in sorted(parsed["date_cols"].keys()):
        try:
            wd = dt.date(year, month, d).strftime("%a")
        except ValueError:
            continue
        code = emp["shifts"].get(d, "")
        if not code:
            continue
        legacy_days.append({"day": d, "weekday": wd, "code": code})
        schedule_rows.append(
            {
                "day": d,
                "shift_code": code,
                "shift_group": shift_bucket(code)[0],
            }
        )

    schedules: Dict[str, List[Dict[str, Any]]] = {}
    if existing:
        if isinstance(existing.get("schedules"), dict):
            schedules = {str(k): list(v) for k, v in existing["schedules"].items()}
        elif existing.get("days") and existing.get("month"):
            ym = str(existing["month"])
            schedules[ym] = [
                {
                    "day": int(d["day"]),
                    "shift_code": str(d.get("code") or d.get("shift_code") or ""),
                    "shift_group": shift_bucket(str(d.get("code") or d.get("shift_code") or ""))[0],
                }
                for d in existing.get("days", [])
                if d.get("code") or d.get("shift_code")
            ]
    schedules[month_key] = schedule_rows

    return {
        "id": emp["id"],
        "name": emp["name"],
        "department": emp["dept_name"],
        "schedules": schedules,
        "month": month_key,
        "monthLabel": month_label,
        "days": legacy_days,
    }


def get_source_filename() -> str:
    """Read original Excel filename from IMPORT_SOURCE_NAME_URL env variable."""
    source_url = os.getenv("IMPORT_SOURCE_NAME_URL", "").strip()
    if not source_url:
        return ""
    try:
        r = requests.get(source_url, timeout=15)
        r.raise_for_status()
        return r.text.strip()
    except Exception:
        return ""


def write_legacy_roster_site_import_redirect(repo_root: Path) -> None:
    """Minimal page for the old GitHub Pages path /roster-site/import/ (separate roster-site repo)."""
    dest = repo_root / "legacy-redirects" / "roster-site" / "import" / "index.html"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(
        f"""<!DOCTYPE html>
<html lang="ar">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Import Duty Roster</title>
  <link rel="canonical" href="{CANONICAL_IMPORT_BASE}">
  <meta http-equiv="refresh" content="0; url={CANONICAL_IMPORT_BASE}">
  <script>
  (function () {{
    var path = location.pathname || '';
    var base = '{CANONICAL_IMPORT_BASE}';
    var rest = path.replace(/^.*\\/roster-site\\/import\\/?/, '');
    var target = base + (rest ? rest.replace(/\\/?$/, '/') : '') + location.search + location.hash;
    location.replace(target);
  }})();
  </script>
</head>
<body>
  <p style="font-family:sans-serif;text-align:center;padding:40px;">جاري التوجيه...</p>
</body>
</html>
""",
        encoding="utf-8",
    )


def pick_export_roster_filename(raw_source_name: str) -> str:
    """Pick the correct Export roster file name when multiple names are provided."""
    if not raw_source_name:
        return ""

    # Some sources provide more than one filename in one payload.
    candidates = [line.strip() for line in re.split(r"[\r\n,;]+", raw_source_name) if line.strip()]
    if not candidates:
        return ""

    for source_name in candidates:
        name_lower = source_name.lower()
        if "export staff roster changes" in name_lower:
            print(f"⏭️ Skipping changes file: {source_name}")
            continue
        if "export roster" not in name_lower:
            print(f"⏭️ Skipping non-roster file: {source_name}")
            continue
        return source_name

    print("⚠️ No matching export roster file found in provided source names.")
    return candidates[0]


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate Import roster pages")
    parser.add_argument("--excel-file", help="Use local Import Excel file instead of IMPORT_EXCEL_URL")
    parser.add_argument("--source-name", help="Optional source filename override for display")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parent
    out_root = repo_root / "docs" / "import"
    out_root.mkdir(parents=True, exist_ok=True)

    # Get original filename from source_name.txt (or CLI override)
    source_filename_raw = (args.source_name or "").strip() or get_source_filename()
    source_filename = pick_export_roster_filename(source_filename_raw)
    print(f"Source filename: {source_filename or '(not set)'}")

    # Load Excel from local file or URL
    tmp_dir = repo_root / ".tmp_import"
    tmp_dir.mkdir(exist_ok=True)
    xlsx_path = tmp_dir / "import.xlsx"
    if args.excel_file:
        data = Path(args.excel_file).read_bytes()
    else:
        url = os.getenv("IMPORT_EXCEL_URL", "").strip()
        if not url:
            raise SystemExit("Missing IMPORT_EXCEL_URL (or use --excel-file)")
        data = download_excel(url)
    xlsx_path.write_bytes(data)

    today = muscat_today()
    sheet = find_sheet_for_date(str(xlsx_path), today)
    parsed = parse_month_sheet(str(xlsx_path), sheet)
    parsed["source_filename"] = source_filename

    style, export_script = load_export_ui_template(repo_root)
    export_script = prepare_export_script_for_import(export_script)

    roster_catalog = discover_import_roster_catalog(out_root)
    min_date = roster_catalog["date_min"]
    max_date = roster_catalog["date_max"]
    available_months = roster_catalog["available_months"]
    # Include the month being generated even before day folders exist.
    gen_start = f"{parsed['year']}-{parsed['month']:02d}-01"
    _, gen_days = calendar.monthrange(parsed["year"], parsed["month"])
    gen_end = f"{parsed['year']}-{parsed['month']:02d}-{gen_days:02d}"
    if gen_start < min_date:
        min_date = gen_start
    if gen_end > max_date:
        max_date = gen_end
    gen_ym = f"{parsed['year']}-{parsed['month']:02d}"
    if gen_ym not in available_months:
        available_months = sorted(set(available_months + [gen_ym]))

    # Generate duty roster page (today)
    duty_html = build_duty_html(
        style, export_script, parsed, today, repo_base_path="/import",
        min_date=min_date, max_date=max_date,
    )
    (out_root / "index.html").write_text(duty_html, encoding="utf-8")

    # Generate /now/ alias (same content)
    now_dir = out_root / "now"
    now_dir.mkdir(parents=True, exist_ok=True)
    (now_dir / "index.html").write_text(duty_html, encoding="utf-8")

    # Generate daily pages for the whole month in BOTH formats:
    # - /import/YYYY-MM-DD/
    # - /import/date/YYYY-MM-DD/  (export-like path alias)
    year = parsed["year"]
    month = parsed["month"]
    _, days_in_month = calendar.monthrange(year, month)
    date_alias_root = out_root / "date"
    for day in range(1, days_in_month + 1):
        d = dt.date(year, month, day)
        iso = d.strftime("%Y-%m-%d")
        day_html = build_duty_html(
            style, export_script, parsed, d, repo_base_path="/import",
            min_date=min_date, max_date=max_date,
        )

        day_dir = out_root / iso
        day_dir.mkdir(parents=True, exist_ok=True)
        (day_dir / "index.html").write_text(day_html, encoding="utf-8")

        alias_day_dir = date_alias_root / iso
        alias_day_dir.mkdir(parents=True, exist_ok=True)
        (alias_day_dir / "index.html").write_text(day_html, encoding="utf-8")

    # Generate schedules JSON
    sched_dir = out_root / "schedules"
    sched_dir.mkdir(parents=True, exist_ok=True)
    for emp in parsed["employees"]:
        sched_path = sched_dir / f"{emp['id']}.json"
        existing: Dict[str, Any] | None = None
        if sched_path.is_file():
            try:
                existing = json.loads(sched_path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                existing = None
        payload = build_employee_json(parsed, emp, existing)
        sched_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    # Generate My Schedule page
    my_dir = out_root / "my-schedules"
    my_dir.mkdir(parents=True, exist_ok=True)
    (my_dir / "index.html").write_text(build_my_schedule_html(style, repo_base_path="/import"), encoding="utf-8")

    # Save a small meta file for debugging
    meta = {
        "sheet": parsed["sheet"],
        "generated_for": str(today),
        "employees_total": len(parsed["employees"]),
        "excel_sha256": hashlib.sha256(data).hexdigest(),
        "date_min": min_date,
        "date_max": max_date,
        "available_months": available_months,
        "month_sources": roster_catalog.get("month_sources", {}),
        "published_dates": roster_catalog.get("published_dates", []),
    }
    (out_root / "import_meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")

    write_legacy_roster_site_import_redirect(repo_root)
    print("OK: Generated Import pages in docs/import/")
    print(f"OK: Legacy redirect stub -> legacy-redirects/roster-site/import/index.html -> {CANONICAL_IMPORT_BASE}")


if __name__ == "__main__":
    main()
