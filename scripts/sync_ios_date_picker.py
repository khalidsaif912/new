#!/usr/bin/env python3
"""Patch roster pages for cross-platform date picking (iOS, Android, Windows)."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"

DATE_PICKER_CSS = re.compile(
    r"/\*\s*(?:الـ input مخفي تماماً[^\n]*|Date input overlays[^\n]*|Transparent date input[^\n]*)\s*\*/\s*"
    r"\.datePickerWrapper\s+#datePicker\s*\{[^}]+\}"
    r"(?:\s*@supports\s*\(-webkit-touch-callout:\s*none\)\s*\{[^}]+\})?",
    re.DOTALL,
)

NEW_CSS = """/* Transparent date input over #dateTag — native picker on iOS */
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
    }"""

DATE_TAG_LABEL = re.compile(
    r'<label\s+class="dateTag"\s+id="dateTag"\s+for="datePicker">(.*?)</label>',
    re.IGNORECASE | re.DOTALL,
)

DATE_TAG_BTN = re.compile(
    r'<button\s+class="dateTag"\s+id="dateTag"\s+onclick="openDatePicker\(\)"\s+type="button">(.*?)</button>',
    re.IGNORECASE | re.DOTALL,
)

IOS_ONLY_COMMENT = re.compile(
    r"\n\s*// Date picker: transparent input overlays[^\n]*\n",
)

CROSS_PLATFORM_JS = """
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

DATE_BTN_LEGACY = re.compile(
    r'<button\s+class="date-btn"\s+onclick="openDatePicker\(\)"\s+type="button">',
    re.IGNORECASE,
)

LEGACY_INLINE = re.compile(
    r'(<input\s+id="datePicker"[^>]*style=")position:absolute;[^"]*(")',
    re.IGNORECASE,
)

LEGACY_INLINE_GOOD = "inset:0;width:100%;height:100%"


def patch_html(text: str) -> tuple[str, list[str]]:
    notes: list[str] = []
    if 'id="datePicker"' not in text:
        return text, notes

    if DATE_TAG_LABEL.search(text):
        text = DATE_TAG_LABEL.sub(r'<span class="dateTag" id="dateTag">\1</span>', text)
        notes.append("label->span")
    elif DATE_TAG_BTN.search(text):
        text = DATE_TAG_BTN.sub(r'<span class="dateTag" id="dateTag">\1</span>', text)
        notes.append("button->span")

    if DATE_BTN_LEGACY.search(text):
        text = DATE_BTN_LEGACY.sub(
            '<span class="date-btn" id="dateTagVisual" style="pointer-events:none;display:inline-flex;align-items:center;gap:6px;">',
            text,
        )
        text = re.sub(
            r'(<span class="date-btn" id="dateTagVisual"[^>]*>[\s\S]*?)</button>',
            r"\1</span>",
            text,
            count=1,
        )
        notes.append("legacy-date-btn")

    if DATE_PICKER_CSS.search(text):
        text = DATE_PICKER_CSS.sub(NEW_CSS, text, count=1)
        notes.append("css")
    elif "opacity: 0.01" not in text and "#datePicker" in text:
        wrapper = ".datePickerWrapper {"
        if wrapper in text:
            text = text.replace(wrapper, NEW_CSS + "\n    " + wrapper, 1)
            notes.append("css-injected")

    if "pointer-events: none" not in text and ".header .dateTag" in text:
        text = text.replace(
            ".header .dateTag:hover {",
            ".header .dateTag {\n      pointer-events: none;\n    }\n    .header .dateTag:hover {",
            1,
        )
        notes.append("pointer-events")

    text = re.sub(
        r'(<input\s+id="datePicker"[^>]*)\s+tabindex="-1"',
        r'\1 aria-label="Select roster date"',
        text,
        count=1,
    )
    text = re.sub(
        r'(<input\s+id="datePicker"[^>]*)\s+aria-hidden="true"',
        r'\1 aria-label="Select roster date"',
        text,
        count=1,
    )

    if LEGACY_INLINE.search(text) and LEGACY_INLINE_GOOD not in text:
        text = LEGACY_INLINE.sub(
            r"\1position:absolute;inset:0;width:100%;height:100%;opacity:0.01;font-size:16px;z-index:2;cursor:pointer\2",
            text,
            count=1,
        )
        notes.append("legacy-inline")

    text = IOS_ONLY_COMMENT.sub(CROSS_PLATFORM_JS, text, count=1)

    if "window.openDatePicker" not in text and "syncHeaderDate(effectiveIso)" in text:
        text = text.replace(
            "syncHeaderDate(effectiveIso);",
            "syncHeaderDate(effectiveIso);" + CROSS_PLATFORM_JS,
            1,
        )
        notes.append("js-injected")

    legacy_nav_marker = "/* date picker: label+input overlay; navigation via change listener */"
    if legacy_nav_marker in text and "p.dataset.navBound" not in text:
        inject = legacy_nav_marker + """
(function(){
  var p=document.getElementById('datePicker');
  if(!p||p.dataset.navBound)return;
  p.dataset.navBound='1';
  p.addEventListener('change',function(){
    if(!p.value)return;
    sessionStorage.setItem('manualNav','1');
    var path=location.pathname||'/';
    if(path.indexOf('/import/date/')>=0){
      location.href=_importBase()+'/date/'+p.value+'/';
    }else{
      location.href=_importBase()+'/'+p.value+'/';
    }
  });
})();"""
        text = text.replace(legacy_nav_marker, inject, 1)
        notes.append("legacy-nav")

    return text, notes


def main() -> int:
    changed = 0
    scanned = 0
    for path in sorted(DOCS.rglob("*.html")):
        scanned += 1
        raw = path.read_text(encoding="utf-8")
        if 'id="datePicker"' not in raw:
            continue
        updated, notes = patch_html(raw)
        if updated != raw:
            path.write_text(updated, encoding="utf-8", newline="\n")
            changed += 1
            if changed <= 5 or "--verbose" in sys.argv:
                print(f"patched {path.relative_to(ROOT)}: {', '.join(notes)}")
    print(f"scanned {scanned} html files, patched {changed}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
