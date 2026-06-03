#!/usr/bin/env python3
"""Remove FROM/TO suffixes from regular shifts and off days on Import HTML pages."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IMPORT = ROOT / "docs" / "import"

# Strip parenthetical range after shift codes (keeps LV/TR/AL style labels intact when coded).
RANGE_IN_STATUS_RE = re.compile(
    r"(<span class=\"empStatus\" style=\"color:[^\"]+;\">)"
    r"((?:MN|ME|AN|AE|NN|NE|NT)\d{1,2}|O|OFF)\s*"
    r"\(<span class=\"shiftRange\">.*?</span>\)\s*"
    r"(</span>)",
    re.I | re.S,
)
RANGE_LEGACY_RE = re.compile(
    r"(<span class=\"empStatus\" style=\"color:[^\"]+;\">)"
    r"((?:MN|ME|AN|AE|NN|NE|NT)\d{1,2}|O|OFF)\s*"
    r"\(<span[^>]*>FROM</span>\s*\d+\s*<span[^>]*>TO</span>\s*\d+\)\s*"
    r"(</span>)",
    re.I | re.S,
)


def strip_file(path: Path) -> int:
    text = path.read_text(encoding="utf-8")
    n = 0
    for pat in (RANGE_IN_STATUS_RE, RANGE_LEGACY_RE):
        text, c = pat.subn(r"\1\2\3", text)
        n += c
    if n:
        path.write_text(text, encoding="utf-8")
    return n


def main() -> int:
    total = 0
    files = 0
    for path in sorted(IMPORT.rglob("index.html")):
        if "my-schedule" in str(path):
            continue
        n = strip_file(path)
        if n:
            files += 1
            total += n
            print(f"{path.relative_to(ROOT)}: {n}")
    print(f"Stripped {total} range(s) in {files} file(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
