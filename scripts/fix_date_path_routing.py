#!/usr/bin/env python3
"""Fix date navigation when opened as /index.html (404 on /index.html/date/...)."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"

NORMALIZE_FN = """  function normalizePathname(p) {
    return (p || '/')
      .replace(/\\/date\\/\\d{4}-\\d{2}-\\d{2}\\/.*$/i, '/')
      .replace(/\\/import\\/date\\/\\d{4}-\\d{2}-\\d{2}\\/.*$/i, '/')
      .replace(/\\/import\\/\\d{4}-\\d{2}-\\d{2}\\/.*$/i, '/')
      .replace(/\\/\\d{4}-\\d{2}-\\d{2}\\/.*$/i, '/')
      .replace(/\\/now\\/.*$/i, '/')
      .replace(/\\/index\\.html$/i, '')
      .replace(/\\/+$/, '');
  }

"""

BUILD_EXPORT_OLD = """  function buildDateBasePath() {
    return path
      .replace(/\\/date\\/\\d{4}-\\d{2}-\\d{2}\\/.*$/, '/')
      .replace(/\\/now\\/.*$/, '/')
      .replace(/\\/+$/, '');
  }"""

BUILD_IMPORT_OLD = """  function buildDateBasePath() {
    return path
      .replace(/\\/date\\/\\d{4}-\\d{2}-\\d{2}\\/.*$/, '/')
      .replace(/\\/\\d{4}-\\d{2}-\\d{2}\\/.*$/, '/')
      .replace(/\\/now\\/.*$/, '/')
      .replace(/\\/+$/, '');
  }"""

BUILD_NEW = NORMALIZE_FN + """  function buildDateBasePath() {
    var root = typeof getSiteRootPath === 'function' ? getSiteRootPath() : '';
    if (root) return root;
    return normalizePathname(path);
  }"""

BASE_ROOT_OLD = (
    "var baseRoot = path.replace(/\\/now\\/?$/, '/').replace(/\\/+$/, '');"
)
BASE_ROOT_NEW = (
    "var baseRoot = (typeof getSiteRootPath === 'function' && getSiteRootPath()) "
    "|| normalizePathname((path || '').replace(/\\/now\\/?$/i, '/'));"
)

PICKER_BLOCK_OLD = """    var path = window.location.pathname || '/';
    var isNowPage = path.includes('/now');
    var base = path
      .replace(/\\/date\\/\\d{4}-\\d{2}-\\d{2}\\/.*$/, '/')
      .replace(/\\/now\\/.*$/, '/')
      .replace(/\\/+$/, '');

    var target = base + '/date/' + picker.value + '/';"""

PICKER_BLOCK_NEW = """    var isNowPage = (window.location.pathname || '').includes('/now');
    var base = buildDateBasePath();
    var target = base + '/date/' + picker.value + '/';"""


def patch_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    if "function normalizePathname" in text:
        return False
    orig = text
    if BUILD_IMPORT_OLD in text:
        text = text.replace(BUILD_IMPORT_OLD, BUILD_NEW, 1)
    elif BUILD_EXPORT_OLD in text:
        text = text.replace(BUILD_EXPORT_OLD, BUILD_NEW, 1)
    if BASE_ROOT_OLD in text:
        text = text.replace(BASE_ROOT_OLD, BASE_ROOT_NEW)
    if PICKER_BLOCK_OLD in text:
        text = text.replace(PICKER_BLOCK_OLD, PICKER_BLOCK_NEW, 1)
    if text != orig:
        path.write_text(text, encoding="utf-8")
        return True
    return False


def patch_generate() -> bool:
    path = ROOT / "generate_and_send.py"
    text = path.read_text(encoding="utf-8")
    if "normalizePathname" in text:
        return False
    orig = text
    old = """  function buildDateBasePath() {{
    return path
      .replace(/\\/date\\/\\d{{4}}-\\d{{2}}-\\d{{2}}\\/.*$/, '/')
      .replace(/\\/now\\/.*$/, '/')
      .replace(/\\/+$/, '');
  }}"""
    new = NORMALIZE_FN.replace("  function", "  function", 1) + """  function buildDateBasePath() {{
    var root = typeof getSiteRootPath === 'function' ? getSiteRootPath() : '';
    if (root) return root;
    return normalizePathname(path);
  }}"""
    text = text.replace(old, new, 1)
    text = text.replace(
        "var baseRoot = path.replace(/\\/now\\/?$/, '/').replace(/\\/+$/, '');",
        BASE_ROOT_NEW,
    )
    text = text.replace(
        """    var path = window.location.pathname || '/';
    var isNowPage = path.includes('/now');
    var base = path
      .replace(/\\/date\\/\\d{{4}}-\\d{{2}}-\\d{{2}}\\/.*$/, '/')
      .replace(/\\/now\\/.*$/, '/')
      .replace(/\\/+$/, '');

    var target = base + '/date/' + picker.value + '/';""",
        """    var isNowPage = (window.location.pathname || '').includes('/now');
    var base = buildDateBasePath();
    var target = base + '/date/' + picker.value + '/';""",
        1,
    )
    if text != orig:
        path.write_text(text, encoding="utf-8")
        return True
    return False


def main() -> None:
    n = 0
    for html in DOCS.rglob("*.html"):
        if patch_file(html):
            n += 1
    if patch_generate():
        print("patched generate_and_send.py")
    print(f"patched {n} html files")


if __name__ == "__main__":
    main()
