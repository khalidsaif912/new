#!/usr/bin/env python3
"""Align Import roster banner HTML + title strings with Export style."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IMPORT_ROOT = ROOT / "docs" / "import"

BANNER_NEW = """    <h1 id="pageTitle" class="bannerTitle">
      <span class="bannerTitleEyebrow" id="pageTitleEyebrow">Import</span>
      <span class="bannerTitleMain" id="pageTitleMain">Duty Roster</span>
    </h1>"""

BANNER_RE = re.compile(
    r"<h1\s+id=\"pageTitle\"[^>]*>.*?</h1>",
    re.DOTALL | re.IGNORECASE,
)

FORCE_OLD = re.compile(
    r"// Force Import header text \(shared export script may override it\)\.\s*"
    r"\(function\(\) \{\s*"
    r"if \(typeof T !== 'undefined'\) \{\s*"
    r"if \(T\.en\) T\.en\.title = 'Import Duty Roster';\s*"
    r"if \(T\.ar\) T\.ar\.title = 'جدول الوارد';\s*"
    r"\}\s*"
    r"if \(typeof applyLang === 'function' && typeof LANG !== 'undefined'\) \{\s*"
    r"applyLang\(LANG\);\s*"
    r"\} else \{\s*"
    r"var titleEl = document\.getElementById\('pageTitle'\);\s*"
    r"if \(titleEl\) titleEl\.textContent = 'Import Duty Roster';\s*"
    r"\}\s*"
    r"\}\)\(\);",
    re.MULTILINE,
)

FORCE_NEW = """// Import banner labels (export script uses titleEyebrow + titleMain).
(function() {
  if (typeof T !== 'undefined') {
    if (T.en) { T.en.titleEyebrow = 'Import'; T.en.titleMain = 'Duty Roster'; }
    if (T.ar) { T.ar.titleEyebrow = 'الوارد'; T.ar.titleMain = 'جدول المناوبات'; }
  }
  if (typeof applyLang === 'function' && typeof LANG !== 'undefined') {
    applyLang(LANG);
  }
})();"""


def patch_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    orig = text
    if "bannerTitleEyebrow" not in text or BANNER_RE.search(text):
        text = BANNER_RE.sub(BANNER_NEW, text, count=1)
    text = text.replace("titleEyebrow:'Export'", "titleEyebrow:'Import'")
    text = text.replace("titleEyebrow:'الصادر'", "titleEyebrow:'الوارد'")
    text = FORCE_OLD.sub(FORCE_NEW, text)
    if text != orig:
        path.write_text(text, encoding="utf-8")
        return True
    return False


def main() -> int:
    n = 0
    for p in IMPORT_ROOT.rglob("*.html"):
        if p.parent.name == "my-schedules":
            continue
        if patch_file(p):
            n += 1
    print(f"patched {n} import roster html files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
