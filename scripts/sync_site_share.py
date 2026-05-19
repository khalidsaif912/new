#!/usr/bin/env python3
"""Add site share button, modal, and site-share.js to roster HTML pages."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"

SHARE_BTN = (
    '  <button type="button" class="btn shareSiteBtn" id="shareSiteBtn">'
    "🔗 Share Site</button>\n"
)

MODAL_HTML = """
<div id="siteShareSheet" class="siteShareSheet" aria-hidden="true">
  <div class="siteShareCard" role="dialog" aria-labelledby="siteShareTitle">
    <h2 class="siteShareTitle" id="siteShareTitle">Share this site</h2>
    <p class="siteShareHint" id="siteShareHint">Scan the QR code or share the link</p>
    <motion class="siteShareQr" id="siteShareQr" aria-hidden="true"></div>
    <p class="siteShareUrl" id="siteShareUrl"></p>
    <div class="siteShareActions">
      <button type="button" class="siteShareBtn siteShareNativeBtn" id="siteShareNativeBtn">Share</button>
      <button type="button" class="siteShareBtn siteShareWhatsAppBtn" id="siteShareWhatsAppBtn">WhatsApp</button>
      <button type="button" class="siteShareBtn siteShareCopyBtn" id="siteShareCopyBtn">Copy link</button>
    </div>
    <button type="button" class="siteShareBtn siteShareCloseBtn" id="siteShareCloseBtn">Close</button>
  </div>
</motion>
""".replace("<motion", "<div").replace("</motion>", "</div>")

COMPARE_LINE = re.compile(
    r'(<a[^>]*id="compareBtn"[^>]*>.*?</a>\s*\n)',
    re.IGNORECASE | re.DOTALL,
)

LOAD_LINE = "addScript(root + '/site-share.js?v=' + ver);"


def patch_html(text: str) -> tuple[str, list[str]]:
    notes: list[str] = []
    if 'class="quickActions"' not in text:
        return text, notes

    if 'id="shareSiteBtn"' not in text:
        if COMPARE_LINE.search(text):
            text = COMPARE_LINE.sub(r"\1" + SHARE_BTN, text, count=1)
        else:
            text = text.replace(
                "</div>\n\n  <!-- ════ FOOTER ════ -->",
                SHARE_BTN + "</div>\n\n  <!-- ════ FOOTER ════ -->",
                1,
            )
        notes.append("btn")

    if 'id="siteShareSheet"' not in text:
        anchor = '<div id="captureBusy"'
        if anchor in text:
            text = text.replace(anchor, MODAL_HTML + "\n" + anchor, 1)
            notes.append("modal")

    if LOAD_LINE not in text and "loadLocalEnhancements" in text:
        text = text.replace(
            "addScript(root + '/ios-tap-fix.js",
            LOAD_LINE + "\n  addScript(root + '/ios-tap-fix.js",
            1,
        )
        notes.append("script")

    if "var ver = '20260520a'" not in text and "var ver = '" in text:
        text = re.sub(r"var ver = '[^']+';", "var ver = '20260520a';", text, count=1)
        notes.append("ver")

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
