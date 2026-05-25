#!/usr/bin/env python3
"""Fix import roster date redirects (stay under /import/date/ not /date/)."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"

BUILD_OLD = re.compile(
    r"  function buildDateBasePath\(\) \{\n"
    r"    var root = typeof getSiteRootPath === 'function' \? getSiteRootPath\(\) : '';\n"
    r"    if \(root\) return root;\n"
    r"    return normalizePathname\(path\);\n"
    r"  \}",
    re.MULTILINE,
)

BUILD_NEW = """  function isImportRosterPath(p) {
    return /\\/import(\\/|$)/i.test(p || '');
  }

  function buildDateBasePath() {
    var root = typeof getSiteRootPath === 'function' ? getSiteRootPath() : '';
    var p = path || location.pathname || '';
    if (isImportRosterPath(p)) {
      var base = root || normalizePathname(p);
      if (!base || base === '/') {
        return '/import';
      }
      if (!/\/import$/i.test(base)) {
        base = base.replace(/\/+$/, '') + '/import';
      }
      return base;
    }
    if (root) return root;
    return normalizePathname(p);
  }"""

REDIRECT_OLD = re.compile(
    r"    if \(!path\.includes\('/date/'\)\) \{\n"
    r"      var baseRoot = \(typeof getSiteRootPath === 'function' && getSiteRootPath\(\)\) "
    r"\|\| normalizePathname\(\(path \|\| ''\)\.replace\(/\\/now\\/?\$/i, '/'\)\);\n"
    r"      window\.location\.replace\(baseRoot \+ '/date/' \+ todayIso \+ '/' \+ "
    r"\(isNowPage \? 'now/' : ''\)\);\n"
    r"      return true;\n"
    r"    \}",
    re.MULTILINE,
)

REDIRECT_NEW = """    if (!path.includes('/date/')) {
      window.location.replace(buildDateBasePath() + '/date/' + todayIso + '/' + (isNowPage ? 'now/' : ''));
      return true;
    }"""


def patch_text(text: str) -> tuple[str, list[str]]:
    notes: list[str] = []
    if "function isImportRosterPath" in text:
        return text, notes
    if BUILD_OLD.search(text):
        text = BUILD_OLD.sub(BUILD_NEW, text, count=1)
        notes.append("buildDateBasePath")
    if REDIRECT_OLD.search(text):
        text = REDIRECT_OLD.sub(REDIRECT_NEW, text, count=1)
        notes.append("redirect")
    return text, notes


def patch_generate(text: str) -> tuple[str, list[str]]:
    notes: list[str] = []
    if "function isImportRosterPath" in text:
        return text, notes
    old = """  function buildDateBasePath() {{
    var root = typeof getSiteRootPath === 'function' ? getSiteRootPath() : '';
    if (root) return root;
    return normalizePathname(path);
  }}"""
    new = """  function isImportRosterPath(p) {{
    return /\\/import(\\/|$)/i.test(p || '');
  }}

  function buildDateBasePath() {{
    var root = typeof getSiteRootPath === 'function' ? getSiteRootPath() : '';
    var p = path || location.pathname || '';
    if (isImportRosterPath(p)) {{
      var base = root || normalizePathname(p);
      if (!base || base === '/') {{
        return '/import';
      }}
      if (!/\\/import$/i.test(base)) {{
        base = base.replace(/\\/+$/, '') + '/import';
      }}
      return base;
    }}
    if (root) return root;
    return normalizePathname(p);
  }}"""
    if old in text:
        text = text.replace(old, new, 1)
        notes.append("gen-build")
    old_redir = """    if (!path.includes('/date/')) {{
      var baseRoot = (typeof getSiteRootPath === 'function' && getSiteRootPath()) || normalizePathname((path || '').replace(/\\/now\\/?$/i, '/'));
      window.location.replace(baseRoot + '/date/' + todayIso + '/' + (isNowPage ? 'now/' : ''));
      return true;
    }}"""
    new_redir = """    if (!path.includes('/date/')) {{
      window.location.replace(buildDateBasePath() + '/date/' + todayIso + '/' + (isNowPage ? 'now/' : ''));
      return true;
    }}"""
    if old_redir in text:
        text = text.replace(old_redir, new_redir, 1)
        notes.append("gen-redirect")
    return text, notes


def main() -> int:
    changed = 0
    for path in sorted(DOCS.rglob("*.html")):
        raw = path.read_text(encoding="utf-8")
        updated, notes = patch_text(raw)
        if updated != raw:
            path.write_text(updated, encoding="utf-8", newline="\n")
            changed += 1
            if changed <= 5 or "--verbose" in sys.argv:
                print(f"patched {path.relative_to(ROOT)}: {', '.join(notes)}")

    gen = ROOT / "generate_and_send.py"
    if gen.exists():
        raw = gen.read_text(encoding="utf-8")
        updated, notes = patch_generate(raw)
        if updated != raw:
            gen.write_text(updated, encoding="utf-8", newline="\n")
            print(f"patched generate_and_send.py: {', '.join(notes)}")

    print(f"patched {changed} html files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
