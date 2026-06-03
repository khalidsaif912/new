"""Shared capture JS/CSS extracted from generate_and_send.py template."""

from __future__ import annotations

import re
from pathlib import Path

_GENERATOR = Path(__file__).resolve().parents[1] / "generate_and_send.py"

_CAPTURE_CSS_RE = re.compile(
    r"/\* ═══════ SHARE/SAVE CAPTURE SHEET ═══════ \*/.*?"
    r"\.captureBusy\.open \{\{? display:block; \}\}?",
    re.DOTALL,
)


def _unescape(js: str) -> str:
    return js.replace("{{", "{").replace("}}", "}")


def capture_js_from_generator() -> str:
    text = _GENERATOR.read_text(encoding="utf-8")
    start = text.find("function openCaptureSheet")
    end = text.find("function goToEmployeeSchedule", start)
    if start < 0 or end < 0:
        raise RuntimeError("Could not slice capture JS from generate_and_send.py")
    return _unescape(text[start:end])


def capture_css_from_generator() -> str:
    text = _GENERATOR.read_text(encoding="utf-8")
    m = _CAPTURE_CSS_RE.search(text)
    if not m:
        return ""
    return _unescape(m.group(0))


def long_press_block_from_generator() -> str:
    text = _GENERATOR.read_text(encoding="utf-8")
    marker = "// Long-press capture for section / shift"
    start = text.find(marker)
    if start < 0:
        return ""
    # End at Shift Filter block (export template)
    end = text.find("// Shift Filter (NOW PAGE ONLY)", start)
    if end < 0:
        end = text.find("// ══════════════════════════════════════════════════\n// Shift Filter", start)
    if end < 0:
        return ""
    block = _unescape(text[start:end].rstrip())
    # Drop trailing comment line fragments
    return block


def needs_capture_css_upgrade(html: str) -> bool:
    if "/* ═══════ SHARE/SAVE CAPTURE SHEET ═══════ */" not in html:
        return False
    return ".capturePreviewWrap {" not in html or "min-height:0" not in html.replace(" ", "")


def needs_capture_upgrade(html: str) -> bool:
    if "function openCaptureSheet" not in html:
        return False
    if "rosterSnapshotLayoutWidth()" in html and "function rosterSnapshotLayoutWidth" not in html:
        return True
    return (
        "flattenShiftCardsInClone" not in html
        or "catch (captureErr)" not in html
        or "buildBannerHeaderForSnapshot" not in html
        or "function openAllShiftsOnDept" not in html
        or "function prepareSnapshotClone" not in html
    )
