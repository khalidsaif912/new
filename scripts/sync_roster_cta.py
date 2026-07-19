#!/usr/bin/env python3
"""Sync redesigned CTA bar into all roster HTML pages under docs/."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"

sys.path.insert(0, str(Path(__file__).resolve().parent))
from roster_cta_snippets import (  # noqa: E402
    APPLY_LANG_NEW,
    CTA_CSS,
    SHIFT_COPY_CSS,
    APPLY_LANG_BAD_LINE,
    CHIP_AFTERNOON_HTML,
    CHIP_ALL_HTML,
    CHIP_DIFF_HTML,
    CHIP_EXPORT_HTML,
    CHIP_FLIGHT_HTML,
    CHIP_ICON_CSS,
    CHIP_MORNING_HTML,
    CHIP_NIGHT_HTML,
    CHIP_SCHEDULE_HTML,
    CHIP_TRAINING_HTML,
    CHIP_WAVE_HTML,
    CHIP_IMG_DIFF_RE,
    CHIP_IMG_FLIGHT_RE,
    REMOVE_ICON_JS_RE,
    REMOVE_ICON_JS_RE2,
    ROSTER_ICONS_SCRIPT,
    SITE_APPS_CSS,
    SITE_APPS_MODAL_HTML,
    SITE_APPS_SCRIPT,
    SITE_SHARE_CSS,
    SITE_SHARE_MODAL_HTML,
    SVG_APPS_BTN,
    SVG_COMPARE,
    LANG_TOGGLE_CSS,
    LANG_TOGGLE_HTML,
    APPLY_LANG_LANG_BTN_NEW,
    APPLY_LANG_LANG_BTN_OLD,
    export_cta_html,
    import_cta_html,
    SHIFT_COPY_MODAL_HTML,
    secondary_bar_html,
    I18N_CMP_AR,
    I18N_CMP_EN,
    I18N_APPS_AR,
    I18N_APPS_EN,
    I18N_SHARE_AR,
    I18N_SHARE_EN,
    I18N_VIEWFULL_AR,
    I18N_VIEWFULL_EN,
)

CTA_CSS_RE = re.compile(
    r"    /\* ═══════ QUICK ACTIONS(?: — see scripts/roster_cta_snippets\.py)? ═══════ \*/\s*.*?"
    r"(?=    /\* ═══════ (?:SITE SHARE|SITE APPS|FOOTER|SHARE/SAVE))",
    re.DOTALL,
)

SHIFT_COPY_CSS_RE = re.compile(
    r"    /\* ═══════ SHIFT COPY \(bottom button \+ modal\) ═══════ \*/\s*.*?"
    r"(?=    \.shiftCopySheet)",
    re.DOTALL,
)

SITE_SHARE_CSS_RE = re.compile(
    r"    /\* ═══════ SITE SHARE MODAL ═══════ \*/\s*.*?"
    r"(?=    /\* ═══════ (?:SITE APPS|FOOTER|SHARE/SAVE))",
    re.DOTALL,
)

SITE_APPS_CSS_RE = re.compile(
    r"    /\* ═══════ RELATED APPS MODAL ═══════ \*/\s*.*?"
    r"(?=    /\* ═══════ (?:FOOTER|SHARE/SAVE))",
    re.DOTALL,
)

ORPHAN_SHARE_FRAGMENT_RE = re.compile(
    r'\n<p class="siteShareUrl" id="siteShareUrl"></p>\s*'
    r'<div class="siteShareActions">.*?</div>\s*'
    r'<div class="siteShareCloseWrap">.*?</div>\s*</div>\s*</div>\s*',
    re.DOTALL,
)

SHARE_SITE_BTN_RE = re.compile(
    r'<button[^>]*\bid="shareSiteBtn"[^>]*>.*?</button>',
    re.DOTALL | re.IGNORECASE,
)

LEGACY_CTA_CSS_RE = re.compile(
    r"    /\* ═══════ CTA ═══════ \*/\s*.*?(?=    /\* ═══════ FOOTER)",
    re.DOTALL,
)

LEGACY_CTA_HTML_RE = re.compile(
    r"  <!-- ════ CTA ════ -->\s*(?:<div class=\"btnWrap\">.*?</div>\s*)+",
    re.DOTALL,
)

EXPORT_CTA_RE = re.compile(
    r"<div class=\"quickActions\">.*?</div>\s*(?=\n\s*(?:<!-- ════ FOOTER|</div>\s*\n\s*<div class=\"importBottom\"))",
    re.DOTALL,
)

IMPORT_WRAP_RE = re.compile(
    r"<div class=\"importBottom\">\s*"
    r"(?:<div class=\"quickActions\">|<nav class=\"quickActions roster-cta\"[^>]*>).*?"
    r"(?:</div>|</nav>)\s*"
    r"(<div class=\"footer)",
    re.DOTALL,
)

TOUCH_OLD = ".langToggle, .btn, button.shiftFilterBtn"
TOUCH_NEW = ".langToggle, .roster-cta-btn, button.shiftFilterBtn"

IMPORT_BOTTOM_OLD = re.compile(
    r"    \.importBottom \.quickActions \{\s*"
    r"margin-bottom: 6px;\s*"
    r"display: flex;\s*"
    r"justify-content: center;\s*"
    r"gap: 10px;\s*"
    r"flex-wrap: wrap;\s*"
    r"\}\s*",
    re.DOTALL,
)
IMPORT_BOTTOM_NEW = """    .importBottom .quickActions.roster-cta {
      margin-bottom: 6px;
      margin-top: 14px;
    }
