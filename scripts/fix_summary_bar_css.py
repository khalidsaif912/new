#!/usr/bin/env python3
"""Remove stray CSS brace and duplicate chip touch rules that break .summaryBar flex layout."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"

CHIP_TOUCH_BLOCK = re.compile(
    r"\s*a\.summaryChip, button\.summaryChip, \.langToggle, \.btn, button\.shiftFilterBtn \{\s*"
    r"touch-action:manipulation;\s*"
    r"-webkit-tap-highlight-color:transparent;\s*"
    r"\}\s*"
    r"(?:\s*a\.summaryChip, button\.summaryChip, \.langToggle, \.btn, button\.shiftFilterBtn \{\s*"
    r"touch-action:manipulation;\s*"
    r"-webkit-tap-highlight-color:transparent;\s*"
    r"\}\s*)*"
    r"\}\s*\n",
    re.MULTILINE,
)

CHIP_TOUCH_ONCE = """
    a.summaryChip, button.summaryChip, .langToggle, .btn, button.shiftFilterBtn {
      touch-action:manipulation;
      -webkit-tap-highlight-color:transparent;
    }

"""

# Cosmetic: chip rule glued to closing brace of #datePicker
GLUED_BRACE = re.compile(
    r"(\.datePickerWrapper #datePicker \{[^}]+\})\s*a\.summaryChip",
    re.DOTALL,
)


def patch_html(text: str) -> tuple[str, bool]:
    changed = False
    if "/* ═══════ SUMMARY BAR ═══════ */" not in text:
        return text, False
    if CHIP_TOUCH_BLOCK.search(text):
        text = CHIP_TOUCH_BLOCK.sub(CHIP_TOUCH_ONCE, text, count=1)
        changed = True
    if GLUED_BRACE.search(text):
        text = GLUED_BRACE.sub(r"\1\n\n    a.summaryChip", text, count=1)
        changed = True
    return text, changed


def main() -> int:
    changed = 0
    for path in sorted(DOCS.rglob("*.html")):
        raw = path.read_text(encoding="utf-8")
        updated, ok = patch_html(raw)
        if ok:
            path.write_text(updated, encoding="utf-8", newline="\n")
            changed += 1
            if changed <= 5 or "--verbose" in sys.argv:
                print(f"fixed {path.relative_to(ROOT)}")
    print(f"fixed {changed} html files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
