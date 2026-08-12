#!/usr/bin/env python3
"""Sync PDF circulars from an inbox folder into docs/read-and-sign/.

Default inbox: <repo>/read-and-sign-inbox
Override: --inbox PATH   or env READ_AND_SIGN_INBOX

Copies new/changed PDFs to docs/read-and-sign/files/ and writes circulars.json.
Run manually anytime, or on a schedule (Task Scheduler / Power Automate → script).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS_DIR = ROOT / "docs" / "read-and-sign"
FILES_DIR = DOCS_DIR / "files"
CATALOG = DOCS_DIR / "circulars.json"
DEFAULT_INBOX = ROOT / "read-and-sign-inbox"


def slugify(name: str) -> str:
    base = Path(name).stem
    base = re.sub(r"[^\w\u0600-\u06FF\-]+", "-", base, flags=re.UNICODE)
    base = re.sub(r"-{2,}", "-", base).strip("-_")
    return (base or "circular")[:80].lower()


def title_from_name(name: str) -> str:
    stem = Path(name).stem
    stem = re.sub(r"[_\-]+", " ", stem).strip()
    return stem or name


def file_date(path: Path) -> str:
    # Prefer YYYY-MM-DD prefix in filename
    m = re.match(r"^(\d{4}-\d{2}-\d{2})", path.stem)
    if m:
        return m.group(1)
    ts = path.stat().st_mtime
    return datetime.fromtimestamp(ts).strftime("%Y-%m-%d")


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()[:16]


def collect_pdfs(inbox: Path) -> list[Path]:
    if not inbox.is_dir():
        return []
    return sorted(
        [p for p in inbox.iterdir() if p.is_file() and p.suffix.lower() == ".pdf"],
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )


def sync(inbox: Path) -> dict:
    FILES_DIR.mkdir(parents=True, exist_ok=True)
    pdfs = collect_pdfs(inbox)
    circulars: list[dict] = []
    used_ids: set[str] = set()

    for src in pdfs:
        digest = sha256_file(src)
        base_id = slugify(src.name)
        cid = base_id
        if cid in used_ids:
            cid = f"{base_id}-{digest[:6]}"
        used_ids.add(cid)

        dest_name = f"{cid}.pdf"
        dest = FILES_DIR / dest_name
        if not dest.exists() or sha256_file(dest) != digest:
            shutil.copy2(src, dest)

        circulars.append(
            {
                "id": cid,
                "title": title_from_name(src.name),
                "date": file_date(src),
                "file": f"files/{dest_name}",
                "bytes": dest.stat().st_size,
                "hash": digest,
                "sourceName": src.name,
            }
        )

    # Also include any PDFs already in files/ that are not from this inbox pass
    # (keeps manually dropped files visible).
    known_files = {c["file"] for c in circulars}
    for existing in sorted(FILES_DIR.glob("*.pdf"), key=lambda p: p.stat().st_mtime, reverse=True):
        rel = f"files/{existing.name}"
        if rel in known_files:
            continue
        cid = slugify(existing.name)
        if cid in used_ids:
            cid = f"{cid}-{sha256_file(existing)[:6]}"
        used_ids.add(cid)
        circulars.append(
            {
                "id": cid,
                "title": title_from_name(existing.name),
                "date": file_date(existing),
                "file": rel,
                "bytes": existing.stat().st_size,
                "hash": sha256_file(existing),
                "sourceName": existing.name,
            }
        )

    circulars.sort(key=lambda c: (c.get("date") or "", c.get("id") or ""), reverse=True)

    payload = {
        "updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": str(inbox),
        "count": len(circulars),
        "circulars": circulars,
    }
    CATALOG.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return payload


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync Read and Sign PDF circulars")
    parser.add_argument(
        "--inbox",
        default=os.environ.get("READ_AND_SIGN_INBOX") or str(DEFAULT_INBOX),
        help="Folder containing PDF circulars",
    )
    args = parser.parse_args()
    inbox = Path(args.inbox).expanduser().resolve()
    if not inbox.exists():
        inbox.mkdir(parents=True, exist_ok=True)
        print(f"Created empty inbox: {inbox}")
    result = sync(inbox)
    print(f"Synced {result['count']} circular(s) -> {CATALOG}")
    for c in result["circulars"][:10]:
        print(f"  - {c['date']}  {c['title']}  ({c['file']})")
    if result["count"] > 10:
        print(f"  … and {result['count'] - 10} more")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
