#!/usr/bin/env python3
"""Remove duplicate .header .dateTag { pointer-events:none } and wire label clicks."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"

DUP_CSS = re.compile(
    r"\n\s*\.header \.dateTag \{\s*pointer-events:\s*none;\s*\}\s*\n",
    re.IGNORECASE,
)

DATE_TAG_CLICK = """
  var dateTagEl = document.getElementById('dateTag');
  if (dateTagEl) {
    dateTagEl.addEventListener('click', function(e) {
      if (e) e.preventDefault();
      openDatePicker();
    });
  }
"""

OLD_WRAP_SIMPLE = re.compile(
    r"  var dateWrap = document\.querySelector\('\.datePickerWrapper'\);\s*"
    r"if \(dateWrap\) \{\s*"
    r"dateWrap\.addEventListener\('touchend', function\(e\) \{\s*"
    r"e\.preventDefault\(\);\s*"
    r"e\.stopPropagation\(\);\s*"
    r"openDatePicker\(\);\s*"
    r"\}, \{ passive: false \}\);\s*"
    r"dateWrap\.addEventListener\('click', function\(e\) \{\s*"
    r"e\.preventDefault\(\);\s*"
    r"e\.stopPropagation\(\);\s*"
    r"openDatePicker\(\);\s*"
    r"\}\);\s*"
    r"\}",
    re.MULTILINE,
)

NEW_WRAP = """  var dateTagEl = document.getElementById('dateTag');
  if (dateTagEl) {
    dateTagEl.addEventListener('click', function(e) {
      if (e) e.preventDefault();
      openDatePicker();
    });
  }

  var dateWrap = document.querySelector('.datePickerWrapper');
  if (dateWrap) {
    dateWrap.addEventListener('touchend', function(e) {
      if (e.target.closest && e.target.closest('#dateTag')) {
        e.preventDefault();
        openDatePicker();
        return;
      }
      onDateWrapActivate(e);
    }, { passive: false });
    dateWrap.addEventListener('click', function(e) {
      if (e.target.closest && e.target.closest('#dateTag')) return;
      if (e.target === picker) return;
      onDateWrapActivate(e);
    });
  }"""

MARKER = "dateTagEl.addEventListener('click'"


def patch_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    if 'id="datePicker"' not in text:
        return False
    orig = text
    text = DUP_CSS.sub("\n", text)
    if MARKER not in text:
        if OLD_WRAP_SIMPLE.search(text):
            text = OLD_WRAP_SIMPLE.sub(NEW_WRAP, text, count=1)
        elif "function onDateWrapActivate" in text and "var dateWrap = document.querySelector" in text:
            text = text.replace(
                "  var dateWrap = document.querySelector('.datePickerWrapper');",
                DATE_TAG_CLICK + "\n  var dateWrap = document.querySelector('.datePickerWrapper');",
                1,
            )
        elif "window.openDatePicker = function" in text:
            text = re.sub(
                r"(  window\.openDatePicker = function\(\) \{[\s\S]*?\n  \};)\n",
                r"\1" + DATE_TAG_CLICK + "\n",
                text,
                count=1,
            )
    if text != orig:
        path.write_text(text, encoding="utf-8")
        return True
    return False


def patch_generate() -> bool:
    path = ROOT / "generate_and_send.py"
    text = path.read_text(encoding="utf-8")
    orig = text
    if "pointer-events: none;" in text and ".header .dateTag {{" in text:
        text = re.sub(
            r"\n    \.header \.dateTag \{{\s*pointer-events: none;\s*\}}\n",
            "\n",
            text,
            count=1,
        )
    marker = "dateTagEl.addEventListener('click'"
    if marker not in text:
        text = text.replace(
            "  var dateWrap = document.querySelector('.datePickerWrapper');",
            DATE_TAG_CLICK.replace("'", "'") + "\n  var dateWrap = document.querySelector('.datePickerWrapper');",
            1,
        )
        # fix braces for generator
        text = text.replace(
            DATE_TAG_CLICK,
            DATE_TAG_CLICK.replace("function(e)", "function(e)").replace("'", "'"),
        )
    gen_click = """
  var dateTagEl = document.getElementById('dateTag');
  if (dateTagEl) {{
    dateTagEl.addEventListener('click', function(e) {{
      if (e) e.preventDefault();
      openDatePicker();
    }});
  }}
"""
    if "dateTagEl.addEventListener" not in text:
        text = text.replace(
            "  var dateWrap = document.querySelector('.datePickerWrapper');",
            gen_click + "\n  var dateWrap = document.querySelector('.datePickerWrapper');",
            1,
        )
    if text != orig:
        path.write_text(text, encoding="utf-8")
        return True
    return False


def main() -> None:
    n = sum(1 for html in DOCS.rglob("*.html") if patch_file(html))
    gen = patch_generate()
    print(f"patched {n} html" + (" + generator" if gen else ""))


if __name__ == "__main__":
    main()
