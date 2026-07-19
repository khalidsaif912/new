#!/usr/bin/env python3
"""Restore early inline banner CSS (cover) in generated HTML pages."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

NEW = "background:#1e3a8a!important;background-image:none!important"
OLD = (
    "background-image:url(\"' + bUrl.replace(/\"/g, '') + '\")!important;"
    "background-size:cover!important;background-position:62% center!important;"
    "background-repeat:no-repeat!important"
)


def main() -> int:
    n = 0
    for p in ROOT.joinpath("docs").rglob("*.html"):
        t = p.read_text(encoding="utf-8")
        if NEW not in t:
            continue
        p.write_text(t.replace(NEW, OLD), encoding="utf-8")
        n += 1
    print(f"Reverted {n} file(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
