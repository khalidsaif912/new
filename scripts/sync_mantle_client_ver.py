#!/usr/bin/env python3
"""Point already-generated pages at the current MANTLE_CLIENT_VER.

Shared Mantle JS (docs/*.js) is not regenerated from Excel, so pages published
before a JS change keep loading the old cached ?v= URL. Run this after bumping
MANTLE_CLIENT_VER in scripts/roster_cta_snippets.py.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from roster_cta_snippets import MANTLE_CLIENT_VER  # noqa: E402

# Keep this class alphanumeric. A greedy .+ eats a closing quote or backtick
# and can leave a <script> that fails to parse. roster-diff used to embed
# banner-changer inside its boot script that way; the page then stayed on
# "No diff loaded yet." The loader is now a normal script tag. This check
# still refuses to write any page whose ?v= token is left unclosed.
_JS = r"(?:site-visits|banner-store|banner-changer|announce-popup|holiday-ticker)"
PATTERN = re.compile(rf"(({_JS})\.js\?v=)[0-9A-Za-z]+")
TOKEN = re.compile(rf"{_JS}\.js\?v=[0-9A-Za-z]+")
CLOSED = re.compile(rf"{_JS}\.js\?v=[0-9A-Za-z]+[`'\"]")
# Broken roster-diff loader: version, then newline, then `s.defer`.
HEAL_TEMPLATE = re.compile(
    rf"({_JS}\.js\?v=[0-9A-Za-z]+)(\s*\n\s*s\.defer\b)"
)


def rewrite_mantle_versions(text: str, version: str) -> str:
    updated = PATTERN.sub(lambda m: m.group(1) + version, text)
    updated = HEAL_TEMPLATE.sub(r"\1`;\2", updated)
    if len(TOKEN.findall(updated)) != len(CLOSED.findall(updated)):
        raise SystemExit(
            "Mantle ?v= token is not closed by a quote or backtick; "
            "refusing to write a page whose script would fail to parse"
        )
    return updated


def main() -> int:
    pending: list[tuple[Path, str]] = []
    for path in (ROOT / "docs").rglob("*.html"):
        text = path.read_text(encoding="utf-8")
        updated = rewrite_mantle_versions(text, MANTLE_CLIENT_VER)
        if updated != text:
            pending.append((path, updated))
    for path, updated in pending:
        path.write_text(updated, encoding="utf-8", newline="\n")
    print(f"MANTLE_CLIENT_VER={MANTLE_CLIENT_VER}: updated {len(pending)} html files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
