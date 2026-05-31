#!/usr/bin/env python3
from pathlib import Path

OLD = "var ver = '20260531a';"
NEW = "var ver = '20260601b';"
root = Path(__file__).resolve().parents[1] / "docs"
n = 0
for p in root.rglob("*.html"):
    t = p.read_text(encoding="utf-8")
    if OLD not in t:
        continue
    p.write_text(t.replace(OLD, NEW), encoding="utf-8", newline="\n")
    n += 1
print(f"updated {n} files")
