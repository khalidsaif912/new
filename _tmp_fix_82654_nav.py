# -*- coding: utf-8 -*-
from pathlib import Path
import re

NEW_GEN = (
    "function goToEmployeeSchedule(empName) {{\n"
    "  var raw = String(empName || '');\n"
    "  var match = raw.match(/-\\s*(\\d{{3,}})\\s*(?:\\(|$)/) || raw.match(/(\\d{{3,}})\\s*(?:\\(|$)/);\n"
    "  var base = getSiteRootUrl() + '/my-schedules/index.html';\n"
    "\n"
    "  if (match) {{\n"
    "    location.href = base + '?emp=' + encodeURIComponent(match[1]);\n"
    "  }} else {{\n"
    "    location.href = base + '?name=' + encodeURIComponent(raw);\n"
    "  }}\n"
    "}}"
)

NEW_HTML = (
    "function goToEmployeeSchedule(empName) {\n"
    "  var raw = String(empName || '');\n"
    "  var match = raw.match(/-\\s*(\\d{3,})\\s*(?:\\(|$)/) || raw.match(/(\\d{3,})\\s*(?:\\(|$)/);\n"
    "  var base = getSiteRootUrl() + '/my-schedules/index.html';\n"
    "\n"
    "  if (match) {\n"
    "    location.href = base + '?emp=' + encodeURIComponent(match[1]);\n"
    "  } else {\n"
    "    location.href = base + '?name=' + encodeURIComponent(raw);\n"
    "  }\n"
    "}"
)

p = Path("generate_and_send.py")
t = p.read_text(encoding="utf-8")
pat = re.compile(r"function goToEmployeeSchedule\(empName\) \{\{.*?\n\}\}", re.S)
m = pat.search(t)
if not m:
    raise SystemExit("not found in generate_and_send")
p.write_text(t[: m.start()] + NEW_GEN + t[m.end() :], encoding="utf-8")
print("generate_and_send.py ok")

for html in [Path("docs/index.html"), Path("docs/now/index.html")]:
    ht = html.read_text(encoding="utf-8")
    pat_h = re.compile(r"function goToEmployeeSchedule\(empName\) \{.*?\n\}", re.S)
    mh = pat_h.search(ht)
    if not mh:
        print("no fn", html)
        continue
    ht2 = ht[: mh.start()] + NEW_HTML + ht[mh.end() :]
    ht2 = ht2.replace(
        'data-emp-name="Ahmed Al Hadi 82654"',
        'data-emp-name="Ahmed Al Hadi - 82654"',
    )
    ht2 = ht2.replace(">Ahmed Al Hadi 82654</span>", ">Ahmed Al Hadi - 82654</span>")
    ht2 = ht2.replace(
        'data-name-ar="أحمد ال هادي 82654"',
        'data-name-ar="أحمد الهادي - 82654"',
    )
    html.write_text(ht2, encoding="utf-8")
    print("updated", html)

ms = Path("docs/my-schedules/index.html")
mt = ms.read_text(encoding="utf-8")
old = (
    "const res=await fetch(`../schedules/${id}.json?ts=${Date.now()}`, { cache:'no-store' });\n"
    "        if(!res.ok) throw new Error('not found');\n"
    "        data=await res.json();"
)
new = (
    "let res=await fetch(`../schedules/${id}.json?ts=${Date.now()}`, { cache:'no-store' });\n"
    "        if(!res.ok){\n"
    "          res=await fetch(`../import/schedules/${id}.json?ts=${Date.now()}`, { cache:'no-store' });\n"
    "        }\n"
    "        if(!res.ok) throw new Error('not found');\n"
    "        data=await res.json();"
)
if old not in mt:
    raise SystemExit("my-schedules fetch block missing")
ms.write_text(mt.replace(old, new, 1), encoding="utf-8")
print("my-schedules fallback ok")

g = Path("generate_and_send.py").read_text(encoding="utf-8")
i = g.find("function goToEmployeeSchedule")
print(g[i : i + 360])

# quick simulate
import re as _re

def sim(empName):
    raw = str(empName or "")
    match = _re.search(r"-\s*(\d{3,})\s*(?:\(|$)", raw) or _re.search(
        r"(\d{3,})\s*(?:\(|$)", raw
    )
    return match.group(1) if match else None

for s in ["Ahmed Al Hadi 82654", "Ahmed Al Hadi - 82654", "Mohamed Al Subhi - 82592 (Inventory)"]:
    print(s, "->", sim(s))
