#!/usr/bin/env python3
"""Point already-generated pages at the current MANTLE_CLIENT_VER.

Shared Mantle JS (docs/*.js) is not regenerated from Excel, so pages published
before a JS change keep loading the old cached ?v= URL. Run this after bumping
MANTLE_CLIENT_VER in scripts/roster_cta_snippets.py.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from roster_cta_snippets import MANTLE_CLIENT_VER  # noqa: E402

PATTERN = re.compile(
    r"((?:site-visits|banner-store|banner-changer|announce-popup|holiday-ticker)\.js\?v=)[0-9A-Za-z]+"
)


def main() -> int:
    changed = 0
    for path in (ROOT / "docs").rglob("*.html"):
        text = path.read_text(encoding="utf-8")
        updated = PATTERN.sub(lambda m: m.group(1) + MANTLE_CLIENT_VER, text)
        if updated != text:
            path.write_text(updated, encoding="utf-8", newline="\n")
            changed += 1
    print(f"MANTLE_CLIENT_VER={MANTLE_CLIENT_VER}: updated {changed} html files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
