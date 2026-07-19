#!/usr/bin/env python3
"""Preserve location.search + hash on roster date redirects (keeps ?wcwin= etc.)."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"

# Common patterns in live pages
REPLACEMENTS = [
    (
        "window.location.replace(buildDateBasePath() + '/date/' + iso + '/' + (isNowPage ? 'now/' : ''));",
        "window.location.replace(buildDateBasePath() + '/date/' + iso + '/' + (isNowPage ? 'now/' : '') + (location.search || '') + (location.hash || ''));",
    ),
    (
        "window.location.replace(buildDateBasePath() + '/date/' + todayIso + '/' + (isNowPage ? 'now/' : ''));",
        "window.location.replace(buildDateBasePath() + '/date/' + todayIso + '/' + (isNowPage ? 'now/' : '') + (location.search || '') + (location.hash || ''));",
    ),
    (
        "window.location.replace(baseRoot + '/date/' + todayIso + '/' + (isNowPage ? 'now/' : ''));",
        "window.location.replace(baseRoot + '/date/' + todayIso + '/' + (isNowPage ? 'now/' : '') + (location.search || '') + (location.hash || ''));",
    ),
]

# Avoid double-appending if already patched
ALREADY = "+ (location.search || '') + (location.hash || '')"


def patch_text(text: str) -> tuple[str, int]:
    n = 0
    for old, new in REPLACEMENTS:
        if ALREADY in text and old not in text:
            continue
        if old in text:
            text = text.replace(old, new)
            n += 1
    # picker navigation
    old_picker = "    window.location.href = target;\n  });"
    new_picker = (
        "    window.location.href = target + (location.search || '') + (location.hash || '');\n"
        "  });"
    )
    if old_picker in text and "target + (location.search" not in text:
        text = text.replace(old_picker, new_picker, 1)
        n += 1
    return text, n


def main() -> int:
    updated = 0
    hits = 0
    for path in sorted(DOCS.rglob("*.html")):
        text = path.read_text(encoding="utf-8")
        new_text, n = patch_text(text)
        if n and new_text != text:
            path.write_text(new_text, encoding="utf-8", newline="\n")
            updated += 1
            hits += n
    print(f"updated {updated} files, {hits} pattern hits")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
