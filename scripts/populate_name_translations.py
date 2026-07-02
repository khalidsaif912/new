#!/usr/bin/env python3
"""Build docs/name_translations.json from employee names in generated HTML pages."""

from __future__ import annotations

import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT))

from roster_app import name_i18n  # noqa: E402

DATA_EMP = re.compile(r'data-emp-name="([^"]+)"')
SPAN_EMP = re.compile(r'<span class="empName">([^<]+)</span>')


def collect_names(docs_root: Path) -> set[str]:
    names: set[str] = set()
    for html in docs_root.rglob("*.html"):
        try:
            text = html.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        names.update(DATA_EMP.findall(text))
        for m in SPAN_EMP.finditer(text):
            val = m.group(1).strip()
            if val:
                names.add(val)
    return names


def main() -> int:
    docs = REPO_ROOT / "docs"
    names = collect_names(docs)
    translator = name_i18n.get_translator()
    for name in sorted(names):
        translator.arabic_display(name)
    translator.flush()
    print(f"OK: {len(names)} employee rows -> {len(translator.names)} translation entries")
    print(f"OK: {len(translator.auto_generated)} names marked for review (auto_generated)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
