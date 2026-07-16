#!/usr/bin/env python3
"""Sync Import roster pages with Export UX (CTA bar, modals, scripts, date picker, etc.)."""

from __future__ import annotations

import calendar
import datetime as dt
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IMPORT_DIR = ROOT / "docs" / "import"

DATE_TAG_SVG = (
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" '
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    '<rect x="3" y="4" width="18" height="18" rx="2"/>'
    '<path d="M16 2v4M8 2v4M3 10h18"/></svg>'
)

GO_TO_EXPORT_OLD = """function goToExport(event) {
  if (event) event.preventDefault();
  location.href = getSiteRootUrl() + '/';
}"""

GO_TO_EXPORT_NEW = """function goToExport(event) {
  if (event) event.preventDefault();
  var picker = document.getElementById('datePicker');
  var iso = (picker && picker.value) ? picker.value : '';
  if (!iso) {
    var m = (location.pathname || '').match(/(\\d{4}-\\d{2}-\\d{2})/);
    if (m) iso = m[1];
  }
  var root = getSiteRootUrl();
  if (!iso) {
    location.href = root + '/';
    return;
  }
  location.href = root + '/date/' + iso + '/';
}"""

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
    r'</div>',
    re.MULTILINE,
)

FIRST_STYLE_RE = re.compile(r"<style>.*?</style>", re.DOTALL)
HEADER_RE = re.compile(r'<div class="header">.*?</div>\s*\n\s*(?=<div class="summaryBar">)', re.DOTALL)
OLD_QUICK_ACTIONS_RE = re.compile(
    r'<div class="quickActions(?: roster-cta)?">\s*.*?</div>\s*(?=<div class="footer">)',
    re.DOTALL,
)
LOAD_ENHANCE_RE = re.compile(r"\(function loadLocalEnhancements\(\) \{[\s\S]*?\}\)\(\);")
IMPORT_GUARD_MARKER = "/* ===== Import path overrides ===== */"
SUMMARY_BAR_START = '<div class="summaryBar">'
DEPT_CARD_MARKER = '<div class="deptCard">'
CTA_INSIDE_BOTTOM_RE = re.compile(
    r'<div class="importBottom">\s*<nav class="quickActions roster-cta"[\s\S]*?</nav>\s*',
    re.DOTALL,
)
EXTRA_IMPORT_CHIP_CSS = """
    a.summaryChip.exportChip .chipVal { color:#059669; }
    a.summaryChip.exportChip:hover { box-shadow:0 8px 20px rgba(5,150,105,.18); }
"""

IMPORT_BOTTOM_FLEX_OLD = """    .importBottom .quickActions {
      margin-bottom: 6px;
      display: flex;
      justify-content: center;
      gap: 10px;
      flex-wrap: wrap;
    }"""

IMPORT_BOTTOM_CTA_CSS = """    .importBottom {
      margin-top: auto;
      padding-top: 14px;
      position: relative;
      z-index: 25;
    }
    .importBottom .quickActions.roster-cta {
      margin-bottom: 6px;
      margin-top: 14px;
    }
"""


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
    sys.path.insert(0, str(ROOT))
    from generate_and_send_import import patch_flatten_future_shifts_js

    return patch_flatten_future_shifts_js(html)


def inject_modals(html: str, share_html: str, apps_html: str) -> str:
    if 'id="siteShareSheet"' in html and 'id="siteAppsSheet"' in html:
        return html
    needle = '<script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>'
    if needle in html:
        insert = f"\n{share_html}\n{apps_html}\n"
        return html.replace(needle, insert + needle, 1)
    if 'id="captureBusy"' in html:
        return html.replace(
            '<div id="captureBusy"',
            f"{share_html}\n{apps_html}\n<div id=\"captureBusy\"",
            1,
        )
    return html


