#!/usr/bin/env python3
"""
Stage export roster snapshots on Linux CI so build_roster_diff can run like
scripts/export/load_local_month.ps1.

Published month diff is always **first edition (baseline) → latest**, so a later
hotfix (e.g. missing employee id) cannot wipe the meaningful first→second delta
by overwriting export-YYYY-MM.json with an empty previous→current compare.

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

from roster_app.cache_io import month_key_from_filename, workbook_content_fingerprint  # noqa: E402

PRE_RUN_OLD = "_pre_run_old.xlsx"
PRE_RUN_OLD_SOURCE_NAME = "_pre_run_old_source_name.txt"
LAST_SOURCE_NAME = "last_source_name.txt"
BASELINE_XLSX = "baseline.xlsx"
BASELINE_SOURCE_NAME = "baseline_source_name.txt"


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


def _name_paths(backup: Path) -> tuple[Path, Path]:
    return backup / LAST_SOURCE_NAME, backup / PRE_RUN_OLD_SOURCE_NAME


def _sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def before_generate() -> int:
    month = _month_key()
    current_source_name = (os.environ.get("ROSTER_FILENAME") or "").strip()
    if not month:
        print("[ci_export_diff] before: no month from ROSTER_FILENAME — skip")
        return 0
    rosters, backup, last_ingested, _last_hash, pre_old = _paths(month)
    last_source_name_file, pre_old_source_name_file = _name_paths(backup)
    backup.mkdir(parents=True, exist_ok=True)
    if pre_old.exists():
        pre_old.unlink()
    if pre_old_source_name_file.exists():
        pre_old_source_name_file.unlink()
    target = rosters / f"{month}.xlsx"
    if last_ingested.is_file():
        shutil.copy2(last_ingested, pre_old)
        print(f"[ci_export_diff] before: staged last_ingested -> {pre_old.name}")
    elif target.is_file():
        shutil.copy2(target, pre_old)
        print(f"[ci_export_diff] before: staged {target.name} -> {pre_old.name}")
    else:
        print("[ci_export_diff] before: no baseline (first run for this month)")

    previous_source_name = ""
    if last_source_name_file.is_file():
        previous_source_name = last_source_name_file.read_text(encoding="utf-8").strip()
    if previous_source_name:
        pre_old_source_name_file.write_text(previous_source_name, encoding="utf-8")
        print(f"[ci_export_diff] before: staged previous source name -> {pre_old_source_name_file.name}")
    elif current_source_name:
        # Fallback for first metadata-enabled run.
        pre_old_source_name_file.write_text(current_source_name, encoding="utf-8")
        print(f"[ci_export_diff] before: seeded source name fallback -> {pre_old_source_name_file.name}")
    return 0


def after_generate() -> int:
    month = _month_key()
    current_source_name = (os.environ.get("ROSTER_FILENAME") or "").strip()
    if not month:
        print("[ci_export_diff] after: no month from ROSTER_FILENAME — skip")
        return 0
    rosters, backup, last_ingested, last_hash_f, pre_old = _paths(month)
    last_source_name_file, pre_old_source_name_file = _name_paths(backup)
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

    baseline = backup / BASELINE_XLSX
    baseline_name_file = backup / BASELINE_SOURCE_NAME

    # Freeze the first edition of the month; later hotfixes must not replace it.
    if not baseline.is_file():
        if pre_old.is_file():
            shutil.copy2(pre_old, baseline)
            if pre_old_source_name_file.is_file():
                baseline_name_file.write_text(
                    pre_old_source_name_file.read_text(encoding="utf-8").strip(),
                    encoding="utf-8",
                )
            print("[ci_export_diff] after: froze previous ingest as baseline.xlsx (first edition)")
        else:
            shutil.copy2(new_path, baseline)
            if current_source_name:
                baseline_name_file.write_text(current_source_name, encoding="utf-8")
            print("[ci_export_diff] after: froze current file as baseline.xlsx (first edition)")

    if not same_as_last and baseline.is_file() and baseline.resolve() != new_path.resolve():
        # Skip building when this is still the first edition (baseline == new bytes).
        if _sha256_file(baseline) == incoming_hash:
            print("[ci_export_diff] after: first version only — diff starts on next update")
        else:
            build_py = ROOT / "scripts" / "build_roster_diff.py"
            out_dir = ROOT / "docs" / "roster-diff" / "data"
            old_source_label = ""
            if baseline_name_file.is_file():
                old_source_label = baseline_name_file.read_text(encoding="utf-8").strip()
            if not old_source_label and pre_old_source_name_file.is_file():
                old_source_label = pre_old_source_name_file.read_text(encoding="utf-8").strip()
            cmd = [
                sys.executable,
                str(build_py),
                "--old",
                str(baseline),
                "--new",
                str(new_path),
                "--old-label",
                old_source_label or "first edition",
                "--new-label",
                current_source_name or new_path.name,
                "--kind",
                "export",
                "--month",
                month,
                "--out-dir",
                str(out_dir),
            ]
            # Cosmetic hotfix (same shifts as last ingest): do not rewrite published diff.
            if pre_old.is_file():
                cmd.extend(["--skip-if-same-shifts-as", str(pre_old)])
            print("[ci_export_diff] after: build_roster_diff.py (baseline → latest) ...")
            subprocess.run(cmd, check=True)
    elif not baseline.is_file():
        print("[ci_export_diff] after: first version — diff starts on next update")

    shutil.copy2(new_path, backup / "current.xlsx")
    shutil.copy2(new_path, last_ingested)
    last_hash_f.write_text(incoming_hash, encoding="utf-8")
    try:
        fp = workbook_content_fingerprint(new_path.read_bytes())
        (backup / "last_content_fp.txt").write_text(fp, encoding="utf-8")
        print(f"[ci_export_diff] after: content fingerprint {fp[:16]}..")
    except Exception as e:
        print(f"[ci_export_diff] after: fingerprint skipped ({e})")
    if pre_old.is_file():
        shutil.copy2(pre_old, backup / "previous.xlsx")

    if pre_old.exists():
        pre_old.unlink()
    if pre_old_source_name_file.exists():
        pre_old_source_name_file.unlink()
    if current_source_name:
        last_source_name_file.write_text(current_source_name, encoding="utf-8")

    return 0


def main() -> None:
    if len(sys.argv) != 2 or sys.argv[1] not in ("before", "after"):
        print("Usage: python scripts/ci_export_diff_snapshots.py before|after", file=sys.stderr)
        sys.exit(2)
    fn = before_generate if sys.argv[1] == "before" else after_generate
    sys.exit(fn())


if __name__ == "__main__":
    main()
