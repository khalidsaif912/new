#!/usr/bin/env python3
"""
Decide whether CI should regenerate roster pages (export or import).

Detects changes by:
  1) Source filename text URL (EXPORT_SOURCE_NAME_URL / IMPORT_SOURCE_NAME_URL)
  2) SHA-256 of the remote Excel file (same name, updated workbook)

Does NOT mutate last_filename.txt / import_last_filename.txt — those are updated
only after a successful generate_* run.

Usage:
  python scripts/ci_roster_change_gate.py export
  python scripts/ci_roster_change_gate.py import
"""

from __future__ import annotations

import argparse
import hashlib
import os
import sys
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from roster_app.cache_io import download_excel, looks_like_roster_month_filename, month_key_from_filename  # noqa: E402

MUSCAT = timezone(timedelta(hours=4))


def _http_get_text(url: str) -> str:
    last_err: Exception | None = None
    for attempt in range(1, 4):
        try:
            r = requests.get(url, timeout=25)
            r.raise_for_status()
            return r.text.strip()
        except requests.RequestException as e:
            last_err = e
            print(f"Fetch attempt {attempt}/3 failed: {e}")
            if attempt < 3:
                time.sleep(2 * attempt)
    raise last_err  # type: ignore[misc]


def _sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8").strip()
    except OSError:
        return ""


def _stored_hash(rosters_kind: str, month_key: str) -> str:
    base = ROOT / ("rosters" if rosters_kind == "export" else "import-rosters")
    p = base / ".versions" / month_key / "last_hash.txt"
    return _read_text(p)


def _cached_xlsx_hash(rosters_kind: str, month_key: str) -> str:
    base = ROOT / ("rosters" if rosters_kind == "export" else "import-rosters")
    p = base / f"{month_key}.xlsx"
    if not p.is_file():
        return ""
    return _sha256_bytes(p.read_bytes())


def _write_github_output(pairs: dict[str, str]) -> None:
    out = os.environ.get("GITHUB_OUTPUT")
    if not out:
        return
    with open(out, "a", encoding="utf-8") as f:
        for k, v in pairs.items():
            f.write(f"{k}={v}\n")


def _email_window(now: datetime) -> bool:
    email_hours = {5, 13, 21}
    return now.hour in email_hours and now.minute < 20


def gate_export() -> int:
    source_url = (
        os.getenv("EXPORT_SOURCE_NAME_URL") or os.getenv("SOURCE_NAME_URL") or ""
    ).strip()
    excel_url = (os.getenv("EXPORT_EXCEL_URL") or os.getenv("EXCEL_URL") or "").strip()
    if not source_url:
        print("::error::Missing EXPORT_SOURCE_NAME_URL")
        return 1

    current_name = _http_get_text(source_url)
    if not current_name:
        print("::error::Export source name is empty")
        return 1

    old_name = _read_text(ROOT / "last_filename.txt") or "none"
    name_changed = old_name != current_name
    month_key = month_key_from_filename(current_name) or ""
    if looks_like_roster_month_filename(current_name) and not month_key:
        print(f"::error::Could not detect month from export filename: {current_name}")
        return 1

    content_changed = False
    remote_hash = ""
    if excel_url and month_key:
        try:
            data = download_excel(excel_url)
            remote_hash = _sha256_bytes(data)
            stored = _stored_hash("export", month_key)
            cached = _cached_xlsx_hash("export", month_key)
            if not stored and not cached:
                content_changed = True
                print("No prior hash for month; treat Excel as new")
            elif stored and stored != remote_hash:
                content_changed = True
                print(f"Excel hash changed (stored): {stored[:12]}.. -> {remote_hash[:12]}..")
            elif cached and cached != remote_hash:
                content_changed = True
                print(f"Excel hash changed (cached xlsx): {cached[:12]}.. -> {remote_hash[:12]}..")
            else:
                print("Excel hash unchanged")
        except Exception as e:
            print(f"::warning::Could not download export Excel for hash check: {e}")
            content_changed = name_changed
    else:
        print("Skipping Excel hash check (missing URL or month)")

    is_manual = os.getenv("GITHUB_EVENT_NAME") == "workflow_dispatch"
    now = datetime.now(MUSCAT)
    should_process = name_changed or content_changed or is_manual
    should_send_email = name_changed or content_changed or _email_window(now)

    print(f"Current file: {current_name}")
    print(f"Previous file: {old_name}")
    print(f"Month key: {month_key or 'unknown'}")
    print(f"Name changed: {name_changed}")
    print(f"Content changed: {content_changed}")
    print(f"Manual dispatch: {is_manual}")
    print(f"Should process: {should_process}")
    print(f"Should send email: {should_send_email}")

    _write_github_output(
        {
            "changed": str(name_changed or content_changed).lower(),
            "name_changed": str(name_changed).lower(),
            "content_changed": str(content_changed).lower(),
            "should_process": str(should_process).lower(),
            "should_send_email": str(should_send_email).lower(),
            "is_scheduled_email": str(_email_window(now)).lower(),
            "filename": current_name,
            "old_filename": old_name,
            "month_key": month_key,
            "remote_hash": remote_hash,
        }
    )
    return 0


def gate_import() -> int:
    source_url = (os.getenv("IMPORT_SOURCE_NAME_URL") or "").strip()
    excel_url = (os.getenv("IMPORT_EXCEL_URL") or "").strip()
    if not source_url:
        print("::error::Missing IMPORT_SOURCE_NAME_URL")
        return 1

    current_name = _http_get_text(source_url)
    if not current_name:
        print("::error::Import source name is empty")
        return 1

    old_name = _read_text(ROOT / "import_last_filename.txt") or "none"
    name_changed = old_name != current_name
    month_key = month_key_from_filename(current_name) or ""
    if looks_like_roster_month_filename(current_name) and not month_key:
        print(f"::error::Could not detect month from import filename: {current_name}")
        return 1

    content_changed = False
    remote_hash = ""
    if excel_url and month_key:
        try:
            data = download_excel(excel_url)
            remote_hash = _sha256_bytes(data)
            stored = _stored_hash("import", month_key)
            cached = _cached_xlsx_hash("import", month_key)
            if not stored and not cached:
                content_changed = True
            elif stored and stored != remote_hash:
                content_changed = True
            elif cached and cached != remote_hash:
                content_changed = True
            else:
                print("Import Excel hash unchanged")
        except Exception as e:
            print(f"::warning::Could not download import Excel for hash check: {e}")
            content_changed = name_changed
    else:
        print("Skipping import Excel hash check")

    is_manual = os.getenv("GITHUB_EVENT_NAME") == "workflow_dispatch"
    should_process = name_changed or content_changed or is_manual

    print(f"Current file: {current_name}")
    print(f"Previous file: {old_name}")
    print(f"Month key: {month_key or 'unknown'}")
    print(f"Name changed: {name_changed}")
    print(f"Content changed: {content_changed}")
    print(f"Manual dispatch: {is_manual}")
    print(f"Should process: {should_process}")

    _write_github_output(
        {
            "changed": str(name_changed or content_changed).lower(),
            "name_changed": str(name_changed).lower(),
            "content_changed": str(content_changed).lower(),
            "should_process": str(should_process).lower(),
            "filename": current_name,
            "old_filename": old_name,
            "month_key": month_key,
            "remote_hash": remote_hash,
        }
    )
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("kind", choices=("export", "import"))
    args = parser.parse_args()
    if args.kind == "export":
        return gate_export()
    return gate_import()


if __name__ == "__main__":
    raise SystemExit(main())
