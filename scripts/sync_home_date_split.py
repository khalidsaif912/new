#!/usr/bin/env python3
"""Sync with-me split date banner trial from docs/index.html to export date pages."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
SOURCE = DOCS / "index.html"

CSS_START = "    /* Date — with-me split layout (homepage trial) */"
CSS_END = "    a.summaryChip, button.summaryChip, .langToggle, .roster-cta-btn, button.shiftFilterBtn {"

OLD_CSS_START = "    /* Date Picker Wrapper */"
OLD_CSS_END = CSS_END

DATE_HTML_START = '    <div class="datePickerWrapper">'
SPLIT_DATE_HTML = """    <div class="datePickerWrapper">
      <label class="dateTag" id="dateTag" for="datePicker">
        <span class="dateTagMain">
          <span class="dateTagDay" id="dateTagDay"></span>
          <span class="dateTagSide">
            <span class="dateTagWeek" id="dateTagWeek"></span>
            <span class="dateTagMonthWrap">
              <span class="dateTagMonth" id="dateTagMonth"></span>
            </span>
          </span>
        </span>
      </label>
      {picker}
    </div>"""

JS_START = "  var MONTHS_EN = "
JS_END = "  window.rosterSyncHeaderDate = syncHeaderDate;\n\n"

OLD_JS_START = "  function formatIsoLabel(iso) {"
OLD_JS_END = "  var path = window.location.pathname || '/';"

OLD_CLONE = (
    "  clone.querySelectorAll('.bannerTitle, .bannerTitleEyebrow, .bannerTitleMain, "
    ".dateTag, .dateTag-label').forEach(function(el) {"
)
NEW_CLONE = (
    "  clone.querySelectorAll('.bannerTitle, .bannerTitleEyebrow, .bannerTitleMain, "
    ".dateTag, .dateTag-label, .dateTagDay, .dateTagWeek, .dateTagMonth').forEach(function(el) {"
)

OLD_APPLY_LANG = """  localStorage.setItem('rosterLang',lang);
  LANG=lang;
  updateSummarySwitchChip();
}"""

NEW_APPLY_LANG = """  localStorage.setItem('rosterLang',lang);
  LANG=lang;
  updateSummarySwitchChip();
  if (window.rosterSyncHeaderDate) {
    var datePickerEl = document.getElementById('datePicker');
    var iso = datePickerEl && datePickerEl.value;
    if (!iso) {
      var m = (window.location.pathname || '').match(/\\/date\\/(\\d{4}-\\d{2}-\\d{2})\\//);
      if (m) iso = m[1];
    }
    if (iso) window.rosterSyncHeaderDate(iso, lang);
  }
}"""

PICKER_RE = re.compile(
    r'<input id="datePicker" type="date" value="[^"]*" min="[^"]*" max="[^"]*"[^>]*/>'
)


def extract_between(text: str, start: str, end: str) -> str:
    i = text.index(start)
    j = text.index(end, i)
    return text[i:j]


def patch_file(path: Path, source: str) -> bool:
    text = path.read_text(encoding="utf-8")
    if "homeDateSplit" in text and "var MONTHS_EN" in text:
        return False

    new_css = extract_between(source, CSS_START, CSS_END)
    if OLD_CSS_START in text:
        old_css = extract_between(text, OLD_CSS_START, OLD_CSS_END)
        text = text.replace(old_css, new_css, 1)
    elif CSS_START not in text:
        return False

    text = text.replace('  <div class="header">', '  <div class="header homeDateSplit">', 1)

    i = text.index(DATE_HTML_START)
    k = text.index("\n    </div>", text.index('id="datePicker"', i))
    old_date_html = text[i : k + len("\n    </div>")]
    picker_m = PICKER_RE.search(old_date_html)
    if not picker_m:
        return False
    picker = picker_m.group(0)
    new_date_html = SPLIT_DATE_HTML.format(picker=picker)
    text = text.replace(old_date_html, new_date_html, 1)

    new_js = extract_between(source, JS_START, JS_END)
    if OLD_JS_START in text:
        old_js = extract_between(text, OLD_JS_START, OLD_JS_END)
        text = text.replace(old_js, new_js, 1)

    if OLD_CLONE in text:
        text = text.replace(OLD_CLONE, NEW_CLONE, 1)
    if OLD_APPLY_LANG in text:
        text = text.replace(OLD_APPLY_LANG, NEW_APPLY_LANG, 1)

    text = text.replace("banner-changer.js?v=20260901c", "banner-changer.js?v=20260901d")
    text = text.replace("banner-changer.js?v=20260901b", "banner-changer.js?v=20260901d")

    path.write_text(text, encoding="utf-8")
    return True


def iter_targets() -> list[Path]:
    out: list[Path] = []
    date_root = DOCS / "date"
    if date_root.is_dir():
        for p in sorted(date_root.glob("*/index.html")):
            out.append(p)
        for p in sorted(date_root.glob("*/now/index.html")):
            out.append(p)
    now_index = DOCS / "now" / "index.html"
    if now_index.is_file():
        out.append(now_index)
    return out


def main() -> None:
    source = SOURCE.read_text(encoding="utf-8")
    n = 0
    for path in iter_targets():
        if patch_file(path, source):
            print(f"patched {path.relative_to(ROOT)}")
            n += 1
    print(f"done: {n} file(s)")


if __name__ == "__main__":
    main()
