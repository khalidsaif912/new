#!/usr/bin/env python3
"""Ensure wc-final-celebrate.js loads in primary (not idle secondary) on all pages."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
LINE = "  addScript(root + '/wc-final-celebrate.js?v=' + ver);"
SEC_LINE = "    addScript(root + '/wc-final-celebrate.js?v=' + ver);"


def patch(text: str) -> str:
    # Remove from secondary first (any indent)
    while SEC_LINE + "\n" in text:
        text = text.replace(SEC_LINE + "\n", "", 1)
    # Also handle if it's the only occurrence with 4 spaces already removed partially
    text = text.replace("\n" + SEC_LINE, "")

    if LINE in text.split("function loadSecondary()")[0]:
        return text

    needle = "  addScript(root + '/site-visits.js?v=' + ver);\n"
    if needle in text and LINE not in text.split("function loadSecondary()")[0]:
        text = text.replace(needle, needle + LINE + "\n", 1)
    return text


def main() -> int:
    n = 0
    for path in sorted(DOCS.rglob("*.html")):
        old = path.read_text(encoding="utf-8")
        if "wc-final-celebrate.js" not in old and "loadLocalEnhancements" not in old:
            continue
        if "loadLocalEnhancements" not in old:
            continue
        new = patch(old)
        if new != old:
            path.write_text(new, encoding="utf-8", newline="\n")
            n += 1
    print(f"patched {n} files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
