#!/usr/bin/env python3
"""Patch published docs/*.html for iOS touch (date picker, chips, capture sheet)."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
_SCRIPTS = ROOT / "scripts"
if str(_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS))
from roster_cta_snippets import (  # noqa: E402
    EID_OVERLAY_LOAD_JS,
    IOS_PERF_VER,
    LOAD_ENHANCE_BLOCK_RE,
    LOAD_LOCAL_ENHANCEMENTS_EXPORT,
    LOAD_LOCAL_ENHANCEMENTS_IMPORT,
    OLD_EID_LOAD_RE,
    OLD_EID_TODAY_ONLY_RE,
    PERF_RENDER_CSS,
)

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
      z-index:5;
      pointer-events:auto;
      color:transparent;
      background:transparent;
      touch-action:manipulation;
    }"""

HIDDEN_DATE_INPUT_CSS = re.compile(
    r"/\*\s*Hidden date input[^*]*\*/\s*"
    r"\.datePickerWrapper\s+#datePicker\s*\{[^}]+\}",
    re.DOTALL,
)

CHIP_TOUCH_ONCE = """    a.summaryChip, button.summaryChip, .langToggle, .btn, button.shiftFilterBtn, a.roster-cta-btn, button.roster-cta-btn, .topDock .dockCard.dockAction, .topDock button.dockCard {
      touch-action:manipulation;
      -webkit-tap-highlight-color:transparent;
      cursor:pointer;
    }"""

IOS_TOUCH_VER = IOS_PERF_VER
IOS_HEAD_SCRIPT = f'<script src="{{prefix}}/ios-tap-fix.js?v={IOS_TOUCH_VER}"></script>'

ONCLICK_CHIP_RE = re.compile(
    r'(<a\s+[^>]*class="summaryChip[^"]*"[^>]*)\s+onclick="[^"]*"',
    re.IGNORECASE,
)

SUMMARY_TOUCH_CSS = """    .header::before,
    .header::after {
      pointer-events:none;
    }
    .summaryBar {
      position:relative;
      z-index:30;
      isolation:isolate;
    }
    .summaryBar a.summaryChip,
    .summaryBar button.summaryChip,
    .quickActions.roster-cta,
    .quickActions .roster-cta-btn,
    .importBottom .quickActions.roster-cta,
    .importBottom .roster-cta-btn,
    .topDock .dockCard.dockAction,
    .topDock .dockCard.savedChip,
    .topDock button.dockCard {
      position:relative;
      z-index:1;
      touch-action:manipulation;
      -webkit-tap-highlight-color:transparent;
      cursor:pointer;
    }
    .summaryBar a.summaryChip *,
    .summaryBar button.summaryChip *,
    .quickActions.roster-cta-btn .roster-cta-icon,
    .quickActions.roster-cta-btn .roster-cta-label,
    .topDock .dockCard * {
      pointer-events:none;
    }
    .importBottom,
    .quickActions.roster-cta {
      position:relative;
      z-index:25;
    }
"""

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

IOS_SCRIPT_LINE = "addScript(root + '/ios-tap-fix.js?v=' + ver, true);"

LOAD_ENHANCE_DEFER_ONLY = re.compile(
    r"addScript\(root \+ '/ios-tap-fix\.js\?v=' \+ ver\);\s*\n",
)

LOAD_ENHANCE_SYNC_FIRST = (
    "addScript(root + '/ios-tap-fix.js?v=' + ver, true);\n"
)

LOAD_ENHANCE_MARKER = "(function loadLocalEnhancements()"


def _load_enhance_score(block: str) -> int:
    score = 0
    if "function addScript(src, sync)" in block:
        score += 10
    if "ios-tap-fix.js?v=' + ver, true" in block:
        score += 10
    if IOS_TOUCH_VER in block:
        score += 5
    return score


