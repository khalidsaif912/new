#!/usr/bin/env python3
"""Sync home date font CSS + Google Fonts links from docs/index.html to date pages."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "index.html"

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

CSS_START = "    /* Date — with-me split layout (homepage trial) */"
CSS_END = "    a.summaryChip, button.summaryChip, .langToggle, .roster-cta-btn, button.shiftFilterBtn {"


def extract_between(text: str, start: str, end: str) -> str:
    i = text.index(start)
    j = text.index(end, i)
    return text[i:j]


def iter_targets() -> list[Path]:
    out: list[Path] = [
        ROOT / "docs" / "index.html",
        ROOT / "docs" / "home.html",
        ROOT / "docs" / "now" / "index.html",
    ]
    date_root = ROOT / "docs" / "date"
    if date_root.is_dir():
        out.extend(sorted(date_root.glob("*/index.html")))
        out.extend(sorted(date_root.glob("*/now/index.html")))
    return out


def patch_file(path: Path, source: str, css_block: str) -> bool:
    text = path.read_text(encoding="utf-8")
    if "homeDateSplit" not in text and path.name != "index.html":
        return False

    changed = False

    if "fonts.googleapis.com/css2?family=IBM+Plex+Sans" not in text:
        anchor = "  <title>Duty Roster</title>"
        if anchor in text:
            text = text.replace(anchor, anchor + "\n" + FONT_LINKS, 1)
            changed = True

    if ROOT_VARS_OLD in text:
        text = text.replace(ROOT_VARS_OLD, ROOT_VARS_NEW, 1)
        changed = True
    elif "--date-font-en" not in text and ":root {" in text:
        text = text.replace(
            "--safe-bottom: env(safe-area-inset-bottom, 0px);",
            "--safe-bottom: env(safe-area-inset-bottom, 0px);\n"
            "      --date-font-en: 'IBM Plex Sans', system-ui, -apple-system, sans-serif;\n"
            "      --date-font-ar: 'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, sans-serif;",
            1,
        )
        changed = True

    if CSS_START in text and CSS_END in text:
        old_css = extract_between(text, CSS_START, CSS_END)
        if old_css != css_block:
            text = text.replace(old_css, css_block, 1)
            changed = True

    if changed:
        path.write_text(text, encoding="utf-8")
    return changed


def main() -> None:
    source = SOURCE.read_text(encoding="utf-8")
    css_block = extract_between(source, CSS_START, CSS_END)
    n = 0
    for path in iter_targets():
        if patch_file(path, source, css_block):
            print(f"patched {path.relative_to(ROOT)}")
            n += 1
    print(f"done: {n} file(s)")


if __name__ == "__main__":
    main()
