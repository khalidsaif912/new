# -*- coding: utf-8 -*-
import json, re, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
js = (ROOT / "docs/emp-contact.js").read_text(encoding="utf-8")
key = re.search(r"MANTLE_KEY\s*=\s*['\"]([^'\"]+)['\"]", js).group(1)
req = urllib.request.Request(
    "https://mantledb.sh/v2/roster-site-visits/phones?ts=1",
    headers={"Accept": "application/json", "X-Mantle-Key": key},
)
data = json.loads(urllib.request.urlopen(req, timeout=20).read().decode())
phones = data.get("phones") or []
emps = json.loads((ROOT / "docs/schedules/index.json").read_text(encoding="utf-8"))[
    "employees"
]
ids = {str(e["id"]) for e in emps}
by_src = {}
in_roster = []
for p in phones:
    if not p or not p.get("id"):
        continue
    if str(p["id"]) not in ids:
        continue
    src = p.get("source") or "roster/other"
    by_src[src] = by_src.get(src, 0) + 1
    in_roster.append(p)
have = {str(p["id"]) for p in in_roster if p.get("phone")}
missing = [e for e in emps if str(e["id"]) not in have]
out = {
    "total_in_mantle": len(phones),
    "roster_with_phone": len(have),
    "roster_total": len(emps),
    "missing": len(missing),
    "by_source": by_src,
    "phone_match_count": sum(1 for p in in_roster if p.get("source") == "phone-match"),
    "missing_names": [
        {"id": e["id"], "name": e["name"]} for e in sorted(missing, key=lambda x: x["name"])
    ],
}
(ROOT / "_tmp_phone_status.json").write_text(
    json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8"
)
print(json.dumps({k: out[k] for k in out if k != "missing_names"}, ensure_ascii=False, indent=2))
print("---MISSING---")
for m in out["missing_names"]:
    print(f"{m['id']}\t{m['name']}")
