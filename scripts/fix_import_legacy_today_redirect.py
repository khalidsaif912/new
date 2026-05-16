#!/usr/bin/env python3
"""Remove legacy Import auto-redirect to today's date on historical day pages."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IMPORT_ROOT = ROOT / "docs" / "import"

# Legacy March pages: redirect any non-today URL to today's roster.
LEGACY_REDIRECT_RE = re.compile(
    r"\s*if\(sessionStorage\.getItem\('manualNav'\)==='1'\)"
    r"\{sessionStorage\.removeItem\('manualNav'\);return;\}\s*"
    r"var pageDate='[^']+',now=new Date\(\);\s*"
    r"var today=now\.getFullYear\(\)\+'-'\+String\(now\.getMonth\(\)\+1\)"
    r"\.padStart\(2,'0'\)\+'-'\+String\(now\.getDate\(\)\)\.padStart\(2,'0'\);\s*"
    r"if\(pageDate!==today\)\{var tm=today\.substring\(0,7\);"
    r"if\(!_avail\.length\|\|_avail\.indexOf\(tm\)!==-1\)\{"
    r"fetch\(_importBase\(\)\+'/'\+today\+'/index\.html',\{method:'HEAD'\}\)"
    r"\.then\(function\(r\)\{if\(r\.ok\)location\.replace\(_importBase\(\)\+'/'\+today\+'/'\);\}\)"
    r"\. catch\(function\(\)\{\}\);\}return;\}\s*",
    re.MULTILINE,
)


def patch_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    if "pageDate!==today" not in text:
        return False
    new_text, n = LEGACY_REDIRECT_RE.subn("\n  ", text, count=1)
    if not n:
        return False
    broken = "  var hr=now.getHours()"
    fixed = "  var now=new Date();\n  var hr=now.getHours()"
    if broken in new_text and fixed not in new_text:
        new_text = new_text.replace(broken, fixed, 1)
    if new_text != text:
        path.write_text(new_text, encoding="utf-8", newline="\n")
        return True
    return False


def main() -> int:
    changed = 0
    for path in sorted(IMPORT_ROOT.rglob("index.html")):
        if patch_file(path):
            changed += 1
            if changed <= 3 or "--verbose" in sys.argv:
                print(path.relative_to(ROOT))
    print(f"removed redirect from {changed} files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