def inject_capture_shell(html: str) -> str:
    if 'id="captureBusy"' in html:
        return html
    needle = "</div>\n\n<script>\n// Hard-guaranteed import page behavior"
    if needle not in html:
        return html
    capture = """
<div id="captureBusy" class="captureBusy">Preparing image...</div>
<div id="captureSheet" class="captureSheet" aria-hidden="true">
  <div class="captureSheetCard">
    <div class="captureSheetTitle">Share or save image</div>
    <img id="capturePreview" class="capturePreviewImg" alt="Snapshot preview" />
    <div class="captureSheetActions">
      <button id="captureShareBtn" class="captureSheetBtn captureShareBtn" type="button">Share</button>
      <button id="captureSaveBtn" class="captureSheetBtn captureSaveBtn" type="button">Save</button>
    </div>
    <button id="captureCancelBtn" class="captureSheetBtn captureCancelBtn" type="button">Cancel</button>
  </div>
</div>
"""
    html2 = '<script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>'
    insert = f"\n{capture}\n{html2}\n"
    return html.replace(needle, f"</div>{insert}\n<script>\n// Hard-guaranteed import page behavior", 1)


def inject_repartition(html: str) -> str:
    if REPARTITION_FN_MARKER in html:
        return html
    needle = "  // Match Export roster logic (Muscat UTC+4)"
    if needle not in html:
        return html
    return html.replace(needle, REPARTITION_FN + "\n\n  // Match Export roster logic (Muscat UTC+4)", 1)


def replace_export_script(html: str, export_script: str) -> str:
    guard = html.find(IMPORT_GUARD_MARKER)
    if guard == -1:
        return html

    marker = "<script>\n\n  (function () {\n    function siteRoot()"
    start = html.find(marker)
    if start == -1:
        hc = html.find("html2canvas")
        if hc != -1:
            start = html.find("<script>", hc)
    if start == -1 or start >= guard:
        return html

    content_start = html.find("\n", start) + 1
    return html[:content_start] + export_script + "\n\n" + html[guard:]


def remove_import_ux_duplicate(html: str) -> str:
    return re.sub(
        r"/\* ===== Import UX fixes ===== \*/\s*\(function\(\) \{[\s\S]*?\}\)\(\);\s*\n",
        "",
        html,
        count=1,
    )


def replace_main_style(html: str, export_style: str) -> str:
    if ".roster-cta-btn" in html and ".siteShareSheet" in html:
        return html
    return FIRST_STYLE_RE.sub(f"<style>{export_style}</style>", html, count=1)


def page_date_label(html: str) -> tuple[str, str]:
    m = re.search(r'id="datePicker"[^>]*value="(\d{4}-\d{2}-\d{2})"', html)
    if not m:
        m = re.search(r"/(\d{4}-\d{2}-\d{2})/", html)
    if not m:
        return "", "Select date"
    iso = m.group(1)
    try:
        d = dt.date.fromisoformat(iso)
        return iso, d.strftime("%d %B %Y")
    except ValueError:
        return iso, iso


def patch_header(html: str, lang_toggle_html: str) -> str:
    iso, date_label = page_date_label(html)
    min_m = re.search(r'id="datePicker"[^>]*min="([^"]+)"', html)
    max_m = re.search(r'id="datePicker"[^>]*max="([^"]+)"', html)
    min_date = min_m.group(1) if min_m else (iso[:7] + "-01" if iso else "")
    max_date = max_m.group(1) if max_m else ""
    if iso and not max_date:
        y, mo = int(iso[:4]), int(iso[5:7])
        _, dim = calendar.monthrange(y, mo)
        max_date = f"{y}-{mo:02d}-{dim:02d}"

    header = f"""  <div class="header">
    {lang_toggle_html}
    <h1 id="pageTitle" class="bannerTitle">
      <span class="bannerTitleEyebrow" id="pageTitleEyebrow">Import</span>
      <span class="bannerTitleMain" id="pageTitleMain">Duty Roster</span>
    </h1>
    <div class="datePickerWrapper">
      <label class="dateTag" id="dateTag" for="datePicker"><span class="dateTag-icon" aria-hidden="true">{DATE_TAG_SVG}</span><span class="dateTag-label" id="dateTagLabel">{date_label}</span></label>
      <input id="datePicker" type="date" value="{iso}" min="{min_date}" max="{max_date}" aria-label="Select roster date" title="Pick day" />
    </div>
  </div>
"""
    if HEADER_RE.search(html):
        return HEADER_RE.sub(header, html, count=1)
    return html


def patch_cta_bar(html: str, cta_html: str) -> str:
    if 'class="quickActions roster-cta"' in html and "shareSiteBtn" in html:
        return html
    if OLD_QUICK_ACTIONS_RE.search(html):
        return OLD_QUICK_ACTIONS_RE.sub(cta_html + "\n    ", html, count=1)
    return html


