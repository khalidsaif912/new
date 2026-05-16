#!/usr/bin/env python3
"""Create /import/date/YYYY-MM-DD/ aliases for legacy /import/YYYY-MM-DD/ pages."""

from __future__ import annotations

import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IMPORT_ROOT = ROOT / "docs" / "import"
DATE_ROOT = IMPORT_ROOT / "date"
ISO_RE = re.compile(r"^(\d{4}-\d{2}-\d{2})$")


def main() -> int:
    created = 0
    for src in sorted(IMPORT_ROOT.iterdir()):
        if not src.is_dir():
            continue
        m = ISO_RE.match(src.name)
        if not m:
            continue
        src_html = src / "index.html"
        if not src_html.is_file():
            continue
        dest_dir = DATE_ROOT / m.group(1)
        dest_html = dest_dir / "index.html"
        if dest_html.is_file():
            continue
        dest_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src_html, dest_html)
        created += 1
        if created <= 5 or "--verbose" in sys.argv:
            print(f"  {m.group(1)}")
    print(f"created {created} date/ aliases")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
