#!/usr/bin/env python3
"""Sync site publish time footer + site-last-updated.json across export pages."""
from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
MUSCAT = ZoneInfo("Asia/Muscat")


def format_display(dt: datetime) -> str:
    try:
        day = dt.strftime("%-d")
    except ValueError:
        day = dt.strftime("%d").lstrip("0") or dt.strftime("%d")
    return f"{day} {dt.strftime('%B %Y')} / {dt.strftime('%H:%M')}"


def write_json_meta(dt: datetime) -> None:
    display = format_display(dt)
    path = DOCS / "site-last-updated.json"
    path.write_text(
        json.dumps(
            {
                "updated_at": dt.isoformat(),
                "display_en": display,
                "display_ar": display,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {path} -> {display}")


FOOTER_STRONG = re.compile(
    r'(<strong style="color:#475569;font-size:13px;">Last Updated:</strong> )'
    r'<strong style="color:#1e40af;">([^<]*)</strong><br>',
)
FOOTER_STRONG_NEW = (
    r'\1<strong style="color:#1e40af;" id="siteLastUpdated" '
    r'data-site-last-updated="1">\2</strong><br>'
)

SCRIPT_LINE = "  addScript(root + '/site-last-updated.js?v=' + ver);"


def patch_html(path: Path, display: str) -> bool:
    text = path.read_text(encoding="utf-8")
    orig = text

    if 'id="siteLastUpdated"' not in text:
        text = FOOTER_STRONG.sub(FOOTER_STRONG_NEW, text, count=1)

    if "site-last-updated.js" not in text and "loadLocalEnhancements" in text:
        text = text.replace(
            "  addScript(root + '/install-pwa.js?v=' + ver);\n",
            "  addScript(root + '/install-pwa.js?v=' + ver);\n" + SCRIPT_LINE + "\n",
            1,
        )

    if 'id="siteLastUpdated"' in text:
        m = re.search(
            r'(<strong[^>]*id="siteLastUpdated"[^>]*>)[^<]*(</strong>)',
            text,
        )
        if m:
            text = text[: m.start()] + m.group(1) + display + m.group(2) + text[m.end() :]

    if text != orig:
        path.write_text(text, encoding="utf-8")
        return True
    return False


def main() -> None:
    now = datetime.now(MUSCAT)
    write_json_meta(now)
    display = format_display(now)
    n = 0
    for html in DOCS.rglob("index.html"):
        if "/import/" in html.as_posix():
            continue
        if patch_html(html, display):
            n += 1
    print(f"Patched {n} HTML files")


if __name__ == "__main__":
    main()
