#!/usr/bin/env python3
"""Fix date picker clicks blocked by dateTag-icon/label after SVG date tag."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"

CSS_INSERT_AFTER_LABEL = """    .dateTag-label {
      line-height:1.2;
    }"""

CSS_INSERT_REPLACEMENT = """    .dateTag-label {
      line-height:1.2;
      pointer-events:none;
    }
    .dateTag-icon {
      pointer-events:none;
    }"""

CSS_PICKER_OLD = """      z-index:2;
      color:transparent;"""

CSS_PICKER_NEW = """      z-index:5;
      pointer-events:auto;
      color:transparent;"""

JS_OLD = """    dateWrap.addEventListener('click', function(e) {
      if (e.target === picker) return;
      onDateWrapActivate(e);
    });"""

JS_NEW = """    dateWrap.addEventListener('click', onDateWrapActivate);
    picker.addEventListener('click', function(e) {
      e.stopPropagation();
      setDatePickerBusy(true);
    });"""

JS_OLD2 = JS_OLD.replace("'", '"')  # some files may use different quotes - check


IMPORT_DUP_RE = re.compile(
    r"\n\n  window\.openDatePicker = function\(\) \{\n"
    r"    if \(!picker\) return;\n"
    r"    try \{ picker\.focus\(\{ preventScroll: true \}\); \} catch \(e\) \{ picker\.focus\(\); \}\n"
    r"    if \(typeof picker\.showPicker === 'function'\) \{\n"
    r"      try \{ picker\.showPicker\(\); return; \} catch \(e\) \{\}\n"
    r"    \}\n"
    r"    try \{ picker\.click\(\); \} catch \(e2\) \{\}\n"
    r"  \};\n\n"
    r"  var dateWrap = document\.querySelector\('\.datePickerWrapper'\);\n"
    r"  if \(dateWrap\) \{\n"
    r"    dateWrap\.addEventListener\('click', function\(e\) \{\n"
    r"      if \(e\.target === picker\) return;\n"
    r"      openDatePicker\(\);\n"
    r"    \}\);\n"
    r"  \}\n"
    r"  picker\.addEventListener\('click', function\(\) \{\n"
    r"    if \(typeof picker\.showPicker === 'function'\) \{\n"
    r"      try \{ picker\.showPicker\(\); \} catch \(e\) \{\}\n"
    r"    \}\n"
    r"  \}\);",
    re.MULTILINE,
)


def patch_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    orig = text
    if "dateTag-icon" in text:
        if CSS_INSERT_AFTER_LABEL in text and ".dateTag-icon {\n      pointer-events:none;" not in text:
            text = text.replace(CSS_INSERT_AFTER_LABEL, CSS_INSERT_REPLACEMENT, 1)
        elif (
            ".dateTag-label {" in text
            and ".dateTag-label {" in text
            and "pointer-events:none" not in text[text.find(".dateTag-label"): text.find(".dateTag-label") + 120]
        ):
            text = re.sub(
                r"(    \.dateTag-label \{[^}]+\})",
                lambda m: m.group(1).rstrip()
                + ("\n      pointer-events:none;" if "pointer-events" not in m.group(1) else ""),
                text,
                count=1,
            )
            text = re.sub(
                r"(    \.dateTag-icon \{[^}]*display:inline-flex[^}]*\})",
                lambda m: m.group(1).rstrip()
                + ("\n      pointer-events:none;" if "pointer-events" not in m.group(1) else ""),
                text,
                count=1,
            )
    if CSS_PICKER_OLD in text:
        text = text.replace(CSS_PICKER_OLD, CSS_PICKER_NEW)
    if JS_OLD in text:
        text = text.replace(JS_OLD, JS_NEW)
    text, n_dup = IMPORT_DUP_RE.subn("", text)
    if text != orig:
        path.write_text(text, encoding="utf-8")
        return True
    return False


def main() -> None:
    n = 0
    for html in DOCS.rglob("*.html"):
        if patch_file(html):
            n += 1
    gen = ROOT / "generate_and_send.py"
    print(f"patched {n} html files")


if __name__ == "__main__":
    main()
