#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IMPORT = ROOT / "docs" / "import"

OLD = re.compile(
    r"\(<span style='font-size:0\.75em;opacity:0\.8;'>FROM</span> (\d+) "
    r"<span style='font-size:0\.75em;opacity:0\.8;'>TO</span> (\d+)\)"
)
NEW = (
    r'(<span class="shiftRange"><span class="shiftRangeLabel">FROM</span> \1 '
    r'<span class="shiftRangeLabel">TO</span> \2</span>)'
)
# Fix prior bad normalization that put ")" before </span>
BAD = re.compile(
    r'(<span class="shiftRangeLabel">TO</span> )(\d+)\)</span>\)'
)
BAD_NEW = r"\1\2</span>)"
APPLY_OLD = "document.querySelectorAll('.empStatus span')"
APPLY_NEW = "document.querySelectorAll('.empStatus .shiftRangeLabel, .empStatus span')"


def main() -> int:
    nfiles = 0
    for path in IMPORT.rglob("index.html"):
        if "my-schedule" in str(path):
            continue
        text = path.read_text(encoding="utf-8")
        updated = BAD.sub(BAD_NEW, text)
        updated = OLD.sub(NEW, updated)
        updated = updated.replace(APPLY_OLD, APPLY_NEW)
        if updated != text:
            path.write_text(updated, encoding="utf-8")
            nfiles += 1
    print(f"Normalized {nfiles} file(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