def extract_employee_total(html: str) -> int:
    m = re.search(r'id="summarySwitchVal"[^>]*>(\d+)<', html)
    if m:
        return int(m.group(1))
    start = html.find(SUMMARY_BAR_START)
    end = html.find(DEPT_CARD_MARKER, start if start != -1 else 0)
    block = html[start:end] if start != -1 and end != -1 else ""
    if block:
        m4 = re.search(r'data-key="employees"[^>]*>Employees', block)
        if m4:
            before = block[: m4.start()]
            nums = re.findall(r"<div class=\"chipVal\"[^>]*>(\d+)<", before)
            if nums:
                return int(nums[-1])
        m5 = re.search(r"<div class=\"chipVal\"[^>]*>(\d+)<", block)
        if m5:
            return int(m5.group(1))
    return 0


def patch_summary_bar(html: str, bar_html: str) -> str:
    if (
        'id="summarySwitchChip"' in html
        and 'id="trainingBtn"' in html
        and 'id="diffChipBtn"' in html
        and 'data-key="departments"' not in html
        and html.count('id="myScheduleBtn"') <= 1
    ):
        return html
    start = html.find(SUMMARY_BAR_START)
    end = html.find(DEPT_CARD_MARKER, start + 1 if start != -1 else 0)
    if start == -1 or end == -1:
        return html
    return html[:start] + bar_html.strip() + "\n\n  " + html[end:]


def patch_cta_placement(html: str, cta_html: str) -> str:
    """Keep CTA inside .importBottom so dept reorder (insertBefore importBottom) stays above it."""
    # Remove CTA wrongly placed between dept cards and importBottom.
    html = re.sub(
        r"\n\s*<nav class=\"quickActions roster-cta\"[\s\S]*?</nav>\s*(?=<div class=\"importBottom\">)",
        "\n  ",
        html,
        count=1,
    )
    if CTA_INSIDE_BOTTOM_RE.search(html):
        return CTA_INSIDE_BOTTOM_RE.sub(
            '<div class="importBottom">\n    ' + cta_html + "\n    ",
            html,
            count=1,
        )
    return re.sub(
        r'(<div class="importBottom">)\s*(?!<nav class="quickActions)',
        r"\1\n    " + cta_html + "\n    ",
        html,
        count=1,
    )


def patch_import_bottom_cta_css(html: str) -> str:
    """Remove legacy flex-wrap CTA bar so export 6-column grid layout applies."""
    if IMPORT_BOTTOM_FLEX_OLD in html:
        html = html.replace(IMPORT_BOTTOM_FLEX_OLD, "", 1)
    dup = """    .importBottom {
      margin-top: auto;
      padding-top: 14px;
    }
    .importBottom {
      margin-top: auto;
      padding-top: 14px;
      position: relative;
      z-index: 25;
    }"""
    if dup in html:
        html = html.replace(dup, IMPORT_BOTTOM_CTA_CSS.strip(), 1)
    elif ".importBottom .quickActions.roster-cta" not in html:
        html = html.replace(
            "    .importBottom {\n      margin-top: auto;\n      padding-top: 14px;\n    }",
            IMPORT_BOTTOM_CTA_CSS.strip(),
            1,
        )
    cta_rule = """    .importBottom .quickActions.roster-cta {
      margin-bottom: 6px;
      margin-top: 14px;
    }"""
    while html.count(cta_rule) > 1:
        html = html.replace(cta_rule, "", 1)
    return html


def patch_export_chip_css(html: str) -> str:
    if "exportChip .chipVal" in html:
        return html
    marker = ".welcomeChip.visible {"
    if marker in html:
        return html.replace(marker, EXTRA_IMPORT_CHIP_CSS + "    " + marker, 1)
    return html


def inject_import_bootstrap(html: str, bootstrap_js: str) -> str:
    if "function reorderImportDepartments" in html:
        return html
    needle = '<script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>'
    block = f"<script>\n{bootstrap_js}\n</script>\n"
    if needle in html:
        return html.replace(needle, needle + "\n" + block, 1)
    return html


def patch_go_to_export(html: str) -> str:
    if "location.href = root + '/date/' + iso + '/';" in html:
        return html
    if GO_TO_EXPORT_OLD in html:
        return html.replace(GO_TO_EXPORT_OLD, GO_TO_EXPORT_NEW, 1)
    return html


