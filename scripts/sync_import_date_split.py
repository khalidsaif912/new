#!/usr/bin/env python3
"""Apply export split-date banner layout to Import pages."""

from __future__ import annotations

import re
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
SOURCE = DOCS / "index.html"

CSS_START = "    /* Date — with-me split layout (homepage trial) */"
CSS_END = "    a.summaryChip, button.summaryChip, .langToggle, .roster-cta-btn, button.shiftFilterBtn {"
OLD_CSS_START = "    /* Date Picker Wrapper */"

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
JS_END = "  var path = window.location.pathname || '/';"
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
      var m = (window.location.pathname || '').match(/(\\d{4}-\\d{2}-\\d{2})/);
      if (m) iso = m[1];
    }
    if (iso) window.rosterSyncHeaderDate(iso, lang);
  }
}"""

FONT_LINKS = """  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700;800&family=IBM+Plex+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">"""

ROOT_VARS_OLD = """    :root {
      --safe-top: env(safe-area-inset-top, 0px);
      --safe-bottom: env(safe-area-inset-bottom, 0px);
    }"""

ROOT_VARS_NEW = """    :root {
      --safe-top: env(safe-area-inset-top, 0px);
      --safe-bottom: env(safe-area-inset-bottom, 0px);
      --date-font-en: 'IBM Plex Sans', system-ui, -apple-system, sans-serif;
      --date-font-ar: 'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, sans-serif;
    }"""

LOADER = """
  (function loadDateBannerNav() {
    var root = typeof getSiteRootPath === 'function' ? getSiteRootPath() : '';
    var s = document.createElement('script');
    s.src = (root || '') + '/date-banner-nav.js?v=20260901e';
    document.head.appendChild(s);
  })();
"""

PICKER_RE = re.compile(r'<input id="datePicker"[^>]*>')
LOADER_MARKER = "loadDateBannerNav"
CLOSE_IIFE_RE = re.compile(
    r"(picker\.addEventListener\('change', function\(\) \{[\s\S]*?\n  \}\);\n)(?!\s*\(function loadDateBannerNav)",
    re.MULTILINE,
)


def extract_between(text: str, start: str, end: str) -> str:
    i = text.index(start)
    j = text.index(end, i)
    return text[i:j]


def iter_targets() -> list[Path]:
    out: list[Path] = [
        DOCS / "import" / "index.html",
        DOCS / "import" / "now" / "index.html",
    ]
    import_root = DOCS / "import"
    if import_root.is_dir():
        out.extend(sorted(import_root.glob("[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]/index.html")))
        date_root = import_root / "date"
        if date_root.is_dir():
            out.extend(sorted(date_root.glob("*/index.html")))
    return [p for p in out if p.is_file()]


def patch_file(path: Path, source: str, css_block: str, js_block: str) -> bool:
    text = path.read_text(encoding="utf-8")
    orig = text

    if "homeDateSplit" in text and "var MONTHS_EN" in text and "dateTagDay" in text:
        if "window.rosterSyncHeaderDate = syncHeaderDate" not in text and "function syncHeaderDate" in text:
            text = text.replace(
                "  var path = window.location.pathname || '/';",
                "  window.rosterSyncHeaderDate = syncHeaderDate;\n\n  var path = window.location.pathname || '/';",
                1,
            )
            if text != orig:
                path.write_text(text, encoding="utf-8")
                return True
        return False

    if OLD_CSS_START in text and CSS_END in text:
        old_css = extract_between(text, OLD_CSS_START, CSS_END)
        text = text.replace(old_css, css_block, 1)
    elif CSS_START not in text:
        return False

    text = text.replace('  <div class="header">', '  <div class="header homeDateSplit">', 1)

    if DATE_HTML_START in text and 'id="datePicker"' in text:
        i = text.index(DATE_HTML_START)
        picker_i = text.index('id="datePicker"', i)
        k = text.index("\n    </div>", picker_i)
        old_date_html = text[i : k + len("\n    </div>")]
        picker_m = PICKER_RE.search(old_date_html)
        if picker_m:
            text = text.replace(old_date_html, SPLIT_DATE_HTML.format(picker=picker_m.group(0)), 1)

    if OLD_JS_START in text and OLD_JS_END in text:
        old_js = extract_between(text, OLD_JS_START, OLD_JS_END)
        text = text.replace(old_js, js_block, 1)

    if OLD_CLONE in text:
        text = text.replace(OLD_CLONE, NEW_CLONE, 1)
    if OLD_APPLY_LANG in text:
        text = text.replace(OLD_APPLY_LANG, NEW_APPLY_LANG, 1)

    if "fonts.googleapis.com/css2?family=IBM+Plex+Sans" not in text:
        for anchor in (
            "  <title>Import Duty Roster</title>",
            "  <title>Duty Roster</title>",
        ):
            if anchor in text:
                text = text.replace(anchor, anchor + "\n" + FONT_LINKS, 1)
                break

    if ROOT_VARS_OLD in text:
        text = text.replace(ROOT_VARS_OLD, ROOT_VARS_NEW, 1)
    elif "--date-font-en" not in text and "--safe-bottom: env(safe-area-inset-bottom, 0px);" in text:
        text = text.replace(
            "--safe-bottom: env(safe-area-inset-bottom, 0px);",
            "--safe-bottom: env(safe-area-inset-bottom, 0px);\n"
            "      --date-font-en: 'IBM Plex Sans', system-ui, -apple-system, sans-serif;\n"
            "      --date-font-ar: 'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, sans-serif;",
            1,
        )

    if LOADER_MARKER not in text:
        m = CLOSE_IIFE_RE.search(text)
        if m:
            text = text[: m.end(1)] + LOADER + text[m.end(1) :]

    text = text.replace("banner-changer.js?v=20260831j", "banner-changer.js?v=20260901h")
    text = text.replace("banner-changer.js?v=20260901c", "banner-changer.js?v=20260901h")
    text = text.replace("banner-changer.js?v=20260901f", "banner-changer.js?v=20260901h")
    text = text.replace("banner-changer.js?v=20260901g", "banner-changer.js?v=20260901h")

    if text == orig:
        return False
    path.write_text(text, encoding="utf-8")
    return True


def main() -> None:
    source = SOURCE.read_text(encoding="utf-8")
    css_block = extract_between(source, CSS_START, CSS_END)
    js_block = extract_between(source, JS_START, JS_END)
    n = 0
    failed = []
    for path in iter_targets():
        ok = False
        for attempt in range(4):
            try:
                if patch_file(path, source, css_block, js_block):
                    n += 1
                ok = True
                break
            except OSError:
                time.sleep(0.2)
            except (ValueError, IndexError) as e:
                failed.append(f"{path.relative_to(ROOT)}: {e}")
                ok = True
                break
        if not ok:
            failed.append(f"{path.relative_to(ROOT)}: write failed")
    print(f"patched {n} file(s)")
    print(f"failed {len(failed)}")
    for item in failed[:12]:
        print(item)


if __name__ == "__main__":
    main()
