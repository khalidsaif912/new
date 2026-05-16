#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILES = [
    ROOT / "docs" / "import" / "my-schedules" / "index.html",
    ROOT / "generate_and_send_import.py",
]

REPLACEMENTS = [
    (
        "var mm=parseInt(m.split('-')[1]);return '<div class=\"mp-item ",
        "var p=m.split('-'),yy=p[0],mm=parseInt(p[1],10);return '<div class=\"mp-item ",
    ),
    (
        "T[lang].months[mm-1]+'</div>'",
        "T[lang].months[mm-1]+' '+yy+'</div>'",
    ),
    (
        "var mLabel=T[lang].months[mo-1];",
        "var mLabel=T[lang].months[mo-1]+' '+yr;",
    ),
]

for path in FILES:
    if not path.is_file():
        continue
    text = path.read_text(encoding="utf-8")
    updated = text
    for old, new in REPLACEMENTS:
        updated = updated.replace(old, new)
    if updated != text:
        path.write_text(updated, encoding="utf-8")
        print("patched", path.relative_to(ROOT))
