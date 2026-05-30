#!/usr/bin/env python3
"""Fix Export/My Schedule chip navigation on generated import roster pages."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS_IMPORT = ROOT / "docs" / "import"

IMPORT_MY_SCHED = (
    "(typeof _importBase === 'function' ? _importBase() : (getSiteRootUrl() + '/import'))"
    " + '/my-schedules/index.html'"
)

IMPORT_SET_SUMMARY_CHIP_HREFS = """
function setSummaryChipHrefs() {
  var importBase = _importBase() + '/my-schedules/index.html';
  var root = getSiteRootUrl();
  var my = document.getElementById('myScheduleBtn');
  var exp = document.getElementById('exportBtn');
  var welcome = document.getElementById('welcomeChip');
  var trn = document.getElementById('trainingBtn');
  var diff = document.getElementById('diffChipBtn');
  if (my) my.href = importBase;
  if (exp) {
    var iso = '';
    var picker = document.getElementById('datePicker');
    if (picker && picker.value) iso = picker.value;
    if (!iso) {
      var pm = (location.pathname || '').match(/\\/(?:import\\/date|import)\\/(\\d{4}-\\d{2}-\\d{2})\\//);
      if (pm) iso = pm[1];
      if (!iso) {
        var m2 = (location.pathname || '').match(/(\\d{4}-\\d{2}-\\d{2})/);
        if (m2) iso = m2[1];
      }
    }
    exp.href = iso ? (root + '/date/' + iso + '/') : (root + '/');
  }
  if (trn) trn.href = root + '/training/';
  if (diff) diff.href = root + '/roster-diff/index.html';
  if (welcome) {
    var wid = localStorage.getItem('importSavedEmpId');
    welcome.href = wid ? importBase + '?emp=' + encodeURIComponent(wid) : importBase;
  }
}
setSummaryChipHrefs();
"""

_EXPORT_SET_SUMMARY_RE = re.compile(
    r"function setSummaryChipHrefs\(\)\s*\{[\s\S]*?"
    r"if \(exp\) \{ /\* exportBtn href via import setSummaryChipHrefs \*/ \}[\s\S]*?\n\}\n",
)

_EXPORT_SET_SUMMARY_GENERIC_RE = re.compile(
    r"function setSummaryChipHrefs\(\)\s*\{[\s\S]*?"
    r"var base = getSiteRootUrl\(\);[\s\S]*?"
    r"if \(my\) my\.href = base \+ '/my-schedules/index\.html';[\s\S]*?\n\}\n",
)

_AFTER_SET_LOCAL_CALL_RE = re.compile(
    r"\nsetSummaryChipHrefs\(\);\n(?=applyLang\(LANG\)|function goToTraining)"
)

_ORPHAN_IIFE_AFTER_SET_SUMMARY_RE = re.compile(
    r"setSummaryChipHrefs\(\);\n\n\}\)\(\);\n\n\(function loadLocalEnhancements",
    re.MULTILINE,
)

_WRONG_MY_SCHED_RE = re.compile(
    r"var base = getSiteRootUrl\(\) \+ '/my-schedules/index\.html';",
)

_IMPORT_TAIL_MARKER = "function _importBase()"
_LOAD_ENHANCE_MARKER = "(function loadLocalEnhancements()"


def patch_import_html(text: str) -> tuple[str, list[str]]:
    notes: list[str] = []
    if _IMPORT_TAIL_MARKER not in text:
        return text, notes

    new_text, n = _EXPORT_SET_SUMMARY_RE.subn("", text)
    if n:
        notes.append("rm-export-setSummary(broken)")
        text = new_text

    new_text, n = _EXPORT_SET_SUMMARY_GENERIC_RE.subn("", text)
    if n:
        notes.append("rm-export-setSummary(generic)")
        text = new_text

    new_text, n = _AFTER_SET_LOCAL_CALL_RE.subn("\n", text)
    if n:
        notes.append("rm-export-setSummary-call")
        text = new_text

    new_text, n = _ORPHAN_IIFE_AFTER_SET_SUMMARY_RE.subn(
        "setSummaryChipHrefs();\n\n(function loadLocalEnhancements", text
    )
    if n:
        notes.append("rm-orphan-iife")
        text = new_text

    new_text, n = _WRONG_MY_SCHED_RE.subn(f"var base = {IMPORT_MY_SCHED};", text)
    if n:
        notes.append(f"fix-goToMySchedule({n})")
        text = new_text

    tail_idx = text.find(_IMPORT_TAIL_MARKER)
    if tail_idx < 0:
        return text, notes

    tail = text[tail_idx:]
    if "function setSummaryChipHrefs()" not in tail or "_importBase()" not in tail.split(
        "function setSummaryChipHrefs()", 1
    )[-1][:800]:
        anchor = "\n\n(function loadLocalEnhancements()"
        if anchor in tail:
            tail = tail.replace(
                anchor,
                "\n" + IMPORT_SET_SUMMARY_CHIP_HREFS + anchor,
                1,
            )
            text = text[:tail_idx] + tail
            notes.append("add-import-setSummary")
        elif _LOAD_ENHANCE_MARKER in tail:
            tail = tail.replace(
                _LOAD_ENHANCE_MARKER,
                IMPORT_SET_SUMMARY_CHIP_HREFS.strip() + "\n\n" + _LOAD_ENHANCE_MARKER,
                1,
            )
            text = text[:tail_idx] + tail
            notes.append("add-import-setSummary")

    return text, notes


def main() -> int:
    changed = 0
    scanned = 0
    for path in sorted(DOCS_IMPORT.rglob("index.html")):
        if "my-schedules" in path.parts:
            continue
        scanned += 1
        raw = path.read_text(encoding="utf-8")
        updated, notes = patch_import_html(raw)
        if updated != raw:
            path.write_text(updated, encoding="utf-8", newline="\n")
            changed += 1
            if changed <= 10 or "--verbose" in sys.argv:
                print(f"patched {path.relative_to(ROOT)}: {', '.join(notes)}")
    print(f"scanned {scanned} import pages, patched {changed}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
