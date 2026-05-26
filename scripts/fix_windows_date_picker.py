#!/usr/bin/env python3
"""Fix date picker on Windows: label activation + showPicker on input click."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"

DATE_TAG_SPAN = re.compile(
    r'<span class="dateTag" id="dateTag">([\s\S]*?)</span>\s*\n\s*<input id="datePicker"',
    re.IGNORECASE,
)
DATE_TAG_LABEL = r'<label class="dateTag" id="dateTag" for="datePicker">\1</label>\n      <input id="datePicker"'

HEADER_PSEUDO_OLD = """    .header::before {
      content:''; position:absolute;
      top:-30px; right:-40px;
      width:140px; height:140px;
      border-radius:50%;
      background:rgba(255,255,255,.08);
    }
    .header::after {
      content:''; position:absolute;
      bottom:-50px; left:-30px;
      width:160px; height:160px;
      border-radius:50%;
      background:rgba(255,255,255,.06);
    }"""

HEADER_PSEUDO_NEW = """    .header::before {
      content:''; position:absolute;
      top:-30px; right:-40px;
      width:140px; height:140px;
      border-radius:50%;
      background:rgba(255,255,255,.08);
      pointer-events:none;
    }
    .header::after {
      content:''; position:absolute;
      bottom:-50px; left:-30px;
      width:160px; height:160px;
      border-radius:50%;
      background:rgba(255,255,255,.06);
      pointer-events:none;
    }"""

DATE_TAG_PE_OLD = """      direction:ltr;
      pointer-events:none;
      color:#fff;"""

DATE_TAG_PE_NEW = """      direction:ltr;
      position:relative;
      z-index:3;
      pointer-events:auto;
      color:#fff;"""

DATE_INPUT_CSS_OLD = re.compile(
    r"/\* Transparent date input over #dateTag[^\n]*\*/\s*"
    r"\.datePickerWrapper #datePicker \{[^}]+\}",
    re.DOTALL,
)

DATE_INPUT_CSS_NEW = """/* Hidden date input — label#dateTag opens picker (Windows + iOS) */
    .datePickerWrapper #datePicker {
      position:absolute;
      width:1px;
      height:1px;
      padding:0;
      margin:-1px;
      overflow:hidden;
      clip:rect(0,0,0,0);
      white-space:nowrap;
      border:0;
      opacity:0;
      pointer-events:none;
    }"""

JS_PICKER_HANDLER_OLD = """    picker.addEventListener('click', function(e) {
      e.stopPropagation();
      setDatePickerBusy(true);
    });"""

JS_PICKER_HANDLER_NEW = """    function onPickerActivate(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      setDatePickerBusy(true);
      openDatePicker();
    }
    picker.addEventListener('click', onPickerActivate);
    picker.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        onPickerActivate(e);
      }
    });"""

JS_WRAP_CLICK_OLD = """    dateWrap.addEventListener('click', onDateWrapActivate);"""

JS_WRAP_CLICK_NEW = """    dateWrap.addEventListener('click', function(e) {
      if (e.target === picker) return;
      onDateWrapActivate(e);
    });"""


def patch_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    if 'id="datePicker"' not in text:
        return False
    orig = text
    text = DATE_TAG_SPAN.sub(DATE_TAG_LABEL, text, count=1)
    if HEADER_PSEUDO_OLD in text and "pointer-events:none" not in text[text.find(".header::before") : text.find(".header::after") + 200]:
        text = text.replace(HEADER_PSEUDO_OLD, HEADER_PSEUDO_NEW, 1)
    if DATE_TAG_PE_OLD in text:
        text = text.replace(DATE_TAG_PE_OLD, DATE_TAG_PE_NEW, 1)
    text = DATE_INPUT_CSS_OLD.sub(DATE_INPUT_CSS_NEW, text, count=1)
    if JS_PICKER_HANDLER_OLD in text:
        text = text.replace(JS_PICKER_HANDLER_OLD, JS_PICKER_HANDLER_NEW, 1)
    if JS_WRAP_CLICK_OLD in text and "e.target === picker" not in text:
        text = text.replace(JS_WRAP_CLICK_OLD, JS_WRAP_CLICK_NEW, 1)
    if text != orig:
        path.write_text(text, encoding="utf-8")
        return True
    return False


def patch_generate() -> bool:
    path = ROOT / "generate_and_send.py"
    text = path.read_text(encoding="utf-8")
    orig = text
    text = text.replace(
        "<span class=\"dateTag\" id=\"dateTag\"><span class=\"dateTag-icon\"",
        "<label class=\"dateTag\" id=\"dateTag\" for=\"datePicker\"><span class=\"dateTag-icon\"",
    )
    text = text.replace(
        "</span></span>\n      <input id=\"datePicker\"",
        "</span></label>\n      <input id=\"datePicker\"",
    )
    text = text.replace(
        "      direction:ltr;\n      pointer-events:none;\n      color:#fff;",
        "      direction:ltr;\n      position:relative;\n      z-index:3;\n      pointer-events:auto;\n      color:#fff;",
        1,
    )
    gen_pseudo = HEADER_PSEUDO_OLD.replace("    ", "    ").replace("{", "{{").replace("}", "}}")
    # generate uses single braces for CSS
    if "pointer-events:none" not in text.split(".header::before")[1].split(".header::after")[0]:
        text = text.replace(HEADER_PSEUDO_OLD, HEADER_PSEUDO_NEW, 1)
    old_input = """    /* Transparent date input over #dateTag — native picker on iOS (no -webkit-appearance reset) */
    .datePickerWrapper #datePicker {{
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
    }}"""
    new_input = """    /* Hidden date input — label#dateTag opens picker (Windows + iOS) */
    .datePickerWrapper #datePicker {{
      position:absolute;
      width:1px;
      height:1px;
      padding:0;
      margin:-1px;
      overflow:hidden;
      clip:rect(0,0,0,0);
      white-space:nowrap;
      border:0;
      opacity:0;
      pointer-events:none;
    }}"""
    text = text.replace(old_input, new_input, 1)
    old_js = """    picker.addEventListener('click', function(e) {{
      e.stopPropagation();
      setDatePickerBusy(true);
    }});"""
    new_js = """    function onPickerActivate(e) {{
      if (e) {{
        e.preventDefault();
        e.stopPropagation();
      }}
      setDatePickerBusy(true);
      openDatePicker();
    }}
    picker.addEventListener('click', onPickerActivate);
    picker.addEventListener('keydown', function(e) {{
      if (e.key === 'Enter' || e.key === ' ') {{
        onPickerActivate(e);
      }}
    }});"""
    text = text.replace(old_js, new_js, 1)
    text = text.replace(
        "    dateWrap.addEventListener('click', onDateWrapActivate);",
        JS_WRAP_CLICK_NEW,
        1,
    )
    if text != orig:
        path.write_text(text, encoding="utf-8")
        return True
    return False


def main() -> None:
    n = 0
    for html in DOCS.rglob("*.html"):
        if patch_file(html):
            n += 1
    gen = patch_generate()
    print(f"patched {n} html files" + (" + generate_and_send.py" if gen else ""))


if __name__ == "__main__":
    main()
