#!/usr/bin/env python3
"""Sync tooltip close UX + 3-state dept shift toggle into roster index.html pages."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

OLD_CSS = """    .nextShiftTooltip.show {
      opacity: 1;
      transform: translateY(0);
    }
    .nextShiftHead {
      padding: 8px 10px;
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      border-bottom: 1px solid rgba(15, 23, 42, 0.12);
      color: #fff;
    }
    .nextShiftEmp {"""

NEW_CSS = """    .nextShiftTooltip.show {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }
    .nextShiftHead {
      padding: 8px 10px;
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      border-bottom: 1px solid rgba(15, 23, 42, 0.12);
      color: #fff;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
    }
    .nextShiftHeadText { flex: 1; min-width: 0; }
    .nextShiftClose {
      flex: 0 0 auto;
      width: 26px;
      height: 26px;
      border: none;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.2);
      color: #fff;
      font-size: 18px;
      line-height: 1;
      cursor: pointer;
      display: grid;
      place-items: center;
      padding: 0;
    }
    .nextShiftClose:hover { background: rgba(255, 255, 255, 0.32); }
    .nextShiftEmp {"""

OLD_DEPT = """      var anyClosed = false;
      shifts.forEach(function(d) {
        if (!d.open) anyClosed = true;
      });
      shifts.forEach(function(d) {
        if (anyClosed) d.setAttribute('open', '');
        else d.removeAttribute('open');
      });"""

NEW_DEPT = """      var step = parseInt(card.dataset.deptShiftStep || '0', 10);
      if (isNaN(step) || step < 0 || step > 2) step = 0;
      if (step === 0) {
        shifts.forEach(function(d) { d.setAttribute('open', ''); });
        card.dataset.deptShiftStep = '1';
      } else if (step === 1) {
        shifts.forEach(function(d) { d.removeAttribute('open'); });
        card.dataset.deptShiftStep = '2';
      } else {
        var now = new Date();
        var muscatTime = new Date(now.getTime() + (4 * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
        var hour = muscatTime.getHours();
        var minute = muscatTime.getMinutes();
        var tt = hour * 60 + minute;
        var currentShift = (tt >= 21 * 60 || tt < 5 * 60) ? 'Night' : (tt >= 13 * 60 ? 'Afternoon' : 'Morning');
        shifts.forEach(function(d) { d.removeAttribute('open'); });
        var target = null;
        shifts.forEach(function(d) {
          if (d.dataset.shift === currentShift) target = d;
        });
        if (!target) target = shifts[0];
        if (target) target.setAttribute('open', '');
        card.dataset.deptShiftStep = '0';
      }"""


def patch_tooltip_js(t: str) -> str:
    if "nextShiftClose" in t and "hideTooltipNow" in t:
        return t

    d = "div"
    new_inner = (
        f"  tooltip.innerHTML = '<{d} class=\"nextShiftHead\"><{d} class=\"nextShiftHeadText\">"
        f"<{d} id=\"nextShiftEmp\" class=\"nextShiftEmp\">-</{d}>"
        f"<{d} class=\"nextShiftTitle\">Upcoming 5 shifts</{d}></{d}>"
        "<button type=\"button\" class=\"nextShiftClose\" id=\"nextShiftClose\" aria-label=\"Close\">&times;</button>"
        f"</{d}><{d} id=\"nextShiftBody\" class=\"nextShiftBody\"></{d}>';"
    )

    for i, line in enumerate(t.splitlines(True)):
        if "tooltip.innerHTML = '<" in line and "nextShiftHead" in line:
            if "nextShiftClose" in line:
                break
            lines = t.splitlines(True)
            lines[i] = new_inner + "\n"
            t = "".join(lines)
            break

    reps = [
        (
            """  var tooltipEmp = tooltip.querySelector('#nextShiftEmp');

  var scheduleCache = {};""",
            """  var tooltipEmp = tooltip.querySelector('#nextShiftEmp');
  var tooltipClose = tooltip.querySelector('#nextShiftClose');

  var scheduleCache = {};
  var tooltipPinned = false;""",
        ),
        (
            """  function hideTooltipSoon() {
    cancelHideTooltip();
    hideTimer = setTimeout(function() {
      tooltip.classList.remove('show');
      activeEl = null;
      hideTimer = null;
    }, 120);
  }""",
            """  function hideTooltipNow() {
    cancelHideTooltip();
    tooltipPinned = false;
    tooltip.classList.remove('show');
    activeEl = null;
  }

  function hideTooltipSoon() {
    if (tooltipPinned) return;
    cancelHideTooltip();
    hideTimer = setTimeout(function() {
      tooltip.classList.remove('show');
      activeEl = null;
      hideTimer = null;
    }, 120);
  }""",
        ),
        (
            """    if (pathMatch) return pathMatch[1];
    var now = new Date();
    var muscat = new Date(now.getTime() + (4 * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
    return muscat.getFullYear() + '-' +
      String(muscat.getMonth() + 1).padStart(2, '0') + '-' +
      String(muscat.getDate()).padStart(2, '0');
  }

  function moveTooltip(ev) {""",
            """    if (pathMatch) return pathMatch[1];
    var picker = document.getElementById('datePicker');
    if (picker && picker.value) return picker.value;
    var now = new Date();
    var muscat = new Date(now.getTime() + (4 * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
    return muscat.getFullYear() + '-' +
      String(muscat.getMonth() + 1).padStart(2, '0') + '-' +
      String(muscat.getDate()).padStart(2, '0');
  }

  function moveTooltip(ev) {""",
        ),
        (
            """  function showPreviewForRow(rowEl, ev) {
    if (!rowEl) return;
    cancelHideTooltip();
    activeEl = rowEl;""",
            """  function showPreviewForRow(rowEl, ev) {
    if (!rowEl) return;
    cancelHideTooltip();
    tooltipPinned = !ev || (ev && ev.pointerType === 'touch');
    activeEl = rowEl;""",
        ),
        (
            """    rowEl.addEventListener('mouseleave', function(ev) {
      var to = ev.relatedTarget;
      if (to && typeof to.closest === 'function' && to.closest('.deptCard .empRow')) {
        cancelHideTooltip();
        return;
      }
      hideTooltipSoon();
    });""",
            """    rowEl.addEventListener('mouseleave', function(ev) {
      var to = ev.relatedTarget;
      if (to && typeof to.closest === 'function') {
        if (to.closest('.nextShiftTooltip')) {
          cancelHideTooltip();
          return;
        }
        if (to.closest('.deptCard .empRow')) {
          cancelHideTooltip();
          return;
        }
      }
      hideTooltipSoon();
    });""",
        ),
        (
            """      if (suppressClickFor === rowEl) {
        ev.preventDefault();
        ev.stopPropagation();
        suppressClickFor = null;
        hideTooltipSoon();
        return;
      }""",
            """      if (suppressClickFor === rowEl) {
        ev.preventDefault();
        ev.stopPropagation();
        suppressClickFor = null;
        return;
      }""",
        ),
        (
            """  document.querySelectorAll('.deptCard .empRow').forEach(bindEmployeeRow);
})();""",
            """  if (tooltipClose) {
    tooltipClose.addEventListener('click', function(ev) {
      ev.preventDefault();
      ev.stopPropagation();
      hideTooltipNow();
    });
  }
  tooltip.addEventListener('mouseenter', cancelHideTooltip);
  tooltip.addEventListener('mouseleave', function(ev) {
    var to = ev.relatedTarget;
    if (to && typeof to.closest === 'function' && to.closest('.deptCard .empRow')) {
      cancelHideTooltip();
      return;
    }
    hideTooltipSoon();
  });

  document.querySelectorAll('.deptCard .empRow').forEach(bindEmployeeRow);
})();""",
        ),
    ]
    for old, new in reps:
        if old in t and new not in t:
            t = t.replace(old, new, 1)
    return t


def patch_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    if "initEmployeeNextShiftPreview" not in text and "deptShiftToggleBound" not in text:
        return False
    updated = text
    if OLD_CSS in updated and ".nextShiftClose" not in updated:
        updated = updated.replace(OLD_CSS, NEW_CSS, 1)
    if OLD_DEPT in updated:
        updated = updated.replace(OLD_DEPT, NEW_DEPT, 1)
    if "initEmployeeNextShiftPreview" in updated:
        updated = patch_tooltip_js(updated)
    if updated == text:
        return False
    path.write_text(updated, encoding="utf-8", newline="\n")
    return True


def main() -> int:
    updated = 0
    for base in (ROOT / "docs",):
        for path in sorted(base.rglob("index.html")):
            if "my-schedule" in str(path).lower():
                continue
            if patch_file(path):
                updated += 1
    print(f"patched={updated}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
