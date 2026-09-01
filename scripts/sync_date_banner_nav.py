#!/usr/bin/env python3
"""Sync centered date picker + banner swipe loader from docs/index.html."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "index.html"

CSS_START = "    /* Date — with-me split layout (homepage trial) */"
CSS_END = "    a.summaryChip, button.summaryChip, .langToggle, .roster-cta-btn, button.shiftFilterBtn {"

LOADER = """
  (function loadDateBannerNav() {
    var root = typeof getSiteRootPath === 'function' ? getSiteRootPath() : '';
    if (!root) {
      var p = location.pathname || '/';
      root = p.replace(/\\/date\\/\\d{4}-\\d{2}-\\d{2}\\/.*$/i, '/').replace(/\\/now\\/.*$/i, '/').replace(/\\/+$/, '') || '';
    }
    var s = document.createElement('script');
    s.src = (root || '') + '/date-banner-nav.js?v=20260901e';
    document.head.appendChild(s);
  })();
"""

LOADER_MARKER = "loadDateBannerNav"
CLOSE_IIFE_RE = re.compile(
    r"(picker\.addEventListener\('change', function\(\) \{[\s\S]*?\n  \}\);\n)(?!\s*\(function loadDateBannerNav)",
    re.MULTILINE,
)


def extract_between(text: str, start: str, end: str) -> str:
    i = text.index(start)
    j = text.index(end, i)
    return text[i:j]


def iter_targets() -> list[Path]:
    out: list[Path] = [
        ROOT / "docs" / "index.html",
        ROOT / "docs" / "home.html",
        ROOT / "docs" / "now" / "index.html",
    ]
    date_root = ROOT / "docs" / "date"
    if date_root.is_dir():
        out.extend(sorted(date_root.glob("*/index.html")))
        out.extend(sorted(date_root.glob("*/now/index.html")))
    return out


def patch_file(path: Path, css_block: str) -> bool:
    text = path.read_text(encoding="utf-8")
    if "homeDateSplit" not in text:
        return False

    changed = False

    if CSS_START in text and CSS_END in text:
        old_css = extract_between(text, CSS_START, CSS_END)
        if old_css != css_block:
            text = text.replace(old_css, css_block, 1)
            changed = True

    if LOADER_MARKER not in text:
        m = CLOSE_IIFE_RE.search(text)
        if m:
            text = text[: m.end(1)] + LOADER + text[m.end(1) :]
            changed = True

    if changed:
        path.write_text(text, encoding="utf-8")
    return changed


def main() -> None:
    source = SOURCE.read_text(encoding="utf-8")
    css_block = extract_between(source, CSS_START, CSS_END)
    n = 0
    for path in iter_targets():
        if patch_file(path, css_block):
            print(f"patched {path.relative_to(ROOT)}")
            n += 1
    print(f"done: {n} file(s)")


if __name__ == "__main__":
    main()
