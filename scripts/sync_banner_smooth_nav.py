#!/usr/bin/env python3
"""Smoother banner paint when navigating between date pages."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "docs"

OLD_EARLY_DOUBLE = """    try {{
      var bn = localStorage.getItem('roster_banner_choice');
      if (bn && /^banner\\d+\\.jpg$/i.test(bn)) {{
        var bUrl = base + 'assets/banners/' + bn;
        if (!document.getElementById('banner-early-style')) {{
          var bes = document.createElement('style');
          bes.id = 'banner-early-style';
          bes.textContent =
            'html.roster-banner-early .header,html.roster-banner-early .topbar{{background-image:url("' + bUrl.replace(/"/g, '') + '")!important;background-size:cover!important;background-position:62% center!important;background-repeat:no-repeat!important}}' +
            'html.roster-banner-early .header::before,html.roster-banner-early .header::after{{opacity:0!important}}';
          document.head.appendChild(bes);
        }}
        if (!document.querySelector('link[data-banner-preload="1"]')) {{
          var bp = document.createElement('link');
          bp.rel = 'preload';
          bp.as = 'image';
          bp.href = bUrl;
          bp.setAttribute('data-banner-preload', '1');
          document.head.appendChild(bp);
        }}
        document.documentElement.classList.add('roster-banner-early');
      }}
    }} catch (bannerEarlyErr) {{}}"""

OLD_EARLY_SINGLE = """    try {
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

NEW_EARLY_DOUBLE = """    try {{
      var bn = localStorage.getItem('roster_banner_choice');
      var paintRe = /^(banner\\d+\\.jpg|custom:[a-z0-9]{{8,32}})$/i;
      if (bn && paintRe.test(bn)) {{
        var bUrl = '';
        var bPos = '62% center';
        try {{
          var cached = JSON.parse(sessionStorage.getItem('roster_banner_paint_cache') || 'null');
          if (cached && cached.name === bn && cached.url) {{
            bUrl = cached.url;
            if (cached.pos) bPos = cached.pos;
          }}
        }} catch (cacheErr) {{}}
        if (!bUrl && /^banner\\d+\\.jpg$/i.test(bn)) {{
          bUrl = base + 'assets/banners/' + bn;
        }}
        if (bUrl) {{
          if (!document.getElementById('banner-early-style')) {{
            var bes = document.createElement('style');
            bes.id = 'banner-early-style';
            bes.textContent =
              'html.roster-banner-early .header,html.roster-banner-early .topbar{{background-image:url("' + bUrl.replace(/"/g, '') + '")!important;background-size:cover!important;background-position:' + bPos + '!important;background-repeat:no-repeat!important}}' +
              'html.roster-banner-early .header::before,html.roster-banner-early .header::after,html.roster-banner-early .topbar::before,html.roster-banner-early .topbar::after{{content:none!important;opacity:0!important;display:none!important}}' +
              'html.roster-banner-early .header.homeDateSplit{{padding:26px 18px 12px!important}}';
            document.head.appendChild(bes);
          }}
          if (!document.querySelector('link[data-banner-preload="1"]')) {{
            var bp = document.createElement('link');
            bp.rel = 'preload';
            bp.as = 'image';
            bp.href = bUrl;
            bp.setAttribute('data-banner-preload', '1');
            document.head.appendChild(bp);
          }}
          document.documentElement.classList.add('roster-banner-early');
        }}
      }}
    }} catch (bannerEarlyErr) {{}}"""

NEW_EARLY_SINGLE = """    try {
      var bn = localStorage.getItem('roster_banner_choice');
      var paintRe = /^(banner\\d+\\.jpg|custom:[a-z0-9]{8,32})$/i;
      if (bn && paintRe.test(bn)) {
        var bUrl = '';
        var bPos = '62% center';
        try {
          var cached = JSON.parse(sessionStorage.getItem('roster_banner_paint_cache') || 'null');
          if (cached && cached.name === bn && cached.url) {
            bUrl = cached.url;
            if (cached.pos) bPos = cached.pos;
          }
        } catch (cacheErr) {}
        if (!bUrl && /^banner\\d+\\.jpg$/i.test(bn)) {
          bUrl = base + 'assets/banners/' + bn;
        }
        if (bUrl) {
          if (!document.getElementById('banner-early-style')) {
            var bes = document.createElement('style');
            bes.id = 'banner-early-style';
            bes.textContent =
              'html.roster-banner-early .header,html.roster-banner-early .topbar{background-image:url("' + bUrl.replace(/"/g, '') + '")!important;background-size:cover!important;background-position:' + bPos + '!important;background-repeat:no-repeat!important}' +
              'html.roster-banner-early .header::before,html.roster-banner-early .header::after,html.roster-banner-early .topbar::before,html.roster-banner-early .topbar::after{content:none!important;opacity:0!important;display:none!important}' +
              'html.roster-banner-early .header.homeDateSplit{padding:26px 18px 12px!important}';
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
      }
    } catch (bannerEarlyErr) {}"""

BANNER_IN_SECONDARY = """    addScript(root + '/banner-store.js?v=20260831g');
    addScript(root + '/banner-changer.js?v="""

HOME_DATE_SPLIT_OLD = """    .header.homeDateSplit {
      padding-bottom:52px;
    }"""

HOME_DATE_SPLIT_NEW = """    .header.homeDateSplit {
      display:grid;
      grid-template-columns:28px minmax(0,1fr) 28px;
      grid-template-rows:auto auto;
      align-items:center;
      direction:ltr;
      padding:26px 18px 12px;
      min-height:0;
    }"""


def patch_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    orig = text

    if OLD_EARLY_DOUBLE in text:
        text = text.replace(OLD_EARLY_DOUBLE, NEW_EARLY_DOUBLE, 1)
    elif OLD_EARLY_SINGLE in text:
        text = text.replace(OLD_EARLY_SINGLE, NEW_EARLY_SINGLE, 1)

    if "banner-changer.js?v=20260901h" not in text and BANNER_IN_SECONDARY in text:
        text = text.replace(
            "  addScript(root + '/wc-final-celebrate.js?v=' + ver);\n  function loadSecondary() {",
            "  addScript(root + '/wc-final-celebrate.js?v=' + ver);\n"
            "  addScript(root + '/banner-store.js?v=20260831g');\n"
            "  addScript(root + '/banner-changer.js?v=20260901h');\n"
            "  function loadSecondary() {",
            1,
        )
        idx = text.find(BANNER_IN_SECONDARY)
        if idx != -1:
            end = text.find("\n  }", idx)
            if end != -1:
                block = text[idx:end]
                if "banner-changer.js" in block:
                    text = text[:idx] + text[end + 1 :]

    text = text.replace("banner-changer.js?v=20260901d", "banner-changer.js?v=20260901h")
    text = text.replace("banner-changer.js?v=20260831j", "banner-changer.js?v=20260901h")
    text = text.replace("banner-changer.js?v=20260901f", "banner-changer.js?v=20260901h")
    text = text.replace("banner-changer.js?v=20260901g", "banner-changer.js?v=20260901h")

    if HOME_DATE_SPLIT_OLD in text and HOME_DATE_SPLIT_NEW not in text:
        text = text.replace(HOME_DATE_SPLIT_OLD, HOME_DATE_SPLIT_NEW, 1)

    if text != orig:
        path.write_text(text, encoding="utf-8")
        return True
    return False


def main() -> None:
    n = 0
    for html in ROOT.rglob("*.html"):
        if patch_file(html):
            n += 1
    print(f"Updated {n} HTML files")


if __name__ == "__main__":
    main()
