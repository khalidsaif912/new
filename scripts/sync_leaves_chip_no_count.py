#!/usr/bin/env python3
"""Remove the live count next to the top Leaves chip in existing docs pages.

The generator (generate_and_send.py + roster_cta_snippets.py) no longer emits
the count; this script backfills already-published HTML until the next generate.
Idempotent: pages without the count are skipped.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"

SPAN_RE = re.compile(r'<span class="chipValNum" id="leavesChipNum"></span>')
CSS_RE = re.compile(
    r'(a\.summaryChip\.leavesChip \.chipVal \{[^}]*?)\s*gap:4px;\s*\}'
    r'\s*\n\s*a\.summaryChip\.leavesChip \.chipValNum \{[^}]*\}'
    r'\s*\n\s*a\.summaryChip\.leavesChip \.chipValNum\[hidden\] \{[^}]*\}'
)
JS_RE = re.compile(
    r'\(function countLeavesChip\(\) \{.*?\n\}\)\(\);\n\n',
    re.S,
)


def patch(text: str) -> tuple[str, bool]:
    new = SPAN_RE.sub("", text)
    new = CSS_RE.sub(lambda m: m.group(1) + " }", new)
    new = JS_RE.sub("", new)
    return new, new != text


def main() -> int:
    changed = 0
    for path in DOCS.rglob("*.html"):
        try:
            text = path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        if "leavesChipNum" not in text and "countLeavesChip" not in text:
            continue
        new, ok = patch(text)
        if ok:
            path.write_text(new, encoding="utf-8")
            changed += 1
    print(f"patched {changed} HTML files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
