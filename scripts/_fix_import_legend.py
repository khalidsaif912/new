#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MARKER = "'+cells+'"
SUFFIX = "</div></div></div><div class=\"actions-card\">"
REPLACEMENT = "</div></div>'+buildLegendHTML()+'</div><div class=\"actions-card\">"

for rel in ("templates/import_my_schedule.html", "docs/import/my-schedules/index.html"):
    p = ROOT / rel
    t = p.read_text(encoding="utf-8")
    i = t.find(MARKER)
    if i < 0:
        print(rel, "no marker")
        continue
    j = i + len(MARKER)
    if "+buildLegendHTML()+" in t[i : i + 120]:
        print(rel, "legend already in render")
        continue
    if not t.startswith(SUFFIX, j):
        print(rel, "unexpected tail", repr(t[j : j + 60]))
        continue
    t = t[:i] + MARKER + REPLACEMENT + t[j + len(SUFFIX) :]
    p.write_text(t, encoding="utf-8")
    print(rel, "patched legend call")
