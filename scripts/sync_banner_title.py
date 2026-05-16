#!/usr/bin/env python3
"""Sync two-line banner title styling across export roster HTML pages."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"

NEW_H1 = """<h1 id="pageTitle" class="bannerTitle">
      <span class="bannerTitleEyebrow" id="pageTitleEyebrow">Export</span>
      <span class="bannerTitleMain" id="pageTitleMain">Duty Roster</span>
    </h1>"""

OLD_H1 = re.compile(
    r'<h1\s+id="pageTitle">Export Duty Roster</h1>',
    re.IGNORECASE,
)

HEADER_H1_CSS = re.compile(
    r"\.header h1\s*\{[^}]+\}",
)

BANNER_TITLE_CSS = """.header .bannerTitle {
      margin:0;
      position:relative;
      z-index:1;
      line-height:1.1;
      color:#fff;
    }
    .header .bannerTitleEyebrow {
      display:block;
      font-size:11px;
      font-weight:700;
      letter-spacing:.22em;
      text-transform:uppercase;
      opacity:.88;
      margin-bottom:5px;
    }
    .header .bannerTitleMain {
      display:block;
      font-size:28px;
      font-weight:800;
      letter-spacing:-.03em;
    }
    body.ar .header .bannerTitleEyebrow {
      letter-spacing:.06em;
      text-transform:none;
      font-size:12px;
    }
    body.ar .header .bannerTitleMain {
      font-size:26px;
      letter-spacing:0;
    }"""

MOBILE_OLD = re.compile(r"\.header h1\s*\{\s*font-size:21px;\s*\}")
MOBILE_NEW = """.header .bannerTitleMain { font-size:22px; }
      body.ar .header .bannerTitleMain { font-size:21px; }"""


def patch_html(text: str) -> tuple[str, list[str]]:
    notes: list[str] = []
    if "Export Duty Roster" not in text and "pageTitleEyebrow" not in text:
        return text, notes

    if OLD_H1.search(text):
        text = OLD_H1.sub(NEW_H1, text, count=1)
        notes.append("h1")

    if ".bannerTitleMain" not in text and HEADER_H1_CSS.search(text):
        text = HEADER_H1_CSS.sub(BANNER_TITLE_CSS, text, count=1)
        notes.append("css")
    elif ".bannerTitleMain" not in text and ".header h1" in text:
        text = text.replace(".header h1 {", BANNER_TITLE_CSS + "\n    .header h1 {", 1)
        notes.append("css-inject")

    if MOBILE_OLD.search(text):
        text = MOBILE_OLD.sub(MOBILE_NEW, text, count=1)
        notes.append("mobile-css")

    if "title:'Export Duty Roster'" in text:
        text = text.replace(
            "title:'Export Duty Roster', langBtn:'ع',",
            "titleEyebrow:'Export', titleMain:'Duty Roster', langBtn:'ع',",
            1,
        )
        notes.append("t-en")

    if "title:'جدول الصادر'" in text:
        text = text.replace(
            "title:'جدول الصادر', langBtn:'EN',",
            "titleEyebrow:'الصادر', titleMain:'جدول المناوبات', langBtn:'EN',",
            1,
        )
        notes.append("t-ar")

    old_apply = "var el=document.getElementById('pageTitle'); if(el) el.textContent=t.title;"
    new_apply = """var eyebrow=document.getElementById('pageTitleEyebrow');
  var main=document.getElementById('pageTitleMain');
  if(eyebrow) eyebrow.textContent=t.titleEyebrow;
  if(main) main.textContent=t.titleMain;"""
    if old_apply in text:
        text = text.replace(old_apply, new_apply, 1)
        notes.append("applyLang")

    return text, notes


def main() -> int:
    changed = 0
    for path in sorted(DOCS.rglob("*.html")):
        raw = path.read_text(encoding="utf-8")
        if "pageTitle" not in raw:
            continue
        if "/import/" in str(path).replace("\\", "/") and "Export Duty Roster" not in raw:
            continue
        updated, notes = patch_html(raw)
        if updated != raw:
            path.write_text(updated, encoding="utf-8", newline="\n")
            changed += 1
            if changed <= 3 or "--verbose" in sys.argv:
                print(f"{path.relative_to(ROOT)}: {', '.join(notes)}")
    print(f"patched {changed} files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
