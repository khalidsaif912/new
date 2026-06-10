#!/usr/bin/env python3
"""Patch PWA head snippets: disable service worker on iOS, bump PWA v14."""

from __future__ import annotations

from pathlib import Path

SW_BLOCK = """    try {
      var iOS = /iP(hone|ad|od)/i.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      if (iOS && 'serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function(regs) {
          regs.forEach(function(r) { r.unregister(); });
        });
      }
    } catch (swIosErr) {}"""

ANCHOR = "    touch.href = base + 'assets/icons/icon-192.png';"
MARKER = "swIosErr"


def patch_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    orig = text
    if MARKER not in text and ANCHOR in text:
        text = text.replace(ANCHOR, ANCHOR + "\n" + SW_BLOCK, 1)
    text = text.replace("var pv = '13';", "var pv = '14';")
    text = text.replace("install-pwa.js?v=13", "install-pwa.js?v=14")
    text = text.replace("var ver = '20260604g';", "var ver = '20260610a';")
    if text != orig:
        path.write_text(text, encoding="utf-8")
        return True
    return False


def main() -> None:
    root = Path(__file__).resolve().parents[1] / "docs"
    n = sum(1 for html in root.rglob("*.html") if patch_file(html))
    print(f"Patched {n} HTML files")


if __name__ == "__main__":
    main()
