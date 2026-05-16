#!/usr/bin/env python3
"""Sync import_meta + date guards: only months with a published roster file are selectable."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IMPORT_ROOT = ROOT / "docs" / "import"
META_PATH = IMPORT_ROOT / "import_meta.json"

PICKER_RE = re.compile(
    r'(<input\s+id="datePicker"\s+type="date"\s+value="[^"]*")\s+min="[^"]*"\s+max="[^"]*"',
    re.IGNORECASE,
)

OLD_APPLY_BLOCK_START = "// Keep native date picker min/max in sync with all published Import dates"
NEW_APPLY_BLOCK = r'''
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
      .replace(/\/date\/\d{4}-\d{2}-\d{2}\/.*$/, '/')
      .replace(/\/\d{4}-\d{2}-\d{2}\/.*$/, '/')
      .replace(/\/now\/.*$/, '/')
      .replace(/\/+$/, '');
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
      var m = (location.pathname || '').match(/(\d{4}-\d{2}-\d{2})/);
      if (m) picker.value = m[1];
      return false;
    }
  }, true);
})();
'''.strip()

LOAD_OLD = "months=Object.keys(data.schedules||{}).sort();if(!months.length)"
LOAD_NEW = (
    "var importMeta=null;try{var mr=await fetch(siteRootUrl()+'import/import_meta.json',{cache:'no-store'});"
    "if(mr.ok)importMeta=await mr.json();}catch(e){}"
    "months=Object.keys(data.schedules||{}).sort();"
    "if(importMeta&&Array.isArray(importMeta.available_months)&&importMeta.available_months.length){"
    "months=importMeta.available_months.slice().sort();"
    "var filtered={};months.forEach(function(m){filtered[m]=(data.schedules&&data.schedules[m])?data.schedules[m]:[];});"
    "data.schedules=filtered;"
    "}if(!months.length)"
)


def patch_apply_block(text: str) -> tuple[str, bool]:
    if "importDateIsPublished" in text and "guardImportDateChange" in text:
        return text, False
    if OLD_APPLY_BLOCK_START not in text and "applyImportDateRange" not in text:
        return text, False
    # Replace from old comment through closing })(); before Long-press or Shift Filter
    pattern = re.compile(
        r"// Keep native date picker min/max.*?\(function applyImportDateRange\(\) \{.*?\}\)\(\);\s*",
        re.DOTALL,
    )
    new_text, n = pattern.subn(lambda _m: NEW_APPLY_BLOCK + "\n\n", text, count=1)
    if n:
        return new_text, True
    # Partial: append guard if applyImportDateRange exists but no guard
    if "applyImportDateRange" in text and "guardImportDateChange" not in text:
        anchor = "})();\n\n// ═══════════════════════════════════════════════════\n// Long-press capture"
        if anchor in text:
            guard_only = NEW_APPLY_BLOCK.split("(function guardImportDateChange")[1]
            insert = (
                "\n\nwindow.importDateIsPublished = function(iso) {\n"
                "  if (!iso) return false;\n"
                "  var dates = window.__importPublishedDates;\n"
                "  if (Array.isArray(dates) && dates.length) return dates.indexOf(iso) >= 0;\n"
                "  var months = window.__importAvailableMonths;\n"
                "  if (Array.isArray(months) && months.length) return months.indexOf(String(iso).slice(0, 7)) >= 0;\n"
                "  return true;\n"
                "};\n\n(function guardImportDateChange" + guard_only
            )
            return text.replace(anchor, "})();" + insert + "\n\n// ═══════════════════════════════════════════════════\n// Long-press capture", 1), True
    return text, False


SCHED_DIR = IMPORT_ROOT / "schedules"


def filter_schedules_dir(allowed_months: list[str]) -> int:
    if not allowed_months:
        return 0
    allowed = set(allowed_months)
    changed = 0
    for path in SCHED_DIR.glob("*.json"):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        schedules = data.get("schedules") if isinstance(data.get("schedules"), dict) else {}
        if not schedules:
            continue
        filtered = {ym: schedules[ym] for ym in schedules if ym in allowed}
        if filtered == schedules:
            continue
        data["schedules"] = filtered
        if filtered:
            latest = sorted(filtered.keys())[-1]
            data["month"] = latest
            data["monthLabel"] = latest
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        changed += 1
    return changed


def main() -> int:
    sys.path.insert(0, str(ROOT))
    from generate_and_send_import import discover_import_roster_catalog

    catalog = discover_import_roster_catalog(IMPORT_ROOT)
    months = catalog["available_months"]
    meta: dict = {}
    if META_PATH.is_file():
        try:
            meta = json.loads(META_PATH.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass
    meta.update(
        {
            "date_min": catalog["date_min"],
            "date_max": catalog["date_max"],
            "available_months": months,
            "month_sources": catalog.get("month_sources", {}),
            "published_dates": catalog.get("published_dates", []),
        }
    )
    META_PATH.write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
    print(f"Roster months: {', '.join(months) or '(none)'}")
    print(f"Dates: {catalog['date_min']} .. {catalog['date_max']} ({len(catalog['published_dates'])} days)")

    picker_changed = 0
    js_changed = 0
    for path in sorted(IMPORT_ROOT.rglob("index.html")):
        if "my-schedules" in path.parts:
            continue
        text = path.read_text(encoding="utf-8")
        updated = text
        if 'id="datePicker"' in text:
            new_text, n = PICKER_RE.subn(
                rf'\1 min="{catalog["date_min"]}" max="{catalog["date_max"]}"',
                text,
                count=1,
            )
            if n:
                updated = new_text
                picker_changed += 1
        new_text, js_patched = patch_apply_block(updated)
        if js_patched:
            updated = new_text
            js_changed += 1
        if updated != text:
            path.write_text(updated, encoding="utf-8", newline="\n")

    my_path = IMPORT_ROOT / "my-schedules" / "index.html"
    if my_path.is_file():
        text = my_path.read_text(encoding="utf-8")
        if LOAD_OLD in text and LOAD_NEW not in text:
            my_path.write_text(text.replace(LOAD_OLD, LOAD_NEW, 1), encoding="utf-8", newline="\n")
            print("patched my-schedules loadSchedule")

    sched_changed = filter_schedules_dir(months)
    print(f"patched datePicker on {picker_changed} pages, JS on {js_changed} pages, schedules {sched_changed} files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
