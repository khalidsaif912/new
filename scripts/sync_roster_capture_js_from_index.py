#!/usr/bin/env python3
"""Sync fixed capture snapshot JS/CSS from generate_and_send.py into roster HTML pages."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from roster_capture_bundle import (  # noqa: E402
    capture_css_from_generator,
    capture_js_from_generator,
    long_press_block_from_generator,
    needs_capture_css_upgrade,
    needs_capture_upgrade,
)

CAPTURE_DOM_OLD = """    <div class="captureSheetTitle">Share or save image</div>
    <img id="capturePreview" class="capturePreviewImg" alt="Snapshot preview" />
    <div class="captureSheetActions">"""

CAPTURE_DOM_NEW = """    <div class="captureSheetTitle">Share or save image</div>
    <div class="capturePreviewWrap">
      <img id="capturePreview" class="capturePreviewImg" alt="Snapshot preview" />
    </div>
    <div class="captureSheetActions">"""

LONG_PRESS_MARKER = "// Long-press capture for section / shift"
SHIFT_FILTER_MARKER = "// Shift Filter (NOW PAGE ONLY)"


def inject_capture_css(html: str) -> str:
    css = capture_css_from_generator()
    if not css or not needs_capture_css_upgrade(html):
        return html
    marker = "/* ═══════ SHARE/SAVE CAPTURE SHEET ═══════ */"
    if marker in html:
        return re.sub(
            r"/\* ═══════ SHARE/SAVE CAPTURE SHEET ═══════ \*/.*?"
            r"\.captureBusy\.open \{\{? display:block; \}\}?",
            css,
            html,
            count=1,
            flags=re.DOTALL,
        )
    return html


def patch_capture_js(html: str, new_js: str) -> str:
    a = html.find("function openCaptureSheet")
    b = html.find("function goToEmployeeSchedule", a)
    if a < 0 or b < 0:
        return html
    return html[:a] + new_js + html[b:]


def patch_long_press(html: str, new_block: str) -> str:
    if not new_block or LONG_PRESS_MARKER not in html:
        return html
    start = html.find(LONG_PRESS_MARKER)
    end = html.find(SHIFT_FILTER_MARKER, start)
    if end < 0:
        end = html.find("// ══════════════════════════════════════════════════\n// Shift Filter", start)
    if start < 0 or end < 0:
        return html
    return html[:start] + new_block + "\n\n" + html[end:]


def needs_long_press_upgrade(html: str) -> bool:
    if LONG_PRESS_MARKER not in html:
        return False
    chunk = html[html.find(LONG_PRESS_MARKER) : html.find(LONG_PRESS_MARKER) + 3500]
    return "deptCaptureId" not in chunk


def patch_file(path: Path, new_js: str, long_press: str) -> bool:
    t = path.read_text(encoding="utf-8")
    upgrade_js = needs_capture_upgrade(t)
    upgrade_lp = needs_long_press_upgrade(t)
    upgrade_css = needs_capture_css_upgrade(t)
    if not upgrade_js and not upgrade_lp and not upgrade_css:
        return False
    orig = t
    if upgrade_js:
        t = patch_capture_js(t, new_js)
    if upgrade_lp and long_press:
        t = patch_long_press(t, long_press)
    if upgrade_css:
        t = inject_capture_css(t)
    if 'class="capturePreviewWrap"' not in t and CAPTURE_DOM_OLD in t:
        t = t.replace(CAPTURE_DOM_OLD, CAPTURE_DOM_NEW, 1)
    if "document.querySelectorAll('.empStatus .shiftRangeLabel, .empStatus span')" not in t:
        t = t.replace(
            "document.querySelectorAll('.empStatus span')",
            "document.querySelectorAll('.empStatus .shiftRangeLabel, .empStatus span')",
        )
    if t != orig:
        path.write_text(t, encoding="utf-8")
        return True
    return False


def main() -> int:
    new_js = capture_js_from_generator()
    long_press = long_press_block_from_generator()
    patched = 0
    for p in sorted(ROOT.joinpath("docs").rglob("*.html")):
        if "my-schedule" in str(p).lower():
            continue
        if patch_file(p, new_js, long_press):
            patched += 1
            print(f"patched: {p.relative_to(ROOT)}")
    print(f"Patched {patched} file(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
