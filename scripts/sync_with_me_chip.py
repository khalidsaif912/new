#!/usr/bin/env python3
"""Replace the Read&Sign summary chip with With me, and keep إقرار in Apps.

Idempotent. Skips import pages and the read-and-sign / with-me apps themselves.
Also cache-busts site-apps.js so the mobile apps sheet + إقرار tile load.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
REQUIRED_ASSETS = (
    DOCS / "with-me" / "index.html",
    DOCS / "with-me.js",
    DOCS / "site-apps.js",
)

CHIP_HTML = """    <a href="{BASE}/with-me/" id="withMeChipBtn" class="summaryChip withMeChip" style="text-decoration:none;">
      <div class="chipVal"><svg class="chip-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#4f46e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
      <div class="chipLabel" data-key="withMePage">With me</div>
    </a>
"""

CSS_SNIPPET = """    a.summaryChip.withMeChip .chipVal { color:#4f46e5; }
    a.summaryChip.withMeChip:hover { box-shadow:0 8px 20px rgba(79,70,229,.18); }
"""

HREF_SNIPPET = """  var withMe = document.getElementById('withMeChipBtn');
  if (withMe) withMe.href = (typeof root !== 'undefined' && root ? root : (typeof base !== 'undefined' && base ? base : getSiteRootUrl())) + '/with-me/';
"""

CHIP_RE = re.compile(
    r'<a\b[^>]*\bid="readSignChipBtn"[^>]*>[\s\S]*?</a>\s*',
    re.IGNORECASE,
)
SITE_APPS_VER_RE = re.compile(
    r"addScript\(root \+ '/site-apps\.js\?v=' \+ ver\);",
)
SITE_APPS_VER_FIXED_RE = re.compile(
    r"addScript\(root \+ '/site-apps\.js\?v=[^']+'\);",
)

SKIP_PREFIXES = (
    "read-and-sign/",
    "with-me/",
    "import/",
    "calculator/",
    "QuickList/",
    "a-cup-of-book/",
    "alumni/",
    "ideas/",
    "training/",
    "my-schedules/",
    "roster-diff/",
    "my-emoji/",
    "tools/",
    "subscribe/",
)


def iter_html() -> list[Path]:
    paths: list[Path] = []
    for p in DOCS.rglob("*.html"):
        rel = p.relative_to(DOCS).as_posix()
        if rel.startswith(SKIP_PREFIXES):
            continue
        if rel == "import":
            continue
        paths.append(p)
    return paths


def iter_all_site_html() -> list[Path]:
    """Pages that load site-apps.js, including import."""
    skip = (
        "read-and-sign/",
        "with-me/",
        "calculator/",
        "QuickList/",
        "a-cup-of-book/",
        "alumni/",
        "ideas/",
        "training/",
        "my-schedules/",
        "my-emoji/",
        "tools/",
    )
    paths: list[Path] = []
    for p in DOCS.rglob("*.html"):
        rel = p.relative_to(DOCS).as_posix()
        if rel.startswith(skip):
            continue
        paths.append(p)
    return paths


def patch_chip(text: str) -> tuple[str, bool]:
    changed = False
    if 'id="withMeChipBtn"' not in text and "readSignChipBtn" in text:
        chip = CHIP_HTML.replace("{BASE}", "https://khalidsaif912.github.io/roster-site")
        text2, n = CHIP_RE.subn(chip, text, count=1)
        if n:
            text = text2
            changed = True

    if "a.summaryChip.withMeChip" not in text:
        if "a.summaryChip.readSignChip:hover" in text:
            text = text.replace(
                "a.summaryChip.readSignChip:hover { box-shadow:0 8px 20px rgba(15,118,110,.18); }",
                "a.summaryChip.readSignChip:hover { box-shadow:0 8px 20px rgba(15,118,110,.18); }\n"
                + CSS_SNIPPET,
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

    if "withMePage:'With me'" not in text and "readSignPage:'Read&Sign'" in text:
        text = text.replace(
            "readSignPage:'Read&Sign'",
            "readSignPage:'Read&Sign', withMePage:'With me'",
            1,
        )
        changed = True
    if "withMePage:'معي'" not in text and "readSignPage:'إقرار'" in text:
        text = text.replace(
            "readSignPage:'إقرار'",
            "readSignPage:'إقرار', withMePage:'معي'",
            1,
        )
        changed = True

    if "k==='withMePage'" not in text and "k==='readSignPage'" in text:
        text = text.replace(
            "else if(k==='readSignPage') el.textContent=t.readSignPage;",
            "else if(k==='readSignPage') el.textContent=t.readSignPage;\n    else if(k==='withMePage') el.textContent=t.withMePage;",
            1,
        )
        changed = True

    if "getElementById('withMeChipBtn')" not in text and "function setSummaryChipHrefs" in text:
        text2, n = re.subn(
            r"(var welcome = document\.getElementById\('welcomeChip'\);)",
            HREF_SNIPPET + r"\n  \1",
            text,
            count=1,
        )
        if n:
            text = text2
            changed = True
        elif "if (readSign) readSign.href" in text:
            text = text.replace(
                "if (readSign) readSign.href = base + '/read-and-sign/';",
                "if (readSign) readSign.href = base + '/read-and-sign/';\n  "
                "var withMe = document.getElementById('withMeChipBtn');\n  "
                "if (withMe) withMe.href = base + '/with-me/';",
                1,
            )
            if "getElementById('withMeChipBtn')" in text:
                changed = True
            else:
                text = text.replace(
                    "if (readSign) readSign.href = root + '/read-and-sign/';",
                    "if (readSign) readSign.href = root + '/read-and-sign/';\n  "
                    "var withMe = document.getElementById('withMeChipBtn');\n  "
                    "if (withMe) withMe.href = root + '/with-me/';",
                    1,
                )
                if "getElementById('withMeChipBtn')" in text:
                    changed = True

    return text, changed


def patch_apps_ver(text: str) -> tuple[str, bool]:
    if "site-apps.js?v=20260830wm" in text:
        return text, False
    text2, n = SITE_APPS_VER_RE.subn(
        "addScript(root + '/site-apps.js?v=20260830wm');",
        text,
        count=1,
    )
    if n:
        return text2, True
    text2, n = SITE_APPS_VER_FIXED_RE.subn(
        "addScript(root + '/site-apps.js?v=20260830wm');",
        text,
        count=1,
    )
    if n:
        return text2, True
    return text, False


def patch_file(path: Path, *, chips: bool) -> bool:
    text = path.read_text(encoding="utf-8", errors="replace")
    orig = text
    if chips:
        text, _ = patch_chip(text)
    text, _ = patch_apps_ver(text)
    if text == orig:
        return False
    path.write_text(text, encoding="utf-8")
    return True


def ensure_assets() -> None:
    """Fail if a roster rebuild dropped the With me page or Apps script."""
    missing = [str(p.relative_to(ROOT)) for p in REQUIRED_ASSETS if not p.is_file()]
    if missing:
        raise FileNotFoundError("With me files missing: " + ", ".join(missing))


def main() -> int:
    ensure_assets()
    updated = 0
    chip_paths = {p.resolve() for p in iter_html()}
    for path in iter_all_site_html():
        try:
            if patch_file(path, chips=path.resolve() in chip_paths):
                updated += 1
                print(f"updated {path.relative_to(ROOT)}")
        except Exception as exc:  # noqa: BLE001
            print(f"skip {path}: {exc}")
    print(f"done, updated {updated} file(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
