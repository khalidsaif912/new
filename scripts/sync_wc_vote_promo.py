#!/usr/bin/env python3
"""Inject wc-vote-promo.js and sync loadLocalEnhancements on roster HTML pages."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
sys.path.insert(0, str(ROOT / "scripts"))

from roster_cta_snippets import (  # noqa: E402
    IOS_PERF_VER,
    LOAD_LOCAL_ENHANCEMENTS_EXPORT,
    LOAD_LOCAL_ENHANCEMENTS_IMPORT,
)

MARKER = "wc-vote-promo.js"
INJECT_LINE = "    addScript(root + '/wc-vote-promo.js?v=' + ver);"
CELEBRATE_MARKER = "wc-final-celebrate.js"
CELEBRATE_LINE = "    addScript(root + '/wc-final-celebrate.js?v=' + ver);"

LOAD_SECONDARY_RE = re.compile(
    r"(function loadSecondary\(\) \{[\s\S]*?)(  \})",
    re.MULTILINE,
)

LOAD_LOCAL_RE = re.compile(
    r"\(function loadLocalEnhancements\(\) \{[\s\S]*?\}\)\(\);",
    re.MULTILINE,
)

INDEX_LOAD = {
    DOCS / "index.html": LOAD_LOCAL_ENHANCEMENTS_EXPORT.strip(),
    DOCS / "import" / "index.html": LOAD_LOCAL_ENHANCEMENTS_IMPORT.strip(),
    DOCS / "now" / "index.html": LOAD_LOCAL_ENHANCEMENTS_EXPORT.strip(),
}


def patch_load_block(text: str) -> tuple[str, bool]:
    if "function loadSecondary()" not in text:
        return text, False
    changed = False

    if MARKER not in text:

        def repl(m: re.Match[str]) -> str:
            body = m.group(1)
            if MARKER in body:
                return m.group(0)
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
        if n > 0:
            text = new_text
            changed = True

    if CELEBRATE_MARKER not in text and MARKER in text:
        if INJECT_LINE in text and CELEBRATE_LINE not in text:
            text = text.replace(INJECT_LINE, INJECT_LINE + "\n" + CELEBRATE_LINE, 1)
            changed = True
        elif "wc-vote-promo.js?v=' + ver);" in text and CELEBRATE_LINE not in text:
            text = text.replace(
                "addScript(root + '/wc-vote-promo.js?v=' + ver);",
                "addScript(root + '/wc-vote-promo.js?v=' + ver);\n" + CELEBRATE_LINE,
                1,
            )
            changed = True

    return text, changed


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


def bump_ver(text: str) -> tuple[str, bool]:
    old = re.findall(r"var ver = '\d{8}[a-z]'", text)
    if not old:
        return text, False
    new_line = f"var ver = '{IOS_PERF_VER}'"
    out = text
    changed = False
    for o in set(old):
        if o != new_line:
            out = out.replace(o, new_line)
            changed = True
    return out, changed


def patch_index_load(text: str, path: Path) -> tuple[str, bool]:
    block = INDEX_LOAD.get(path)
    if not block or "function loadLocalEnhancements()" not in text:
        return text, False
    new_text, n = LOAD_LOCAL_RE.subn(block + "\n", text, count=1)
    return new_text, n > 0


def patch_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    orig = text
    text, _ = bump_ver(text)
    if path in INDEX_LOAD:
        text, _ = patch_index_load(text, path)
    text, _ = patch_load_block(text)
    text, _ = patch_site_apps_modal(text)
    if text != orig:
        path.write_text(text, encoding="utf-8", newline="\n")
        return True
    return False


def main() -> int:
    updated = 0
    for path in sorted(DOCS.rglob("*.html")):
        if patch_file(path):
            print("patched", path.relative_to(ROOT))
            updated += 1
    print(f"done: {updated} file(s), ver={IOS_PERF_VER}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
