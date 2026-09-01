from pathlib import Path

root = Path("docs")
old = "training-new-badge.js?v=20260729h"
new = "training-new-badge.js?v=20260819n"
n = 0
for p in root.rglob("*.html"):
    try:
        c = p.read_text(encoding="utf-8")
    except Exception:
        continue
    if old not in c:
        continue
    p.write_text(c.replace(old, new), encoding="utf-8")
    n += 1
print("html updated", n)
