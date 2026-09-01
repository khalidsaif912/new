# -*- coding: utf-8 -*-
"""Fix 82654 name format + schedule nav across pages; ensure export schedule exists."""
from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent

NEW_GOTO = """function goToEmployeeSchedule(empName) {
  var raw = String(empName || '');
  var match = raw.match(/-\\s*(\\d{3,})\\s*(?:\\(|$)/) || raw.match(/(\\d{3,})\\s*(?:\\(|$)/);
  var base = getSiteRootUrl() + '/my-schedules/index.html';

  if (match) {
    location.href = base + '?emp=' + encodeURIComponent(match[1]);
  } else {
    location.href = base + '?name=' + encodeURIComponent(raw);
  }
}"""

NEW_GOTO_IMPORT = """function goToEmployeeSchedule(empName) {
  var raw = String(empName || '');
  var match = raw.match(/-\\s*(\\d{3,})\\s*(?:\\(|$)/) || raw.match(/(\\d{3,})\\s*(?:\\(|$)/);
  var base = (typeof _importBase === 'function' ? _importBase() : (getSiteRootUrl() + '/import')) + '/my-schedules/index.html';

  if (match) {
    location.href = base + '?emp=' + encodeURIComponent(match[1]);
  } else {
    location.href = base + '?name=' + encodeURIComponent(raw);
  }
}"""

GOTO_RE = re.compile(r"function goToEmployeeSchedule\(empName\)\s*\{.*?\n\}", re.S)


def fix_html(path: Path, import_side: bool = False) -> bool:
    t = path.read_text(encoding="utf-8", errors="ignore")
    orig = t

    # Normalize English + Arabic display for this employee
    replacements = [
        ('data-emp-name="Ahmed Al Hadi 82654"', 'data-emp-name="Ahmed Al Hadi - 82654"'),
        ("data-emp-name='Ahmed Al Hadi 82654'", "data-emp-name='Ahmed Al Hadi - 82654'"),
        (">Ahmed Al Hadi 82654</span>", ">Ahmed Al Hadi - 82654</span>"),
        ('data-name-ar="أحمد ال هادي 82654"', 'data-name-ar="أحمد الهادي - 82654"'),
        ('data-name-ar="أحمد ال هادي - 82654"', 'data-name-ar="أحمد الهادي - 82654"'),
        ('data-name-ar="أحمد الهادي 82654"', 'data-name-ar="أحمد الهادي - 82654"'),
        (">أحمد ال هادي 82654<", ">أحمد الهادي - 82654<"),
        (">أحمد ال هادي - 82654<", ">أحمد الهادي - 82654<"),
        # search blobs / data-search sometimes
        ("Ahmed Al Hadi 82654", "Ahmed Al Hadi - 82654"),
        ("أحمد ال هادي 82654", "أحمد الهادي - 82654"),
        ("أحمد ال هادي - 82654", "أحمد الهادي - 82654"),
    ]
    for a, b in replacements:
        t = t.replace(a, b)

    # Avoid double dash if already fixed then replaced poorly
    t = t.replace("Ahmed Al Hadi - - 82654", "Ahmed Al Hadi - 82654")
    t = t.replace("أحمد الهادي - - 82654", "أحمد الهادي - 82654")

    if "function goToEmployeeSchedule" in t:
        repl = NEW_GOTO_IMPORT if import_side else NEW_GOTO
        m = GOTO_RE.search(t)
        if m:
            t = t[: m.start()] + repl + t[m.end() :]

    if t != orig:
        path.write_text(t, encoding="utf-8")
        return True
    return False


def ensure_export_schedule() -> None:
    src = ROOT / "docs/import/schedules/82654.json"
    dst = ROOT / "docs/schedules/82654.json"
    if not src.exists():
        print("no import schedule for 82654")
        return
    data = json.loads(src.read_text(encoding="utf-8"))
    # Keep import history but present as export-friendly shape
    data["name"] = "Ahmed Al Hadi"
    data["id"] = "82654"
    if "schedules" not in data or not data["schedules"]:
        print("import schedule missing schedules dict")
        return
    dst.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("wrote", dst)

    # Add to export index if missing
    idx_path = ROOT / "docs/schedules/index.json"
    idx = json.loads(idx_path.read_text(encoding="utf-8"))
    emps = idx.get("employees") or []
    if not any(str(e.get("id")) == "82654" for e in emps):
        months = sorted(data.get("schedules", {}).keys())
        emps.append(
            {
                "id": "82654",
                "name": "Ahmed Al Hadi",
                "department": data.get("department") or "Export Checker",
                "months": months,
            }
        )
        emps.sort(key=lambda e: str(e.get("name") or "").lower())
        idx["employees"] = emps
        idx["total"] = len(emps)
        idx_path.write_text(json.dumps(idx, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print("added 82654 to schedules/index.json")
    else:
        print("82654 already in index")


def fix_name_translations() -> None:
    p = ROOT / "docs/name_translations.json"
    j = json.loads(p.read_text(encoding="utf-8"))
    names = j.setdefault("names", {})
    names["AHMED AL HADI"] = "أحمد الهادي"
    names["AHMED AL HADI 82654"] = "أحمد الهادي - 82654"
    names["AHMED AL HADI - 82654"] = "أحمد الهادي - 82654"
    # remove bad spaced variant if present
    for bad in ["أحمد ال هادي", "أحمد ال هادي 82654", "أحمد ال هادي - 82654"]:
        # values only cleanup happens via overwrite above
        pass
    # ensure not stuck in auto_generated forever incorrectly — keep reviewed names out of auto_generated
    auto = j.get("auto_generated")
    if isinstance(auto, list):
        j["auto_generated"] = [
            x
            for x in auto
            if str(x).upper()
            not in {"AHMED AL HADI", "AHMED AL HADI 82654", "AHMED AL HADI - 82654"}
        ]
    p.write_text(json.dumps(j, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("name_translations updated")


def main() -> None:
    fix_name_translations()
    ensure_export_schedule()

    changed = 0
    roots = [
        ROOT / "docs",
    ]
    for root in roots:
        for path in root.rglob("index.html"):
            rel = path.as_posix()
            import_side = "/import/" in rel
            if fix_html(path, import_side=import_side):
                changed += 1
                print("fixed", path.relative_to(ROOT).as_posix())
    print("html files changed", changed)


if __name__ == "__main__":
    main()
