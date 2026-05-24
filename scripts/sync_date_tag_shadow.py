#!/usr/bin/env python3
"""Add dual-tone date tag text-shadow for light/dark banner backgrounds."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"

TEXT_SHADOW = (
    "text-shadow:0 1px 2px rgba(0,0,0,.72),"
    "0 0 5px rgba(0,0,0,.38),0 0 1px rgba(255,255,255,.5);"
)
ICON_FILTER = (
    "filter:drop-shadow(0 1px 1px rgba(0,0,0,.7)) "
    "drop-shadow(0 0 2px rgba(255,255,255,.45));"
)

DATE_TAG_RE = re.compile(
    r"(    \.header \.dateTag \{[^}]*?color:#fff;\s*)"
    r"(\})",
    re.DOTALL,
)

LABEL_RE = re.compile(
    r"(    \.dateTag-label \{\s*line-height:1\.2;\s*pointer-events:none;\s*)"
    r"(\})",
    re.DOTALL,
)

SVG_RE = re.compile(
    r"(    \.dateTag-icon svg \{\s*display:block;\s*width:16px;\s*height:16px;\s*"
    r"(?:pointer-events:none;\s*)?)"
    r"(\})",
    re.DOTALL,
)


def patch_html(text: str) -> tuple[str, list[str]]:
    notes: list[str] = []
    if 'id="dateTag"' not in text:
        return text, notes

    if TEXT_SHADOW.split(";")[0] not in text and DATE_TAG_RE.search(text):

        def tag_sub(m: re.Match[str]) -> str:
            body = m.group(1)
            if "text-shadow:" in body:
                return m.group(0)
            return body + "\n      " + TEXT_SHADOW + "\n    " + m.group(2)

        text = DATE_TAG_RE.sub(tag_sub, text, count=1)
        notes.append("dateTag")

    if "dateTag-label" in text and LABEL_RE.search(text):
        if ".dateTag-label" in text and TEXT_SHADOW.split(";")[0] not in re.search(
            r"\.dateTag-label \{[^}]+\}", text, re.DOTALL
        ).group(0):  # type: ignore[union-attr]

            def label_sub(m: re.Match[str]) -> str:
                body = m.group(1)
                if "text-shadow:" in body:
                    return m.group(0)
                return body + TEXT_SHADOW + "\n    " + m.group(2)

            text = LABEL_RE.sub(label_sub, text, count=1)
            notes.append("label")

    if ".dateTag-icon svg" in text and SVG_RE.search(text):
        block = SVG_RE.search(text)
        if block and "filter:drop-shadow" not in block.group(0):

            def svg_sub(m: re.Match[str]) -> str:
                body = m.group(1)
                if "filter:" in body:
                    return m.group(0)
                if "pointer-events:none;" not in body:
                    body += "      pointer-events:none;\n      "
                return body + ICON_FILTER + "\n    " + m.group(2)

            text = SVG_RE.sub(svg_sub, text, count=1)
            notes.append("icon")

    return text, notes


def main() -> int:
    changed = 0
    for path in sorted(DOCS.rglob("*.html")):
        raw = path.read_text(encoding="utf-8")
        updated, notes = patch_html(raw)
        if updated != raw:
            path.write_text(updated, encoding="utf-8", newline="\n")
            changed += 1
            if changed <= 5 or "--verbose" in sys.argv:
                print(f"patched {path.relative_to(ROOT)}: {', '.join(notes)}")
    print(f"patched {changed} html files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
