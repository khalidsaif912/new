#!/usr/bin/env python3
"""Sync shift-filter JS/CSS from generate_and_send.py into roster /now/ HTML pages."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GEN = ROOT / "generate_and_send.py"

SHIFT_START_MARKER = "// Shift Filter (NOW PAGE ONLY)"
WELCOME_MARKER = "// ═══════════════════════════════════════════════════\n// رسالة الترحيب"

SHIFT_BLOCK_RE = re.compile(
    r"// ═══════════════════════════════════════════════════\s*\n"
    r"// Shift Filter \(NOW PAGE ONLY\)\s*\n"
    r"// ═══════════════════════════════════════════════════\s*\n"
    r"\(function\(\)\{.*?\}\)\(\);\s*\n",
    re.DOTALL,
)

OPEN_MATCHING_OLD = """    shiftCards.forEach(function(shiftCard){
      shiftCard.style.display = '';
      shiftCard.removeAttribute('open');
    });"""

OPEN_MATCHING_NEW = """    shiftCards.forEach(function(shiftCard){
      shiftCard.removeAttribute('open');
    });"""

ALL_BTN_OLD = 'shiftFilterBtn all active" data-shift="All"'
ALL_BTN_NEW = 'shiftFilterBtn all" data-shift="All"'

FOCUS_CSS_OLD = """    button.summaryChip.shiftFilterBtn.active {
      border-color:currentColor;"""
FOCUS_CSS_NEW = """    button.summaryChip.shiftFilterBtn:focus {
      outline:none;
    }
    button.summaryChip.shiftFilterBtn:focus:not(.active) {
      border-color:transparent;
    }
    button.summaryChip.shiftFilterBtn.active {
      border-color:currentColor;"""


def extract_shift_filter_block() -> str:
    text = GEN.read_text(encoding="utf-8")
    start = text.find(SHIFT_START_MARKER)
    end = text.find(WELCOME_MARKER, start)
    if start < 0 or end < 0:
        raise RuntimeError("Could not find shift filter block in generate_and_send.py")
    block = text[start:end].rstrip()
    block = block.replace("{{", "{").replace("}}", "}")
    return (
        "// ═══════════════════════════════════════════════════\n"
        + block
        + "\n"
    )


def insert_shift_filter(html: str, new_block: str) -> str:
    if "window.applyShiftFilter" in html:
        return html
    if WELCOME_MARKER not in html:
        return html
    return html.replace(WELCOME_MARKER, new_block + "\n" + WELCOME_MARKER, 1)


def patch_file(path: Path, new_block: str) -> bool:
    t = path.read_text(encoding="utf-8")
    orig = t
    t = SHIFT_BLOCK_RE.sub("", t, count=1)
    t = insert_shift_filter(t, new_block)
    if OPEN_MATCHING_OLD in t:
        t = t.replace(OPEN_MATCHING_OLD, OPEN_MATCHING_NEW)
    if ALL_BTN_OLD in t:
        t = t.replace(ALL_BTN_OLD, ALL_BTN_NEW)
    if FOCUS_CSS_OLD in t and "shiftFilterBtn:focus:not(.active)" not in t:
        t = t.replace(FOCUS_CSS_OLD, FOCUS_CSS_NEW)
    if t != orig:
        path.write_text(t, encoding="utf-8")
        return True
    return False


def main() -> int:
    new_block = extract_shift_filter_block()
    targets = list((ROOT / "docs").rglob("now/index.html"))
    targets += [ROOT / "docs" / "now" / "index.html", ROOT / "now" / "index.html"]
    changed = 0
    for path in sorted(set(targets)):
        if not path.is_file():
            continue
        if patch_file(path, new_block):
            print("patched", path.relative_to(ROOT))
            changed += 1
    print(f"done: {changed} file(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
