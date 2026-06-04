#!/usr/bin/env python3
"""Inject wc-vote-promo.js into all roster HTML pages that use loadLocalEnhancements."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
VER = "20260604b"
MARKER = "wc-vote-promo.js"
INJECT_LINE = "    addScript(root + '/wc-vote-promo.js?v=' + ver);"

LOAD_SECONDARY_RE = re.compile(
    r"(function loadSecondary\(\) \{[\s\S]*?)(  \})",
    re.MULTILINE,
)


def patch_load_block(text: str) -> tuple[str, bool]:
    if MARKER in text:
        return text, False
    if "function loadSecondary()" not in text:
        return text, False

    def repl(m: re.Match[str]) -> str:
        body = m.group(1)
        if MARKER in body:
            return m.group(0)
        # After site-share.js if present, else at start of loadSecondary body
        if "site-share.js" in body:
            body = body.replace(
                "addScript(root + '/site-share.js?v=' + ver);",
                "addScript(root + '/site-share.js?v=' + ver);\n" + INJECT_LINE,
                1,
            )
        else:
            body = body.rstrip() + "\n" + INJECT_LINE + "\n"
        return body + m.group(2)

    new_text, n = LOAD_SECONDARY_RE.subn(repl, text, count=1)
    return new_text, n > 0


def patch_site_apps_modal(text: str) -> tuple[str, bool]:
    if 'data-app-id="wcvote"' in text:
        return text, False
    if 'id="siteAppsGrid"' not in text:
        return text, False
    needle = '<div class="siteAppsGrid" id="siteAppsGrid">'
    insert = (
        needle
        + '\n      <a class="siteAppsLink siteAppsLink--wcvote" href="https://match-accb0.web.app/?utm_source=roster-site&utm_medium=apps" target="_blank" rel="noopener noreferrer" data-app-id="wcvote">'
        + '\n        <span class="siteAppsLink-icon">🏆</span>'
        + '\n        <span class="siteAppsLink-text">'
        + '\n          <span class="siteAppsLink-title" data-i18n="wcvote">World Cup Fan Vote</span>'
        + '\n          <span class="siteAppsLink-sub" data-i18n-sub="wcvote">Vote for your team</span>'
        + '\n        </span>'
        + '\n      </a>'
    )
    if needle not in text:
        return text, False
    return text.replace(needle, insert, 1), True


def main() -> int:
    updated = 0
    for path in sorted(DOCS.rglob("*.html")):
        text = path.read_text(encoding="utf-8")
        changed = False
        new_text, c1 = patch_load_block(text)
        if c1:
            text = new_text
            changed = True
        new_text, c2 = patch_site_apps_modal(text)
        if c2:
            text = new_text
            changed = True
        if changed:
            path.write_text(text, encoding="utf-8", newline="\n")
            updated += 1
    print(f"patched_html={updated}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
