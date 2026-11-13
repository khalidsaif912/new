#!/usr/bin/env python3
"""Fail the build if the live Leaves-chip counter comes back.

The counter (``chipValNum`` / ``leavesChipNum`` + ``countLeavesChip``) was
removed from the generators and from the published pages. Generated HTML is
rewritten on every roster update, so this guard runs after generate and fails
the workflow instead of silently republishing the number.

Usage: python scripts/ci_guard_leaves_chip.py [--source-only]
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

FORBIDDEN = ("chipValNum", "leavesChipNum", "countLeavesChip")

SOURCE_GLOBS = ("*.py", "scripts/*.py")
SKIP_DIRS = {
    ".git",
    ".github",
    "tmp",
    "_tmp_chrome_out",
    "__pycache__",
    "node_modules",
}


def _iter_files(base: Path, pattern: str):
    for path in base.glob(pattern):
        if path.is_file():
            yield path


def _scan_sources() -> list[str]:
    hits: list[str] = []
    for pattern in SOURCE_GLOBS:
        for path in _iter_files(ROOT, pattern):
            if path.name == Path(__file__).name:
                continue
            try:
                text = path.read_text(encoding="utf-8")
            except (OSError, UnicodeDecodeError):
                continue
            for token in FORBIDDEN:
                if token in text and path.name != "sync_leaves_chip_no_count.py":
                    hits.append(f"{path.relative_to(ROOT)}: {token}")
    return hits


def _scan_docs() -> list[str]:
    hits: list[str] = []
    docs = ROOT / "docs"
    if not docs.is_dir():
        return hits
    for path in docs.rglob("*.html"):
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        for token in FORBIDDEN:
            if token in text:
                hits.append(f"{path.relative_to(ROOT)}: {token}")
                break
    return hits


def main() -> int:
    source_only = "--source-only" in sys.argv[1:]
    problems = _scan_sources()
    if not source_only:
        problems += _scan_docs()
    if not problems:
        print("leaves chip guard: OK (no counter in generators or docs)")
        return 0
    print("leaves chip guard: FAILED — the Leaves chip counter is back:")
    for line in problems[:40]:
        print(f"  {line}")
    if len(problems) > 40:
        print(f"  ... and {len(problems) - 40} more")
    print(
        "Remove it from the generator (scripts/roster_cta_snippets.py "
        "CHIP_LEAVES_HTML + generate_and_send.py), then run "
        "python scripts/sync_leaves_chip_no_count.py."
    )
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
