#!/usr/bin/env python3
"""Sync early banner paint + PWA v13 across generated docs HTML."""
from __future__ import annotations

from pathlib import Path

BANNER_EARLY_BLOCK = """
    try {
      var bn = localStorage.getItem('roster_banner_choice');
      if (bn && /^banner\\d+\\.jpg$/i.test(bn)) {
        var bUrl = base + 'assets/banners/' + bn;
        if (!document.getElementById('banner-early-style')) {
          var bes = document.createElement('style');
          bes.id = 'banner-early-style';
          bes.textContent =
            'html.roster-banner-early .header,html.roster-banner-early .topbar{background-image:url("' + bUrl.replace(/"/g, '') + '")!important;background-size:cover!important;background-position:62% center!important;background-repeat:no-repeat!important}' +
            'html.roster-banner-early .header::before,html.roster-banner-early .header::after{opacity:0!important}';
          document.head.appendChild(bes);
        }
        if (!document.querySelector('link[data-banner-preload="1"]')) {
          var bp = document.createElement('link');
          bp.rel = 'preload';
          bp.as = 'image';
          bp.href = bUrl;
          bp.setAttribute('data-banner-preload', '1');
          document.head.appendChild(bp);
        }
        document.documentElement.classList.add('roster-banner-early');
      }
    } catch (bannerEarlyErr) {}"""

MARKER = "banner-early-style"
ANCHOR = "    touch.href = base + 'assets/icons/icon-192.png';"


def patch_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    orig = text
    if MARKER not in text and ANCHOR in text:
        text = text.replace(
            ANCHOR,
            ANCHOR + BANNER_EARLY_BLOCK,
            1,
        )
    text = text.replace("var pv = '12';", "var pv = '13';")
    text = text.replace('install-pwa.js?v=12', 'install-pwa.js?v=13')
    if text != orig:
        path.write_text(text, encoding="utf-8")
        return True
    return False


def main() -> None:
    root = Path(__file__).resolve().parents[1] / "docs"
    n = 0
    for html in root.rglob("*.html"):
        if patch_file(html):
            n += 1
    print(f"Updated {n} HTML files")


if __name__ == "__main__":
    main()
