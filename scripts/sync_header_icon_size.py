#!/usr/bin/env python3
"""Shrink language and banner-changer header buttons across roster HTML pages."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"

REPLACEMENTS = [
    (
        "min-width:auto; height:auto; padding:4px;\n      display:inline-flex; flex-direction:column; align-items:center; justify-content:center;\n      gap:2px; color:#fff; font-size:0; cursor:pointer;",
        "min-width:auto; height:auto; padding:2px;\n      display:inline-flex; flex-direction:column; align-items:center; justify-content:center;\n      gap:1px; color:#fff; font-size:0; cursor:pointer;",
    ),
    (
        "display:block; width:18px; height:18px;\n      filter:drop-shadow(0 1px 2px rgba(0,0,0,.55));",
        "display:block; width:13px; height:13px;\n      filter:drop-shadow(0 1px 2px rgba(0,0,0,.55));",
    ),
    (
        ".langToggle-label {\n      font-size:10px; font-weight:800; line-height:1; letter-spacing:.02em;",
        ".langToggle-label {\n      font-size:8px; font-weight:800; line-height:1; letter-spacing:.02em;",
    ),
    (
        "min-width:auto; min-height:auto; padding:4px;",
        "min-width:auto; min-height:auto; padding:2px;",
    ),
    (
        "display:block; width:20px; height:20px;\n      filter:drop-shadow(0 1px 2px rgba(0,0,0,.55));",
        "display:block; width:13px; height:13px;\n      filter:drop-shadow(0 1px 2px rgba(0,0,0,.55));",
    ),
    (
        ".langToggle { padding:6px; min-width:44px; min-height:44px; }\n      .langToggle-icon svg { width:20px; height:20px; }\n      .langToggle-label { font-size:11px; }\n      #banner-changer-btn { padding:6px; min-width:44px; min-height:44px; }\n      #banner-changer-btn .banner-changer-icon svg { width:22px; height:22px; }",
        ".langToggle { padding:2px; min-width:0; min-height:0; }\n      .langToggle-icon svg { width:13px; height:13px; }\n      .langToggle-label { font-size:8px; }\n      #banner-changer-btn { padding:2px; min-width:0; min-height:0; }\n      #banner-changer-btn .banner-changer-icon svg { width:13px; height:13px; }",
    ),
    (
        ".langToggle { padding:6px; }\n      .langToggle-icon svg { width:20px; height:20px; }\n      .langToggle-label { font-size:11px; }\n      #banner-changer-btn { padding:6px; }\n      #banner-changer-btn .banner-changer-icon svg { width:22px; height:22px; }",
        ".langToggle { padding:2px; }\n      .langToggle-icon svg { width:13px; height:13px; }\n      .langToggle-label { font-size:8px; }\n      #banner-changer-btn { padding:2px; }\n      #banner-changer-btn .banner-changer-icon svg { width:13px; height:13px; }",
    ),
    (
        "grid-template-columns:44px minmax(0,1fr) 44px",
        "grid-template-columns:28px minmax(0,1fr) 28px",
    ),
    (
        ".langToggle      { width:44px; height:44px; min-width:44px; min-height:44px; font-size:12px; }",
        ".langToggle      { width:auto; height:auto; min-width:0; min-height:0; font-size:8px; }",
    ),
    ("banner-changer.js?v=20260901h", "banner-changer.js?v=20260901i"),
    ("banner-changer.js?v=20260901a", "banner-changer.js?v=20260901i"),
]

SIZE_MARKER = """    body.ar .header.homeDateSplit #banner-changer-btn {
      grid-column:1;
      left:auto !important;
      right:auto !important;
    }"""

SIZE_BLOCK = """    body.ar .header.homeDateSplit #banner-changer-btn {
      grid-column:1;
      left:auto !important;
      right:auto !important;
    }
    .header.homeDateSplit .langToggle,
    .header.homeDateSplit #langToggle,
    .header.homeDateSplit #banner-changer-btn {
      padding:2px;
      min-width:0;
      min-height:0;
      width:auto;
      height:auto;
    }
    .header.homeDateSplit .langToggle-icon svg,
    .header.homeDateSplit #banner-changer-btn .banner-changer-icon svg {
      width:13px;
      height:13px;
    }
    .header.homeDateSplit .langToggle-label { font-size:8px; }"""


def patch_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    orig = text
    for old, new in REPLACEMENTS:
        text = text.replace(old, new)
    if SIZE_MARKER in text and ".header.homeDateSplit .langToggle-label { font-size:8px; }" not in text:
        text = text.replace(SIZE_MARKER, SIZE_BLOCK, 1)
    if text == orig:
        return False
    path.write_text(text, encoding="utf-8")
    return True


def main() -> None:
    patched = 0
    for path in DOCS.rglob("*.html"):
        if patch_file(path):
            patched += 1
    print(f"patched {patched} file(s)")


if __name__ == "__main__":
    main()
