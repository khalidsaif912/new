#!/usr/bin/env python3
"""Inject export roster UX (hover preview, screenshots, date picker, etc.) into import HTML pages."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IMPORT_DIR = ROOT / "docs" / "import"

CAPTURE_BLOCK = """
<div id="captureBusy" class="captureBusy">Preparing image...</div>
<div id="captureSheet" class="captureSheet" aria-hidden="true">
  <motion class="captureSheetCard">
    <div class="captureSheetTitle">Share or save image</div>
    <img id="capturePreview" class="capturePreviewImg" alt="Snapshot preview" />
    <div class="captureSheetActions">
      <button id="captureShareBtn" class="captureSheetBtn captureShareBtn" type="button">Share</button>
      <button id="captureSaveBtn" class="captureSheetBtn captureSaveBtn" type="button">Save</button>
    </motion>
    <button id="captureCancelBtn" class="captureSheetBtn captureCancelBtn" type="button">Cancel</button>
  </div>
</div>
""".replace('<motion class="captureSheetCard">', '<motion class="captureSheetCard">').replace(
    '<motion class="captureSheetCard">', '<div class="captureSheetCard">'
).replace('</motion>\n    <button', '</div>\n    <button')

HTML2CANVAS_TAG = '<script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>'

REPARTITION_FN_MARKER = "function repartitionLeaveRowsInDeptCards"
REPARTITION_FN = """
  function repartitionLeaveRowsInDeptCards() {
    document.querySelectorAll('.deptCard').forEach(function(card) {
      var other = card.querySelector('details.shiftCard[data-shift="Other"]');
      if (!other) return;
      var toMove = [];
      other.querySelectorAll('.empRow').forEach(function(row) {
        var st = row.querySelector('.empStatus');
        if (!st) return;
        var raw = (st.textContent || '').trim().toUpperCase();
        var code = raw.split(/\\s+/)[0];
        if (code === 'LV' || code === 'AL' || raw.indexOf('ANNUAL') >= 0) toMove.push(row);
      });
      if (!toMove.length) return;
      var annual = card.querySelector('details.shiftCard[data-shift="Annual Leave"]');
      if (!annual) {
        var template = card.querySelector('details.shiftCard[data-shift="Off Day"]');
        if (!template) return;
        annual = template.cloneNode(true);
        annual.setAttribute('data-shift', 'Annual Leave');
        annual.style.border = '1px solid #10b98144';
        annual.style.background = '#d1fae5';
        var sum = annual.querySelector('.shiftSummary');
        if (sum) { sum.style.background = '#d1fae5'; sum.style.borderBottom = '1px solid #10b98133'; }
        var label = annual.querySelector('.shiftLabel');
        if (label) { label.textContent = 'Annual Leave'; label.style.color = '#065f46'; }
        var icon = annual.querySelector('.shiftIcon');
        if (icon) icon.textContent = '✈️';
        var emptyBody = annual.querySelector('.shiftBody');
        if (emptyBody) emptyBody.innerHTML = '';
        other.parentNode.insertBefore(annual, other);
      }
      var body = annual.querySelector('.shiftBody');
      toMove.forEach(function(row) { body.appendChild(row); });
      var oc = other.querySelector('.shiftCount');
      var left = other.querySelectorAll('.empRow').length;
      if (oc) oc.textContent = String(left);
      if (!left) other.remove();
      var ac = annual.querySelector('.shiftCount');
      if (ac) ac.textContent = String(annual.querySelectorAll('.empRow').length);
    });
  }
