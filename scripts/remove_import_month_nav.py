#!/usr/bin/env python3
"""Remove Import month quick-nav buttons; keep native date picker only."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IMPORT_ROOT = ROOT / "docs" / "import"
META_PATH = IMPORT_ROOT / "import_meta.json"

MONTH_NAV_CSS_RE = re.compile(
    r"\n\s*\.importMonthNav\s*\{[^}]*\}\s*"
    r"\.importMonthBtn\s*\{[^}]*\}\s*"
    r"\.importMonthBtn:hover\s*\{[^}]*\}\s*"
    r"\.importMonthBtn\.active\s*\{[^}]*\}",
    re.DOTALL,
)

NAV_HTML_RE = re.compile(
    r"\s*<div class=\"importMonthNav\" id=\"importMonthNav\"[^>]*>.*?</div>\s*",
    re.DOTALL,
)

MONTH_NAV_JS_RE = re.compile(
    r"\n// Import month quick-nav.*?// Keep native date picker min/max",
    re.DOTALL,
)
MONTH_NAV_JS_ONLY_RE = re.compile(
    r"\n// Import month quick-nav.*?(?=\n// |\nfunction |\n\}\)\(\);?\n</script>)",
    re.DOTALL,
)

APPLY_RANGE_JS = """
// Keep native date picker min/max in sync with all published Import dates (import_meta.json).
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
      if (Array.isArray(meta.available_months) && meta.available_months.length) {
        window._avail = meta.available_months.slice();
      }
    })
    .catch(function() {});
})();
"""

ISO_RE = re.compile(r"^(\d{4}-\d{2}-\d{2})$")
PICKER_RE = re.compile(
    r'(<input\s+id="datePicker"\s+type="date"\s+value="[^"]*")\s+min="[^"]*"\s+max="[^"]*"',
    re.IGNORECASE,
)
AVAIL_RE = re.compile(r'var _avail=\[[^\]]*\];')


def discover_range() -> tuple[str, str, list[str]]:
    found: list[str] = []
    for base in (IMPORT_ROOT / "date", IMPORT_ROOT):
        if not base.is_dir():
            continue
        for child in base.iterdir():
            if child.is_dir() and ISO_RE.match(child.name) and (child / "index.html").is_file():
                found.append(child.name)
    if not found:
        return "2026-03-01", "2026-05-31", ["2026-03", "2026-04", "2026-05"]
    found.sort()
    months = sorted({d[:7] for d in found})
    return found[0], found[-1], months


def update_meta(min_date: str, max_date: str, months: list[str]) -> None:
    meta: dict = {}
    if META_PATH.is_file():
        try:
            meta = json.loads(META_PATH.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass
    meta["date_min"] = min_date
    meta["date_max"] = max_date
    meta["available_months"] = months
    META_PATH.write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")


def patch_html(text: str, min_date: str, max_date: str, months: list[str]) -> tuple[str, list[str]]:
    notes: list[str] = []
    if 'id="datePicker"' not in text:
        return text, notes

    new_text = MONTH_NAV_CSS_RE.sub("", text)
    if new_text != text:
        text = new_text
        notes.append("css")

    new_text = NAV_HTML_RE.sub("\n", text)
    if new_text != text:
        text = new_text
        notes.append("nav")

    if "initImportMonthNav" in text:
        if "applyImportDateRange" in text:
            text = MONTH_NAV_JS_ONLY_RE.sub("", text, count=1)
        else:
            text = MONTH_NAV_JS_ONLY_RE.sub(lambda _m: APPLY_RANGE_JS, text, count=1)
        notes.append("js")
    elif "applyImportDateRange" not in text and 'id="datePicker"' in text:
        for anchor in (
            "})();\n\n// ═══════════════════════════════════════════════════\n// Long-press capture",
            "})();\n\n// ═══════════════════════════════════════════════════\n// Shift Filter (NOW PAGE ONLY)",
            "// Force Import header text (shared export script may override it).",
            "})();\nfunction goToMySchedule(e)",
        ):
            if anchor in text:
                if anchor.startswith("// Force"):
                    text = text.replace(anchor, APPLY_RANGE_JS + "\n" + anchor, 1)
                elif anchor.startswith("})();\nfunction"):
                    text = text.replace(anchor, "})();" + APPLY_RANGE_JS + "\nfunction goToMySchedule(e)", 1)
                else:
                    text = text.replace(anchor, "})();" + APPLY_RANGE_JS + "\n\n" + anchor.split("})();", 1)[-1], 1)
                notes.append("js-add")
                break

    new_text, n = PICKER_RE.subn(rf'\1 min="{min_date}" max="{max_date}"', text, count=1)
    if n:
        text = new_text
        notes.append("range")

    avail_json = "var _avail=" + json.dumps(months) + ";"
    new_text, n = AVAIL_RE.subn(avail_json, text, count=1)
    if n:
        text = new_text
        notes.append("avail")

    return text, notes


def main() -> int:
    min_date, max_date, months = discover_range()
    update_meta(min_date, max_date, months)
    print(f"Import date range: {min_date} .. {max_date} ({len(months)} months)")

    changed = 0
    for path in sorted(IMPORT_ROOT.rglob("index.html")):
        raw = path.read_text(encoding="utf-8")
        updated, notes = patch_html(raw, min_date, max_date, months)
        if notes and updated != raw:
            path.write_text(updated, encoding="utf-8", newline="\n")
            changed += 1
            if changed <= 3 or "--verbose" in sys.argv:
                print(f"{path.relative_to(ROOT)}: {', '.join(notes)}")
    print(f"patched {changed} files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
