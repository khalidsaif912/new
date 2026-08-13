#!/usr/bin/env python3
"""Remove Read&Sign summary chip from import pages (export-only feature)."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IMPORT = ROOT / "docs" / "import"

CHIP_RE = re.compile(
    r'\s*<a\b[^>]*\bid="readSignChipBtn"[^>]*>[\s\S]*?</a>\s*',
    re.IGNORECASE,
)

# Dead JS left by older sync (harmless but tidy)
JS_READSIGN_RE = re.compile(
    r"\s*var readSign = document\.getElementById\('readSignChipBtn'\);\s*"
    r"if \(readSign\) readSign\.href = [^;]+;\s*",
)


def patch(text: str) -> str:
    if 'id="readSignChipBtn"' not in text and "readSignChipBtn" not in text:
        return text
    text2 = CHIP_RE.sub("\n", text, count=1)
    text2 = JS_READSIGN_RE.sub("\n", text2)
    return text2


def main() -> int:
    updated = 0
    for path in IMPORT.rglob("*.html"):
        raw = path.read_text(encoding="utf-8", errors="replace")
        if 'id="readSignChipBtn"' not in raw and "getElementById('readSignChipBtn')" not in raw:
            continue
        new = patch(raw)
        if new != raw:
            path.write_text(new, encoding="utf-8")
            updated += 1
            print(f"updated {path.relative_to(ROOT)}")
    print(f"done, updated {updated} file(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
