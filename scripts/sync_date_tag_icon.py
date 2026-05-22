#!/usr/bin/env python3
"""Replace date emoji with line SVG icon and remove date text-shadow on custom banners."""

from __future__ import annotations

import re
from pathlib import Path

from roster_date_snippets import (
    DATE_TAG_CSS_PATCH,
    DATE_TAG_CSS_RE,
    DATE_TAG_SPAN_RE,
    IMPORT_PICKER_CHANGE_BROKEN,
    IMPORT_PICKER_CHANGE_FIXED,
    SYNC_HEADER_JS_REPLACEMENTS,
    date_tag_html,
)

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"

BANNER_DATE_SHADOW_OLD = (
    "'.' + ACTIVE_CLASS + ' .dateTag{',\n"
    "      'color:#fff!important;text-shadow:' + TEXT_HALO + ';',"
)
BANNER_DATE_SHADOW_NEW = (
    "'.' + ACTIVE_CLASS + ' .dateTag{',\n"
    "      'color:#fff!important;',"
)


def patch_html(html: str) -> str:
    if "dateTagLabel" not in html and 'id="dateTag"' in html:

        def _span_sub(m: re.Match[str]) -> str:
            return date_tag_html(m.group(1).strip())

        html = DATE_TAG_SPAN_RE.sub(_span_sub, html)

    if ".dateTag-icon svg" not in html and ".header .dateTag" in html:
        html = DATE_TAG_CSS_RE.sub(DATE_TAG_CSS_PATCH, html, count=1)

    for pattern, replacement in SYNC_HEADER_JS_REPLACEMENTS:
        html = pattern.sub(replacement, html)

    if IMPORT_PICKER_CHANGE_BROKEN in html:
        html = html.replace(IMPORT_PICKER_CHANGE_BROKEN, IMPORT_PICKER_CHANGE_FIXED)

    return html


def patch_banner_changer(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    orig = text
    if BANNER_DATE_SHADOW_OLD in text:
        text = text.replace(BANNER_DATE_SHADOW_OLD, BANNER_DATE_SHADOW_NEW, 1)
    if text != orig:
        path.write_text(text, encoding="utf-8")
        return True
    return False


def main() -> None:
    n = 0
    for html_path in DOCS.rglob("*.html"):
        text = html_path.read_text(encoding="utf-8")
        if 'id="dateTag"' not in text:
            continue
        updated = patch_html(text)
        if updated != text:
            html_path.write_text(updated, encoding="utf-8")
            n += 1

    if patch_banner_changer(DOCS / "banner-changer.js"):
        print("patched docs/banner-changer.js")

    gen = ROOT / "generate_and_send.py"
    if gen.exists():
        text = gen.read_text(encoding="utf-8")
        updated = patch_html(text)
        if ".header .dateTag {{" in updated and ".dateTag-icon svg" not in updated:
            updated = re.sub(
                r"    \.header \.dateTag \{\{[^}]+\}\}",
                DATE_TAG_CSS_PATCH.replace(".header .dateTag {", ".header .dateTag {{")
                + "}",
                updated,
                count=1,
            )
        if updated != text:
            gen.write_text(updated, encoding="utf-8")
            print("patched generate_and_send.py")

    print(f"patched {n} html files")


if __name__ == "__main__":
    main()
