#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OLD = "'+cells+'</motion></motion></motion></motion><div class=\"actions-card\">'"
NEW = "'+cells+'</motion></motion></motion>'+buildLegendHTML()+'</div><div class=\"actions-card\">'"

for rel in ["templates/import_my_schedule.html", "docs/import/my-schedules/index.html"]:
    p = ROOT / rel
    t = p.read_text(encoding="utf-8")
    if "+buildLegendHTML()+" in t:
        print("skip", rel)
        continue
    if OLD.replace("<motion", "<div").replace("</motion>", "</motion>") in t:
        pass
    # exact from template line
    exact = "'+cells+'</div></div></motion></motion><div class=\"actions-card\">'"
    if exact in t:
        t = t.replace(exact, "'+cells+'</div></div></motion>'+buildLegendHTML()+'</motion><div class=\"actions-card\">'", 1)
        t = t.replace("'</motion><div class=\"actions-card\">'", "'</div><div class=\"actions-card\">'", 1)
        p.write_text(t, encoding="utf-8")
        print("fixed", rel)
        continue
    exact2 = "'+cells+'</div></div></div></div><motion class=\"actions-card\">'"
    if exact2 in t:
        t = t.replace(exact2, "'+cells+'</div></div></div>'+buildLegendHTML()+'</div><div class=\"actions-card\">'", 1)
        p.write_text(t, encoding="utf-8")
        print("fixed2", rel)
        continue
    i = t.find("'+cells+'")
    if i > 0:
        print("snippet", repr(t[i : i + 80]), "in", rel)
