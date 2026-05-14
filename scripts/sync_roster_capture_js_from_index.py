#!/usr/bin/env python3
"""Copy openCaptureSheet + snapshot helpers + captureRosterElement from docs/index.html into stale roster HTML.

Stale pages (e.g. docs/date/.../index.html) were generated before mobile-width capture and shift banner
logic; they still used 680px and captureRosterElement(shiftCard, 'shift') without the section header.
"""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

CSS_OLD = """    .captureSheetCard {
      width:min(100%,420px); background:#fff; border-radius:16px; padding:12px;
      border:1px solid rgba(15,23,42,.1); box-shadow:0 16px 40px rgba(15,23,42,.24);
    }
    .captureSheetTitle { font-size:13px; font-weight:800; color:#334155; padding:4px 6px 10px; }"""

CSS_NEW = """    .captureSheetCard {
      width:min(100%,420px); background:#fff; border-radius:16px; padding:12px;
      border:1px solid rgba(15,23,42,.1); box-shadow:0 16px 40px rgba(15,23,42,.24);
    }
    .capturePreviewImg {
      display:block; width:100%; max-width:100%; height:auto; border-radius:12px;
      border:1px solid #e2e8f0; margin:0 0 10px; background:#f8fafc;
    }
    .captureSheetTitle { font-size:13px; font-weight:800; color:#334155; padding:4px 6px 10px; }"""

HTML_OLD = """    <div class="captureSheetTitle">Share or save image</div>
    <div class="captureSheetActions">"""

HTML_NEW = """    <div class="captureSheetTitle">Share or save image</div>
    <img id="capturePreview" class="capturePreviewImg" alt="Snapshot preview" />
    <div class="captureSheetActions">"""

SHIFT_OLD_PLAIN = "      captureRosterElement(shiftCard, 'shift');"

SHIFT_OLD_DEPTHEAD = """      var deptCard = shiftCard.closest('.deptCard');
      var deptHead = deptCard ? deptCard.querySelector('.deptHead') : null;
      captureRosterElement(shiftCard, 'shift', deptHead ? { prependClone: deptHead } : {});"""

SHIFT_NEW = """      var deptCard = shiftCard.closest('.deptCard');
      var deptBanner = buildDeptBannerForSnapshot(deptCard);
      captureRosterElement(shiftCard, 'shift', deptBanner ? { prependClone: deptBanner } : {});"""


def _slice_reference_js() -> str:
    ref_path = ROOT / "docs" / "index.html"
    ref = ref_path.read_text(encoding="utf-8")
    a = ref.find("function openCaptureSheet")
    b = ref.find("function goToEmployeeSchedule", a)
    if a < 0 or b < 0:
        raise SystemExit(f"Could not slice reference JS from {ref_path} (markers missing).")
    return ref[a:b]


def patch_file(path: Path, new_js: str) -> bool:
    t = path.read_text(encoding="utf-8")
    if "wrap.style.width = '680px'" not in t:
        return False
    orig = t
    a = t.find("function openCaptureSheet")
    b = t.find("function goToEmployeeSchedule", a)
    if a < 0 or b < 0:
        print(f"SKIP (no openCaptureSheet block): {path.relative_to(ROOT)}")
        return False
    t = t[:a] + new_js + t[b:]

    if ".capturePreviewImg" not in t:
        if CSS_OLD in t:
            t = t.replace(CSS_OLD, CSS_NEW, 1)
        else:
            print(f"WARN: CSS block not matched: {path.relative_to(ROOT)}")

    if 'id="capturePreview"' not in t and HTML_OLD in t:
        t = t.replace(HTML_OLD, HTML_NEW, 1)

    if SHIFT_OLD_PLAIN in t:
        t = t.replace(SHIFT_OLD_PLAIN, SHIFT_NEW, 1)
    elif SHIFT_OLD_DEPTHEAD in t:
        t = t.replace(SHIFT_OLD_DEPTHEAD, SHIFT_NEW, 1)

    if t != orig:
        path.write_text(t, encoding="utf-8")
        return True
    return False


def main() -> None:
    new_js = _slice_reference_js()
    patched = 0
    for p in sorted(ROOT.joinpath("docs").rglob("*.html")):
        if patch_file(p, new_js):
            patched += 1
    print(f"Patched {patched} file(s).")


if __name__ == "__main__":
    main()
