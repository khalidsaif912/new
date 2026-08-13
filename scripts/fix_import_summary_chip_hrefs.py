#!/usr/bin/env python3
"""Fix import summary-chip clicks: undefined `base` aborted setSummaryChipHrefs."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IMPORT = ROOT / "docs" / "import"

BAD = "if (readSign) readSign.href = base + '/read-and-sign/';"
GOOD = "if (readSign) readSign.href = root + '/read-and-sign/';"
# Safer fallback if a page still uses `base` as the site-root var name
SAFE = (
    "if (readSign) readSign.href = "
    "(typeof root !== 'undefined' && root ? root : "
    "(typeof base !== 'undefined' && base ? base : getSiteRootUrl())) "
    "+ '/read-and-sign/';"
)


def patch(text: str) -> str:
    if BAD in text:
        # Prefer root when the function already declares it (import pages).
        if "var root = getSiteRootUrl();" in text.split("function setSummaryChipHrefs")[-1][:400]:
            return text.replace(BAD, GOOD)
        return text.replace(BAD, SAFE)
    if "readSign.href = root + '/read-and-sign/'" in text:
        return text
    if "getElementById('readSignChipBtn')" in text and "readSign.href" in text:
        return text
    return text


def main() -> int:
    updated = 0
    for path in IMPORT.rglob("*.html"):
        text = path.read_text(encoding="utf-8", errors="replace")
        if BAD not in text and "readSign.href = base +" not in text:
            continue
        new = patch(text)
        if new != text:
            path.write_text(new, encoding="utf-8")
            updated += 1
            print(f"updated {path.relative_to(ROOT)}")
    print(f"done, updated {updated} file(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