"""

EMP_ROW_ONCLICK = re.compile(
    r'<div class="empRow([^"]*)">\s*'
    r'<span class="empName" style="cursor:pointer;" onclick=\'goToEmployeeSchedule\(([^)]+)\)\'>([^<]+)</span>\s*'
    r'<span class="empStatus" style="color:([^"]+);">([^<]*)</span>\s*'
    r'</motion>',
    re.MULTILINE,
)

# fix typo in regex - should be </motion> -> </div>
EMP_ROW_ONCLICK = re.compile(
    r'<div class="empRow([^"]*)">\s*'
    r'<span class="empName" style="cursor:pointer;" onclick=\'goToEmployeeSchedule\(([^)]+)\)\'>([^<]+)</span>\s*'
    r'<span class="empStatus" style="color:([^"]+);">([^<]*)</span>\s*'
    r'</div>',
    re.MULTILINE,
)


def upgrade_emp_rows(html: str) -> str:
    def repl(m: re.Match[str]) -> str:
        alt, _arg, label, color, status = m.groups()
        label = label.strip()
        name_attr = label.replace("&", "&amp;").replace('"', "&quot;")
        return (
            f'<div class="empRow{alt}" data-emp-name="{name_attr}" role="button" tabindex="0">\n'
            f'       <span class="empName">{label}</span>\n'
            f'       <span class="empStatus" style="color:{color};">{status}</span>\n'
            f"     </div>"
        )

    return EMP_ROW_ONCLICK.sub(repl, html)


def patch_reference_date(html: str) -> str:
    old = "if (pathMatch) return pathMatch[1];\n    var now = new Date();"
    new = (
        "if (pathMatch) return pathMatch[1];\n"
        "    var picker = document.getElementById('datePicker');\n"
        "    if (picker && picker.value) return picker.value;\n"
        "    var now = new Date();"
    )
    if "picker && picker.value) return picker.value" in html:
        return html
    if old not in html:
        return html
    return html.replace(old, new, 1)


def patch_flatten_future_shifts(html: str) -> str:
    if "Array.isArray(data.days)" in html:
        return html
    flatten_old = """  function flattenFutureShifts(data, fromIso) {
    var out = [];
    if (!data || !data.schedules) return out;"""
    flatten_new = """  function flattenFutureShifts(data, fromIso) {
    var out = [];
    if (!data) return out;
    if (Array.isArray(data.days) && data.month) {
      var mp = String(data.month).match(/^(\\d{4})-(\\d{2})$/);
      if (mp) {
        var y = mp[1], mo = mp[2];
        data.days.forEach(function(d) {
          if (!d || !d.day) return;
          var iso = y + '-' + mo + '-' + String(d.day).padStart(2, '0');
          if (iso >= fromIso) out.push({ date: iso, shift_code: String(d.code || '').trim() });
        });
        out.sort(function(a, b) { return String(a.date).localeCompare(String(b.date)); });
        return out.slice(0, 5);
      }
    }
    if (!data.schedules) return out;"""
    if flatten_old not in html:
        return html
    return html.replace(flatten_old, flatten_new, 1)


def inject_capture_shell(html: str) -> str:
    if 'id="captureBusy"' in html:
        return html
    needle = "</div>\n\n<script>\n// Hard-guaranteed import page behavior"
    if needle not in html:
        return html
    insert = f"\n{CAPTURE_BLOCK}\n{HTML2CANVAS_TAG}\n"
    return html.replace(needle, f"</div>{insert}\n<script>\n// Hard-guaranteed import page behavior", 1)


def inject_repartition(html: str) -> str:
    if REPARTITION_FN_MARKER in html:
        return html
    needle = "  // Match Export roster logic (Muscat UTC+4)"
    if needle not in html:
        return html
    return html.replace(needle, REPARTITION_FN + "\n\n  // Match Export roster logic (Muscat UTC+4)", 1)


def replace_export_script(html: str, export_script: str) -> str:
    if "initEmployeeNextShiftPreview" in html:
        return html
    start = html.find("<script>\n\n  (function () {\n    function siteRoot()")
    if start == -1:
        start = html.find("<script>\n{script}")
    end = html.find("/* ===== Import path overrides ===== */")
    if start == -1 or end == -1:
        return html
    return html[:start] + "<script>\n" + export_script + "\n\n" + html[end:]


def remove_import_ux_duplicate(html: str) -> str:
    return re.sub(
        r"/\* ===== Import UX fixes ===== \*/\s*\(function\(\) \{[\s\S]*?\}\)\(\);\s*\n",
        "",
        html,
        count=1,
    )


def patch_load_enhancements(html: str) -> str:
    html = html.replace(
        "addScript(root + '/install-pwa.js?v=' + ver);\n  addScript(root + '/banner-changer.js');",
        "addScript(root + '/install-pwa.js?v=' + ver);\n  addScript(root + '/change-alert.js?v=' + ver);\n  addScript(root + '/banner-changer.js');",
    )
    html = html.replace(
        "var ver = '11';",
        "var ver = '20260514b';",
    )
    html = html.replace(
        "match(/\\/date\\/(\\d{4}-\\d{2}-\\d{2})\\//)",
        "match(/\\/(?:import\\/date|import)\\/(\\d{4}-\\d{2}-\\d{2})\\//)",
    )
    if "syncImportHeaderDate();" in html:
        html = html.replace("  syncImportHeaderDate();\n", "  repartitionLeaveRowsInDeptCards();\n")
    elif "repartitionLeaveRowsInDeptCards();" not in html.split("applySavedEmployeeDepartmentFirst();")[0][-500:]:
        html = html.replace(
            "  applySavedEmployeeDepartmentFirst();\n",
            "  repartitionLeaveRowsInDeptCards();\n  applySavedEmployeeDepartmentFirst();\n",
        )
    return html


def patch_file(path: Path, export_script: str) -> bool:
    text = path.read_text(encoding="utf-8")
    if ".deptCard" not in text or "Import path overrides" not in text:
        return False
    updated = text
    updated = inject_capture_shell(updated)
    updated = patch_flatten_future_shifts(updated)
    updated = patch_reference_date(updated)
    updated = upgrade_emp_rows(updated)
    updated = inject_repartition(updated)
    updated = replace_export_script(updated, export_script)
    updated = remove_import_ux_duplicate(updated)
    updated = patch_load_enhancements(updated)
    if updated == text:
        return False
    path.write_text(updated, encoding="utf-8", newline="\n")
    return True


def main() -> int:
    sys.path.insert(0, str(ROOT))
    from generate_and_send_import import load_export_ui_template, prepare_export_script_for_import

    _, export_script = load_export_ui_template(ROOT)
    export_script = prepare_export_script_for_import(export_script)
    if len(export_script) < 5000:
        print("ERROR: export script too short; template extraction failed")
        return 1

    updated = 0
    for path in sorted(IMPORT_DIR.rglob("index.html")):
        if path.parent.name in {"fallback", "my-schedules"}:
            continue
        if patch_file(path, export_script):
            updated += 1
    print(f"patched={updated}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
