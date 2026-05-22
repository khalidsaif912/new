#!/usr/bin/env python3
"""Add shift-swap.js to roster HTML pages (after change-alert.js)."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"

MARKER = "shift-swap.js"
INSERT_AFTER = re.compile(
    r"(addScript\(root \+ '/change-alert\.js\?v=' \+ ver\);\s*\n)"
)

INSERT_LINE = "  addScript(root + '/shift-swap.js?v=' + ver);\n"


def patch_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    if MARKER in text:
        return False
    if "change-alert.js" not in text:
        return False
    new_text, n = INSERT_AFTER.subn(r"\1" + INSERT_LINE, text, count=1)
    if n:
        path.write_text(new_text, encoding="utf-8")
        return True
    return False


def main() -> None:
    n = 0
    for html in DOCS.rglob("*.html"):
        if patch_file(html):
            n += 1
    gen = ROOT / "generate_and_send.py"
    if gen.exists():
        text = gen.read_text(encoding="utf-8")
        if MARKER not in text and "change-alert.js" in text:
            new_text, c = INSERT_AFTER.subn(r"\1" + INSERT_LINE.replace("'", "'"), text, count=1)
            if c:
                gen.write_text(new_text, encoding="utf-8")
                print("patched generate_and_send.py")
    print(f"patched {n} html files")


if __name__ == "__main__":
    main()
