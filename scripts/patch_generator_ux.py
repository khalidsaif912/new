#!/usr/bin/env python3
"""Patch tooltip close + 3-state dept shift toggle in generate_and_send.py."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
p = ROOT / "generate_and_send.py"
t = p.read_text(encoding="utf-8")
d = "div"
NEW_INNER = (
    f"  tooltip.innerHTML = '<{d} class=\"nextShiftHead\"><{d} class=\"nextShiftHeadText\">"
    f"<{d} id=\"nextShiftEmp\" class=\"nextShiftEmp\">-</{d}>"
    f"<{d} class=\"nextShiftTitle\">Upcoming 5 shifts</{d}></{d}>"
    "<button type=\"button\" class=\"nextShiftClose\" id=\"nextShiftClose\" aria-label=\"Close\">&times;</button>"
    f"</{d}><{d} id=\"nextShiftBody\" class=\"nextShiftBody\"></{d}>';"
)

lines = t.splitlines(True)
for i, line in enumerate(lines):
    if "tooltip.innerHTML = '<" in line and "nextShiftHead" in line and "initEmployeeNextShiftPreview" not in line:
        if "nextShiftClose" in line:
            print("tooltip innerHTML already patched")
            break
        old_line = line
        lines[i] = NEW_INNER + "\n"
        print("patched tooltip innerHTML at line", i + 1)
        break
else:
    raise SystemExit("tooltip innerHTML line not found")

t = "".join(lines)

OLD_VARS = """  var tooltipEmp = tooltip.querySelector('#nextShiftEmp');

  var scheduleCache = {};"""

NEW_VARS = """  var tooltipEmp = tooltip.querySelector('#nextShiftEmp');
  var tooltipClose = tooltip.querySelector('#nextShiftClose');

  var scheduleCache = {};
  var tooltipPinned = false;"""

if "var tooltipClose" not in t:
    if OLD_VARS not in t:
        raise SystemExit("tooltip vars block not found")
    t = t.replace(OLD_VARS, NEW_VARS, 1)
    print("patched tooltip vars")

OLD_HIDE = """  function hideTooltipSoon() {
    cancelHideTooltip();
    hideTimer = setTimeout(function() {
      tooltip.classList.remove('show');
      activeEl = null;
      hideTimer = null;
    }, 120);
  }"""

NEW_HIDE = """  function hideTooltipNow() {
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
  }"""

if "function hideTooltipNow" not in t:
    if OLD_HIDE not in t:
        raise SystemExit("hideTooltipSoon block not found")
    t = t.replace(OLD_HIDE, NEW_HIDE, 1)
    print("patched hideTooltip")

OLD_REF = """    if (pathMatch) return pathMatch[1];
    var now = new Date();
    var muscat = new Date(now.getTime() + (4 * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
    return muscat.getFullYear() + '-' +
      String(muscat.getMonth() + 1).padStart(2, '0') + '-' +
      String(muscat.getDate()).padStart(2, '0');
  }

  function moveTooltip(ev) {"""

NEW_REF = """    if (pathMatch) return pathMatch[1];
    var picker = document.getElementById('datePicker');
    if (picker && picker.value) return picker.value;
    var now = new Date();
    var muscat = new Date(now.getTime() + (4 * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
    return muscat.getFullYear() + '-' +
      String(muscat.getMonth() + 1).padStart(2, '0') + '-' +
      String(muscat.getDate()).padStart(2, '0');
  }

  function moveTooltip(ev) {"""

if "picker && picker.value" not in t.split("initEmployeeNextShiftPreview")[1].split("})();")[0]:
    # only first occurrence in tooltip block
    idx = t.find("function getReferenceIsoDate()")
    idx2 = t.find(OLD_REF, idx)
    if idx2 < 0:
        raise SystemExit("getReferenceIsoDate block not found")
    t = t[:idx2] + NEW_REF + t[idx2 + len(OLD_REF) :]
    print("patched getReferenceIsoDate")

OLD_SHOW = """  function showPreviewForRow(rowEl, ev) {
    if (!rowEl) return;
    cancelHideTooltip();
    activeEl = rowEl;"""

NEW_SHOW = """  function showPreviewForRow(rowEl, ev) {
    if (!rowEl) return;
    cancelHideTooltip();
    tooltipPinned = !!(ev && ev.pointerType === 'touch') || (!ev && 'ontouchstart' in window);
    activeEl = rowEl;"""

if "tooltipPinned = !!" not in t:
    t = t.replace(OLD_SHOW, NEW_SHOW, 1)
    print("patched showPreviewForRow")

OLD_LEAVE = """    rowEl.addEventListener('mouseleave', function(ev) {
      var to = ev.relatedTarget;
      if (to && typeof to.closest === 'function' && to.closest('.deptCard .empRow')) {
        cancelHideTooltip();
        return;
      }
      hideTooltipSoon();
    });"""

NEW_LEAVE = """    rowEl.addEventListener('mouseleave', function(ev) {
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
    });"""

if "to.closest('.nextShiftTooltip')" not in t:
    t = t.replace(OLD_LEAVE, NEW_LEAVE, 1)
    print("patched mouseleave")

OLD_CLICK = """      if (suppressClickFor === rowEl) {
        ev.preventDefault();
        ev.stopPropagation();
        suppressClickFor = null;
        hideTooltipSoon();
        return;
      }"""

NEW_CLICK = """      if (suppressClickFor === rowEl) {
        ev.preventDefault();
        ev.stopPropagation();
        suppressClickFor = null;
        return;
      }"""

if OLD_CLICK in t:
    t = t.replace(OLD_CLICK, NEW_CLICK, 1)
    print("patched click handler")

OLD_BIND_END = """  document.querySelectorAll('.deptCard .empRow').forEach(bindEmployeeRow);
})();
"""

NEW_BIND_END = """  if (tooltipClose) {
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
})();
"""

if "tooltipClose.addEventListener" not in t:
  if OLD_BIND_END not in t:
    raise SystemExit("bind end block not found")
  t = t.replace(OLD_BIND_END, NEW_BIND_END, 1)
  print("patched tooltip listeners")

# Fix showPreviewForRow pinned logic - long press passes null ev
OLD_SHOW2 = "    tooltipPinned = !!(ev && ev.pointerType === 'touch') || (!ev && 'ontouchstart' in window);"
NEW_SHOW2 = "    tooltipPinned = !ev || (ev && ev.pointerType === 'touch');"
if OLD_SHOW2 in t:
    t = t.replace(OLD_SHOW2, NEW_SHOW2, 1)

# --- Dept 3-state toggle (double braces in generator) ---
OLD_DEPT = """    head.addEventListener('click', function() {{
      if (suppressNextClick) return;
      var card = head.closest('.deptCard');
      if (!card) return;
      card.classList.remove('collapsed');
      var shifts = card.querySelectorAll('details.shiftCard');
      if (!shifts.length) return;
      var anyClosed = false;
      shifts.forEach(function(d) {{
        if (!d.open) anyClosed = true;
      }});
      shifts.forEach(function(d) {{
        if (anyClosed) d.setAttribute('open', '');
        else d.removeAttribute('open');
      }});
    }});"""

NEW_DEPT = """    head.addEventListener('click', function() {{
      if (suppressNextClick) return;
      var card = head.closest('.deptCard');
      if (!card) return;
      card.classList.remove('collapsed');
      var shifts = card.querySelectorAll('details.shiftCard');
      if (!shifts.length) return;
      var step = parseInt(card.dataset.deptShiftStep || '0', 10);
      if (isNaN(step) || step < 0 || step > 2) step = 0;
      if (step === 0) {{
        shifts.forEach(function(d) {{ d.setAttribute('open', ''); }});
        card.dataset.deptShiftStep = '1';
      }} else if (step === 1) {{
        shifts.forEach(function(d) {{ d.removeAttribute('open'); }});
        card.dataset.deptShiftStep = '2';
      }} else {{
        var now = new Date();
        var muscatTime = new Date(now.getTime() + (4 * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
        var hour = muscatTime.getHours();
        var minute = muscatTime.getMinutes();
        var tt = hour * 60 + minute;
        var currentShift = (tt >= 21 * 60 || tt < 5 * 60) ? 'Night' : (tt >= 13 * 60 ? 'Afternoon' : 'Morning');
        shifts.forEach(function(d) {{ d.removeAttribute('open'); }});
        var target = null;
        shifts.forEach(function(d) {{
          if (d.dataset.shift === currentShift) target = d;
        }});
        if (!target) target = shifts[0];
        if (target) target.setAttribute('open', '');
        card.dataset.deptShiftStep = '0';
      }}
    }});"""

if "deptShiftStep" not in t:
    if OLD_DEPT not in t:
        raise SystemExit("dept toggle block not found")
    t = t.replace(OLD_DEPT, NEW_DEPT, 1)
    print("patched dept 3-state toggle")

p.write_text(t, encoding="utf-8", newline="\n")
print("done")
