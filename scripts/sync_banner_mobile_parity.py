#!/usr/bin/env python3
"""Unify roster banner appearance on mobile with desktop."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"

PWA_HEAD_BLOCK = """
  <meta name="theme-color" content="#f4354b">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="mobile-web-app-capable" content="yes">
  <script>
  (function () {
    function siteRoot() {
      if (location.protocol === 'file:') return '';
      var path = location.pathname || '/';
      if (path.indexOf('/roster-site/') !== -1) return '/roster-site';
      if (location.hostname && location.hostname.endsWith('github.io')) {
        var segs = path.split('/').filter(Boolean);
        if (segs.length >= 2 && segs[1] === 'docs') return '/' + segs[0] + '/docs';
        return segs.length ? '/' + segs[0] : '';
      }
      return '';
    }
    var p = siteRoot();
    var base = location.origin + p + (p && p.charAt(p.length - 1) !== '/' ? '/' : '');
    if (!p) base = location.origin + '/';
    var pv = '13';
    var imp = (location.pathname || '').indexOf('/import/') !== -1;
    var man = base + (imp ? 'import/manifest.json' : 'manifest.json') + '?v=' + pv;
    var mlinks = document.querySelectorAll('link[rel="manifest"]');
    var link = mlinks.length ? mlinks[0] : null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'manifest';
      document.head.appendChild(link);
    }
    link.href = man;
    for (var i = 1; i < mlinks.length; i++) mlinks[i].remove();
    var touch = document.querySelector('link[rel="apple-touch-icon"][data-pwa-touch="1"]');
    if (!touch) {
      touch = document.createElement('link');
      touch.rel = 'apple-touch-icon';
      touch.setAttribute('data-pwa-touch', '1');
      document.head.appendChild(touch);
    }
    touch.href = base + 'assets/icons/icon-192.png';
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
    } catch (bannerEarlyErr) {}
  })();
  </script>
"""

BANNER_TITLE_SHRINK_RE = re.compile(
    r"\s*\.header \.bannerTitleMain \{ font-size:22px; \}\s*"
    r"body\.ar \.header \.bannerTitleMain \{ font-size:21px; \}\s*",
    re.MULTILINE,
)


def patch_html(text: str, path: Path) -> tuple[str, list[str]]:
    notes: list[str] = []
    if 'class="header"' not in text and "class='header'" not in text:
        return text, notes

    new_text, n = BANNER_TITLE_SHRINK_RE.subn("\n      ", text)
    if n:
        notes.append("drop-mobile-title-shrink")
        text = new_text

    if "background-position:center!important" in text:
        text = text.replace(
            "background-position:center!important",
            "background-position:62% center!important",
        )
        notes.append("banner-pos-62")

    if 'name="theme-color"' not in text and "</head>" in text:
        rel = str(path.relative_to(DOCS)).replace("\\", "/")
        if rel.startswith("import/") and "my-schedules" not in rel:
            text = text.replace("</head>", PWA_HEAD_BLOCK + "\n</head>", 1)
            notes.append("inject-pwa-head")

    return text, notes


def main() -> int:
    changed = 0
    for path in sorted(DOCS.rglob("*.html")):
        raw = path.read_text(encoding="utf-8")
        updated, notes = patch_html(raw, path)
        if updated != raw:
            path.write_text(updated, encoding="utf-8", newline="\n")
            changed += 1
            if changed <= 8 or "--verbose" in sys.argv:
                print(f"{path.relative_to(ROOT)}: {', '.join(notes)}")
    print(f"patched {changed} html files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
