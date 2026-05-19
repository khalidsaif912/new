#!/usr/bin/env python3
"""Patch published docs/*.html for iOS touch (date picker, chips, capture sheet)."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"

DATE_PICKER_CSS = re.compile(
    r"/\*\s*(?:Transparent date input[^\n]*|الـ input[^\n]*)\s*\*/\s*"
    r"\.datePickerWrapper\s+#datePicker\s*\{[^}]+\}"
    r"(?:\s*@supports\s*\(-webkit-touch-callout:\s*none\)\s*\{[^}]+\})?",
    re.DOTALL,
)

NEW_DATE_INPUT_CSS = """/* Transparent date input over #dateTag — native picker on iOS */
    .datePickerWrapper #datePicker {
      position:absolute;
      inset:0;
      width:100%;
      height:100%;
      min-height:44px;
      margin:0;
      padding:0;
      opacity:0;
      cursor:pointer;
      font-size:16px;
      line-height:44px;
      border:none;
      z-index:2;
      color:transparent;
      background:transparent;
      touch-action:manipulation;
    }

    a.summaryChip, button.summaryChip, .langToggle, .btn, button.shiftFilterBtn {
      touch-action:manipulation;
      -webkit-tap-highlight-color:transparent;
    }"""

WRAPPER_OLD = re.compile(
    r"\.datePickerWrapper\s*\{\s*"
    r"position:relative;\s*display:inline-block;\s*margin-top:14px;\s*"
    r"z-index:1;\s*\}",
    re.DOTALL,
)

WRAPPER_NEW = """.datePickerWrapper {
      position:relative;
      display:inline-block;
      margin-top:14px;
      z-index:20;
      min-height:44px;
      min-width:min(100%, 220px);
      touch-action:manipulation;
      -webkit-tap-highlight-color:transparent;
    }"""

OPEN_DATE_OLD = re.compile(
    r"window\.openDatePicker\s*=\s*function\(\)\s*\{[^}]+\};\s*"
    r"(?:var dateWrap = document\.querySelector\('\.datePickerWrapper'\);\s*"
    r"if \(dateWrap\) \{[^}]+\}\s*)?"
    r"(?:picker\.addEventListener\('click', function\(\) \{[^}]+\}\);\s*)?",
    re.DOTALL,
)

OPEN_DATE_NEW = """
  var DATE_PICKER_BUSY_KEY = 'rosterDatePickerBusy';

  function setDatePickerBusy(on) {
    try {
      if (on) sessionStorage.setItem(DATE_PICKER_BUSY_KEY, '1');
      else sessionStorage.removeItem(DATE_PICKER_BUSY_KEY);
    } catch (e) {}
  }

  window.openDatePicker = function() {
    if (!picker) return;
    setDatePickerBusy(true);
    try { picker.focus({ preventScroll: true }); } catch (e) { picker.focus(); }
    if (typeof picker.showPicker === 'function') {
      try { picker.showPicker(); return; } catch (e) {}
    }
    try { picker.click(); } catch (e2) {}
  };

  function onDateWrapActivate(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    openDatePicker();
  }

  var dateWrap = document.querySelector('.datePickerWrapper');
  if (dateWrap) {
    dateWrap.addEventListener('touchend', onDateWrapActivate, { passive: false });
    dateWrap.addEventListener('click', function(e) {
      if (e.target === picker) return;
      onDateWrapActivate(e);
    });
  }
  picker.addEventListener('focus', function() { setDatePickerBusy(true); });
  picker.addEventListener('blur', function() {
    setTimeout(function() { setDatePickerBusy(false); }, 400);
  });