"""

LANG_TOGGLE_RE = re.compile(
    r'<button class="langToggle" id="langToggle" onclick="toggleLang\(\)">[^<]*</button>',
    re.IGNORECASE,
)
LANG_TOGGLE_CSS_OLD_RE = re.compile(
    r"    /\* زر اللغة \*/\s*.*?    \.langToggle:hover \{[^}]+\}\s*",
    re.DOTALL,
)
LANG_TOGGLE_BLOCK_RE = re.compile(
    r"    /\* زر اللغة \*/\s*.*?    body\.ar #banner-changer-btn \{[^}]+\}\s*",
    re.DOTALL,
)
LANG_TOGGLE_MOBILE_480_OLD = (
    "      .langToggle      { min-width:44px; min-height:44px; padding:6px 8px; }\n"
    "      .langToggle-icon svg { width:16px; height:16px; }\n"
    "      .langToggle-label { font-size:11px; }\n"
)

COMPARE_BTN_ICON_RE = re.compile(
    r'(<(?:a|button)[^>]*\bid="compareBtn"[^>]*>\s*<span class="roster-cta-icon">).*?(</span>)',
    re.DOTALL | re.IGNORECASE,
)
COMPARE_BTN_RE = re.compile(
    r'\s*<a class="roster-cta-btn roster-cta-btn--compare" id="compareBtn"[^>]*>.*?</a>\s*',
    re.DOTALL | re.IGNORECASE,
)
SUBSCRIBE_BTN_RE = re.compile(
    r'\s*<a class="roster-cta-btn roster-cta-btn--subscribe" id="subscribeBtn"[^>]*>.*?</a>\s*',
    re.DOTALL | re.IGNORECASE,
)
SET_CTA_SUBSCRIBE_RE = re.compile(
    r"\s*setCtaLabel\('subscribeBtn', t\.subscribe\);\n",
)
SET_CTA_COMPARE_RE = re.compile(
    r"\s*setCtaLabel\('compareBtn', t\.compare\);\n",
)
SET_LOCAL_SUBSCRIBE_RE = re.compile(
    r"\s*var c2 = document\.getElementById\('subscribeBtn'\);\s*\n"
    r"\s*if \(c1\) c1\.href = root \+ '/now/';\s*\n"
    r"\s*if \(c2\) c2\.href = root \+ '/subscribe/';",
)
SET_LOCAL_SUBSCRIBE_RE2 = re.compile(
    r"\s*var c2 = document\.getElementById\('subscribeBtn'\);\s*\n"
    r"\s*if \(c2\) c2\.href = root \+ '/subscribe/';",
)


def _extract_href(html: str, el_id: str, default: str = "#") -> str:
    m = re.search(
        rf'<a[^>]*id="{el_id}"[^>]*href="([^"]*)"',
        html,
        re.IGNORECASE,
    )
    return m.group(1) if m else default


def patch_legacy_btn_wrap(html: str) -> str:
    if 'class="btnWrap"' not in html:
        return html
    cta_href = _extract_href(html, "ctaBtn", "#")
    block = export_cta_html(cta_href=cta_href)
    html = LEGACY_CTA_HTML_RE.sub("  <!-- ════ CTA ════ -->\n" + block, html, count=1)
    if ".roster-cta-btn--roster" not in html:
        if "/* ═══════ QUICK ACTIONS ═══════ */" in html:
            html = CTA_CSS_RE.sub(CTA_CSS, html, count=1)
        elif "/* ═══════ CTA ═══════ */" in html:
            html = LEGACY_CTA_CSS_RE.sub(CTA_CSS, html, count=1)
    return html


ROSTER_NAV_RE = re.compile(
    r'<nav class="quickActions roster-cta[^"]*"[^>]*>.*?</nav>',
    re.DOTALL | re.IGNORECASE,
)


def patch_export_cta(html: str) -> str:
    if 'id="ctaBtn"' not in html:
        return html
    cta_href = _extract_href(html, "ctaBtn", "#")
    block = export_cta_html(cta_href=cta_href)
    m = ROSTER_NAV_RE.search(html)
    if m:
        return ROSTER_NAV_RE.sub(block.strip(), html, count=1)
    new_html, n = EXPORT_CTA_RE.subn(block, html, count=1)
    if n:
        return new_html
    old = re.search(r"<div class=\"quickActions\">.*?</div>", html, re.DOTALL)
    if old:
        return html.replace(old.group(0), block.strip(), 1)
    return html


def patch_import_cta(html: str) -> str:
    if 'class="importBottom"' not in html:
        return html
    cta_href = _extract_href(html, "ctaBtn", "/now/")
    block = import_cta_html(cta_href=cta_href)
    m = ROSTER_NAV_RE.search(html)
    if m:
        return ROSTER_NAV_RE.sub(block.strip(), html, count=1)
    new_html, n = IMPORT_WRAP_RE.subn(
        '<div class="importBottom">\n    ' + block + r"\1",
        html,
        count=1,
    )
    if n:
        return new_html
    return html


CTA_LANG_APPLY_RE = re.compile(
    r"  var c1=document\.getElementById\('ctaBtn'\); if\(c1\) c1\.textContent=t\.viewFull;\s*"
    r"(?:  var c2=document\.getElementById\('subscribeBtn'\); if\(c2\) c2\.textContent=t\.subscribe;\s*)?"
    r"(?:  var c3=document\.getElementById\('compareBtn'\); if\(c3\) c3\.textContent=t\.compare;\s*)?"
    r"(?:  var c4=document\.getElementById\('shareSiteBtn'\); if\(c4\) c4\.textContent=t\.shareSite;\s*)?"
    r"(?:  var c5=document\.getElementById\('moreAppsBtn'\); if\(c5\) c5\.textContent=t\.moreApps;\s*)?",
)


def patch_apply_lang(html: str) -> str:
    if "setCtaLabel('ctaBtn'" in html or "setCtaLabel(\"ctaBtn\"" in html:
        return html
    if CTA_LANG_APPLY_RE.search(html):
        html = CTA_LANG_APPLY_RE.sub(APPLY_LANG_NEW + "\n", html, count=1)
    if 'id="shareSiteBtn"' in html:
        if "shareSite:" not in html:
            html = html.replace(
                "compare:'Compare',",
                "compare:'Compare', shareSite:'Share Site',",
                1,
            )
            html = html.replace(
                "compare:'مقارنة',",
                "compare:'مقارنة', shareSite:'مشاركة الموقع',",
                1,
            )
    if 'id="moreAppsBtn"' in html:
        if "moreApps:" not in html:
            html = html.replace(
                "shareSite:'Share Site',",
                "shareSite:'Share Site', moreApps:'Apps',",
                1,
            )
            html = html.replace(
                "shareSite:'مشاركة الموقع',",
                "shareSite:'مشاركة الموقع', moreApps:'تطبيقات',",
                1,
            )
        if "rosterSiteApps.setLang" not in html and "rosterSiteShare.setLang" in html:
            html = html.replace(
                "if(window.rosterSiteShare && window.rosterSiteShare.setLang) window.rosterSiteShare.setLang();",
                "if(window.rosterSiteShare && window.rosterSiteShare.setLang) window.rosterSiteShare.setLang();\n"
                "  if(window.rosterSiteApps && window.rosterSiteApps.setLang) window.rosterSiteApps.setLang();",
                1,
            )
    return html


def patch_apply_lang_more_apps(html: str) -> str:
    if 'id="moreAppsBtn"' not in html:
        return html
    if "moreApps:" not in html:
        html = html.replace(
            "shareSite:'Share Site',",
            "shareSite:'Share Site', moreApps:'Apps',",
            1,
        )
        html = html.replace(
            "shareSite:'مشاركة الموقع',",
            "shareSite:'مشاركة الموقع', moreApps:'تطبيقات',",
            1,
        )
    if "setCtaLabel('moreAppsBtn'" in html:
        return html
    inserts = [
        (
            "setCtaLabel('shareSiteBtn', t.shareSite);  var footer=document.querySelector('.footer');",
            "setCtaLabel('shareSiteBtn', t.shareSite);\n"
            "  setCtaLabel('moreAppsBtn', t.moreApps);\n"
            "  if(window.rosterSiteShare && window.rosterSiteShare.setLang) window.rosterSiteShare.setLang();\n"
            "  if(window.rosterSiteApps && window.rosterSiteApps.setLang) window.rosterSiteApps.setLang();\n"
            "  var footer=document.querySelector('.footer');",
        ),
        (
            "setCtaLabel('shareSiteBtn', t.shareSite);\n  var footer=document.querySelector('.footer');",
            "setCtaLabel('shareSiteBtn', t.shareSite);\n"
            "  setCtaLabel('moreAppsBtn', t.moreApps);\n"
            "  if(window.rosterSiteShare && window.rosterSiteShare.setLang) window.rosterSiteShare.setLang();\n"
            "  if(window.rosterSiteApps && window.rosterSiteApps.setLang) window.rosterSiteApps.setLang();\n"
            "  var footer=document.querySelector('.footer');",
        ),
    ]
    replaced = False
    for old, new in inserts:
        if old in html:
            html = html.replace(old, new, 1)
            replaced = True
            break
    if not replaced and "rosterSiteShare.setLang" in html and "rosterSiteApps.setLang" not in html:
        html = html.replace(
            "if(window.rosterSiteShare && window.rosterSiteShare.setLang) window.rosterSiteShare.setLang();",
            "if(window.rosterSiteShare && window.rosterSiteShare.setLang) window.rosterSiteShare.setLang();\n"
            "  setCtaLabel('moreAppsBtn', t.moreApps);\n"
            "  if(window.rosterSiteApps && window.rosterSiteApps.setLang) window.rosterSiteApps.setLang();",
            1,
        )
    return html


def _next_modal_marker(html: str, start: int) -> int:
    """Index of the next modal block after start (apps sheet or capture overlay)."""
    markers = ('<div id="siteAppsSheet"', '<div id="captureBusy"')
    positions = [html.find(m, start + 1) for m in markers]
    positions = [p for p in positions if p >= 0]
    return min(positions) if positions else -1


def cleanup_orphan_share_fragments(html: str) -> str:
    while ORPHAN_SHARE_FRAGMENT_RE.search(html):
        html = ORPHAN_SHARE_FRAGMENT_RE.sub("\n", html, count=1)
    return html


def replace_share_modal_block(html: str) -> str:
    start = html.find('<div id="siteShareSheet"')
    if start < 0:
        return html
    end = _next_modal_marker(html, start)
    if end < 0:
        return html
    return html[:start] + SITE_SHARE_MODAL_HTML.strip() + "\n\n" + html[end:]


def replace_apps_modal_block(html: str) -> str:
    start = html.find('<div id="siteAppsSheet"')
    if start < 0:
        return html
    end = html.find('<div id="captureBusy"', start + 1)
    if end < 0:
        return html
    shift_block = ""
    if 'id="shiftCopySheet"' in html[start:end]:
        sc_start = html.find('<div id="shiftCopySheet"', start)
        if sc_start >= 0:
            shift_block = html[sc_start:end].strip() + "\n\n"
    apps_block = SITE_APPS_MODAL_HTML.strip() + "\n\n"
    return html[:start] + apps_block + shift_block + html[end:]


def patch_site_share(html: str) -> str:
    if 'id="shareSiteBtn"' not in html and 'id="siteShareSheet"' not in html:
        return html
    if "/* ═══════ SITE SHARE MODAL ═══════ */" in html:
        html = SITE_SHARE_CSS_RE.sub(SITE_SHARE_CSS, html, count=1)
    elif 'id="shareSiteBtn"' in html:
        html = html.replace(
            "    /* ═══════ FOOTER ═══════ */",
            SITE_SHARE_CSS + "\n    /* ═══════ FOOTER ═══════ */",
            1,
        )
    html = cleanup_orphan_share_fragments(html)
    if '<div id="siteShareSheet"' in html:
        html = replace_share_modal_block(html)
    elif 'id="shareSiteBtn"' in html:
        marker = '<div id="siteAppsSheet"'
        pos = html.find(marker)
        if pos < 0:
            pos = html.find('<div id="captureBusy"')
        if pos >= 0:
            html = (
                html[:pos]
                + SITE_SHARE_MODAL_HTML.strip()
                + "\n\n"
                + html[pos:]
            )
    return html


def patch_site_apps(html: str) -> str:
    if 'id="moreAppsBtn"' not in html and 'id="shareSiteBtn"' in html:
        apps_btn = (
            '  <button type="button" class="roster-cta-btn roster-cta-btn--apps moreAppsBtn" id="moreAppsBtn">\n'
            f'    <span class="roster-cta-icon">{SVG_APPS_BTN}</span>\n'
            '    <span class="roster-cta-label">Apps</span>\n'
            "  </button>\n"
        )
        html = SHARE_SITE_BTN_RE.sub(lambda m: m.group(0) + "\n" + apps_btn, html, count=1)
    if "/* ═══════ RELATED APPS MODAL ═══════ */" in html:
        html = SITE_APPS_CSS_RE.sub(SITE_APPS_CSS, html, count=1)
    elif 'id="siteAppsSheet"' in html or 'id="shareSiteBtn"' in html:
        anchor = "    /* ═══════ FOOTER ═══════ */"
        if "/* ═══════ RELATED APPS MODAL ═══════ */" not in html:
            html = html.replace(anchor, SITE_APPS_CSS + "\n" + anchor, 1)
    html = cleanup_orphan_share_fragments(html)
    if '<div id="siteAppsSheet"' in html:
        html = replace_apps_modal_block(html)
    elif 'id="moreAppsBtn"' in html or 'id="shareSiteBtn"' in html:
        pos = html.find('<div id="captureBusy"')
        if pos >= 0:
            html = (
                html[:pos]
                + SITE_APPS_MODAL_HTML.strip()
                + "\n\n"
                + html[pos:]
            )
    html = _fix_share_apps_grid_css(html)
    return html


def _fix_share_apps_grid_css(html: str) -> str:
    html = re.sub(
        r"\.roster-cta-btn--share\s*\{\s*grid-column:\s*1\s*/\s*-1;\s*",
        ".roster-cta-btn--share {\n      ",
        html,
        count=1,
    )
    html = re.sub(
        r"\.roster-cta--import\s+\.roster-cta-btn--share\s*\{\s*grid-column:\s*1\s*/\s*-1;\s*\}\s*",
        "",
        html,
        count=1,
    )
    if ".roster-cta-btn--apps" not in html and ".roster-cta-btn--share" in html:
        html = html.replace(
            ".roster-cta-btn--share {",
            ".roster-cta-btn--share {",
            1,
        )
        insert = """    .roster-cta-btn--apps {
      background: #f0f9ff;
      border-color: #7dd3fc;
      color: #0369a1;
    }
