#!/usr/bin/env python3
"""Write docs/import/my-schedules/index.html from template + PWA snippet."""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from generate_and_send_import import IMPORT_PWA_HEAD_SNIPPET, build_my_schedule_html

OUT = ROOT / "docs" / "import" / "my-schedules" / "index.html"
TPL = ROOT / "templates" / "import_my_schedule.html"


def main() -> int:
    html = build_my_schedule_html("", "/import")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(html, encoding="utf-8")
    if "{IMPORT_PWA_HEAD_SNIPPET}" in html:
        print("ERROR: placeholder still present", file=sys.stderr)
        return 1
    print(f"Wrote {OUT.relative_to(ROOT)} ({len(html)} bytes)")
    if TPL.is_file() and "{IMPORT_PWA_HEAD_SNIPPET}" not in TPL.read_text(encoding="utf-8"):
        print("Note: templates/import_my_schedule.html should keep the placeholder for rebuilds.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
