#!/usr/bin/env python3
"""Build published roster-diff JSON from two Excel workbooks.

Identity rules
--------------
* Prefer numeric employee id (including ``Name - 12345`` suffixes).
* Fall back to a normalized name key.
* When one side has only a name and the other has an id, align by compatible
  name tokens so fixing a missing id does not invent/remove a whole schedule.

Cosmetic uploads (same shifts, only name/id/label tweaks) are detected via
``shifts_fingerprint`` so callers can skip rewriting the published month diff.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

from openpyxl import load_workbook


DAYS = {"SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"}
SKIP_SHEETS = {"full staffs as per jd"}
_ID_IN_NAME_RE = re.compile(r"[-–—]\s*(\d{3,})\s*$")


def norm(v) -> str:
    if v is None:
        return ""
    return str(v).strip()


def is_emp_id(v: str) -> bool:
    v = norm(v)
    return bool(re.fullmatch(r"\d{3,}", v))


def looks_name(v: str) -> bool:
    """True for person names; false for JD codes (CHKA) and shift codes (MN06)."""
    v = norm(v)
    if not v or is_emp_id(v):
        return False
    if not any(ch.isalpha() for ch in v):
        return False
    up = v.upper()
    if up in DAYS or up in {"OFF", "TR", "LV", "AL", "SL", "RD", "PH", "TOIL"}:
        return False
    if re.fullmatch(r"[A-Z]{1,4}\d{2,3}", up):
        return False
    # Lone short tokens are almost always dept/JD codes, not people.
    if " " not in v and re.fullmatch(r"[A-Z]{2,6}", up):
        return False
    return True


def extract_id_from_name(name: str) -> str:
    m = _ID_IN_NAME_RE.search(name or "")
    return m.group(1) if m else ""


def normalize_name_key(name: str) -> str:
    """Uppercase name without trailing ``- id`` and with collapsed spaces."""
    base = _ID_IN_NAME_RE.sub("", name or "")
    base = re.sub(r"[^A-Za-z0-9\u0600-\u06FF]+", " ", base)
    return re.sub(r"\s+", " ", base).strip().upper()


def name_tokens(name: str) -> set[str]:
    key = normalize_name_key(name)
    if not key:
        return set()
    # Drop the particle AL so "RASHID SHAYAI" ≈ "RASHID AL SHAYAI".
    return {t for t in key.split() if t and t != "AL"}


def names_compatible(a: str, b: str) -> bool:
    ta, tb = name_tokens(a), name_tokens(b)
    if not ta or not tb:
        return False
    if ta == tb or ta <= tb or tb <= ta:
        return True
    inter = len(ta & tb)
    union = len(ta | tb)
    return union > 0 and (inter / union) >= 0.6


def stable_emp_key(emp_id: str, name: str) -> str:
    eid = (emp_id or "").strip() or extract_id_from_name(name)
    if eid:
        return f"id:{eid}"
    nk = normalize_name_key(name)
    return f"name:{nk}" if nk else ""


def find_day_row(ws) -> int:
    max_scan = min(80, ws.max_row)
    for r in range(1, max_scan + 1):
        vals = [norm(ws.cell(row=r, column=c).value).upper() for c in range(1, ws.max_column + 1)]
        tokens = 0
        for x in vals:
            if any(d in x for d in DAYS):
                tokens += 1
        if tokens >= 3:
            return r
    raise ValueError("Could not detect day header row (SUN/MON/...)")


def day_cols(ws, day_row: int) -> List[Tuple[int, int]]:
    cols = []
    idx = 1
    for c in range(1, ws.max_column + 1):
        v = norm(ws.cell(row=day_row, column=c).value).upper()
        if any(d in v for d in DAYS):
            cols.append((idx, c))
            idx += 1
    if not cols:
        raise ValueError("No day columns found")
    return cols


def parse_file(path: Path) -> Dict[str, Dict]:
    """Return ``stable_key -> {id,name,shifts}``."""
    wb = load_workbook(path, data_only=True)
    out: Dict[str, Dict] = {}
    parsed_any_sheet = False

    for sn in wb.sheetnames:
        if norm(sn).lower() in SKIP_SHEETS:
            continue
        ws = wb[sn]
        try:
            drow = find_day_row(ws)
            dcols = day_cols(ws, drow)
        except Exception:
            continue
        parsed_any_sheet = True

        for r in range(drow + 1, ws.max_row + 1):
            row_vals = [norm(ws.cell(row=r, column=c).value) for c in range(1, ws.max_column + 1)]
            emp_id = ""
            name = ""
            for i, v in enumerate(row_vals):
                if not emp_id and is_emp_id(v):
                    emp_id = v
                    left = row_vals[i - 1] if i - 1 >= 0 else ""
                    right = row_vals[i + 1] if i + 1 < len(row_vals) else ""
                    left_ok = looks_name(left)
                    right_ok = looks_name(right)
                    if left_ok and right_ok:
                        name = left if len(left) >= len(right) else right
                    elif left_ok:
                        name = left
                    elif right_ok:
                        name = right
                    break
            # Some local roster templates omit a dedicated id column.
            if not name:
                for v in row_vals:
                    if looks_name(v):
                        name = v
                        break
            if not emp_id:
                emp_id = extract_id_from_name(name)

            shift_map: Dict[str, str] = {}
            for day_num, col in dcols:
                code = norm(ws.cell(row=r, column=col).value).upper()
                if code:
                    shift_map[str(day_num)] = code

            # Skip totals/summary rows that don't contain shift codes.
            has_alpha_shift = any(any(ch.isalpha() for ch in code) for code in shift_map.values())
            if not has_alpha_shift:
                continue

            key = stable_emp_key(emp_id, name)
            if not key:
                continue
            rec = out.setdefault(key, {"id": emp_id, "name": name, "shifts": {}})
            if emp_id and not rec.get("id"):
                rec["id"] = emp_id
            if name and (not rec.get("name") or len(name) > len(rec.get("name") or "")):
                rec["name"] = name
            rec["shifts"].update(shift_map)

    if not parsed_any_sheet:
        raise ValueError("Could not detect day header row in any sheet")
    return out


def _align_records(
    old_data: Dict[str, Dict], new_data: Dict[str, Dict]
) -> List[Tuple[str, Dict, Dict]]:
    """Pair old/new employee records despite id/name-only key differences."""
    used_old: set[str] = set()
    pairs: List[Tuple[str, Dict, Dict]] = []

    old_by_id = {k[3:]: (k, v) for k, v in old_data.items() if k.startswith("id:")}
    old_name_items = [(k, v) for k, v in old_data.items() if k.startswith("name:")]

    for new_key, new_rec in new_data.items():
        old_key: Optional[str] = None
        old_rec: Optional[Dict] = None

        if new_key in old_data and new_key not in used_old:
            old_key, old_rec = new_key, old_data[new_key]
        else:
            nid = (new_rec.get("id") or "").strip() or (
                new_key[3:] if new_key.startswith("id:") else ""
            )
            if nid and nid in old_by_id and old_by_id[nid][0] not in used_old:
                old_key, old_rec = old_by_id[nid]
            else:
                for ok, orec in old_name_items:
                    if ok in used_old:
                        continue
                    if names_compatible(new_rec.get("name") or "", orec.get("name") or ""):
                        old_key, old_rec = ok, orec
                        break

        if old_key is not None and old_rec is not None:
            used_old.add(old_key)
            pairs.append((new_key, old_rec, new_rec))
        else:
            pairs.append((new_key, {"id": "", "name": "", "shifts": {}}, new_rec))

    for old_key, old_rec in old_data.items():
        if old_key in used_old:
            continue
        pairs.append((old_key, old_rec, {"id": "", "name": "", "shifts": {}}))

    pairs.sort(key=lambda t: t[0])
    return pairs


def build_diff(old_path: Path, new_path: Path) -> List[Dict]:
    old_data = parse_file(old_path)
    new_data = parse_file(new_path)
    changes: List[Dict] = []
    for emp_key, a, b in _align_records(old_data, new_data):
        days = sorted(set(a["shifts"].keys()) | set(b["shifts"].keys()), key=lambda x: int(x))
        display_id = b.get("id") or a.get("id") or emp_key
        display_name = b.get("name") or a.get("name") or ""
        for day in days:
            v1 = a["shifts"].get(day, "")
            v2 = b["shifts"].get(day, "")
            if v1 != v2:
                changes.append(
                    {
                        "emp_id": display_id,
                        "name": display_name,
                        "day": int(day),
                        "v1": v1,
                        "v2": v2,
                    }
                )
    return changes


def shifts_fingerprint(path: Path) -> str:
    """Hash of shift grids only (ignores name spelling / id column cosmetics)."""
    data = parse_file(path)
    chunks: List[Tuple[str, str]] = []
    for rec in data.values():
        shifts = rec.get("shifts") or {}
        shift_sig = ",".join(
            f"{day}:{shifts[day]}" for day in sorted(shifts.keys(), key=lambda x: int(x))
        )
        # Token identity stays stable when an id is added later or AL is inserted.
        toks = " ".join(sorted(name_tokens(rec.get("name") or "")))
        sid = (rec.get("id") or "").strip() or extract_id_from_name(rec.get("name") or "")
        ident = toks or (f"id:{sid}" if sid else "unknown")
        chunks.append((ident, shift_sig))
    chunks.sort()
    blob = "\n".join(f"{ident}|{sig}" for ident, sig in chunks).encode("utf-8")
    return hashlib.sha256(blob).hexdigest()


def shifts_equivalent(path_a: Path, path_b: Path) -> bool:
    return shifts_fingerprint(path_a) == shifts_fingerprint(path_b)


def main() -> None:
    p = argparse.ArgumentParser(description="Build roster diff JSON from old/new xlsx")
    p.add_argument("--old", required=True)
    p.add_argument("--new", required=True)
    p.add_argument("--old-label", default="", help="Display label for old source file")
    p.add_argument("--new-label", default="", help="Display label for new source file")
    p.add_argument("--kind", choices=["export", "import"], required=True)
    p.add_argument("--month", required=True, help="YYYY-MM")
    p.add_argument("--out-dir", default="docs/roster-diff/data")
    p.add_argument(
        "--skip-if-same-shifts-as",
        default="",
        help="If set to an xlsx path whose shift grid matches --new, do not rewrite outputs",
    )
    args = p.parse_args()

    old_path = Path(args.old)
    new_path = Path(args.new)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    if not re.fullmatch(r"\d{4}-\d{2}", args.month):
        raise SystemExit("month must be YYYY-MM")
    if not old_path.exists() or not new_path.exists():
        raise SystemExit("old/new file missing")

    skip_vs = Path(args.skip_if_same_shifts_as) if args.skip_if_same_shifts_as else None
    if skip_vs and skip_vs.is_file() and shifts_equivalent(skip_vs, new_path):
        print(
            f"SKIP cosmetic roster update: shifts unchanged vs {skip_vs.name} "
            f"(kept existing {args.kind}-{args.month}.json)"
        )
        return

    changes = build_diff(old_path, new_path)
    payload = {
        "kind": args.kind,
        "month": args.month,
        "generated_at": datetime.now(timezone.utc).replace(tzinfo=None).isoformat() + "Z",
        "old_file": (args.old_label or "").strip() or old_path.name,
        "new_file": (args.new_label or "").strip() or new_path.name,
        "total_changes": len(changes),
        "changes": changes,
    }

    month_file = out_dir / f"{args.kind}-{args.month}.json"
    latest_file = out_dir / f"{args.kind}-latest.json"

    # Never replace a non-empty published month diff with an empty one.
    if payload["total_changes"] == 0 and month_file.is_file():
        try:
            existing = json.loads(month_file.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            existing = {}
        if int(existing.get("total_changes") or 0) > 0:
            print(
                f"KEEP existing diff ({existing.get('total_changes')} changes); "
                "new compare produced 0 shift changes"
            )
            return

    month_file.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    latest_file.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"OK diff: {latest_file} ({len(changes)} changes)")


if __name__ == "__main__":
    main()
