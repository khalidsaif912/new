# -*- coding: utf-8 -*-
"""Build leavers candidates from schedule history vs current month."""
from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "docs" / "tools" / "leavers"
OUT.mkdir(parents=True, exist_ok=True)

idx = json.loads((ROOT / "docs/schedules/index.json").read_text(encoding="utf-8"))
emps = idx.get("employees") or []
names_map = json.loads((ROOT / "docs/name_translations.json").read_text(encoding="utf-8")).get(
    "names", {}
)
alumni = json.loads((ROOT / "docs/alumni.json").read_text(encoding="utf-8"))
alumni_ids = {str(p.get("id")) for p in (alumni.get("people") or []) if p.get("id")}

all_months = sorted({m for e in emps for m in (e.get("months") or [])})
current = all_months[-1] if all_months else datetime.now().strftime("%Y-%m")

candidates = []
active = []
for e in emps:
    eid = str(e["id"])
    months = sorted(e.get("months") or [])
    last = months[-1] if months else ""
    en = e.get("name") or ""
    ar = names_map.get(en.upper()) or names_map.get(en) or ""
    row = {
        "id": eid,
        "en": en,
        "ar": ar,
        "dept": e.get("department") or "",
        "months": months,
        "lastMonth": last,
        "inAlumni": eid in alumni_ids,
        "kind": "export",
    }
    if last == current:
        active.append(row)
    else:
        candidates.append(row)

candidates.sort(key=lambda x: (x["lastMonth"], x["en"].lower()))
active.sort(key=lambda x: x["en"].lower())

# Also include alumni people still marked for reference
payload = {
    "generatedAt": datetime.now().isoformat(timespec="seconds"),
    "currentMonth": current,
    "allMonths": all_months,
    "summary": {
        "active": len(active),
        "candidates": len(candidates),
        "candidatesNotInAlumni": sum(1 for c in candidates if not c["inAlumni"]),
        "alreadyAlumni": sum(1 for c in candidates if c["inAlumni"]),
    },
    "candidates": candidates,
    "alumniIds": sorted(alumni_ids),
}
(OUT / "data.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(payload["summary"], ensure_ascii=False))
print("current", current, "candidates", len(candidates))
