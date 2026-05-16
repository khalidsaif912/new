#!/usr/bin/env python3
"""Patch roster pages for reliable date picking on iOS Safari."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"

OLD_CSS = re.compile(
    r"/\*\s*(?:الـ input مخفي تماماً[^\n]*|Date input overlays label[^\n]*)\s*\*/\s*"
    r"(?:\.datePickerWrapper\s+)?#datePicker\s*\{[^}]+\}",
    re.DOTALL,
)

NEW_CSS = """/* Date input overlays label — direct tap opens picker on iOS Safari */
.datePickerWrapper #datePicker {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  opacity: 0;
  cursor: pointer;
  font-size: 16px;
  border: none;
  z-index: 2;
  -webkit-appearance: none;
  appearance: none;
  color: transparent;
  background: transparent;
}"""

DATE_TAG_BTN = re.compile(
    r'<button\s+class="dateTag"\s+id="dateTag"\s+onclick="openDatePicker\(\)"\s+type="button">(.*?)</button>',
    re.IGNORECASE | re.DOTALL,
)

OPEN_DATE_PICKER_FN = re.compile(
    r"\n\s*// ═+\s*\n\s*// فتح الـ date picker[\s\S]*?"
    r"picker\.addEventListener\('blur', restore\);\s*\n\};\s*\n",
    re.MULTILINE,
)

OPEN_DATE_PICKER_FN_ALT = re.compile(
    r"\nwindow\.openDatePicker\s*=\s*function\s*\(\)\s*\{[\s\S]*?"
    r"picker\.addEventListener\('blur', restore\);\s*\n\};\s*\n",
    re.MULTILINE,
)

OLD_IMPORT_INPUT = re.compile(
    r'(<input\s+id="datePicker"[^>]*)\s+aria-hidden="true"',
    re.IGNORECASE,
)

INLINE_IMPORT_INPUT = re.compile(
    r'(<input\s+id="datePicker"[^>]*style="[^"]*)pointer-events:\s*none;?',
    re.IGNORECASE,
)

DATE_BTN_LEGACY = re.compile(
    r'<button\s+class="date-btn"\s+onclick="openDatePicker\(\)"\s+type="button">',
    re.IGNORECASE,
)

OPEN_DATE_PICKER_ONELINER = re.compile(
    r"function openDatePicker\(\)\{var p=document\.getElementById\('datePicker'\);"
    r"if\(!p\)return;try\{p\.showPicker\(\)\}catch\(e\)\{p\.click\(\)\}"
    r"p\.onchange=function\(\)\{if\(!p\.value\)return;sessionStorage\.setItem\('manualNav','1'\);"
    r"location\.href=_importBase\(\)\+'/'\+p\.value\+'/';}; \}",
)


def patch_html(text: str) -> tuple[str, list[str]]:
    notes: list[str] = []
    if 'id="datePicker"' not in text and "id='datePicker'" not in text:
        return text, notes

    if DATE_TAG_BTN.search(text):
        text = DATE_TAG_BTN.sub(
            r'<label class="dateTag" id="dateTag" for="datePicker">\1</label>',
            text,
        )
        notes.append("dateTag->label")

    if DATE_BTN_LEGACY.search(text):
        text = DATE_BTN_LEGACY.sub(
            '<label class="date-btn" for="datePicker" style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;">',
            text,
        )
        # close tag: first </button> after date-btn label
        text = re.sub(
            r'(<label class="date-btn" for="datePicker"[^>]*>[\s\S]*?)</button>',
            r"\1</label>",
            text,
            count=1,
        )
        notes.append("date-btn->label")

    if OLD_CSS.search(text):
        text = OLD_CSS.sub(NEW_CSS, text, count=1)
        notes.append("css")
    elif "#datePicker" in text and "inset: 0" not in text:
        wrapper = ".datePickerWrapper {"
        if wrapper in text and NEW_CSS not in text:
            text = text.replace(wrapper, NEW_CSS + "\n    " + wrapper, 1)
            notes.append("css-injected")

    text2, n = OPEN_DATE_PICKER_FN.subn(
        "\n  // Date picker: transparent input overlays #dateTag (label) for iOS.\n\n",
        text,
        count=1,
    )
    if n:
        text = text2
        notes.append("removed-openDatePicker-block")
    else:
        text2, n = OPEN_DATE_PICKER_FN_ALT.subn(
            "\n  // Date picker: transparent input overlays #dateTag (label) for iOS.\n\n",
            text,
            count=1,
        )
        if n:
            text = text2
            notes.append("removed-openDatePicker-alt")

    if OPEN_DATE_PICKER_ONELINER.search(text):
        text = OPEN_DATE_PICKER_ONELINER.sub(
            "/* date picker: label+input overlay; navigation via change listener */",
            text,
            count=1,
        )
        notes.append("removed-oneliner-openDatePicker")

    text, n = OLD_IMPORT_INPUT.subn(r"\1", text)
    if n:
        notes.append("aria-hidden")

    text, n = INLINE_IMPORT_INPUT.subn(r"\1", text)
    if n:
        notes.append("inline-pointer-events")

    # Fix inline 1x1 hidden input on legacy import pages
    legacy_inline = re.compile(
        r'(<input\s+id="datePicker"[^>]*style=")position:absolute;opacity:0;(?:pointer-events:\s*none;)?width:1px;height:1px(")',
        re.IGNORECASE,
    )
    text, n = legacy_inline.subn(
        r"\1position:absolute;inset:0;width:100%;height:100%;opacity:0;font-size:16px;z-index:2;cursor:pointer\2",
        text,
    )
    if n:
        notes.append("legacy-inline-input")

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
        notes.append("legacy-nav-listener")

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
        if notes and updated != raw:
            path.write_text(updated, encoding="utf-8", newline="\n")
            changed += 1
            if changed <= 5 or "--verbose" in sys.argv:
                print(f"patched {path.relative_to(ROOT)}: {', '.join(notes)}")
    print(f"scanned {scanned} html files, patched {changed}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