def dedupe_load_local_enhancements(text: str) -> tuple[str, bool]:
    """Keep one loadLocalEnhancements IIFE (prefer ios-tap-fix sync in head)."""
    spans: list[tuple[int, int, str]] = []
    pos = 0
    while True:
        start = text.find(LOAD_ENHANCE_MARKER, pos)
        if start < 0:
            break
        end = text.find("})();", start)
        if end < 0:
            break
        end += len("})();")
        spans.append((start, end, text[start:end]))
        pos = end
    if len(spans) < 2:
        return text, False
    best = max(spans, key=lambda s: _load_enhance_score(s[2]))
    out = text
    removed = False
    for start, end, block in reversed(spans):
        if (start, end, block) == best:
            continue
        out = out[:start] + out[end:]
        removed = True
    return out, removed


SET_SUMMARY_HREFS_JS = """
function setSummaryChipHrefs() {
  var rootUrl = (typeof getSiteRootUrl === 'function') ? getSiteRootUrl() : '';
  var rootPath = (typeof getSiteRootPath === 'function') ? getSiteRootPath() : '';
  var importBase = (typeof _importBase === 'function') ? _importBase() : (rootUrl + '/import');
  var my = document.getElementById('myScheduleBtn');
  var imp = document.getElementById('importBtn');
  var exp = document.getElementById('exportBtn');
  var trn = document.getElementById('trainingBtn');
  var diff = document.getElementById('diffChipBtn');
  var welcome = document.getElementById('welcomeChip');
  if (my) {
    my.href = (location.pathname || '').indexOf('/import/') >= 0
      ? importBase + '/my-schedules/index.html'
      : rootUrl + '/my-schedules/index.html';
  }
  if (imp) imp.href = rootUrl + '/import/';
  if (exp) exp.href = rootUrl + '/';
  if (trn) trn.href = rootPath + '/training/';
  if (diff) diff.href = rootUrl + '/roster-diff/index.html';
  if (welcome) {
    var wid = localStorage.getItem('importSavedEmpId') || localStorage.getItem('exportSavedEmpId') || localStorage.getItem('savedEmpId');
    var wbase = (location.pathname || '').indexOf('/import/') >= 0
      ? importBase + '/my-schedules/index.html'
      : rootUrl + '/my-schedules/index.html';
    welcome.href = wid ? wbase + '?emp=' + encodeURIComponent(wid) : wbase;
  }
}
"""


def ios_script_src_for(path: Path) -> str:
    try:
        rel = path.parent.relative_to(DOCS)
        depth = len(rel.parts)
    except ValueError:
        depth = 0
    prefix = "/".join([".."] * depth) if depth else "."
    return f"{prefix}/ios-tap-fix.js?v={IOS_TOUCH_VER}"


def inject_ios_head_script(text: str, html_path: Path) -> tuple[str, bool]:
    src = ios_script_src_for(html_path)
    tag = f'<script defer src="{src}"></script>'
    if "ios-tap-fix.js" in text:
        updated, n = re.subn(
            r'<script(?:\s+defer)?\s+src="[^"]*ios-tap-fix\.js[^"]*"\s*></script>',
            tag,
            text,
            count=1,
        )
        return updated, n > 0
    marker = '<meta name="viewport"'
    if marker not in text:
        return text, False
    insert = text.replace(
        marker,
        tag + "\n  " + marker,
        1,
    )
    return insert, True


def strip_chip_onclick(text: str) -> tuple[str, bool]:
    updated, n = ONCLICK_CHIP_RE.subn(r"\1", text)
    return updated, n > 0


