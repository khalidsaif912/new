#!/usr/bin/env python3
"""Fix long-press preview: define LONG_PRESS_MS + robust bindEmployeeRow on roster pages."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

OLD_BIND = """    rowEl.addEventListener('pointerdown', function(ev) {
      if (ev.button !== 0 && ev.button !== undefined) return;
      if (longPressTimer) clearTimeout(longPressTimer);
      longPressTimer = setTimeout(function() {
        longPressTimer = null;
        suppressClickFor = rowEl;
        showPreviewForRow(rowEl, null);
      }, LONG_PRESS_MS);
    });
    rowEl.addEventListener('pointerup', function() {
      if (longPressTimer) clearTimeout(longPressTimer);
      longPressTimer = null;
    });
    rowEl.addEventListener('pointercancel', function() {
      if (longPressTimer) clearTimeout(longPressTimer);
      longPressTimer = null;
    });
    rowEl.addEventListener('pointerleave', function() {
      if (longPressTimer) clearTimeout(longPressTimer);
      longPressTimer = null;
    });"""

NEW_BIND = """    rowEl.addEventListener('pointerdown', function(ev) {
      if (ev.button !== 0 && ev.button !== undefined) return;
      longPressRow = rowEl;
      longPressMoved = false;
      if (longPressTimer) clearTimeout(longPressTimer);
      longPressTimer = setTimeout(function() {
        longPressTimer = null;
        if (longPressRow !== rowEl || longPressMoved) return;
        suppressClickFor = rowEl;
        showPreviewForRow(rowEl, null);
      }, LONG_PRESS_MS);
    });
    rowEl.addEventListener('pointermove', function(ev) {
      if (longPressRow !== rowEl) return;
      if (typeof ev.movementX === 'number' && (Math.abs(ev.movementX) > 8 || Math.abs(ev.movementY) > 8)) {
        longPressMoved = true;
      }
    });
    rowEl.addEventListener('pointerup', function() {
      if (longPressTimer) clearTimeout(longPressTimer);
      longPressTimer = null;
      longPressRow = null;
    });
    rowEl.addEventListener('pointercancel', function() {
      if (longPressTimer) clearTimeout(longPressTimer);
      longPressTimer = null;
      longPressRow = null;
    });
    rowEl.addEventListener('contextmenu', function(ev) {
      if (suppressClickFor === rowEl) ev.preventDefault();
    });"""

VARS_NEEDLE = "  var suppressClickFor = null;\n"
VARS_INSERT = (
    "  var suppressClickFor = null;\n"
    "  var longPressRow = null;\n"
    "  var longPressMoved = false;\n"
    "  var LONG_PRESS_MS = 550;\n"
)

FLATTEN_OLD = """  function flattenFutureShifts(data, fromIso) {
    var out = [];
    if (!data || !data.schedules) return out;
    Object.keys(data.schedules).forEach(function(monthKey) {
      var rows = data.schedules[monthKey] || [];
      rows.forEach(function(r) {
        var d = String(r && r.date || '');
        if (!d) return;
        if (d >= fromIso) out.push(r);
      });
    });"""

FLATTEN_NEW = """  function flattenFutureShifts(data, fromIso) {
    var out = [];
    if (!data) return out;
    if (!data.schedules) return out;
    Object.keys(data.schedules).forEach(function(monthKey) {
      var mk = String(monthKey).match(/^(\\d{4})-(\\d{2})$/);
      if (!mk) return;
      var y = mk[1], mo = mk[2];
      var rows = data.schedules[monthKey] || [];
      rows.forEach(function(r) {
        if (!r) return;
        var iso = String(r.date || '').trim();
        if (!iso && r.day != null && r.day !== '') {
          iso = y + '-' + mo + '-' + String(r.day).padStart(2, '0');
        }
        if (!iso || iso < fromIso) return;
        out.push({ date: iso, shift_code: String(r.shift_code || r.code || '').trim() });
      });
    });"""


DISMISS_ANCHOR = "  document.querySelectorAll('.deptCard .empRow').forEach(bindEmployeeRow);"
DISMISS_BLOCK = """
  function isTooltipOpen() {
    return tooltip.classList.contains('show');
  }

  function dismissUnlessTooltipTarget(ev) {
    if (!isTooltipOpen()) return;
    var t = ev && ev.target;
    if (t && typeof t.closest === 'function' && t.closest('.nextShiftTooltip')) return;
    hideTooltipNow();
  }

  document.addEventListener('pointerdown', dismissUnlessTooltipTarget, true);
  document.addEventListener('click', function(ev) {
    if (suppressClickFor) return;
    dismissUnlessTooltipTarget(ev);
  }, true);

  function dismissOnScroll() {
    if (isTooltipOpen()) hideTooltipNow();
  }
  window.addEventListener('scroll', dismissOnScroll, true);
  window.addEventListener('wheel', dismissOnScroll, { passive: true, capture: true });
  window.addEventListener('touchmove', function(ev) {
    if (!isTooltipOpen()) return;
    var t = ev.target;
    if (t && typeof t.closest === 'function' && t.closest('.nextShiftTooltip')) return;
    hideTooltipNow();
  }, { passive: true, capture: true });

  document.querySelectorAll('.deptCard .empRow').forEach(bindEmployeeRow);"""

OLD_TOOLTIP_LEAVE = """  tooltip.addEventListener('mouseenter', cancelHideTooltip);
  tooltip.addEventListener('mouseleave', function(ev) {
    var to = ev.relatedTarget;
    if (to && typeof to.closest === 'function' && to.closest('.deptCard .empRow')) {
      cancelHideTooltip();
      return;
    }
    hideTooltipSoon();
  });

  document.querySelectorAll('.deptCard .empRow').forEach(bindEmployeeRow);"""


def patch_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    if "initEmployeeNextShiftPreview" not in text:
        return False
    orig = text

    i = text.find("function initEmployeeNextShiftPreview")
    j = text.find("})();", i)
    block = text[i:j] if i >= 0 and j > i else ""

    if block and "var LONG_PRESS_MS" not in block and VARS_NEEDLE in text:
        text = text.replace(VARS_NEEDLE, VARS_INSERT, 1)

    if OLD_BIND in text:
        text = text.replace(OLD_BIND, NEW_BIND, 1)
    elif NEW_BIND.split("pointermove")[0] not in text and "longPressRow = rowEl" not in text:
        # already has mouseenter-only old block
        pass

    if FLATTEN_OLD in text:
        text = text.replace(FLATTEN_OLD, FLATTEN_NEW, 1)

    if "long-press (touch)" in text:
        text = text.replace(
            "// Employee row: tap → schedule; long-press (touch) → next 5 shifts preview",
            "// Employee row: tap → schedule; long-press → next 5 shifts preview",
            1,
        )

    if "function isTooltipOpen" not in text:
        if OLD_TOOLTIP_LEAVE in text:
            text = text.replace(OLD_TOOLTIP_LEAVE, DISMISS_BLOCK, 1)
        elif DISMISS_ANCHOR in text:
            text = text.replace(DISMISS_ANCHOR, DISMISS_BLOCK, 1)

    if text == orig:
        return False
    path.write_text(text, encoding="utf-8")
    return True


def main() -> int:
    n = 0
    for base in [ROOT / "docs" / "date", ROOT / "docs" / "import", ROOT / "docs" / "index.html", ROOT / "docs" / "now" / "index.html"]:
        files = [base] if base.is_file() else sorted(base.rglob("index.html"))
        for f in files:
            if patch_file(f):
                n += 1
    print(f"patched {n} files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
