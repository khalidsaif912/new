#!/usr/bin/env python3
"""Compare two roster months and stage leavers for alumni confirmation.

People present in the older month but missing from the newer month are written
to docs/tools/leavers/data.json as pending candidates. They are NOT added to
docs/alumni.json until confirmed in the leavers review tool (Mantle).
"""
from __future__ import annotations

import argparse
import json
import re
from datetime import datetime
from pathlib import Path

from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[1]
TRANS = json.loads((ROOT / "docs" / "name_translations.json").read_text(encoding="utf-8"))
NAMES = TRANS.get("names") or {}

SKIP_SHEETS = {"setting", "setting ", "master", "full staffs as per jd"}
NAME_RE = re.compile(r"^\s*(.+?)\s*[-–]\s*(\d{3,})\s*$")

JD_MAP = {
    "SUPV": "Supervisors",
    "FLTI": "Flight Dispatch (Import)",
    "FLTE": "Flight Dispatch (Export)",
    "DOC": "Documentation",
    "DOCS": "Documentation",
    "ICHK": "Import Checkers",
    "IOPS": "Import Operators",
    "RC": "Release Control",
    "CHK": "Import Checkers",
    "OPS": "Import Operators",
}


def ar_for(en: str) -> str:
    key = re.sub(r"\s+", " ", en).strip().upper()
    return NAMES.get(key) or ""


def extract_export(path: Path) -> dict:
    wb = load_workbook(path, data_only=True, read_only=True)
    out: dict = {}
    for sheet in wb.sheetnames:
        if sheet.strip().lower() in SKIP_SHEETS:
            continue
        ws = wb[sheet]
        for row in ws.iter_rows(values_only=True):
            for cell in row[:6]:
                if not isinstance(cell, str):
                    continue
                m = NAME_RE.match(cell)
                if not m:
                    continue
                name, eid = m.group(1).strip(), m.group(2)
                if eid not in out:
                    out[eid] = {
                        "id": eid,
                        "name": name,
                        "department": sheet.strip(),
                        "kind": "export",
                    }
    wb.close()
    return out


def extract_import(path: Path) -> dict:
    wb = load_workbook(path, data_only=True, read_only=True)
    out: dict = {}
    for sheet in wb.sheetnames:
        ws = wb[sheet]
        rows = list(ws.iter_rows(values_only=True))
        header_i = None
        for i, row in enumerate(rows[:10]):
            vals = [str(c).strip().lower() if c is not None else "" for c in row[:5]]
            if "employee name" in vals:
                header_i = i
                break
        if header_i is None:
            continue
        for row in rows[header_i + 1 :]:
            if not row or len(row) < 3:
                continue
            jd = str(row[0] or "").strip()
            name = str(row[1] or "").strip()
            sn = str(row[2] or "").strip()
            if not name or not re.fullmatch(r"\d{3,}", sn):
                continue
            name_disp = name.title() if name.isupper() else name
            dept = JD_MAP.get(jd.upper(), jd or "Import")
            if sn not in out:
                out[sn] = {
                    "id": sn,
                    "name": name_disp,
                    "department": dept,
                    "kind": "import",
                    "jd": jd,
                }
    wb.close()
    return out


def resolve_month_file(folder: Path, month: str) -> Path:
    path = folder / f"{month}.xlsx"
    if not path.is_file():
        raise FileNotFoundError(f"Missing roster file: {path}")
    return path


def classify_left(
    old: dict,
    new: dict,
    other_new: dict,
    moved_label: str,
) -> tuple[list[dict], list[dict]]:
    left: list[dict] = []
    moved: list[dict] = []
    for eid, e in sorted(old.items(), key=lambda x: x[1]["name"].lower()):
        if eid in new:
            continue
        row = {
            **e,
            "nameAr": ar_for(e["name"]),
            "lastMonth": "",  # filled by caller
            "reason": "missing_from_newer_month",
        }
        if eid in other_new:
            row["status"] = moved_label
            moved.append(row)
        else:
            row["status"] = "left"
            left.append(row)
    return left, moved


