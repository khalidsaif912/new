#!/usr/bin/env python3
"""Fix the empty cell in the bottom Actions button group (existing docs pages).

Replaces the old `.qaFlow > *:last-child:nth-child(odd)` rule — which left a
hole because the phone-only Training tile is display:none on desktop but still
counts towards :nth-child — with the `.qaFlowOdd` class toggle added in
docs/quick-actions.js. Also refreshes the quick-actions.js cache key.

Idempotent: rerunning is a no-op.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
NEW_VER = "20261112g"

OLD_CSS_RE = re.compile(
    r"\.qaFlow > \*:last-child:nth-child\(odd\) \{ grid-column: 1 / -1; \}"
)
NEW_CSS = ".qaFlow.qaFlowOdd > *:last-child { grid-column: 1 / -1; }"
VER_RE = re.compile(r"quick-actions\.js\?v=[0-9A-Za-z._-]+")


def patch(text: str) -> tuple[str, bool]:
    new = OLD_CSS_RE.sub(NEW_CSS, text)
    new = VER_RE.sub(f"quick-actions.js?v={NEW_VER}", new)
    return new, new != text


def main() -> int:
    changed = 0
    failed: list[str] = []
    for path in DOCS.rglob("*.html"):
        try:
            text = path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        if "qaFlow" not in text and "quick-actions.js" not in text:
            continue
        new, ok = patch(text)
        if not ok:
            continue
        try:
            with path.open("w", encoding="utf-8", newline="") as fh:
                fh.write(new)
        except OSError:
            failed.append(str(path))
            continue
        changed += 1
    print(f"patched {changed} HTML files")
    for item in failed:
        print(f"FAILED {item}")
    return 0



if __name__ == "__main__":
    raise SystemExit(main())