"""
        if ".roster-cta-btn--apps" not in html:
            html = html.replace(
                ".roster-cta-btn--muted {",
                insert + "    .roster-cta-btn--muted {",
                1,
            )
        hover = "      .roster-cta-btn--share:hover { background: #d1fae5; }\n"
        if ".roster-cta-btn--apps:hover" not in html:
            html = html.replace(
                hover,
                hover + "      .roster-cta-btn--apps:hover { background: #e0f2fe; }\n",
                1,
            )
    return html


def _inject_chip_icon_css(html: str) -> str:
    if ".summaryChip .chipVal .chip-icon" in html:
        return html
    html = re.sub(
        r"    \.(?:roster-icon|chipIcon)[^\n]*\{[^}]*\}\s*",
        "",
        html,
    )
    html = re.sub(
        r"    img\[data-roster-icon[^\n]*\{[^}]*\}\s*",
        "",
        html,
    )
    html = re.sub(
        r"    \.chipVal \.roster-icon[^\n]*\{[^}]*\}\s*",
        "",
        html,
    )
    html = re.sub(
        r"    \.summaryChip \.chipIcon[^\n]*\{[^}]*\}\s*",
        "",
        html,
    )
    if "    .summaryChip .chipVal {" in html:
        return html.replace(
            "    .summaryChip .chipVal {",
            CHIP_ICON_CSS + "    .summaryChip .chipVal {",
            1,
        )
    return html


def patch_summary_chips(html: str) -> str:
    html = _inject_chip_icon_css(html)
    chip_patches = (
        (r'(<a[^>]*id="myScheduleBtn"[^>]*>\s*)<div class="chipVal">[^<]*</div>', r"\1" + CHIP_SCHEDULE_HTML),
        (r'(<a[^>]*id="importBtn"[^>]*>\s*)<div class="chipVal">.*?</div>', r"\1" + CHIP_FLIGHT_HTML),
        (r'(<a[^>]*id="exportBtn"[^>]*>\s*)<div class="chipVal">.*?</div>', r"\1" + CHIP_EXPORT_HTML),
        (r'(<a[^>]*id="trainingBtn"[^>]*>\s*)<div class="chipVal">[^<]*</div>', r"\1" + CHIP_TRAINING_HTML),
        (r'(<a[^>]*id="diffChipBtn"[^>]*>\s*)<div class="chipVal">.*?</div>', r"\1" + CHIP_DIFF_HTML),
        (
            r'(<a[^>]*id="welcomeChip"[^>]*>\s*)<div class="chipVal">.*?</div>',
            r"\1" + CHIP_WAVE_HTML,
        ),
        (
            r'(<button[^>]*shiftFilterBtn morning[^>]*>\s*)<div class="chipVal">[^<]*</div>',
            r"\1" + CHIP_MORNING_HTML,
        ),
        (
            r'(<button[^>]*shiftFilterBtn afternoon[^>]*>\s*)<div class="chipVal">[^<]*</div>',
            r"\1" + CHIP_AFTERNOON_HTML,
        ),
        (
            r'(<button[^>]*shiftFilterBtn night[^>]*>\s*)<div class="chipVal">[^<]*</div>',
            r"\1" + CHIP_NIGHT_HTML,
        ),
        (
            r'(<button[^>]*shiftFilterBtn all[^>]*>\s*)<div class="chipVal">[^<]*</div>',
            r"\1" + CHIP_ALL_HTML,
        ),
    )
    for pattern, repl in chip_patches:
        html, _ = re.subn(pattern, repl, html, count=1, flags=re.DOTALL | re.IGNORECASE)
    html = CHIP_IMG_DIFF_RE.sub(CHIP_DIFF_HTML, html)
    html = CHIP_IMG_FLIGHT_RE.sub(CHIP_FLIGHT_HTML, html)
    if "flightSwitchIcon" in html:
        html = re.sub(
            r'<div class="chipVal"><img class="chipIcon flightSwitchIcon"[^>]*/></div>',
            CHIP_FLIGHT_HTML,
            html,
            flags=re.IGNORECASE,
        )
    return html


def patch_lang_toggle(html: str) -> str:
    if 'id="langToggle"' not in html or "toggleLang" not in html:
        return html
    if "langToggleLabel" not in html:
        html = LANG_TOGGLE_RE.sub(LANG_TOGGLE_HTML, html, count=1)
    if "/* زر اللغة */" in html:
        needs_lang_css = (
            "#banner-changer-btn" not in html
            or "background:transparent" not in html
            or "@media (max-width:720px)" not in html
            or ".langToggle      { min-width:44px" in html
        )
        if needs_lang_css:
            if LANG_TOGGLE_BLOCK_RE.search(html):
                html = LANG_TOGGLE_BLOCK_RE.sub(
                    "    /* زر اللغة */\n" + LANG_TOGGLE_CSS,
                    html,
                    count=1,
                )
            elif LANG_TOGGLE_CSS_OLD_RE.search(html):
                html = LANG_TOGGLE_CSS_OLD_RE.sub(
                    "    /* زر اللغة */\n" + LANG_TOGGLE_CSS,
                    html,
                    count=1,
                )
            elif "    .langToggle {" in html and "background:transparent" not in html:
                html = re.sub(
                    r"    /\* زر اللغة \*/\s*.*?    \.langToggle-label \{[^}]+\}\s*",
                    "    /* زر اللغة */\n" + LANG_TOGGLE_CSS,
                    html,
                    count=1,
                    flags=re.DOTALL,
                )
            elif "    .langToggle {" in html and ".langToggle-label" not in html:
                html = re.sub(
                    r"    \.langToggle \{[^}]+\}\s*",
                    LANG_TOGGLE_CSS,
                    html,
                    count=1,
                )
    if LANG_TOGGLE_MOBILE_480_OLD in html:
        html = html.replace(LANG_TOGGLE_MOBILE_480_OLD, "")
    if APPLY_LANG_LANG_BTN_OLD.strip() in html:
        html = html.replace(APPLY_LANG_LANG_BTN_OLD, APPLY_LANG_LANG_BTN_NEW)
    elif "langToggleLabel" in html and "getElementById('langToggleLabel')" not in html:
        html = html.replace(
            "  var btn=document.getElementById('langToggle'); if(btn) btn.textContent=t.langBtn;\n",
            APPLY_LANG_LANG_BTN_NEW,
            1,
        )
    return html


def patch_compare_cta_icon(html: str) -> str:
    if 'id="compareBtn"' not in html:
        return html
    m = COMPARE_BTN_ICON_RE.search(html)
    if not m or "<img" not in m.group(0):
        return html
    return COMPARE_BTN_ICON_RE.sub(r"\1" + SVG_COMPARE + r"\2", html, count=1)


def patch_remove_subscribe(html: str) -> str:
    html = SUBSCRIBE_BTN_RE.sub("\n", html)
    html = SET_CTA_SUBSCRIBE_RE.sub("\n", html)
    html = SET_LOCAL_SUBSCRIBE_RE.sub(
        "\n  if (c1) c1.href = root + '/now/';",
        html,
    )
    html = SET_LOCAL_SUBSCRIBE_RE2.sub("", html)
    return html


def patch_remove_compare(html: str) -> str:
    html = COMPARE_BTN_RE.sub("\n", html)
    html = SET_CTA_COMPARE_RE.sub("\n", html)
    return html


def patch_shift_copy_css(html: str) -> str:
    if 'id="copyShiftBtn"' not in html and 'id="shiftCopySheet"' not in html:
        return html
    # Prefer presence of the hide rule, not only the section comment.
    if ".shiftCopySheet {" in html or ".shiftCopySheet{" in html:
        if "/* ═══════ SHIFT COPY (bottom button + modal) ═══════ */" in html:
            return SHIFT_COPY_CSS_RE.sub(SHIFT_COPY_CSS, html, count=1)
        return html
    for anchor in (
        "    /* ═══════ SITE SHARE MODAL ═══════ */",
        "    /* ═══════ RELATED APPS MODAL ═══════ */",
        "</style>",
    ):
        if anchor in html:
            insert = SHIFT_COPY_CSS + ("\n" if anchor != "</style>" else "\n  ")
            return html.replace(anchor, insert + anchor, 1)
    return html


def patch_shift_copy_modal(html: str) -> str:
    if 'id="copyShiftBtn"' not in html or 'id="shiftCopySheet"' in html:
        return html
    marker = '<div id="captureBusy"'
    pos = html.find(marker)
    if pos < 0:
        return html
    return html[:pos] + SHIFT_COPY_MODAL_HTML.strip() + "\n\n" + html[pos:]


SECONDARY_BARS_RE = re.compile(
    r"(?:  <!-- ════ COPY SHIFT ════ -->\s*)?"
    r"(?:<nav class=\"quickActions (?:rosterCopyBar|alumniBar|secondaryBar)\"[^>]*>.*?</nav>\s*)+",
    re.DOTALL | re.IGNORECASE,
)


def patch_secondary_bar(html: str) -> str:
    """Merge Copy Shift + Former Colleagues into one 2-column secondary bar."""
    has_copy = 'id="copyShiftBtn"' in html
    has_alumni = 'id="alumniBtn"' in html
    if not has_copy and not has_alumni:
        return html
    include_alumni = has_alumni or has_copy
    alumni_href = _extract_href(html, "alumniBtn", "#")
    block = secondary_bar_html(
        include_copy=has_copy,
        include_alumni=include_alumni,
        alumni_href=alumni_href,
    )
    if not block:
        return html
    m = SECONDARY_BARS_RE.search(html)
    if m:
        return SECONDARY_BARS_RE.sub(
            "  <!-- ════ SECONDARY ACTIONS ════ -->\n" + block + "\n",
            html,
            count=1,
        )
    # Insert after main CTA nav when bars are missing as a group.
    cta = ROSTER_NAV_RE.search(html)
    if cta and (has_copy or has_alumni):
        insert_at = cta.end()
        return (
            html[:insert_at]
            + "\n\n  <!-- ════ SECONDARY ACTIONS ════ -->\n"
            + block
            + html[insert_at:]
        )
    return html


def cleanup_secondary_comments(html: str) -> str:
    return re.sub(
        r'(?:\s*<!-- ════ SECONDARY ACTIONS ════ -->\s*){2,}',
        "\n\n  <!-- ════ SECONDARY ACTIONS ════ -->\n",
        html,
        flags=re.IGNORECASE,
    )


def patch_broken_script_lines(html: str) -> str:
    """Repair corrupted addScript lines from a bad sync (truncated site-share.js)."""
    broken = (
        "addScript(root + '/site-share.js\n"
        "  addScript(root + '/site-apps.js?v=' + ver);"
    )
    fixed = (
        "addScript(root + '/site-share.js?v=' + ver);\n"
        "  addScript(root + '/site-apps.js?v=' + ver);"
    )
    if broken in html:
        html = html.replace(broken, fixed)
    if "site-apps.js?v=' + ver);?v=" in html:
        html = html.replace(
            "addScript(root + '/site-apps.js?v=' + ver);?v=' + ver);",
            "addScript(root + '/site-apps.js?v=' + ver);",
        )
    return html


def patch_roster_icons_script(html: str) -> str:
    html_out = patch_broken_script_lines(html)
    share_line = "addScript(root + '/site-share.js?v=' + ver);"
    apps_line = "addScript(root + '/site-apps.js?v=' + ver);"
    if "roster-icons.js" not in html_out and share_line in html_out:
        html_out = html_out.replace(
            share_line,
            ROSTER_ICONS_SCRIPT.strip() + "\n  " + share_line,
            1,
        )
    if "site-apps.js" not in html_out and share_line in html_out:
        html_out = html_out.replace(
            share_line,
            share_line + "\n  " + apps_line,
            1,
        )
    return html_out


def patch_alumni_css(html: str) -> str:
    """Restore alumni + secondaryBar styles if a roster regen dropped them."""
    if ".roster-cta-btn--alumni" in html and ".quickActions.secondaryBar" in html:
        return html
    snippet = (
        "    .quickActions.secondaryBar,\n"
        "    .quickActions.rosterCopyBar,\n"
        "    .quickActions.alumniBar {\n"
        "      margin-top: 10px;\n"
        "      padding: 0 2px;\n"
        "      display: grid;\n"
        "      grid-template-columns: repeat(2, 1fr);\n"
        "      gap: var(--cta-gap, 10px);\n"
        "      width: 100%;\n"
        "      max-width: var(--cta-max, min(100%, 440px));\n"
        "      margin-inline: auto;\n"
        "    }\n"
        "    .quickActions.secondaryBar:not(:has(> :nth-child(2))),\n"
        "    .quickActions.rosterCopyBar:not(:has(> :nth-child(2))),\n"
        "    .quickActions.alumniBar:not(:has(> :nth-child(2))) {\n"
        "      grid-template-columns: 1fr;\n"
        "    }\n"
        "    .secondaryBar .roster-cta-btn,\n"
        "    .rosterCopyBar .roster-cta-btn,\n"
        "    .alumniBar .roster-cta-btn {\n"
        "      width: 100%;\n"
        "      min-width: 0;\n"
        "    }\n"
        "    .roster-cta-btn--alumni {\n"
        "      background: #f0fdfa;\n"
        "      border-color: #99f6e4;\n"
        "      color: #0f766e;\n"
        "    }\n"
        "    @media (hover: hover) {\n"
        "      .roster-cta-btn--alumni:hover { background: #ccfbf1; }\n"
        "    }\n"
    )
    for needle in (
        "    /* ═══════ SITE SHARE MODAL ═══════ */",
        "    /* ═══════ SHIFT COPY",
        "    /* ═══════ RELATED APPS MODAL ═══════ */",
    ):
        if needle in html:
            return html.replace(needle, snippet + "\n" + needle, 1)
    return html


def patch_css_and_js(html: str) -> str:
    if "/* ═══════ QUICK ACTIONS" in html:
        html = CTA_CSS_RE.sub(CTA_CSS, html, count=1)
    elif "/* ═══════ CTA ═══════ */" in html and 'id="ctaBtn"' in html:
        html = LEGACY_CTA_CSS_RE.sub(CTA_CSS, html, count=1)
    html = patch_alumni_css(html)
    html = patch_shift_copy_css(html)
    html = patch_site_share(html)
    html = patch_site_apps(html)
    html = patch_shift_copy_modal(html)
    html = patch_secondary_bar(html)
    html = cleanup_secondary_comments(html)
    html = patch_summary_chips(html)
    html = patch_lang_toggle(html)
    html = patch_compare_cta_icon(html)
    html = patch_remove_compare(html)
    html = patch_remove_subscribe(html)
    html = patch_broken_script_lines(html)
    html = patch_roster_icons_script(html)
    html = APPLY_LANG_BAD_LINE.sub("", html)
    if "setDiffChipIcon" in html:
        html = REMOVE_ICON_JS_RE.sub("setLocalCtaLinks();\n", html, count=1)
        html = html.replace("setDiffChipIcon();\n", "")
        html = html.replace("function setDiffChipIcon() {\n  var icon = document.getElementById('diffChipIcon');\n  if(!icon) return;\n  var root = getSiteRootPath();\n  icon.src = root + '/assets/icons/diff-calendar.png?v=20260428d';\n}\n", "")
    if "bindFlightSwitchIcons" in html:
        html = REMOVE_ICON_JS_RE2.sub("", html, count=1)
    if TOUCH_OLD in html:
        html = html.replace(TOUCH_OLD, TOUCH_NEW)
    html = IMPORT_BOTTOM_OLD.sub(IMPORT_BOTTOM_NEW, html)
    html = patch_apply_lang(html)
    html = patch_apply_lang_more_apps(html)
    for old, new in (
        ("viewFull:'📋 Full Roster'", I18N_VIEWFULL_EN),
        ("compare:'📊 Compare'", I18N_CMP_EN),
        ("shareSite:'🔗 Share Site'", I18N_SHARE_EN),
        ("viewFull:'📋 الجدول الكامل'", I18N_VIEWFULL_AR),
        ("compare:'📊 مقارنة'", I18N_CMP_AR),
        ("shareSite:'🔗 مشاركة الموقع'", I18N_SHARE_AR),
    ):
        html = html.replace(old, new)
    return html


def patch_file(path: Path) -> bool:
    raw = path.read_text(encoding="utf-8")
    if 'id="ctaBtn"' not in raw and "quickActions" not in raw and 'class="btnWrap"' not in raw:
        return False
    updated = raw
    if 'class="btnWrap"' in updated and "roster-cta-btn--roster" not in updated:
        updated = patch_legacy_btn_wrap(updated)
    elif 'id="ctaBtn"' in updated and (
        "roster-cta" in updated or 'class="importBottom"' in updated
    ):
        updated = patch_export_cta(updated)
    updated = patch_css_and_js(updated)
    if updated != raw:
        path.write_text(updated, encoding="utf-8", newline="\n")
        return True
    return False


def main() -> int:
    changed = 0
    for path in sorted(DOCS.rglob("*.html")):
        if patch_file(path):
            changed += 1
            if changed <= 8 or "--verbose" in sys.argv:
                print(f"patched {path.relative_to(ROOT)}")
    print(f"patched {changed} html files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