def build_payload(old_month: str, new_month: str) -> dict:
    old_exp_path = resolve_month_file(ROOT / "rosters", old_month)
    new_exp_path = resolve_month_file(ROOT / "rosters", new_month)
    old_imp_path = resolve_month_file(ROOT / "import-rosters", old_month)
    new_imp_path = resolve_month_file(ROOT / "import-rosters", new_month)

    old_exp = extract_export(old_exp_path)
    new_exp = extract_export(new_exp_path)
    old_imp = extract_import(old_imp_path)
    new_imp = extract_import(new_imp_path)

    left_exp, moved_exp = classify_left(old_exp, new_exp, new_imp, "moved_to_import")
    left_imp, moved_imp = classify_left(old_imp, new_imp, new_exp, "moved_to_export")
    for row in left_exp + moved_exp + left_imp + moved_imp:
        row["lastMonth"] = old_month
        row["compareFrom"] = old_month
        row["compareTo"] = new_month

    alumni = json.loads((ROOT / "docs" / "alumni.json").read_text(encoding="utf-8"))
    alumni_ids = {str(p.get("id")) for p in (alumni.get("people") or []) if p.get("id")}

    candidates: list[dict] = []
    for e in left_exp + left_imp:
        eid = str(e["id"])
        candidates.append(
            {
                "id": eid,
                "en": e["name"],
                "ar": e.get("nameAr") or "",
                "dept": e.get("department") or "",
                "months": [old_month],
                "lastMonth": old_month,
                "inAlumni": eid in alumni_ids,
                "kind": e.get("kind") or "export",
                "reason": "missing_from_" + new_month,
                "compareFrom": old_month,
                "compareTo": new_month,
            }
        )
    candidates.sort(key=lambda x: (x["kind"], x["en"].lower()))

    compare_audit = {
        "export": {
            "old_file": str(old_exp_path.relative_to(ROOT)),
            "new_file": str(new_exp_path.relative_to(ROOT)),
            "old_count": len(old_exp),
            "new_count": len(new_exp),
            "left": left_exp,
            "moved": moved_exp,
        },
        "import": {
            "old_file": str(old_imp_path.relative_to(ROOT)),
            "new_file": str(new_imp_path.relative_to(ROOT)),
            "old_count": len(old_imp),
            "new_count": len(new_imp),
            "left": left_imp,
            "moved": moved_imp,
        },
    }

    leavers_payload = {
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "compareFrom": old_month,
        "compareTo": new_month,
        "currentMonth": new_month,
        "allMonths": [old_month, new_month],
        "summary": {
            "activeExport": len(new_exp),
            "activeImport": len(new_imp),
            "candidates": len(candidates),
            "candidatesNotInAlumni": sum(1 for c in candidates if not c["inAlumni"]),
            "alreadyAlumni": sum(1 for c in candidates if c["inAlumni"]),
            "movedExport": len(moved_exp),
            "movedImport": len(moved_imp),
        },
        "candidates": candidates,
        "moved": {
            "export": moved_exp,
            "import": moved_imp,
        },
        "alumniIds": sorted(alumni_ids),
        "note": (
            "Candidates are pending confirmation only. "
            "Confirm in docs/tools/leavers/ before they appear under Former Colleagues."
        ),
    }
    return leavers_payload, compare_audit


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--old", default="2026-09", help="Older month YYYY-MM (default: 2026-09)")
    ap.add_argument("--new", default="2026-10", help="Newer month YYYY-MM (default: 2026-10)")
    args = ap.parse_args()

    leavers_payload, compare_audit = build_payload(args.old, args.new)

    leavers_dir = ROOT / "docs" / "tools" / "leavers"
    leavers_dir.mkdir(parents=True, exist_ok=True)
    leavers_path = leavers_dir / "data.json"
    leavers_path.write_text(
        json.dumps(leavers_payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    audit_path = ROOT / "docs" / "_alumni_compare.json"
    audit_path.write_text(
        json.dumps(compare_audit, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    s = leavers_payload["summary"]
    print(f"compare {args.old} -> {args.new}")
    print(
        f"export {compare_audit['export']['old_count']} -> {compare_audit['export']['new_count']} "
        f"| import {compare_audit['import']['old_count']} -> {compare_audit['import']['new_count']}"
    )
    print(
        f"pending leavers: {s['candidatesNotInAlumni']} "
        f"(already alumni: {s['alreadyAlumni']}, moved skipped: "
        f"{s['movedExport'] + s['movedImport']})"
    )
    for c in leavers_payload["candidates"]:
        flag = " [already alumni]" if c["inAlumni"] else " [PENDING CONFIRM]"
        print(f"  {c['id']:>8}  {c['en']:<35}  {c['kind']:<7}  {c['dept']}{flag}")
    print("wrote", leavers_path)
    print("wrote", audit_path)
    print("alumni.json NOT modified — confirm via tools/leavers/")


if __name__ == "__main__":
    main()
