#!/usr/bin/env python3
"""Sync export/import date redirect logic across docs HTML pages."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"

MARKER = "// التحقق من التاريخ وإعادة التوجيه للـ today"
END_MARKER = "if (checkAndRedirectToToday()) return;"

EXPORT_BLOCK = """
  var USER_DATE_NAV_KEY = 'rosterUserPickedDate';

  function getMuscatTodayIso() {
    var now = new Date();
    var muscatTime = new Date(now.getTime() + (4 * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
    return muscatTime.getFullYear() + '-' +
      String(muscatTime.getMonth() + 1).padStart(2, '0') + '-' +
      String(muscatTime.getDate()).padStart(2, '0');
  }

  function consumeUserDateNavigation() {
    if (sessionStorage.getItem(USER_DATE_NAV_KEY) !== '1') return false;
    sessionStorage.removeItem(USER_DATE_NAV_KEY);
    return true;
  }

  function markUserDateNavigation() {
    sessionStorage.setItem(USER_DATE_NAV_KEY, '1');
  }

  function buildDateBasePath() {
    var p = window.location.pathname || '/';
    return p
      .replace(/\\/date\\/\\d{4}-\\d{2}-\\d{2}\\/.*$/, '/')
      .replace(/\\/now\\/.*$/, '/')
      .replace(/\\/+$/, '');
  }

  function redirectToDate(iso, isNowPage) {
    window.location.replace(buildDateBasePath() + '/date/' + iso + '/' + (isNowPage ? 'now/' : ''));
  }

  // ═══════════════════════════════════════════════════
  // التحقق من التاريخ وإعادة التوجيه للـ today
  // ═══════════════════════════════════════════════════
  function checkAndRedirectToToday() {
    var path = window.location.pathname || '/';
    var isNowPage = path.includes('/now');
    var todayIso = getMuscatTodayIso();

    if (!path.includes('/date/')) {
      var baseRoot = path.replace(/\\/now\\/?$/, '/').replace(/\\/+$/, '');
      window.location.replace(baseRoot + '/date/' + todayIso + '/' + (isNowPage ? 'now/' : ''));
      return true;
    }

    var dateMatch = path.match(/\\/date\\/(\\d{4})-(\\d{2})-(\\d{2})\\//);
    if (!dateMatch) return false;

    var pageIso = dateMatch[1] + '-' + dateMatch[2] + '-' + dateMatch[3];
    if (pageIso === todayIso) {
      sessionStorage.removeItem(USER_DATE_NAV_KEY);
      sessionStorage.removeItem('pageLoaded');
      return false;
    }

    if (consumeUserDateNavigation()) return false;

    redirectToDate(todayIso, isNowPage);
    return true;
  }

  function resyncTodayIfNeeded() {
    var path = window.location.pathname || '/';
    if (!path.includes('/date/')) return;
    var dateMatch = path.match(/\\/date\\/(\\d{4})-(\\d{2})-(\\d{2})\\//);
    if (!dateMatch) return;
    var pageIso = dateMatch[1] + '-' + dateMatch[2] + '-' + dateMatch[3];
    var todayIso = getMuscatTodayIso();
    if (pageIso !== todayIso && sessionStorage.getItem(USER_DATE_NAV_KEY) !== '1') {
      redirectToDate(todayIso, path.includes('/now'));
    }
  }

  if (checkAndRedirectToToday()) return;

  window.addEventListener('pageshow', function(ev) {
    if (ev.persisted) resyncTodayIfNeeded();
  });
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') resyncTodayIfNeeded();
  });"""

IMPORT_BLOCK = """
  var USER_DATE_NAV_KEY = 'rosterUserPickedDate';

  function getMuscatTodayIso() {
    var now = new Date();
    var muscatTime = new Date(now.getTime() + (4 * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
    return muscatTime.getFullYear() + '-' +
      String(muscatTime.getMonth() + 1).padStart(2, '0') + '-' +
      String(muscatTime.getDate()).padStart(2, '0');
  }

  function consumeUserDateNavigation() {
    if (sessionStorage.getItem(USER_DATE_NAV_KEY) !== '1') return false;
    sessionStorage.removeItem(USER_DATE_NAV_KEY);
    return true;
  }

  function markUserDateNavigation() {
    sessionStorage.setItem(USER_DATE_NAV_KEY, '1');
  }

  function buildDateBasePath() {
    var p = window.location.pathname || '/';
    return p
      .replace(/\\/date\\/\\d{4}-\\d{2}-\\d{2}\\/.*$/, '/')
      .replace(/\\/\\d{4}-\\d{2}-\\d{2}\\/.*$/, '/')
      .replace(/\\/now\\/.*$/, '/')
      .replace(/\\/+$/, '');
  }

  function redirectToDate(iso, isNowPage) {
    window.location.replace(buildDateBasePath() + '/date/' + iso + '/' + (isNowPage ? 'now/' : ''));
  }

  // ═══════════════════════════════════════════════════
  // التحقق من التاريخ وإعادة التوجيه للـ today
  // ═══════════════════════════════════════════════════
  function checkAndRedirectToToday() {
    var path = window.location.pathname || '/';
    var isNowPage = path.includes('/now');
    var todayIso = getMuscatTodayIso();
    var hasDateInPath = /\\/(?:import\\/date|import)\\/\\d{4}-\\d{2}-\\d{2}\\//.test(path);

    if (!hasDateInPath) {
      var baseRoot = path.replace(/\\/now\\/?$/, '/').replace(/\\/+$/, '');
      window.location.replace(baseRoot + '/date/' + todayIso + '/' + (isNowPage ? 'now/' : ''));
      return true;
    }

    var dateMatch = path.match(/\\/(?:import\\/date|import)\\/(\\d{4})-(\\d{2})-(\\d{2})\\//);
    if (!dateMatch) return false;

    var pageIso = dateMatch[1] + '-' + dateMatch[2] + '-' + dateMatch[3];
    if (pageIso === todayIso) {
      sessionStorage.removeItem(USER_DATE_NAV_KEY);
      sessionStorage.removeItem('pageLoaded');
      return false;
    }

    if (consumeUserDateNavigation()) return false;

    redirectToDate(todayIso, isNowPage);
    return true;
  }

  function resyncTodayIfNeeded() {
    var path = window.location.pathname || '/';
    var dateMatch = path.match(/\\/(?:import\\/date|import)\\/(\\d{4})-(\\d{2})-(\\d{2})\\//);
    if (!dateMatch) return;
    var pageIso = dateMatch[1] + '-' + dateMatch[2] + '-' + dateMatch[3];
    var todayIso = getMuscatTodayIso();
    if (pageIso !== todayIso && sessionStorage.getItem(USER_DATE_NAV_KEY) !== '1') {
      redirectToDate(todayIso, path.includes('/now'));
    }
  }

  if (checkAndRedirectToToday()) return;

  window.addEventListener('pageshow', function(ev) {
    if (ev.persisted) resyncTodayIfNeeded();
  });
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') resyncTodayIfNeeded();
  });"""

PICKER_MARK_RE = re.compile(
    r"(\s*picker\.addEventListener\('change', function\(\) \{\s*\n\s*if \(!picker\.value\) return;\s*\n)\s*sessionStorage\.removeItem\('pageLoaded'\);",
    re.MULTILINE,
)

PICKER_MARK_NEW = r"\1\n    markUserDateNavigation();\n    sessionStorage.removeItem('pageLoaded');"


def is_import_page(text: str, path: Path) -> bool:
    if "\\docs\\import\\" in str(path).replace("/", "\\") or "/docs/import/" in path.as_posix():
        return True
    return "import/date" in text or "import\\/date" in text or "/(?:import/date|import)/" in text


def patch_html(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    if MARKER not in text or "getElementById('datePicker')" not in text:
        return False

    start = text.find(MARKER)
    if start == -1:
        return False
    # Include comment lines above marker if present
    block_start = text.rfind("// ═══", 0, start)
    if block_start == -1 or start - block_start > 120:
        block_start = start

    end = text.find(END_MARKER, start)
    if end == -1:
        return False
    end += len(END_MARKER)

    block = IMPORT_BLOCK if is_import_page(text, path) else EXPORT_BLOCK
    new_text = text[:block_start] + block + text[end:]

    # Remove duplicate getMuscatTodayIso if block inserted before existing one
    if new_text.count("function getMuscatTodayIso()") > 1:
        # Keep first getMuscatTodayIso in picker IIFE, remove from inserted if duplicate adjacent
        pass

    # If page already had getMuscatTodayIso before marker, remove duplicate from EXPORT_BLOCK
    before = text[:block_start]
    if "function getMuscatTodayIso()" in before and "function getMuscatTodayIso()" in block:
        block = IMPORT_BLOCK if is_import_page(text, path) else EXPORT_BLOCK
        block = re.sub(
            r"\n  function getMuscatTodayIso\(\) \{[^}]+\}\n",
            "\n",
            block,
            count=1,
        )
        new_text = text[:block_start] + block + text[end:]

    new_text2, n = PICKER_MARK_RE.subn(PICKER_MARK_NEW, new_text, count=1)
    if n:
        new_text = new_text2
    elif "markUserDateNavigation();" not in new_text:
        new_text = new_text.replace(
            "sessionStorage.removeItem('pageLoaded');",
            "markUserDateNavigation();\n    sessionStorage.removeItem('pageLoaded');",
            1,
        )

    if new_text == text:
        return False
    path.write_text(new_text, encoding="utf-8")
    return True


def main() -> None:
    n = 0
    for html in DOCS.rglob("*.html"):
        if patch_html(html):
            n += 1
    print(f"Patched {n} HTML files")


if __name__ == "__main__":
    main()
