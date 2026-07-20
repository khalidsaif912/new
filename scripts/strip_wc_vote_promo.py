#!/usr/bin/env python3
"""Strip World Cup vote promo / results UI from docs HTML and related sources."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"

SCRIPT_LINE_RE = re.compile(
    r"^[ \t]*addScript\(root \+ '/wc-vote-promo\.js\?v=' \+ ver\);\r?\n",
    re.MULTILINE,
)
WCVOTE_CSS_RE = re.compile(
    r"\n[ \t]*\.siteAppsLink--wcvote\s*\{.*?"
    r"\.siteAppsLink--wcvote \.siteAppsLink-sub\s*\{[^}]*\}\s*",
    re.DOTALL,
)
WCVOTE_LINK_RE = re.compile(
    r"\n[ \t]*<a class=\"siteAppsLink siteAppsLink--wcvote\"[\s\S]*?</a>\s*",
    re.MULTILINE,
)
VER_RE = re.compile(r"var ver = '20260719[a-z]'")


def strip_html(text: str) -> str:
    text = SCRIPT_LINE_RE.sub("", text)
    text = WCVOTE_CSS_RE.sub("\n", text)
    text = WCVOTE_LINK_RE.sub("\n", text)
    text = VER_RE.sub("var ver = '20260720a'", text)
    text = text.replace("var ver = '20260719j'", "var ver = '20260720a'")
    text = text.replace("var ver = '20260719i'", "var ver = '20260720a'")
    text = text.replace("var ver = '20260719h'", "var ver = '20260720a'")
    return text


def main() -> int:
    n = 0
    for path in sorted(DOCS.rglob("*.html")):
        old = path.read_text(encoding="utf-8")
        new = strip_html(old)
        if new != old:
            path.write_text(new, encoding="utf-8", newline="\n")
            n += 1
    print(f"stripped {n} html files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
