from pathlib import Path

old = "holiday-ticker.js?v=20260802d"
new = "holiday-ticker.js?v=20260802e"
n = 0
for p in [Path("scripts/roster_cta_snippets.py")] + list(Path("docs").rglob("*.html")):
    t = p.read_text(encoding="utf-8")
    if old not in t:
        continue
    p.write_text(t.replace(old, new), encoding="utf-8", newline="\n")
    n += 1
print("bumped", n)
