#!/usr/bin/env python3
"""Add bg-texture-shuffle.js to roster HTML pages."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"

LOAD_LINE = "  addScript(root + '/bg-texture-shuffle.js?v=' + ver);"


def patch_html(text: str) -> tuple[str, list[str]]:
    notes: list[str] = []
    if "loadLocalEnhancements" not in text:
        return text, notes
    if LOAD_LINE.strip() in text:
        return text, notes
    if "addScript(root + '/site-last-updated.js" in text:
        text = text.replace(
            "addScript(root + '/site-last-updated.js",
            LOAD_LINE + "\n  addScript(root + '/site-last-updated.js",
            1,
        )
        notes.append("script")
    elif "addScript(root + '/banner-changer.js" in text:
        text = text.replace(
            "addScript(root + '/banner-changer.js",
            LOAD_LINE + "\n  addScript(root + '/banner-changer.js",
            1,
        )
        notes.append("script")
    return text, notes


def main() -> int:
    changed = 0
    for path in sorted(DOCS.rglob("*.html")):
        raw = path.read_text(encoding="utf-8")
        updated, notes = patch_html(raw)
        if updated != raw:
            path.write_text(updated, encoding="utf-8", newline="\n")
            changed += 1
            if changed <= 5 or "--verbose" in sys.argv:
                print(f"patched {path.relative_to(ROOT)}: {', '.join(notes)}")
    print(f"patched {changed} html files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
