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
    SITE_SHARE_CSS,
    SITE_SHARE_MODAL_HTML,
    SVG_BELL,
    SVG_COMPARE,
    LANG_TOGGLE_CSS,
    LANG_TOGGLE_HTML,
    APPLY_LANG_LANG_BTN_NEW,
    APPLY_LANG_LANG_BTN_OLD,
    export_cta_html,
    import_cta_html,
    I18N_CMP_AR,
    I18N_CMP_EN,
    I18N_SHARE_AR,
    I18N_SHARE_EN,
    I18N_SUB_AR,
    I18N_SUB_EN,
    I18N_VIEWFULL_AR,
    I18N_VIEWFULL_EN,
)

CTA_CSS_RE = re.compile(
    r"    /\* ═══════ QUICK ACTIONS ═══════ \*/\s*.*?"
    r"(?=    /\* ═══════ (?:SITE SHARE|FOOTER|SHARE/SAVE))",
    re.DOTALL,
)

SITE_SHARE_CSS_RE = re.compile(
    r"    /\* ═══════ SITE SHARE MODAL ═══════ \*/\s*.*?"
    r"(?=    /\* ═══════ (?:FOOTER|SHARE/SAVE))",
    re.DOTALL,
)

SITE_SHARE_MODAL_RE = re.compile(
    r'<div id="siteShareSheet" class="siteShareSheet"[^>]*>.*?</div>\s*(?=<div id="captureBusy")',
    re.DOTALL,
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
SUBSCRIBE_BTN_ICON_RE = re.compile(
    r'(<(?:a|button)[^>]*\bid="subscribeBtn"[^>]*>\s*<span class="roster-cta-icon">).*?(</span>)',
    re.DOTALL | re.IGNORECASE,
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
    sub_href = _extract_href(html, "subscribeBtn", "#")
    block = export_cta_html(cta_href=cta_href, subscribe_href=sub_href)
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
    if 'id="subscribeBtn"' not in html:
        return html
    cta_href = _extract_href(html, "ctaBtn", "#")
    sub_href = _extract_href(html, "subscribeBtn", "#")
    block = export_cta_html(cta_href=cta_href, subscribe_href=sub_href)
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
    r"  var c2=document\.getElementById\('subscribeBtn'\); if\(c2\) c2\.textContent=t\.subscribe;\s*"
    r"(?:  var c3=document\.getElementById\('compareBtn'\); if\(c3\) c3\.textContent=t\.compare;\s*)?"
    r"(?:  var c4=document\.getElementById\('shareSiteBtn'\); if\(c4\) c4\.textContent=t\.shareSite;\s*)?",
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
    return html


def patch_site_share(html: str) -> str:
    if 'id="siteShareSheet"' not in html:
        return html
    if "/* ═══════ SITE SHARE MODAL ═══════ */" in html:
        html = SITE_SHARE_CSS_RE.sub(SITE_SHARE_CSS, html, count=1)
    else:
        html = html.replace(
            "    /* ═══════ FOOTER ═══════ */",
            SITE_SHARE_CSS + "\n    /* ═══════ FOOTER ═══════ */",
            1,
        )
    m = SITE_SHARE_MODAL_RE.search(html)
    if m:
        html = SITE_SHARE_MODAL_RE.sub(SITE_SHARE_MODAL_HTML + "\n", html, count=1)
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
            r'(<a[^>]*id="welcomeChip"[^>]*>\s*)<div class="chipVal">(?:<span class="waveHand">[^<]*</span>|.*?)</div>',
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


def patch_subscribe_bell_icon(html: str) -> str:
    if 'id="subscribeBtn"' not in html:
        return html
    m = SUBSCRIBE_BTN_ICON_RE.search(html)
    if not m:
        return html
    inner = m.group(0)
    if "#ca8a04" in inner or "📩" in inner or "<img" in inner:
        return SUBSCRIBE_BTN_ICON_RE.sub(r"\1" + SVG_BELL + r"\2", html, count=1)
    return html


def patch_roster_icons_script(html: str) -> str:
    if "roster-icons.js" in html:
        return html
    needle = "addScript(root + '/site-share.js"
    if needle in html:
        return html.replace(
            needle,
            ROSTER_ICONS_SCRIPT + "\n  " + needle,
            1,
        )
    return html


def patch_css_and_js(html: str) -> str:
    if "/* ═══════ QUICK ACTIONS ═══════ */" in html:
        html = CTA_CSS_RE.sub(CTA_CSS, html, count=1)
    elif "/* ═══════ CTA ═══════ */" in html and 'id="ctaBtn"' in html:
        html = LEGACY_CTA_CSS_RE.sub(CTA_CSS, html, count=1)
    html = patch_site_share(html)
    html = patch_summary_chips(html)
    html = patch_lang_toggle(html)
    html = patch_compare_cta_icon(html)
    html = patch_subscribe_bell_icon(html)
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
    for old, new in (
        ("viewFull:'📋 Full Roster'", I18N_VIEWFULL_EN),
        ("subscribe:'📩 Subscribe'", I18N_SUB_EN),
        ("compare:'📊 Compare'", I18N_CMP_EN),
        ("shareSite:'🔗 Share Site'", I18N_SHARE_EN),
        ("viewFull:'📋 الجدول الكامل'", I18N_VIEWFULL_AR),
        ("subscribe:'📩 اشتراك'", I18N_SUB_AR),
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
    elif 'class="importBottom"' in updated and 'id="subscribeBtn"' not in updated:
        updated = patch_import_cta(updated)
    elif 'id="subscribeBtn"' in updated:
        updated = patch_export_cta(updated)
    elif 'id="ctaBtn"' in updated and "roster-cta" in updated:
        updated = patch_export_cta(updated) if 'id="subscribeBtn"' in updated else patch_import_cta(updated)
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
