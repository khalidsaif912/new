#!/usr/bin/env python3
"""Apply line SVG icons to training + a-cup-of-book HTML pages."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"

sys.path.insert(0, str(Path(__file__).resolve().parent))
from training_page_icons import (  # noqa: E402
    BACK_TRAINING_CHIP,
    DOCK_CUP_INNER,
    DOCK_ROSTER_INNER,
    DOCK_SAVED_ICON,
    DOCK_SEARCH_INNER,
    ICON_CSS,
    PAGE_TITLE_HTML,
    QUICK_LINKS_BLOCK,
    SVG_COURSE_ICON,
    SVG_PEOPLE_BADGE,
)

PAGE_TITLE_RE = re.compile(
    r'<h1 id="pageTitle">[^<]*Training Courses</h1>',
    re.IGNORECASE,
)
ROSTER_INNER_RE = re.compile(
    r"<div class=\"rosterInner\">.*?</div>\s*</button>\s*<button class=\"dockCard dockAction\" id=\"searchToggle\"",
    re.DOTALL,
)
SEARCH_TOGGLE_RE = re.compile(
    r'(<button class="dockCard dockAction" id="searchToggle"[^>]*>).*?(</button>)',
    re.DOTALL,
)
SAVED_ICON_RE = re.compile(
    r"<div class=\"savedIcon\">[^<]*</div>",
)
QUICK_LINKS_RE = re.compile(
    r'<div class="quickLinks">.*?</div>',
    re.DOTALL,
)
BACK_INNER_RE = re.compile(
    r'<div class="backInner">.*?</div>\s*</a>',
    re.DOTALL,
)
COURSE_ICON_EMOJI_RE = re.compile(
    r'<div class="courseIcon">[^<]+</div>',
)
PEOPLE_BADGE_RE = re.compile(
    r'<span class="badge peopleBadge">👥\s*(\d+)</span>',
)
ROSTER_IMG_RE = re.compile(
    r'<img class="rosterIcon"[^>]*/>\s*',
)
OTHER_PAGE_IMG_RE = re.compile(
    r'<div class="otherPageInner"><img[^>]*class="otherIcon"[^>]*/>\s*'
    r'<div class="dockLabel otherPageLabel">A Cup of Book</div></div>',
    re.IGNORECASE,
)
OTHER_PAGE_INNER_RE = re.compile(
    r'<div class="otherPageInner">.*?<div class="dockLabel otherPageLabel">A Cup of Book</div></div>',
    re.DOTALL | re.IGNORECASE,
)


def inject_css(html: str) -> str:
    if ".titleWithIcon" in html:
        return html
    if "</style>" in html:
        return html.replace("</style>", ICON_CSS + "\n</style>", 1)
    return html


def _refresh_icon_css(html: str) -> str:
    """Ensure latest dock/cup icon rules are present."""
    if ".otherIconWrap" in html and "#otherPageBtn:hover .otherIconWrap" in html:
        return html
    old = re.search(
        r"\.titleWithIcon\{[^}]+\}.*?\.badge\.peopleBadge\{[^}]+\}",
        html,
        re.DOTALL,
    )
    if old:
        html = html[: old.start()] + ICON_CSS.strip() + "\n" + html[old.end() :]
    elif "</style>" in html and ".titleWithIcon" not in html:
        html = inject_css(html)
    return html


def patch_training_page(html: str) -> str:
    html = _refresh_icon_css(html)
    html = inject_css(html)
    html = html.replace("content:'✈';", "content:'';")
    html = re.sub(
        r"font-size:clamp\(48px,13vw,104px\);line-height:1;opacity:\.11;\s*"
        r"transform:rotate\(-16deg\);pointer-events:none;filter:grayscale\(\.2\);",
        "width:clamp(80px,18vw,120px);height:clamp(80px,18vw,120px);"
        "opacity:.09;pointer-events:none;"
        "background:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' "
        "viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='1.5'%3E%3Cpath "
        "d='M17.8 19.2 16 12l-3.5-1.5L3 3l4 12 4-1 2.5 3.5 3.5 1.8 4.2z'/%3E%3C/svg%3E\") "
        "center/contain no-repeat;transform:rotate(-16deg);",
        html,
        count=1,
    )
    html = re.sub(r" • 👥 (\d+)", r" • \1 staff", html)
    html = html.replace(">📅 Archive<", ">Archive<")
    html = PAGE_TITLE_RE.sub(PAGE_TITLE_HTML, html)
    if 'id="rosterHomeBtn"' in html:
        html = ROSTER_INNER_RE.sub(
            DOCK_ROSTER_INNER + '\n  </button>\n  <button class="dockCard dockAction" id="searchToggle"',
            html,
            count=1,
        )
        html = ROSTER_IMG_RE.sub("", html)
    html = SEARCH_TOGGLE_RE.sub(r"\1" + DOCK_SEARCH_INNER + r"\2", html, count=1)
    html = SAVED_ICON_RE.sub(DOCK_SAVED_ICON, html, count=1)
    if 'id="otherPageBtn"' in html:
        html = OTHER_PAGE_IMG_RE.sub(DOCK_CUP_INNER, html)
        if "otherIconWrap" not in html:
            html = OTHER_PAGE_INNER_RE.sub(DOCK_CUP_INNER, html, count=1)
    html = COURSE_ICON_EMOJI_RE.sub(
        f'<div class="courseIcon">{SVG_COURSE_ICON}</div>',
        html,
    )
    html = PEOPLE_BADGE_RE.sub(
        rf'<span class="badge peopleBadge">{SVG_PEOPLE_BADGE}\1</span>',
        html,
    )
    return html


def patch_cup_page(html: str) -> str:
    html = inject_css(html)
    html = QUICK_LINKS_RE.sub(
        f'<div class="quickLinks">\n      {QUICK_LINKS_BLOCK}\n    </div>',
        html,
        count=1,
    )
    if 'class="backInner"' in html:
        html = BACK_INNER_RE.sub(BACK_TRAINING_CHIP + "\n      </a>", html, count=1)
    return html


def patch_file(path: Path) -> bool:
    raw = path.read_text(encoding="utf-8")
    if "training" in path.parts and path.name.endswith(".html"):
        if "a-cup-of-book" in path.parts:
            updated = patch_cup_page(raw)
        else:
            updated = patch_training_page(raw)
    elif path.parts[-2:] == ("a-cup-of-book", "index.html"):
        updated = patch_cup_page(raw)
    else:
        return False
    if updated != raw:
        path.write_text(updated, encoding="utf-8", newline="\n")
        return True
    return False


def main() -> int:
    paths = list((DOCS / "training").rglob("*.html"))
    paths.extend([
        DOCS / "a-cup-of-book" / "index.html",
        DOCS / "training" / "a-cup-of-book" / "index.html",
    ])
    paths = list(dict.fromkeys(paths))
    n = 0
    for path in paths:
        if path.exists() and patch_file(path):
            print(f"patched {path.relative_to(ROOT)}")
            n += 1
    print(f"done: {n} files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