def dedupe_load_enhancements(html: str) -> str:
    guard = html.find(IMPORT_GUARD_MARKER)
    if guard == -1:
        return html
    before = html[:guard]
    after = html[guard:]
    while LOAD_ENHANCE_RE.search(before):
        before = LOAD_ENHANCE_RE.sub("", before, count=1)
    # Keep at most one block after import overrides.
    seen = False

    def _keep_one(m: re.Match[str]) -> str:
        nonlocal seen
        if seen:
            return ""
        seen = True
        return m.group(0)

    after = LOAD_ENHANCE_RE.sub(_keep_one, after)
    return before + after


def patch_load_enhancements_footer(html: str, load_block: str) -> str:
    guard = html.find(IMPORT_GUARD_MARKER)
    if guard == -1:
        return html
    after = html[guard:]
    block = load_block.strip()
    if block in after:
        return html

    def _repl(_: re.Match[str]) -> str:
        return block

    if "function loadLocalEnhancements" in after:
        after = LOAD_ENHANCE_RE.sub(_repl, after, count=1)
    else:
        insert_at = after.find("function goToMySchedule")
        if insert_at != -1:
            after = after[:insert_at] + block + "\n" + after[insert_at:]
    return html[:guard] + after


def patch_file(
    path: Path,
    export_style: str,
    export_script: str,
    lang_toggle_html: str,
    cta_html: str,
    summary_bar_html: str,
    bootstrap_js: str,
    load_block: str,
    share_html: str,
    apps_html: str,
) -> bool:
    text = path.read_text(encoding="utf-8")
    if ".deptCard" not in text:
        return False

    updated = text
    updated = replace_main_style(updated, export_style)
    updated = patch_export_chip_css(updated)
    updated = patch_import_bottom_cta_css(updated)
    updated = patch_header(updated, lang_toggle_html)
    updated = patch_summary_bar(updated, summary_bar_html)
    updated = patch_cta_placement(updated, cta_html)
    updated = patch_cta_bar(updated, cta_html)
    updated = inject_capture_shell(updated)
    updated = inject_modals(updated, share_html, apps_html)
    updated = patch_flatten_future_shifts(updated)
    updated = patch_reference_date(updated)
    updated = upgrade_emp_rows(updated)
    updated = inject_repartition(updated)
    updated = replace_export_script(updated, export_script)
    updated = remove_import_ux_duplicate(updated)
    updated = dedupe_load_enhancements(updated)
    updated = patch_load_enhancements_footer(updated, load_block)
    updated = patch_go_to_export(updated)
    updated = inject_import_bootstrap(updated, bootstrap_js)

    if updated == text:
        return False
    path.write_text(updated, encoding="utf-8", newline="\n")
    return True


def main() -> int:
    sys.path.insert(0, str(ROOT))
    from generate_and_send_import import import_bootstrap_script, load_export_ui_template, prepare_export_script_for_import
    from roster_cta_snippets import (
        import_cta_html,
        import_summary_bar_html,
        LANG_TOGGLE_HTML,
        LOAD_LOCAL_ENHANCEMENTS_IMPORT,
        SITE_APPS_MODAL_HTML,
        SITE_SHARE_MODAL_HTML,
    )

    export_style, export_script = load_export_ui_template(ROOT)
    export_script = prepare_export_script_for_import(export_script)
    if len(export_script) < 5000:
        print("ERROR: export script too short; template extraction failed")
        return 1

    cta_html = import_cta_html(cta_href="{BASE}/now/")
    bootstrap_js = import_bootstrap_script()
    load_block = LOAD_LOCAL_ENHANCEMENTS_IMPORT.strip()

    updated = 0
    for path in sorted(IMPORT_DIR.rglob("index.html")):
        if path.parent.name in {"fallback", "my-schedules", "subscribe"}:
            continue
        total = extract_employee_total(path.read_text(encoding="utf-8"))
        summary_html = import_summary_bar_html(total)
        if patch_file(
            path,
            export_style,
            export_script,
            LANG_TOGGLE_HTML,
            cta_html,
            summary_html,
            bootstrap_js,
            load_block,
            SITE_SHARE_MODAL_HTML,
            SITE_APPS_MODAL_HTML,
        ):
            updated += 1
    print(f"patched={updated}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