def patch_html(text: str, html_path: Path | None = None) -> tuple[str, list[str]]:
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
    elif HIDDEN_DATE_INPUT_CSS.search(text) and "pointer-events:none" in text:
        text = HIDDEN_DATE_INPUT_CSS.sub(NEW_DATE_INPUT_CSS, text, count=1)
        notes.append("date-css-hidden")

    # Repair broken layout from earlier sync runs (stray } before SUMMARY BAR)
    try:
        from fix_summary_bar_css import patch_html as repair_summary_css

        text, repaired = repair_summary_css(text)
        if repaired:
            notes.append("summary-css-repair")
    except ImportError:
        pass

    if "opacity: 0.01" in text and ".datePickerWrapper #datePicker" in text:
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
        CHIP_TOUCH_ONCE not in text
        and "/* ═══════ SUMMARY BAR ═══════ */" in text
    ):
        text = text.replace(
            "    /* ═══════ SUMMARY BAR ═══════ */",
            CHIP_TOUCH_ONCE + "\n\n    /* ═══════ SUMMARY BAR ═══════ */",
            1,
        )
        notes.append("chip-touch")

    if "pointer-events:none" not in text.split(".header::before")[1][:80] if ".header::before" in text else "":
        if "/* ═══════ SUMMARY BAR ═══════ */" in text and "z-index:30" not in text.split(".summaryBar")[1][:120] if ".summaryBar" in text else "":
            text = text.replace(
                "    /* ═══════ SUMMARY BAR ═══════ */",
                SUMMARY_TOUCH_CSS + "\n    /* ═══════ SUMMARY BAR ═══════ */",
                1,
            )
            notes.append("summary-touch-css")

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

    if "content-visibility: auto" not in text and ".deptCard {" in text:
        text = text.replace(
            "    /* ═══════ DEPARTMENT CARD ═══════ */",
            "    /* ═══════ DEPARTMENT CARD ═══════ */" + PERF_RENDER_CSS,
            1,
        )
        notes.append("perf-css")

    if "loadEidOverlayScript" not in text:
        eid_js = EID_OVERLAY_LOAD_JS.strip()
        if OLD_EID_TODAY_ONLY_RE.search(text):
            text = OLD_EID_TODAY_ONLY_RE.sub(lambda _m: eid_js, text, count=1)
            notes.append("eid-window")
        elif OLD_EID_LOAD_RE.search(text):
            text = OLD_EID_LOAD_RE.sub(lambda _m: eid_js, text, count=1)
            notes.append("eid-window")

    if LOAD_ENHANCE_BLOCK_RE.search(text):
        replacement = (
            LOAD_LOCAL_ENHANCEMENTS_IMPORT.strip()
            if "function goToExport" in text
            else LOAD_LOCAL_ENHANCEMENTS_EXPORT.strip()
        )
        if "requestIdleCallback" not in text or "loadEidOverlayScript" not in text:
            text = LOAD_ENHANCE_BLOCK_RE.sub(lambda _m: replacement, text, count=1)
            notes.append("lazy-enhance")

    if "loadLocalEnhancements" in text and "ios-tap-fix.js" in text:
        text = re.sub(
            r"\s*addScript\(root \+ '/ios-tap-fix\.js[^']*'[^)]*\);\s*",
            "\n",
            text,
            count=1,
        )
        notes.append("drop-dup-ios")

    if "function setSummaryChipHrefs" not in text and "id=\"myScheduleBtn\"" in text:
        anchor = "setLocalCtaLinks();"
        if anchor in text:
            text = text.replace(
                anchor,
                anchor + "\nsetSummaryChipHrefs();",
                1,
            )
            notes.append("call-setSummaryChipHrefs")
        insert_at = "function setLocalCtaLinks()"
        if insert_at in text:
            text = text.replace(insert_at, SET_SUMMARY_HREFS_JS + "\n" + insert_at, 1)
            notes.append("setSummaryChipHrefs-fn")
        elif "function goToMySchedule" in text:
            text = text.replace(
                "function goToMySchedule",
                SET_SUMMARY_HREFS_JS + "\nfunction goToMySchedule",
                1,
            )
            notes.append("setSummaryChipHrefs-fn")
    if ".captureBusy {" in text and "pointer-events:none" not in text.split(".captureBusy")[1][:200]:
        text = text.replace(
            "z-index:10000; display:none;\n    }",
            "z-index:10000; display:none;\n      pointer-events:none;\n    }",
            1,
        )
        notes.append("capture-busy")

    text, deduped = dedupe_load_local_enhancements(text)
    if deduped:
        notes.append("dedupe-loadEnhance")

    if html_path is not None:
        text, head = inject_ios_head_script(text, html_path)
        if head:
            notes.append("ios-head")
        text, stripped = strip_chip_onclick(text)
        if stripped:
            notes.append("chip-no-onclick")

    return text, notes


def main() -> int:
    changed = 0
    scanned = 0
    for path in sorted(DOCS.rglob("*.html")):
        scanned += 1
        raw = path.read_text(encoding="utf-8")
        updated, notes = patch_html(raw, path)
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
