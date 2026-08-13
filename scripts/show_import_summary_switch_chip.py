#!/usr/bin/env python3
"""Show Emp/Depts summary chip on all import screen sizes.

Export keeps the large-screen-only rule (Read&Sign owns the mobile slot).
Import no longer has Read&Sign, so the count chip should always be visible.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IMPORT = ROOT / "docs" / "import"

HIDE_BLOCK = re.compile(
    r"\s*/\* Emp/Depts count: large screens only[^*]*\*/\s*"
    r"#summarySwitchChip\s*\{\s*display\s*:\s*none\s*!important\s*;\s*\}\s*"
    r"@media\s*\(\s*min-width\s*:\s*1024px\s*\)\s*\{\s*"
    r"#summarySwitchChip\s*\{[^}]*\}\s*"
    r"\}\s*",
    re.IGNORECASE,
)

SHOW_BLOCK = """
    /* Emp/Depts count: always visible on import (no Read&Sign chip) */
    #summarySwitchChip {
      display:flex !important;
      flex-direction:column;
      align-items:center;
      justify-content:center;
    }
"""

# Also catch minified / slightly different spacing without the comment
HIDE_BLOCK_LOOSE = re.compile(
    r"#summarySwitchChip\s*\{\s*display\s*:\s*none\s*!important\s*;\s*\}\s*"
    r"@media\s*\(\s*min-width\s*:\s*1024px\s*\)\s*\{\s*"
    r"#summarySwitchChip\s*\{[^}]*\}\s*"
    r"\}",
    re.IGNORECASE,
)


def patch(text: str) -> str:
    if "#summarySwitchChip { display:none" not in text and "#summarySwitchChip{display:none" not in text:
        return text
    new, n = HIDE_BLOCK.subn(SHOW_BLOCK, text)
    if n:
        return new
    new, n = HIDE_BLOCK_LOOSE.subn(SHOW_BLOCK.strip(), text)
    return new if n else text


def main() -> int:
    updated = 0
    for path in IMPORT.rglob("*.html"):
        raw = path.read_text(encoding="utf-8", errors="replace")
        new = patch(raw)
        if new != raw:
            path.write_text(new, encoding="utf-8")
            updated += 1
            print(f"updated {path.relative_to(ROOT)}")
    print(f"done, updated {updated} file(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
