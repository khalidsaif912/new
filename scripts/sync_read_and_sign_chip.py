#!/usr/bin/env python3
"""Inject Read and Sign summary chip into duty HTML pages under docs/.

Idempotent: skips pages that already have readSignChipBtn.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"

CHIP_HTML = """    <a href="{BASE}/read-and-sign/" id="readSignChipBtn" class="summaryChip readSignChip" style="text-decoration:none;">
      <div class="chipVal"><svg class="chip-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#0f766e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 15l2 2 4-4"/></svg></div>
      <div class="chipLabel" data-key="readSignPage">Read&amp;Sign</div>
    </a>
"""

CSS_SNIPPET = """    a.summaryChip.readSignChip .chipVal { color:#0f766e; }
    a.summaryChip.readSignChip:hover { box-shadow:0 8px 20px rgba(15,118,110,.18); }
"""

HREF_SNIPPET = """  var readSign = document.getElementById('readSignChipBtn');
  if (readSign) readSign.href = base + '/read-and-sign/';
"""


def iter_html() -> list[Path]:
    paths: list[Path] = []
    for p in DOCS.rglob("*.html"):
        rel = p.relative_to(DOCS).as_posix()
        if rel.startswith("read-and-sign/"):
            continue
        paths.append(p)
    return paths


def patch_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8", errors="replace")
    if "readSignChipBtn" in text and "readSignPage" in text and "readSignChip" in text:
        # Still ensure href setter exists
        changed = False
        if "getElementById('readSignChipBtn')" not in text and "function setSummaryChipHrefs" in text:
            text2, n = re.subn(
                r"(function setSummaryChipHrefs\(\) \{[\s\S]*?var base = getSiteRootUrl\(\);)",
                r"\1\n" + HREF_SNIPPET,
                text,
                count=1,
            )
            if n:
                text = text2
                changed = True
            else:
                # simpler inject before welcome handling
                text2, n = re.subn(
                    r"(var welcome = document\.getElementById\('welcomeChip'\);)",
                    HREF_SNIPPET + r"\n  \1",
                    text,
                    count=1,
                )
                if n:
                    text = text2
                    changed = True
        if changed:
            path.write_text(text, encoding="utf-8")
        return changed

    if 'id="diffChipBtn"' not in text and 'id="ideasChipBtn"' not in text:
        return False

    changed = False

    if "a.summaryChip.readSignChip" not in text:
        # After ideasChip CSS if present, else after diffChip CSS
        if "a.summaryChip.ideasChip:hover" in text:
            text = text.replace(
                "a.summaryChip.ideasChip:hover { box-shadow:0 8px 20px rgba(217,119,6,.18); }",
                "a.summaryChip.ideasChip:hover { box-shadow:0 8px 20px rgba(217,119,6,.18); }\n" + CSS_SNIPPET,
                1,
            )
            changed = True
        elif "a.summaryChip.diffChip:hover" in text:
            text = re.sub(
                r"(a\.summaryChip\.diffChip:hover \{[^}]+\})",
                r"\1\n" + CSS_SNIPPET,
                text,
                count=1,
            )
            changed = True

    chip = CHIP_HTML.replace("{BASE}", "https://khalidsaif912.github.io/roster-site")
    if 'id="readSignChipBtn"' not in text:
        if 'id="ideasChipBtn"' in text:
            text2, n = re.subn(
                r'(<a href="[^"]*" id="ideasChipBtn"[\s\S]*?</a>)',
                r"\1\n" + chip,
                text,
                count=1,
            )
        else:
            text2, n = re.subn(
                r'(<a href="[^"]*" id="diffChipBtn"[\s\S]*?</a>)',
                r"\1\n" + chip,
                text,
                count=1,
            )
        if n:
            text = text2
            changed = True

    # i18n keys
    if "readSignPage:'Read&Sign'" not in text and "ideasPage:'Ideas'" in text:
        text = text.replace("ideasPage:'Ideas'", "ideasPage:'Ideas', readSignPage:'Read&Sign'", 1)
        changed = True
    if "readSignPage:'إقرار'" not in text and "ideasPage:'أفكار'" in text:
        text = text.replace("ideasPage:'أفكار'", "ideasPage:'أفكار', readSignPage:'إقرار'", 1)
        changed = True
    elif "readSignPage:'إقرار'" not in text and "diffPage:'فروقات'" in text and "ideasPage" not in text:
        text = text.replace("diffPage:'فروقات'", "diffPage:'فروقات', readSignPage:'إقرار'", 1)
        changed = True
    if "k==='readSignPage'" not in text and "k==='ideasPage'" in text:
        text = text.replace(
            "else if(k==='ideasPage') el.textContent=t.ideasPage;",
            "else if(k==='ideasPage') el.textContent=t.ideasPage;\n    else if(k==='readSignPage') el.textContent=t.readSignPage;",
            1,
        )
        changed = True
    elif "k==='readSignPage'" not in text and "k==='diffPage'" in text:
        text = text.replace(
            "else if(k==='diffPage') el.textContent=t.diffPage;",
            "else if(k==='diffPage') el.textContent=t.diffPage;\n    else if(k==='readSignPage') el.textContent=t.readSignPage;",
            1,
        )
        changed = True

    if "getElementById('readSignChipBtn')" not in text and "function setSummaryChipHrefs" in text:
        text2, n = re.subn(
            r"(var welcome = document\.getElementById\('welcomeChip'\);)",
            HREF_SNIPPET + r"\n  \1",
            text,
            count=1,
        )
        if n:
            text = text2
            changed = True

    if changed:
        path.write_text(text, encoding="utf-8")
    return changed


def main() -> int:
    updated = 0
    for path in iter_html():
        try:
            if patch_file(path):
                updated += 1
                print(f"updated {path.relative_to(ROOT)}")
        except Exception as exc:  # noqa: BLE001
            print(f"skip {path}: {exc}")
    print(f"done, updated {updated} file(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
