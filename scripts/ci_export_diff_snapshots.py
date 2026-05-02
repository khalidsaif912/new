#!/usr/bin/env python3
"""
Stage export roster snapshots on Linux CI so build_roster_diff can run like
scripts/export/load_local_month.ps1 (previous vs current for the same YYYY-MM).

Env:
  ROSTER_FILENAME — same body as EXPORT source_name.txt (used to detect month).

Usage:
  python scripts/ci_export_diff_snapshots.py before
  python scripts/ci_export_diff_snapshots.py after
"""

from __future__ import annotations

import hashlib
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from roster_app.cache_io import month_key_from_filename  # noqa: E402

PRE_RUN_OLD = "_pre_run_old.xlsx"


def _month_key() -> str | None:
    name = (os.environ.get("ROSTER_FILENAME") or "").strip()
    if not name:
        return None
    return month_key_from_filename(name)


def _paths(month: str) -> tuple[Path, Path, Path, Path, Path]:
    rosters = ROOT / "rosters"
    backup = rosters / ".versions" / month
    return (
        rosters,
        backup,
        backup / "last_ingested.xlsx",
        backup / "last_hash.txt",
        backup / PRE_RUN_OLD,
    )


def _sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def before_generate() -> int:
    month = _month_key()
    if not month:
        print("[ci_export_diff] before: no month from ROSTER_FILENAME — skip")
        return 0
    rosters, backup, last_ingested, _last_hash, pre_old = _paths(month)
    backup.mkdir(parents=True, exist_ok=True)
    if pre_old.exists():
        pre_old.unlink()
    target = rosters / f"{month}.xlsx"
    if last_ingested.is_file():
        shutil.copy2(last_ingested, pre_old)
        print(f"[ci_export_diff] before: staged last_ingested -> {pre_old.name}")
    elif target.is_file():
        shutil.copy2(target, pre_old)
        print(f"[ci_export_diff] before: staged {target.name} -> {pre_old.name}")
    else:
        print("[ci_export_diff] before: no baseline (first run for this month)")
    return 0


def after_generate() -> int:
    month = _month_key()
    if not month:
        print("[ci_export_diff] after: no month from ROSTER_FILENAME — skip")
        return 0
    rosters, backup, last_ingested, last_hash_f, pre_old = _paths(month)
    backup.mkdir(parents=True, exist_ok=True)
    new_path = rosters / f"{month}.xlsx"
    if not new_path.is_file():
        print(f"[ci_export_diff] after: missing {new_path}")
        return 0

    incoming_hash = _sha256_file(new_path)
    same_as_last = False
    if last_hash_f.is_file():
        prev_h = last_hash_f.read_text(encoding="utf-8").strip()
        if prev_h == incoming_hash:
            same_as_last = True
            print("[ci_export_diff] after: hash unchanged — keep existing export-latest.json")

    if pre_old.is_file() and not same_as_last:
        build_py = ROOT / "scripts" / "build_roster_diff.py"
        out_dir = ROOT / "docs" / "roster-diff" / "data"
        cmd = [
            sys.executable,
            str(build_py),
            "--old",
            str(pre_old),
            "--new",
            str(new_path),
            "--kind",
            "export",
            "--month",
            month,
            "--out-dir",
            str(out_dir),
        ]
        print("[ci_export_diff] after: build_roster_diff.py ...")
        subprocess.run(cmd, check=True)
    elif not pre_old.is_file():
        print("[ci_export_diff] after: first version — diff starts on next update")

    shutil.copy2(new_path, backup / "current.xlsx")
    shutil.copy2(new_path, last_ingested)
    last_hash_f.write_text(incoming_hash, encoding="utf-8")
    if pre_old.is_file():
        shutil.copy2(pre_old, backup / "previous.xlsx")

    if pre_old.exists():
        pre_old.unlink()

    return 0


def main() -> None:
    if len(sys.argv) != 2 or sys.argv[1] not in ("before", "after"):
        print("Usage: python scripts/ci_export_diff_snapshots.py before|after", file=sys.stderr)
        sys.exit(2)
    fn = before_generate if sys.argv[1] == "before" else after_generate
    sys.exit(fn())


if __name__ == "__main__":
    main()