"""

RESYNC_NEEDLE = "function resyncTodayIfNeeded() {\n    if (!path.includes('/date/')) return;"
RESYNC_GUARD = (
    "function resyncTodayIfNeeded() {\n"
    "    if (!path.includes('/date/')) return;\n"
    "    try {\n"
    "      if (sessionStorage.getItem('rosterDatePickerBusy') === '1') return;\n"
    "    } catch (e) {}"
)

CAPTURE_SHEET_OLD = re.compile(
    r"\.captureSheet\.open \{ display:flex; \}",
)

CAPTURE_SHEET_NEW = (
    ".captureSheet {\n"
    "      pointer-events:none; visibility:hidden;\n"
    "    }\n"
    "    .captureSheet.open { display:flex; pointer-events:auto; visibility:visible; }"
)

# Fix duplicate if captureSheet block already has pointer-events
CAPTURE_SHEET_BLOCK = re.compile(
    r"\.captureSheet \{\s*"
    r"position:fixed; inset:0; display:none;[^}]+\}\s*"
    r"\.captureSheet\.open \{ display:flex;[^}]*\}",
    re.DOTALL,
)

CAPTURE_SHEET_REPLACEMENT = """.captureSheet {
      position:fixed; inset:0; display:none; align-items:flex-end; justify-content:center;
      background:rgba(15,23,42,.38); z-index:9999; padding:14px;
      pointer-events:none; visibility:hidden;
    }
    .captureSheet.open { display:flex; pointer-events:auto; visibility:visible; }"""

LOAD_ENHANCE = re.compile(
    r"(function loadLocalEnhancements\(\) \{[^}]+var ver = ')[^']+(';)",
    re.DOTALL,
)

IOS_SCRIPT_LINE = "addScript(root + '/ios-tap-fix.js?v=' + ver);"


def patch_html(text: str) -> tuple[str, list[str]]:
    notes: list[str] = []

    if 'touch-action:manipulation' not in text and "body {" in text and "min-height:100dvh" in text:
        text = text.replace(
            "-webkit-font-smoothing:antialiased;\n    }",
            "-webkit-font-smoothing:antialiased;\n      touch-action:manipulation;\n    }",
            1,
        )
        notes.append("body-touch")

    if WRAPPER_OLD.search(text):
        text = WRAPPER_OLD.sub(WRAPPER_NEW, text, count=1)
        notes.append("wrapper")

    if DATE_PICKER_CSS.search(text):
        text = DATE_PICKER_CSS.sub(NEW_DATE_INPUT_CSS, text, count=1)
        notes.append("date-css")
    elif "opacity: 0.01" in text and ".datePickerWrapper #datePicker" in text:
        text = text.replace("opacity: 0.01", "opacity:0", 1)
        text = re.sub(
            r"@supports\s*\(-webkit-touch-callout:\s*none\)\s*\{\s*"
            r"\.datePickerWrapper\s+#datePicker\s*\{[^}]+\}\s*\}",
            "",
            text,
            count=1,
        )
        notes.append("date-css-fallback")

    if (
        "a.summaryChip, button.summaryChip" not in text
        and "/* ═══════ SUMMARY BAR ═══════ */" in text
    ):
        text = text.replace(
            "    /* ═══════ SUMMARY BAR ═══════ */",
            "    a.summaryChip, button.summaryChip, .langToggle, .btn, button.shiftFilterBtn {\n"
            "      touch-action:manipulation;\n"
            "      -webkit-tap-highlight-color:transparent;\n"
            "    }\n\n"
            "    /* ═══════ SUMMARY BAR ═══════ */",
            1,
        )
        notes.append("chip-touch")

    if ".langToggle {" in text and "z-index:25" not in text:
        text = text.replace("z-index:10;", "z-index:25;", 1)
        if "touch-action:manipulation" not in text.split(".langToggle")[1][:400]:
            text = text.replace(
                "-webkit-tap-highlight-color:transparent; padding:0;",
                "-webkit-tap-highlight-color:transparent; padding:0;\n      touch-action:manipulation;",
                1,
            )
        notes.append("lang-toggle")

    if "@media (max-width:480px)" in text and ".langToggle      { width:44px" not in text:
        text = text.replace(
            "@media (max-width:480px){\n      .wrap",
            "@media (max-width:480px){\n      .langToggle      { width:44px; height:44px; min-width:44px; min-height:44px; font-size:12px; }\n      .wrap",
            1,
        )
        notes.append("lang-mobile")

    if CAPTURE_SHEET_BLOCK.search(text) and "pointer-events:none; visibility:hidden" not in text:
        text = CAPTURE_SHEET_BLOCK.sub(CAPTURE_SHEET_REPLACEMENT, text, count=1)
        notes.append("capture-sheet")

    if "DATE_PICKER_BUSY_KEY" not in text and "window.openDatePicker" in text:
        if OPEN_DATE_OLD.search(text):
            text = OPEN_DATE_OLD.sub(OPEN_DATE_NEW, text, count=1)
            notes.append("date-js")
        elif "syncHeaderDate(effectiveIso)" in text:
            text = text.replace(
                "syncHeaderDate(effectiveIso);",
                "syncHeaderDate(effectiveIso);" + OPEN_DATE_NEW,
                1,
            )
            notes.append("date-js-inject")

    if RESYNC_NEEDLE in text and "sessionStorage.getItem('rosterDatePickerBusy')" not in text:
        text = text.replace(RESYNC_NEEDLE, RESYNC_GUARD, 1)
        notes.append("resync-guard")

    if "var ver = '20260514b'" in text:
        text = text.replace("var ver = '20260514b'", "var ver = '20260519a'", 1)
        notes.append("ver-bump")

    if "loadLocalEnhancements" in text:
        if IOS_SCRIPT_LINE not in text:
            text = text.replace(
                "addScript(root + '/install-pwa.js",
                IOS_SCRIPT_LINE + "\n  addScript(root + '/install-pwa.js",
                1,
            )
            notes.append("ios-script")
    if ".captureBusy {" in text and "pointer-events:none" not in text.split(".captureBusy")[1][:200]:
        text = text.replace(
            "z-index:10000; display:none;\n    }",
            "z-index:10000; display:none;\n      pointer-events:none;\n    }",
            1,
        )
        notes.append("capture-busy")

    return text, notes


def main() -> int:
    changed = 0
    scanned = 0
    for path in sorted(DOCS.rglob("*.html")):
        scanned += 1
        raw = path.read_text(encoding="utf-8")
        updated, notes = patch_html(raw)
        if updated != raw:
            path.write_text(updated, encoding="utf-8", newline="\n")
            changed += 1
            if changed <= 8 or "--verbose" in sys.argv:
                rel = path.relative_to(ROOT)
                print(f"patched {rel}: {', '.join(notes)}")
    print(f"scanned {scanned} html files, patched {changed}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
