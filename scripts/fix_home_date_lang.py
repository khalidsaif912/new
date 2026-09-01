#!/usr/bin/env python3
"""Fix split date lang sync + backfill missing JS on export date pages."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "index.html"

OLD_SYNC = """  function syncHeaderDate(iso) {
    var lang = (typeof LANG !== 'undefined' && LANG) ? LANG : (localStorage.getItem('rosterLang') || 'en');
    var dateWeek = document.getElementById('dateTagWeek');
    var dateDay = document.getElementById('dateTagDay');
    var dateMonth = document.getElementById('dateTagMonth');
    if (dateDay) {
      if (dateWeek) dateWeek.textContent = weekdayLabel(iso, lang);
      dateDay.textContent = dayNumLabel(iso);
      if (dateMonth) dateMonth.textContent = monthNameLabel(iso, lang);
      return;
    }"""

NEW_SYNC = """  function syncHeaderDate(iso, langOverride) {
    var lang = langOverride
      || (typeof LANG !== 'undefined' && LANG)
      || document.documentElement.getAttribute('lang')
      || (localStorage.getItem('rosterLang') || 'en');
    var dateWeek = document.getElementById('dateTagWeek');
    var dateDay = document.getElementById('dateTagDay');
    var dateMonth = document.getElementById('dateTagMonth');
    if (dateDay) {
      if (dateWeek) dateWeek.textContent = weekdayLabel(iso, lang);
      dateDay.textContent = dayNumLabel(iso);
      if (dateMonth) dateMonth.textContent = monthNameLabel(iso, lang);
      return;
    }"""

OLD_APPLY = """  if (window.rosterSyncHeaderDate) {
    var datePickerEl = document.getElementById('datePicker');
    if (datePickerEl && datePickerEl.value) window.rosterSyncHeaderDate(datePickerEl.value);
  }
}"""

NEW_APPLY = """  if (window.rosterSyncHeaderDate) {
    var datePickerEl = document.getElementById('datePicker');
    var iso = datePickerEl && datePickerEl.value;
    if (!iso) {
      var m = (window.location.pathname || '').match(/\\/date\\/(\\d{4}-\\d{2}-\\d{2})\\//);
      if (m) iso = m[1];
    }
    if (iso) window.rosterSyncHeaderDate(iso, lang);
  }
}"""

LEGACY_APPLY_OLD = """  localStorage.setItem('rosterLang',lang);
  LANG=lang;
}
function toggleLang()"""

LEGACY_APPLY_NEW = """  localStorage.setItem('rosterLang',lang);
  LANG=lang;
  if (window.rosterSyncHeaderDate) {
    var datePickerEl = document.getElementById('datePicker');
    var iso = datePickerEl && datePickerEl.value;
    if (!iso) {
      var m = (window.location.pathname || '').match(/\\/date\\/(\\d{4}-\\d{2}-\\d{2})\\//);
      if (m) iso = m[1];
    }
    if (iso) window.rosterSyncHeaderDate(iso, lang);
  }
}
function toggleLang()"""

JS_START = "  var MONTHS_EN = "
JS_END = "  window.rosterSyncHeaderDate = syncHeaderDate;\n"

INIT_BLOCK = """
  var path = window.location.pathname || '/';
  var pageDateMatch = path.match(/\\/date\\/(\\d{4})-(\\d{2})-(\\d{2})\\//);
  var effectiveIso = pageDateMatch
    ? (pageDateMatch[1] + '-' + pageDateMatch[2] + '-' + pageDateMatch[3])
    : getMuscatTodayIso();
  picker.value = effectiveIso;
  syncHeaderDate(effectiveIso);
"""

GET_MUSCAT_END = """  function getMuscatTodayIso() {
    var now = new Date();
    var muscatTime = new Date(now.getTime() + (4 * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
    return muscatTime.getFullYear() + '-' +
      String(muscatTime.getMonth() + 1).padStart(2, '0') + '-' +
      String(muscatTime.getDate()).padStart(2, '0');
  }
"""

INIT_ANCHOR = "  if (checkAndRedirectToToday()) return;"


def iter_targets() -> list[Path]:
    out: list[Path] = [ROOT / "docs" / "index.html", ROOT / "docs" / "home.html", ROOT / "docs" / "now" / "index.html"]
    date_root = ROOT / "docs" / "date"
    if date_root.is_dir():
        out.extend(sorted(date_root.glob("*/index.html")))
        out.extend(sorted(date_root.glob("*/now/index.html")))
    return out


def extract_between(text: str, start: str, end: str) -> str:
    i = text.index(start)
    j = text.index(end, i)
    return text[i : j + len(end)]


def patch_legacy_date_js(path: Path, source: str) -> bool:
    text = path.read_text(encoding="utf-8")
    if "homeDateSplit" not in text or "var MONTHS_EN" in text:
        return False
    if GET_MUSCAT_END not in text or INIT_ANCHOR not in text:
        return False

    date_js = extract_between(source, JS_START, JS_END)
    text = text.replace(GET_MUSCAT_END, GET_MUSCAT_END + "\n" + date_js + "\n", 1)
    if INIT_BLOCK.strip() not in text:
        text = text.replace(INIT_ANCHOR, INIT_BLOCK + "\n\n" + INIT_ANCHOR, 1)
    if LEGACY_APPLY_OLD in text:
        text = text.replace(LEGACY_APPLY_OLD, LEGACY_APPLY_NEW, 1)
    path.write_text(text, encoding="utf-8")
    return True


def main() -> None:
    source = SOURCE.read_text(encoding="utf-8")
    sync_n = apply_n = legacy_n = 0
    for path in iter_targets():
        text = path.read_text(encoding="utf-8")
        changed = False
        if OLD_SYNC in text:
            text = text.replace(OLD_SYNC, NEW_SYNC, 1)
            sync_n += 1
            changed = True
        if OLD_APPLY in text:
            text = text.replace(OLD_APPLY, NEW_APPLY, 1)
            apply_n += 1
            changed = True
        if changed:
            path.write_text(text, encoding="utf-8")
            print(f"lang-fix {path.relative_to(ROOT)}")
        if patch_legacy_date_js(path, source):
            legacy_n += 1
            print(f"legacy-js {path.relative_to(ROOT)}")
    print(f"done: sync={sync_n} apply={apply_n} legacy={legacy_n}")


if __name__ == "__main__":
    main()
