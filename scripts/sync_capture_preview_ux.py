#!/usr/bin/env python3
"""Sync capture sheet CSS + snapshot layout JS across roster HTML pages."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

CSS_OLD = """    .captureSheet {
      position:fixed; inset:0; display:none; align-items:flex-end; justify-content:center;
      background:rgba(15,23,42,.38); z-index:9999; padding:14px;
      pointer-events:none; visibility:hidden;
    }
    .captureSheet.open { display:flex; pointer-events:auto; visibility:visible; }
    .captureSheetCard {
      width:min(100%,420px); background:#fff; border-radius:16px; padding:12px;
      border:1px solid rgba(15,23,42,.1); box-shadow:0 16px 40px rgba(15,23,42,.24);
    }
    .capturePreviewImg {
      display:block; width:100%; max-width:100%; height:auto; border-radius:12px;
      border:1px solid #e2e8f0; margin:0 0 10px; background:#f8fafc;
    }"""

CSS_NEW = """    .captureSheet {
      position:fixed; inset:0; display:none; align-items:center; justify-content:center;
      background:rgba(15,23,42,.38); z-index:9999; padding:12px 10px;
      pointer-events:none; visibility:hidden;
    }
    .captureSheet.open { display:flex; pointer-events:auto; visibility:visible; }
    .captureSheetCard {
      width:min(100%,420px); max-height:min(92dvh, 900px); overflow-y:auto;
      background:#fff; border-radius:16px; padding:12px;
      border:1px solid rgba(15,23,42,.1); box-shadow:0 16px 40px rgba(15,23,42,.24);
      -webkit-overflow-scrolling:touch;
    }
    .capturePreviewWrap {
      max-height:min(62dvh, 560px); overflow-y:auto; overflow-x:hidden;
      margin:0 0 10px; border-radius:12px; border:1px solid #e2e8f0; background:#f8fafc;
      -webkit-overflow-scrolling:touch;
    }
    .capturePreviewImg {
      display:block; width:100%; max-width:100%; height:auto; margin:0;
      border:none; border-radius:0; background:transparent;
    }"""


def main() -> None:
    ref = ROOT / "docs" / "date" / "2026-06-02" / "index.html"
    js = ref.read_text(encoding="utf-8")
    a = js.find("function openCaptureSheet")
    b = js.find("function goToEmployeeSchedule", a)
    if a < 0 or b < 0:
        raise SystemExit("Reference JS markers missing")
    new_js = js[a:b]

    css_patched = js_patched = 0
    for path in sorted(ROOT.joinpath("docs").rglob("*.html")):
        text = path.read_text(encoding="utf-8")
        orig = text
        if CSS_OLD in text:
            text = text.replace(CSS_OLD, CSS_NEW, 1)
            css_patched += 1
        if "function openCaptureSheet" in text:
            ca = text.find("function openCaptureSheet")
            cb = text.find("function goToEmployeeSchedule", ca)
            if ca >= 0 and cb > ca and "injectCaptureSnapshotStyles" not in text[ca:cb]:
                text = text[:ca] + new_js + text[cb:]
                js_patched += 1
        if text != orig:
            path.write_text(text, encoding="utf-8")
    print(f"CSS patched: {css_patched}, JS patched: {js_patched}")


if __name__ == "__main__":
    main()
