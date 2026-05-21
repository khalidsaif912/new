"""Line SVG icons for training + a-cup-of-book pages (matches roster CTA style)."""

from __future__ import annotations


def _svg(
    paths: str,
    *,
    size: int = 22,
    stroke: str = "#1e40af",
    extra_class: str = "",
) -> str:
    cls = f' class="{extra_class}"' if extra_class else ""
    return (
        f'<svg{cls} viewBox="0 0 24 24" width="{size}" height="{size}" '
        f'fill="none" stroke="{stroke}" stroke-width="2" stroke-linecap="round" '
        f'stroke-linejoin="round" aria-hidden="true">{paths}</svg>'
    )


# ── Training header + dock ──
SVG_TITLE_BOOK = _svg(
    '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>'
    '<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    size=26,
    stroke="#ffffff",
    extra_class="titleIconSvg",
)
PAGE_TITLE_HTML = (
    f'<h1 id="pageTitle" class="titleWithIcon">'
    f'<span class="titleIcon">{SVG_TITLE_BOOK}</span>'
    f'<span class="pageTitleText">Training Courses</span></h1>'
)

SVG_DOCK_ROSTER = _svg(
    '<path d="M17.8 19.2 16 12l-3.5-1.5L3 3l4 12 4-1 2.5 3.5 3.5 1.8 4.2z"/>',
    size=28,
    stroke="#2563eb",
    extra_class="dockSvg",
)
SVG_DOCK_SEARCH = _svg(
    '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    size=28,
    stroke="#475569",
    extra_class="dockSvg",
)
SVG_DOCK_USER = _svg(
    '<circle cx="12" cy="8" r="3"/>'
    '<path d="M6 20v-1a6 6 0 0 1 12 0v1"/>',
    size=20,
    stroke="#2563eb",
    extra_class="dockSvg",
)

DOCK_ROSTER_INNER = (
    f'<div class="rosterInner">'
    f'<span class="rosterIconWrap">{SVG_DOCK_ROSTER}</span>'
    f'<span class="rosterLabel">Roster</span></div>'
)
DOCK_SEARCH_INNER = (
    f'<div class="dockValue searchGlyph">{SVG_DOCK_SEARCH}</div>'
    f'<div class="dockLabel">Search</div>'
)
DOCK_SAVED_ICON = f'<div class="savedIcon">{SVG_DOCK_USER}</div>'

# A Cup of Book dock button (book + cup — line icon, brown like label)
SVG_DOCK_CUP = _svg(
    '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H15"/>'
    '<path d="M6.5 6H15v11H6.5A2.5 2.5 0 0 1 4 13.5V8.5A2.5 2.5 0 0 1 6.5 6z"/>'
    '<path d="M17 8h2a2 2 0 0 1 0 4h-1"/>'
    '<path d="M17.5 12v1.5a2 2 0 0 1-2 2h-1"/>',
    size=28,
    stroke="#92400e",
    extra_class="dockSvg",
)
DOCK_CUP_INNER = (
    f'<div class="otherPageInner">'
    f'<span class="otherIconWrap">{SVG_DOCK_CUP}</span>'
    f'<div class="dockLabel otherPageLabel">A Cup of Book</div></div>'
)

# Course card — one style; color from --accent on .courseIcon
SVG_COURSE_ICON = _svg(
    '<path d="M17.8 19.2 16 12l-3.5-1.5L3 3l4 12 4-1 2.5 3.5 3.5 1.8 4.2z"/>',
    size=28,
    stroke="currentColor",
    extra_class="courseIconSvg",
)

SVG_PEOPLE_BADGE = _svg(
    '<circle cx="9" cy="8" r="2.5"/>'
    '<circle cx="16" cy="9" r="2"/>'
    '<path d="M4 18v-1a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v1"/>'
    '<path d="M14 18v-1a3 3 0 0 1 2-2.8"/>',
    size=12,
    stroke="currentColor",
    extra_class="peopleIconSvg",
)

# ── A Cup of Book quick links (on dark header) ──
_STROKE_LIGHT = "rgba(255,255,255,.92)"

SVG_QUICK_BOOK = _svg(
    '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>'
    '<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    size=14,
    stroke=_STROKE_LIGHT,
)
SVG_QUICK_EXPORT = _svg(
    '<path d="M17.8 19.2 16 12l-3.5-1.5L3 3l4 12 4-1 2.5 3.5 3.5 1.8 4.2z"/>',
    size=14,
    stroke=_STROKE_LIGHT,
)
SVG_QUICK_IMPORT = _svg(
    '<path d="M17.8 19.2 16 12l-3.5-1.5L3 3l4 12 4-1 2.5 3.5 3.5 1.8 4.2z"/>',
    size=14,
    stroke=_STROKE_LIGHT,
)

SVG_BACK_TRAINING = _svg(
    '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>'
    '<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    size=28,
    stroke="#1976d2",
)


def quick_btn(href: str, icon: str, label: str, aria: str = "") -> str:
    aria_attr = f' aria-label="{aria}"' if aria else ""
    return (
        f'<a class="quickBtn" href="{href}"{aria_attr}>'
        f'<span class="quickBtn-icon">{icon}</span><span>{label}</span></a>'
    )


QUICK_LINKS_TRAINING = quick_btn("../training/", SVG_QUICK_BOOK, "Training schedule")
QUICK_LINKS_EXPORT = quick_btn("../", SVG_QUICK_EXPORT, "الصادر", "العودة إلى الروستر الصادر")
QUICK_LINKS_IMPORT = quick_btn("../import/", SVG_QUICK_IMPORT, "الوارد", "الذهاب إلى الروستر الوارد")
QUICK_LINKS_BLOCK = "\n      ".join(
    [QUICK_LINKS_TRAINING, QUICK_LINKS_EXPORT, QUICK_LINKS_IMPORT]
)

BACK_TRAINING_CHIP = (
    f'<div class="backInner">'
    f'<div class="backIcon">{SVG_BACK_TRAINING}</div>'
    f'<div class="backLabel">Training</div></div>'
)

ICON_CSS = """
.titleWithIcon{display:inline-flex;align-items:center;gap:10px;flex-wrap:wrap}
.titleWithIcon .titleIcon{line-height:0;display:inline-flex}
.titleWithIcon .titleIcon svg{display:block}
.quickBtn{display:inline-flex;align-items:center;gap:6px}
.quickBtn-icon{line-height:0;display:inline-flex;flex-shrink:0}
.quickBtn-icon svg{display:block}
.rosterIconWrap,.otherIconWrap,.dockValue.searchGlyph,.savedIcon,.backIcon,.courseIcon{
  line-height:0;display:inline-flex;align-items:center;justify-content:center;
  transition:transform .28s ease
}
.rosterIconWrap svg,.otherIconWrap svg,.dockValue.searchGlyph svg,.savedIcon svg,.backIcon svg{display:block}
#otherPageBtn:hover .otherIconWrap{transform:translateY(-5px) scale(1.06)}
.courseIcon{font-size:0;color:var(--accent,#2563eb)}
.courseIcon svg{display:block}
.peopleBadge .peopleIconSvg{display:inline-block;vertical-align:-2px;margin-inline-end:3px}
.badge.peopleBadge{display:inline-flex;align-items:center;gap:4px}
"""
