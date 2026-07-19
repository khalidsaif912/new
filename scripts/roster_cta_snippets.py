"""Shared CTA bar HTML/CSS, unified PNG/SVG icons, and site-share modal."""

from __future__ import annotations

import re

ICON_VER = "20260521b"
ICON_DIFF = f"/assets/icons/diff-calendar.png?v={ICON_VER}"
ICON_FLIGHT = f"/assets/icons/flight.png?v={ICON_VER}"

# ── SVG icons (CTA + share modal — same on all pages) ──
SVG_CLIPBOARD = (
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" '
    'stroke="#1e3a8a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    '<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>'
    '<rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h6"/></svg>'
)
SVG_BELL = (
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">'
    '<path d="M18 14V9a6 6 0 1 0-12 0v5l-2 2v1h16v-1l-2-2z" stroke="#dc2626" stroke-width="2" stroke-linejoin="round"/>'
    '<path d="M10 18a2 2 0 0 0 4 0" stroke="#dc2626" stroke-width="2" stroke-linecap="round"/></svg>'
)
SVG_SHARE_OUT = (
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" '
    'stroke="#166534" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    '<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/>'
    '<path d="M12 3v12M8 7l4-4 4 4"/></svg>'
)
SVG_WHATSAPP = (
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">'
    '<circle cx="12" cy="12" r="9" fill="#22c55e"/>'
    '<path d="M8.5 9.5c.4 2.2 2.4 4.2 4.8 4.8l1-2.2c.1-.2.3-.3.5-.2l1.8.8c.2.1.4 0 .5-.2.4-.9.9-1.7 1.5-2.4.1-.2 0-.5-.2-.6l-1.6-.9c-.2-.1-.5 0-.6.2-.3.6-.7 1.1-1.1 1.6-.1.2-.4.2-.6.1l-1.4-.7c-.2-.1-.4-.1-.5.1z" fill="#fff"/></svg>'
)
SVG_LINK = (
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" '
    'stroke="#b45309" stroke-width="2" stroke-linecap="round" aria-hidden="true">'
    '<path d="M10 13a5 5 0 0 0 7.07 0l1.41-1.41a5 5 0 0 0-7.07-7.07L10 5"/>'
    '<path d="M14 11a5 5 0 0 0-7.07 0L5.52 12.41a5 5 0 0 0 7.07 7.07L14 19"/></svg>'
)
# Compare CTA — line icon matching roster / subscribe / share (not PNG emoji)
SVG_COMPARE = (
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" '
    'stroke="#b45309" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    '<rect x="3" y="4" width="18" height="17" rx="2"/>'
    '<path d="M3 9h18"/>'
    '<path d="M8 14l-2 2 2 2"/>'
    '<path d="M16 14l2 2-2 2"/>'
    '</svg>'
)
SVG_APPS_BTN = (
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" '
    'stroke="#0369a1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    '<rect x="3" y="3" width="7" height="7" rx="1.5"/>'
    '<rect x="14" y="3" width="7" height="7" rx="1.5"/>'
    '<rect x="3" y="14" width="7" height="7" rx="1.5"/>'
    '<rect x="14" y="14" width="7" height="7" rx="1.5"/>'
    '</svg>'
)
SVG_APP_FLIGHT = (
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" '
    'stroke="#0284c7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    '<path d="M17.8 19.2 16 12l-3.5-1.5L3 3l4 12 4-1 2.5 3.5 3.5 1.8 4.2z"/>'
    '</svg>'
)
SVG_APP_LABEL = (
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" '
    'stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>'
    '<path d="M7 7h.01"/>'
    '</svg>'
)
SVG_APP_CALC = (
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" '
    'stroke="#b45309" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    '<rect x="4" y="2" width="16" height="20" rx="2"/>'
    '<path d="M8 6h8M8 10h8M8 14h2M12 14h2M8 18h2M12 18h2"/>'
    '</svg>'
)
SVG_APP_CART = (
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" '
    'stroke="#7c3aed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>'
    '<path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>'
    '</svg>'
)
SVG_APP_GAME = (
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" '
    'stroke="#db2777" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    '<path d="M6 12h4"/><path d="M8 10v4"/>'
    '<path d="M15 13h.01"/><path d="M18 11h.01"/>'
    '<rect x="2" y="6" width="20" height="12" rx="2"/>'
    '</svg>'
)
SVG_APP_WCVOTE = (
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">'
    '<circle cx="12" cy="12" r="9" fill="#0a1520" stroke="#FFD700" stroke-width="1.5"/>'
    '<path d="M8 10h8M8 14h5" stroke="#FFD700" stroke-width="1.5" stroke-linecap="round"/>'
    '<circle cx="16" cy="14" r="2" fill="#00d4ff"/>'
    '</svg>'
)
SVG_APP_STORE = (
    '<svg class="siteAppsStoreSvg" viewBox="0 0 24 24" width="22" height="22" fill="none" '
    'stroke="#ea580c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    '<path d="M3 10h18"/>'
    '<path d="M5 10l1.5-5h11L19 10"/>'
    '<path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9"/>'
    '<path d="M10 20v-5h4v5"/>'
    '<path d="M12 7V5"/>'
    '</svg>'
)


def _chip_svg(paths: str, *, size: int = 22, stroke: str = "#1e40af") -> str:
    return (
        f'<svg class="chip-icon" viewBox="0 0 24 24" width="{size}" height="{size}" '
        f'fill="none" stroke="{stroke}" stroke-width="2" stroke-linecap="round" '
        f'stroke-linejoin="round" aria-hidden="true">{paths}</svg>'
    )


def _chip_val(inner: str) -> str:
    return f'<div class="chipVal">{inner}</div>'


# ── Summary chip icons (line SVG — same style as bottom CTA bar) ──
SVG_CHIP_SCHEDULE = _chip_svg(
    '<rect x="3" y="4" width="18" height="18" rx="2"/>'
    '<path d="M16 2v4M8 2v4M3 10h18"/>'
    '<path d="M8 14h.01M12 14h.01M16 14h.01"/>',
    stroke="#2563eb",
)
SVG_CHIP_FLIGHT = _chip_svg(
    '<path d="M17.8 19.2 16 12l-3.5-1.5L3 3l4 12 4-1 2.5 3.5 3.5 1.8 4.2z"/>',
    stroke="#0ea5e9",
)
SVG_CHIP_EXPORT = _chip_svg(
    '<path d="M17.8 19.2 16 12l-3.5-1.5L3 3l4 12 4-1 2.5 3.5 3.5 1.8 4.2z"/>',
    stroke="#059669",
)
SVG_CHIP_WAVE = _chip_svg(
    '<path d="M18 11V6a2 2 0 0 0-4 0"/>'
    '<path d="M14 10V4a2 2 0 0 0-4 0v2"/>'
    '<path d="M10 10.5V6a2 2 0 0 0-4 0v8"/>'
    '<path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>',
    stroke="#db2777",
)
SVG_CHIP_TRAINING = _chip_svg(
    '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>'
    '<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    stroke="#7c3aed",
)
SVG_CHIP_DIFF = _chip_svg(
    '<rect x="3" y="4" width="18" height="17" rx="2"/>'
    '<path d="M3 9h18"/>'
    '<path d="M8 14l-2 2 2 2"/>'
    '<path d="M16 14l2 2-2 2"/>',
    stroke="#ef4444",
)
SVG_CHIP_SUN = _chip_svg(
    '<circle cx="12" cy="12" r="4"/>'
    '<path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41"/>'
    '<path d="M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',
    stroke="#f59e0b",
)
SVG_CHIP_CLOUD_SUN = _chip_svg(
    '<path d="M17 18H8a5 5 0 1 1 2-9.5"/>'
    '<circle cx="17" cy="8" r="3"/>',
    stroke="#f97316",
)
SVG_CHIP_MOON = _chip_svg(
    '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    stroke="#8b5cf6",
)
SVG_CHIP_CLIPBOARD = _chip_svg(
    '<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>'
    '<rect x="9" y="3" width="6" height="4" rx="1"/>',
    stroke="#1e40af",
)

CHIP_SCHEDULE_HTML = _chip_val(SVG_CHIP_SCHEDULE)
CHIP_FLIGHT_HTML = _chip_val(SVG_CHIP_FLIGHT)
CHIP_EXPORT_HTML = _chip_val(SVG_CHIP_EXPORT)
CHIP_WAVE_HTML = _chip_val(f'<span class="waveHand">{SVG_CHIP_WAVE}</span>')
CHIP_TRAINING_HTML = _chip_val(SVG_CHIP_TRAINING)
CHIP_DIFF_HTML = _chip_val(SVG_CHIP_DIFF)
CHIP_MORNING_HTML = _chip_val(SVG_CHIP_SUN)
CHIP_AFTERNOON_HTML = _chip_val(SVG_CHIP_CLOUD_SUN)
CHIP_NIGHT_HTML = _chip_val(SVG_CHIP_MOON)
CHIP_ALL_HTML = _chip_val(SVG_CHIP_CLIPBOARD)

SVG_LANG_GLOBE = (
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" '
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">'
    '<circle cx="12" cy="12" r="9"/>'
    '<path d="M3 12h18"/>'
    '<path d="M12 3a14 14 0 0 1 0 18"/>'
    '<path d="M12 3a14 14 0 0 0 0 18"/>'
    '</svg>'
)
LANG_TOGGLE_HTML = (
    '<button class="langToggle" id="langToggle" onclick="toggleLang()" '
    'type="button" title="Switch language">'
    f'<span class="langToggle-icon">{SVG_LANG_GLOBE}</span>'
    '<span class="langToggle-label" id="langToggleLabel">ع</span>'
    '</button>'
)
LANG_TOGGLE_CSS = r"""    .langToggle {
      position:absolute; top:12px; right:12px; z-index:30;
      background:transparent; border:none; border-radius:0;
      min-width:auto; height:auto; padding:4px;
      display:inline-flex; flex-direction:column; align-items:center; justify-content:center;
      gap:2px; color:#fff; font-size:0; cursor:pointer;
      box-shadow:none; backdrop-filter:none; -webkit-backdrop-filter:none;
      transition:transform .2s ease, opacity .2s ease;
      -webkit-tap-highlight-color:transparent;
      touch-action:manipulation;
    }
    body.ar .langToggle { right:12px; left:auto; }
    .langToggle:hover { background:transparent; transform:scale(1.08); opacity:.92; }
    .langToggle-icon { line-height:0; display:flex; align-items:center; justify-content:center; }
    .langToggle-icon svg {
      display:block; width:18px; height:18px;
      filter:drop-shadow(0 1px 2px rgba(0,0,0,.55));
    }
    .langToggle-label {
      font-size:10px; font-weight:800; line-height:1; letter-spacing:.02em;
      text-shadow:0 1px 3px rgba(0,0,0,.65);
    }
    #banner-changer-btn {
      position:absolute; top:12px; left:12px; z-index:30;
      background:transparent; border:none; border-radius:0;
      min-width:auto; min-height:auto; padding:4px;
      color:#fff; cursor:pointer; line-height:0;
      box-shadow:none; backdrop-filter:none; -webkit-backdrop-filter:none;
      display:inline-flex; align-items:center; justify-content:center;
      -webkit-tap-highlight-color:transparent; touch-action:manipulation;
      transition:transform .2s ease, opacity .2s ease;
    }
    #banner-changer-btn:hover { background:transparent; transform:scale(1.08); opacity:.92; }
    #banner-changer-btn .banner-changer-icon svg {
      display:block; width:20px; height:20px;
      filter:drop-shadow(0 1px 2px rgba(0,0,0,.55));
    }
    body.ar #banner-changer-btn { left:12px; right:auto; }
    @media (max-width:720px) {
      .langToggle { padding:6px; }
      .langToggle-icon svg { width:20px; height:20px; }
      .langToggle-label { font-size:11px; }
      #banner-changer-btn { padding:6px; }
      #banner-changer-btn .banner-changer-icon svg { width:22px; height:22px; }
    }
"""
APPLY_LANG_LANG_BTN_OLD = (
    "  var btn=document.getElementById('langToggle'); if(btn) btn.textContent=t.langBtn;\n"
)
APPLY_LANG_LANG_BTN_NEW = (
    "  var langLbl=document.getElementById('langToggleLabel');\n"
    "  if(langLbl) langLbl.textContent=t.langBtn;\n"
    "  else {{ var btn=document.getElementById('langToggle'); "
    "if(btn) btn.textContent=t.langBtn; }}\n"
)

IOS_TOUCH_CSS = r"""    .header::before,
    .header::after {
      pointer-events:none;
    }
    .summaryBar {
      position:relative;
      z-index:30;
      isolation:isolate;
    }
    .summaryBar a.summaryChip,
    .summaryBar button.summaryChip,
    .quickActions.roster-cta,
    .quickActions .roster-cta-btn,
    .importBottom .quickActions.roster-cta,
    .importBottom .roster-cta-btn,
    .topDock .dockCard.dockAction,
    .topDock .dockCard.savedChip,
    .topDock button.dockCard {
      position:relative;
      z-index:1;
      touch-action:manipulation;
      -webkit-tap-highlight-color:transparent;
      cursor:pointer;
    }
    .summaryBar a.summaryChip *,
    .summaryBar button.summaryChip *,
    .quickActions.roster-cta-btn .roster-cta-icon,
    .quickActions.roster-cta-btn .roster-cta-label,
    .topDock .dockCard * {
      pointer-events:none;
    }
    .importBottom,
    .quickActions.roster-cta {
      position:relative;
      z-index:25;
    }
"""

CHIP_ICON_CSS = r"""    .summaryChip .chipVal .chip-icon {
      display: block;
      width: 22px;
      height: 22px;
      margin: 0 auto;
      flex-shrink: 0;
    }
    .summaryChip .chipVal .waveHand {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 0;
    }
    .summaryChip .chipVal .waveHand .chip-icon {
      margin: 0;
    }
"""

CTA_CSS = r"""    /* ═══════ QUICK ACTIONS ═══════ */
    .quickActions.roster-cta {
      --cta-font: "Segoe UI", system-ui, -apple-system, sans-serif;
      --cta-gap: 10px;
      --cta-max: min(100%, 680px);
      margin-top: 22px;
      padding: 0 2px;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--cta-gap);
      width: 100%;
      max-width: var(--cta-max);
      margin-inline: auto;
    }
    .roster-cta-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 44px;
      padding: 10px 12px;
      border-radius: 999px;
      border: 1.5px solid transparent;
      font-family: var(--cta-font);
      font-size: 13px;
      font-weight: 700;
      line-height: 1.2;
      text-decoration: none;
      cursor: pointer;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      box-shadow: none;
      transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease, border-color 0.15s ease;
    }
    button.roster-cta-btn {
      appearance: none;
      -webkit-appearance: none;
      font: inherit;
    }
    .roster-cta-icon {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      line-height: 0;
    }
    .roster-cta-icon svg { display: block; width: 18px; height: 18px; }
    .roster-cta-icon .roster-icon { width: 18px; height: 18px; }
    .roster-cta-label {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .roster-cta-btn--roster {
      background: #e8f1ff;
      border-color: #b8c9f5;
      color: #1e3a8a;
    }
    .roster-cta-btn--share {
      background: #ecfdf5;
      border-color: #86efac;
      color: #166534;
    }
    .roster-cta-btn--apps {
      background: #f0f9ff;
      border-color: #7dd3fc;
      color: #0369a1;
    }
    .roster-cta-btn--texture {
      background: #f5f3ff;
      border-color: #c4b5fd;
      color: #5b21b6;
    }
    .roster-cta-btn--muted {
      background: #f1f5f9;
      border-color: #cbd5e1;
      color: #475569;
    }
    .roster-cta--import {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      max-width: var(--cta-max);
    }
    @media (hover: hover) {
      .roster-cta-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
      }
      .roster-cta-btn--roster:hover { background: #dce8ff; }
      .roster-cta-btn--share:hover { background: #d1fae5; }
      .roster-cta-btn--apps:hover { background: #e0f2fe; }
      .roster-cta-btn--texture:hover { background: #ede9fe; }
      .roster-cta-btn--muted:hover { background: #e2e8f0; }
    }
    .roster-cta-btn:active {
      transform: translateY(0) scale(0.98);
      box-shadow: none;
    }
    .roster-cta-btn:focus-visible {
      outline: 2px solid rgba(37, 99, 235, 0.45);
      outline-offset: 2px;
    }
    @media (max-width: 380px) {
      .roster-cta-btn {
        padding: 9px 8px;
        font-size: 11px;
        gap: 5px;
        min-height: 40px;
      }
      .roster-cta-icon { width: 16px; height: 16px; }
      .roster-cta-icon svg { width: 16px; height: 16px; }
      .roster-cta-icon .roster-icon { width: 16px; height: 16px; }
    }
    .quickActions.secondaryBar,
    .quickActions.rosterCopyBar,
    .quickActions.alumniBar {
      margin-top: 10px;
      padding: 0 2px;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--cta-gap, 10px);
      width: 100%;
      max-width: var(--cta-max, min(100%, 440px));
      margin-inline: auto;
    }
    .quickActions.secondaryBar:not(:has(> :nth-child(2))),
    .quickActions.rosterCopyBar:not(:has(> :nth-child(2))),
    .quickActions.alumniBar:not(:has(> :nth-child(2))) {
      grid-template-columns: 1fr;
    }
    .secondaryBar .roster-cta-btn,
    .rosterCopyBar .roster-cta-btn,
    .alumniBar .roster-cta-btn {
      width: 100%;
      min-width: 0;
    }
    .roster-cta-btn--alumni {
      background: #f0fdfa;
      border-color: #99f6e4;
      color: #0f766e;
    }
    @media (hover: hover) {
      .roster-cta-btn--alumni:hover { background: #ccfbf1; }
    }
"""

CTA_CSS_PY = CTA_CSS.replace("{", "{{").replace("}", "}}")

SITE_SHARE_CSS = r"""    /* ═══════ SITE SHARE MODAL ═══════ */
    .siteShareSheet {
      position: fixed;
      inset: 0;
      display: none;
      align-items: center;
      justify-content: center;
      background: rgba(15, 23, 42, 0.45);
      z-index: 10001;
      padding: 16px;
      pointer-events: none;
      visibility: hidden;
    }
    .siteShareSheet.open {
      display: flex;
      pointer-events: auto;
      visibility: visible;
    }
    .siteShareCard {
      width: min(100%, 360px);
      background: #fff;
      border-radius: 18px;
      padding: 18px 16px 14px;
      border: 1px solid rgba(15, 23, 42, 0.1);
      box-shadow: 0 20px 48px rgba(15, 23, 42, 0.22);
      text-align: center;
    }
    .siteShareTitle {
      font-size: 17px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 4px;
    }
    .siteShareHint {
      font-size: 12px;
      color: #64748b;
      margin: 0 0 14px;
      line-height: 1.4;
    }
    .siteShareQr {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 220px;
      margin: 0 auto 12px;
      background: #f8fafc;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
      padding: 10px;
    }
    .siteShareUrl {
      display: block;
      width: 100%;
      box-sizing: border-box;
      font-size: 11px;
      color: #475569;
      word-break: break-all;
      line-height: 1.45;
      margin: 0 0 14px;
      padding: 8px 10px;
      background: #f1f5f9;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      direction: ltr;
      text-align: left;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }
    .siteShareActions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 10px;
    }
    .siteShareActions .roster-cta-btn--compare {
      grid-column: 1 / -1;
    }
    .siteShareCloseWrap {
      margin-top: 4px;
    }
    .siteShareCloseWrap .roster-cta-btn {
      width: 100%;
    }
"""

SITE_SHARE_MODAL_HTML = f"""<div id="siteShareSheet" class="siteShareSheet" aria-hidden="true">
  <div class="siteShareCard" role="dialog" aria-labelledby="siteShareTitle">
    <h2 class="siteShareTitle" id="siteShareTitle">Share this site</h2>
    <p class="siteShareHint" id="siteShareHint">Scan the QR code or share the link</p>
    <div class="siteShareQr" id="siteShareQr"></div>
    <input class="siteShareUrl" id="siteShareUrl" type="text" readonly dir="ltr" inputmode="none" aria-label="Share URL"/>
    <div class="siteShareActions">
      <button type="button" class="roster-cta-btn roster-cta-btn--roster siteShareNativeBtn" id="siteShareNativeBtn">
        <span class="roster-cta-icon">{SVG_SHARE_OUT}</span>
        <span class="roster-cta-label">Share</span>
      </button>
      <button type="button" class="roster-cta-btn roster-cta-btn--share siteShareWhatsAppBtn" id="siteShareWhatsAppBtn">
        <span class="roster-cta-icon">{SVG_WHATSAPP}</span>
        <span class="roster-cta-label">WhatsApp</span>
      </button>
      <button type="button" class="roster-cta-btn roster-cta-btn--compare siteShareCopyBtn" id="siteShareCopyBtn">
        <span class="roster-cta-icon">{SVG_LINK}</span>
        <span class="roster-cta-label">Copy link</span>
      </button>
    </div>
    <div class="siteShareCloseWrap">
      <button type="button" class="roster-cta-btn roster-cta-btn--muted siteShareCloseBtn" id="siteShareCloseBtn">
        <span class="roster-cta-label">Close</span>
      </button>
    </div>
  </div>
</div>
"""

SITE_APPS_CSS = r"""    /* ═══════ RELATED APPS MODAL ═══════ */
    .siteAppsSheet {
      position: fixed;
      inset: 0;
      display: none;
      align-items: center;
      justify-content: center;
      background: rgba(15, 23, 42, 0.45);
      z-index: 10002;
      padding: 16px;
      pointer-events: none;
      visibility: hidden;
    }
    .siteAppsSheet.open {
      display: flex;
      pointer-events: auto;
      visibility: visible;
    }
    .siteAppsCard {
      width: min(100%, 400px);
      max-height: min(92vh, 560px);
      overflow: auto;
      -webkit-overflow-scrolling: touch;
      background: #fff;
      border-radius: 18px;
      padding: 18px 14px 14px;
      border: 1px solid rgba(15, 23, 42, 0.1);
      box-shadow: 0 20px 48px rgba(15, 23, 42, 0.22);
      text-align: center;
    }
    .siteAppsTitle {
      font-size: 17px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 4px;
    }
    .siteAppsHint {
      font-size: 12px;
      color: #64748b;
      margin: 0 0 14px;
      line-height: 1.4;
    }
    .siteAppsGrid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 12px;
      text-align: start;
    }
    .siteAppsLink {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 96px;
      padding: 12px 10px;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      text-decoration: none;
      color: #0f172a;
      transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
      -webkit-tap-highlight-color: transparent;
    }
    .siteAppsLink:active {
      transform: scale(0.98);
    }
    .siteAppsLink-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: #fff;
      border: 1px solid #e2e8f0;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
    }
    .siteAppsLink-icon svg {
      display: block;
    }
    .siteAppsLink-title {
      font-size: 12px;
      font-weight: 800;
      line-height: 1.25;
      text-align: center;
      color: #0f172a;
    }
    .siteAppsLink-sub {
      font-size: 10px;
      font-weight: 600;
      color: #64748b;
      line-height: 1.3;
      text-align: center;
    }
    .siteAppsLink--flights .siteAppsLink-icon { background: #e0f2fe; border-color: #bae6fd; }
    .siteAppsLink--labels .siteAppsLink-icon { background: #ecfdf5; border-color: #a7f3d0; }
    .siteAppsLink--calc .siteAppsLink-icon { background: #fffbeb; border-color: #fde68a; }
    .siteAppsLink--quicklist .siteAppsLink-icon { background: #f5f3ff; border-color: #ddd6fe; }
    .siteAppsLink--store .siteAppsLink-icon { background: #ffedd5; border-color: #fdba74; }
    .siteAppsLink--store .siteAppsLink-icon svg.siteAppsStoreSvg {
      animation: siteAppsStorePulse 2.4s ease-in-out infinite;
      transform-origin: center;
    }
    @keyframes siteAppsStorePulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.07); }
    }
    .siteAppsLink--wcvote {
      grid-column: 1 / -1;
      flex-direction: row;
      min-height: 72px;
      justify-content: flex-start;
      padding-inline: 14px;
      gap: 12px;
      background: linear-gradient(135deg, #0a1520 0%, #1a2744 100%);
      border-color: rgba(255, 215, 0, 0.45);
    }
    .siteAppsLink--wcvote .siteAppsLink-icon {
      background: rgba(255, 215, 0, 0.12);
      border-color: rgba(255, 215, 0, 0.35);
      flex-shrink: 0;
    }
    .siteAppsLink--wcvote .siteAppsLink-text {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;
      flex: 1;
    }
    .siteAppsLink--wcvote .siteAppsLink-title { color: #FFD700; text-align: start; }
    .siteAppsLink--wcvote .siteAppsLink-sub { color: #e8f4f8; text-align: start; }
    .siteAppsLink--store,
    .siteAppsLink--games {
      grid-column: 1 / -1;
      flex-direction: row;
      min-height: 72px;
      justify-content: flex-start;
      padding-inline: 14px;
      gap: 12px;
    }
    .siteAppsLink--store {
      background: linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%);
      border-color: #fdba74;
    }
    .siteAppsLink--store .siteAppsLink-icon {
      flex-shrink: 0;
    }
    .siteAppsLink--games .siteAppsLink-icon {
      background: #fdf2f8;
      border-color: #fbcfe8;
      flex-shrink: 0;
    }
    .siteAppsLink--store .siteAppsLink-text,
    .siteAppsLink--games .siteAppsLink-text {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;
      flex: 1;
    }
    .siteAppsLink--store .siteAppsLink-title,
    .siteAppsLink--store .siteAppsLink-sub,
    .siteAppsLink--games .siteAppsLink-title,
    .siteAppsLink--games .siteAppsLink-sub {
      text-align: start;
    }
    @media (hover: hover) {
      .siteAppsLink:hover {
        background: #fff;
        box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
        transform: translateY(-1px);
      }
    }
    @media (max-width: 360px) {
      .siteAppsLink { min-height: 88px; padding: 10px 8px; }
      .siteAppsLink-icon { width: 40px; height: 40px; }
      .siteAppsLink-title { font-size: 11px; }
    }
    .siteAppsCloseWrap {
      margin-top: 4px;
    }
    .siteAppsCloseWrap .roster-cta-btn {
      width: 100%;
    }
"""

SITE_APPS_MODAL_HTML = f"""<div id="siteAppsSheet" class="siteAppsSheet" aria-hidden="true">
  <div class="siteAppsCard" role="dialog" aria-labelledby="siteAppsTitle">
    <h2 class="siteAppsTitle" id="siteAppsTitle">Related apps</h2>
    <p class="siteAppsHint" id="siteAppsHint">Quick links to other tools</p>
    <div class="siteAppsGrid" id="siteAppsGrid">
      <a class="siteAppsLink siteAppsLink--wcvote" href="https://match-accb0.web.app/?utm_source=roster-site&utm_medium=apps" target="_blank" rel="noopener noreferrer" data-app-id="wcvote">
        <span class="siteAppsLink-icon">{SVG_APP_WCVOTE}</span>
        <span class="siteAppsLink-text">
          <span class="siteAppsLink-title" data-i18n="wcvote">World Cup Fan Vote</span>
          <span class="siteAppsLink-sub" data-i18n-sub="wcvote">Vote for your team</span>
        </span>
      </a>
      <a class="siteAppsLink siteAppsLink--flights" href="https://khalidsaif912.github.io/live-flights/" target="_blank" rel="noopener noreferrer" data-app-id="flights">
        <span class="siteAppsLink-icon">{SVG_APP_FLIGHT}</span>
        <span class="siteAppsLink-title" data-i18n="flights">Muscat Flights</span>
        <span class="siteAppsLink-sub" data-i18n-sub="flights">Airport board</span>
      </a>
      <a class="siteAppsLink siteAppsLink--labels" href="https://lbit.netlify.app/" target="_blank" rel="noopener noreferrer" data-app-id="labels">
        <span class="siteAppsLink-icon">{SVG_APP_LABEL}</span>
        <span class="siteAppsLink-title" data-i18n="labels">SATS Labels</span>
        <span class="siteAppsLink-sub" data-i18n-sub="labels">Cargo labels</span>
      </a>
      <a class="siteAppsLink siteAppsLink--calc" href="https://khalidsaif912.github.io/new/docs/calculator/index.html" data-app-id="calc" data-open-same="1">
        <span class="siteAppsLink-icon">{SVG_APP_CALC}</span>
        <span class="siteAppsLink-title" data-i18n="calc">Quantities</span>
        <span class="siteAppsLink-sub" data-i18n-sub="calc">Shipment calc</span>
      </a>
      <a class="siteAppsLink siteAppsLink--quicklist" href="https://khalidsaif912.github.io/new/docs/QuickList/index.html" data-app-id="quicklist" data-open-same="1">
        <span class="siteAppsLink-icon">{SVG_APP_CART}</span>
        <span class="siteAppsLink-title" data-i18n="quicklist">QuickList</span>
        <span class="siteAppsLink-sub" data-i18n-sub="quicklist">Shopping lists</span>
      </a>
      <a class="siteAppsLink siteAppsLink--store" href="https://mystore-96d8e.web.app" target="_blank" rel="noopener noreferrer" data-app-id="store">
        <span class="siteAppsLink-icon">{SVG_APP_STORE}</span>
        <span class="siteAppsLink-text">
          <span class="siteAppsLink-title" data-i18n="store">Mobhar Store · متجر مُبهر</span>
          <span class="siteAppsLink-sub" data-i18n-sub="store">Electronics &amp; gadgets</span>
        </span>
      </a>
      <a class="siteAppsLink siteAppsLink--games" href="https://dgr-exp.netlify.app/" target="_blank" rel="noopener noreferrer" data-app-id="games">
        <span class="siteAppsLink-icon">{SVG_APP_GAME}</span>
        <span class="siteAppsLink-text">
          <span class="siteAppsLink-title" data-i18n="games">Memory Games</span>
          <span class="siteAppsLink-sub" data-i18n-sub="games">Roster games hub</span>
        </span>
      </a>
    </div>
    <div class="siteAppsCloseWrap">
      <button type="button" class="roster-cta-btn roster-cta-btn--muted siteAppsCloseBtn" id="siteAppsCloseBtn">
        <span class="roster-cta-label">Close</span>
      </button>
    </div>
  </div>
</div>
"""

# ═══════════════════════════════════════════════════════════════════════
# SHIFT COPY — bottom button + modal to copy on-duty names as WhatsApp text
# ═══════════════════════════════════════════════════════════════════════
SVG_COPY_SHIFT = (
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" '
    'stroke="#5b21b6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    '<rect x="8" y="8" width="12" height="12" rx="2"/>'
    '<path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>'
    '<path d="M11.5 13h5M11.5 16h3"/></svg>'
)
SVG_ALUMNI = (
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" '
    'stroke="#0f766e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>'
    '<circle cx="9" cy="7" r="4"/>'
    '<path d="M22 21v-2a4 4 0 0 0-3-3.87"/>'
    '<path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
)


def _shift_opt_svg(paths: str, stroke: str) -> str:
    return (
        f'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="{stroke}" '
        f'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{paths}</svg>'
    )


_SVG_OPT_MORNING = _shift_opt_svg(
    '<circle cx="12" cy="12" r="4"/>'
    '<path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41"/>'
    '<path d="M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',
    "#f59e0b",
)
_SVG_OPT_AFTERNOON = _shift_opt_svg(
    '<path d="M17 18H8a5 5 0 1 1 2-9.5"/><circle cx="17" cy="8" r="3"/>',
    "#f97316",
)
_SVG_OPT_NIGHT = _shift_opt_svg(
    '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    "#8b5cf6",
)
_SVG_OPT_ANNUAL = _shift_opt_svg(
    '<path d="M12 3v3M5.6 8.6 3.5 6.5M18.4 8.6l2.1-2.1"/>'
    '<path d="M3 13a9 9 0 0 1 18 0z"/>'
    '<path d="M12 13v8M9 21h6"/>',
    "#dc2626",
)
_SVG_OPT_TRAINING = _shift_opt_svg(
    '<path d="M22 10 12 5 2 10l10 5 10-5z"/>'
    '<path d="M6 12v5c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-5"/>',
    "#7c3aed",
)

# Small per-shift action icons (Copy + Share).
_SVG_ACT_COPY = (
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" '
    'stroke="#334155" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    '<rect x="8" y="8" width="12" height="12" rx="2"/>'
    '<path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>'
)
_SVG_ACT_SHARE = (
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" '
    'stroke="#166534" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>'
    '<path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>'
)

_SHIFT_OPT_ICONS = {
    "Morning": ("shiftCopyOpt--morning", _SVG_OPT_MORNING),
    "Afternoon": ("shiftCopyOpt--afternoon", _SVG_OPT_AFTERNOON),
    "Night": ("shiftCopyOpt--night", _SVG_OPT_NIGHT),
    "Annual Leave": ("shiftCopyOpt--annual", _SVG_OPT_ANNUAL),
    "Training": ("shiftCopyOpt--training", _SVG_OPT_TRAINING),
}

_SHIFT_OPT_LABELS = {
    "Morning": "Morning",
    "Afternoon": "Afternoon",
    "Night": "Night",
    "Annual Leave": "Annual Leave",
    "Training": "Training",
}


def _shift_copy_option(shift_key: str) -> str:
    cls, icon = _SHIFT_OPT_ICONS[shift_key]
    label = _SHIFT_OPT_LABELS[shift_key]
    return (
        f'      <div class="shiftCopyOpt {cls}" data-shift="{shift_key}">\n'
        f'        <span class="shiftCopyOpt-icon">{icon}</span>\n'
        f'        <span class="shiftCopyOpt-main">\n'
        f'          <span class="shiftCopyOpt-label">{label}</span>\n'
        f'          <span class="shiftCopyOpt-count" data-shift-count="{shift_key}">0</span>\n'
        f"        </span>\n"
        f'        <span class="shiftCopyOpt-actions">\n'
        f'          <button type="button" class="shiftCopyAct shiftCopyAct--copy" data-act="copy" data-shift="{shift_key}" title="Copy" aria-label="Copy">{_SVG_ACT_COPY}</button>\n'
        f'          <button type="button" class="shiftCopyAct shiftCopyAct--share" data-act="share" data-shift="{shift_key}" title="Share" aria-label="Share">{_SVG_ACT_SHARE}</button>\n'
        f"        </span>\n"
        f"      </div>\n"
    )


def secondary_bar_html(
    *,
    include_copy: bool = True,
    include_alumni: bool = True,
    alumni_href: str = "#",
) -> str:
    """Bottom row: Copy Shift + Former Colleagues side-by-side when both exist."""
    parts: list[str] = []
    if include_copy:
        parts.append(
            '  <button type="button" class="roster-cta-btn roster-cta-btn--texture copyShiftBtn" id="copyShiftBtn">\n'
            f'    <span class="roster-cta-icon">{SVG_COPY_SHIFT}</span>\n'
            '    <span class="roster-cta-label" id="copyShiftLabel">Copy Shift</span>\n'
            "  </button>\n"
        )
    if include_alumni:
        parts.append(
            f'  <a class="roster-cta-btn roster-cta-btn--alumni" id="alumniBtn" href="{alumni_href}">\n'
            f'    <span class="roster-cta-icon">{SVG_ALUMNI}</span>\n'
            '    <span class="roster-cta-label">Former Colleagues</span>\n'
            "  </a>\n"
        )
    if not parts:
        return ""
    return (
        '<nav class="quickActions secondaryBar" aria-label="More actions">\n'
        + "".join(parts)
        + "</nav>\n"
    )


SHIFT_COPY_BUTTON_HTML = secondary_bar_html(
    include_copy=True,
    include_alumni=True,
    alumni_href="alumni/",
)

SHIFT_COPY_MODAL_HTML = (
    '<div id="shiftCopySheet" class="shiftCopySheet" aria-hidden="true">\n'
    '  <div class="shiftCopyCard" role="dialog" aria-labelledby="shiftCopyTitle">\n'
    '    <h2 class="shiftCopyTitle" id="shiftCopyTitle">On-duty list</h2>\n'
    '    <p class="shiftCopyHint" id="shiftCopyHint">Copy or share a shift as WhatsApp text</p>\n'
    '    <div class="shiftCopyGrid">\n'
    + _shift_copy_option("Morning")
    + _shift_copy_option("Afternoon")
    + _shift_copy_option("Night")
    + _shift_copy_option("Annual Leave")
    + _shift_copy_option("Training")
    + "    </div>\n"
    '    <p class="shiftCopyStatus" id="shiftCopyStatus" aria-live="polite"></p>\n'
    '    <div class="shiftCopyCloseWrap">\n'
    '      <button type="button" class="roster-cta-btn roster-cta-btn--muted shiftCopyCloseBtn" id="shiftCopyCloseBtn">\n'
    '        <span class="roster-cta-label" id="shiftCopyCloseLabel">Close</span>\n'
    "      </button>\n"
    "    </div>\n"
    "  </div>\n"
    "</div>\n"
)

# Plain-CSS (single braces). Interpolated into the page <style> f-string.
SHIFT_COPY_CSS = """    /* ═══════ SHIFT COPY (bottom button + modal) ═══════ */
    .shiftCopySheet {
      position: fixed; inset: 0; display: none; align-items: center; justify-content: center;
      background: rgba(15,23,42,.45); z-index: 10003; padding: 16px;
      pointer-events: none; visibility: hidden;
    }
    .shiftCopySheet.open { display: flex; pointer-events: auto; visibility: visible; }
    .shiftCopyCard {
      width: min(100%, 380px); background: #fff; border-radius: 18px; padding: 18px 16px 14px;
      border: 1px solid rgba(15,23,42,.1); box-shadow: 0 20px 48px rgba(15,23,42,.22);
      text-align: center;
    }
    .shiftCopyTitle { font-size: 17px; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
    .shiftCopyHint { font-size: 12px; color: #64748b; margin: 0 0 14px; line-height: 1.4; }
    .shiftCopyGrid { display: grid; grid-template-columns: 1fr; gap: 10px; margin-bottom: 6px; }
    .shiftCopyOpt {
      display: flex; align-items: center; gap: 12px;
      min-height: 52px; padding: 8px 10px 8px 14px; border-radius: 14px;
      border: 1.5px solid #e2e8f0; background: #f8fafc;
      font: inherit; text-align: start; -webkit-tap-highlight-color: transparent;
    }
    .shiftCopyOpt-icon {
      display: inline-flex; align-items: center; justify-content: center;
      width: 40px; height: 40px; border-radius: 12px; background: #fff;
      border: 1px solid #e2e8f0; flex-shrink: 0;
    }
    .shiftCopyOpt-main {
      flex: 1; display: flex; align-items: center; gap: 8px; min-width: 0;
    }
    .shiftCopyOpt-label { font-size: 14px; font-weight: 800; color: #1e293b; }
    .shiftCopyOpt-count {
      min-width: 26px; padding: 2px 8px; border-radius: 999px;
      font-size: 12px; font-weight: 800; color: #475569;
      background: #eef2f7; border: 1px solid #e2e8f0; text-align: center;
    }
    .shiftCopyOpt-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
    .shiftCopyAct {
      display: inline-flex; align-items: center; justify-content: center;
      width: 40px; height: 40px; border-radius: 12px; cursor: pointer;
      border: 1.5px solid #e2e8f0; background: #fff; font: inherit;
      -webkit-tap-highlight-color: transparent;
      transition: transform .15s ease, box-shadow .15s ease, background .15s ease;
    }
    .shiftCopyAct:active { transform: scale(.94); }
    .shiftCopyAct svg { display: block; }
    .shiftCopyAct--share { background: #ecfdf5; border-color: #86efac; }
    .shiftCopyOpt.is-empty { opacity: .5; }
    .shiftCopyOpt.is-empty .shiftCopyAct { pointer-events: none; }
    .shiftCopyOpt--morning { border-color: #fcd34d; background: #fffbeb; }
    .shiftCopyOpt--morning .shiftCopyOpt-icon { background: #fef9c3; border-color: #fde68a; }
    .shiftCopyOpt--afternoon { border-color: #fdba74; background: #fff7ed; }
    .shiftCopyOpt--afternoon .shiftCopyOpt-icon { background: #ffedd5; border-color: #fed7aa; }
    .shiftCopyOpt--night { border-color: #c4b5fd; background: #f5f3ff; }
    .shiftCopyOpt--night .shiftCopyOpt-icon { background: #ede9fe; border-color: #ddd6fe; }
    .shiftCopyOpt--annual { border-color: #fca5a5; background: #fef2f2; }
    .shiftCopyOpt--annual .shiftCopyOpt-icon { background: #fee2e2; border-color: #fecaca; }
    .shiftCopyOpt--training { border-color: #d8b4fe; background: #faf5ff; }
    .shiftCopyOpt--training .shiftCopyOpt-icon { background: #f3e8ff; border-color: #e9d5ff; }
    .shiftCopyStatus {
      min-height: 18px; margin: 10px 0 12px; font-size: 12.5px; font-weight: 700;
      line-height: 1.4; color: #64748b;
    }
    .shiftCopyStatus.is-ok { color: #166534; }
    .shiftCopyStatus.is-err { color: #b91c1c; }
    .shiftCopyCloseWrap { margin-top: 2px; }
    .shiftCopyCloseWrap .roster-cta-btn { width: 100%; }
    body.ar .shiftCopyOpt { text-align: start; }
    @media (hover: hover) {
      .shiftCopyAct--copy:hover { background: #f1f5f9; box-shadow: 0 4px 12px rgba(15,23,42,.08); }
      .shiftCopyAct--share:hover { background: #d1fae5; box-shadow: 0 4px 12px rgba(15,23,42,.08); }
    }
"""

ROSTER_ICONS_SCRIPT = "addScript(root + '/roster-icons.js?v=' + ver);"
SITE_APPS_SCRIPT = "  addScript(root + '/site-apps.js?v=' + ver);"


def _btn(
    tag: str,
    classes: str,
    el_id: str,
    label: str,
    icon: str,
    extra: str = "",
) -> str:
    body = (
        f'    <span class="roster-cta-icon">{icon}</span>\n'
        f'    <span class="roster-cta-label">{label}</span>\n'
    )
    if tag == "a":
        return f'  <a class="roster-cta-btn {classes}" id="{el_id}"{extra}>\n{body}  </a>\n'
    return (
        f'  <button type="button" class="roster-cta-btn {classes}" id="{el_id}"{extra}>\n'
        f"{body}  </button>\n"
    )


def export_cta_html(
    cta_href: str = "#",
) -> str:
    return (
        '<nav class="quickActions roster-cta" aria-label="Page actions">\n'
        + _btn("a", "roster-cta-btn--roster", "ctaBtn", "Full Roster", SVG_CLIPBOARD, f' href="{cta_href}"')
        + _btn(
            "button",
            "roster-cta-btn--share shareSiteBtn",
            "shareSiteBtn",
            "Share Site",
            SVG_SHARE_OUT,
        )
        + _btn(
            "button",
            "roster-cta-btn--apps moreAppsBtn",
            "moreAppsBtn",
            "Apps",
            SVG_APPS_BTN,
        )
        + "</nav>\n"
    )


def import_summary_bar_html(total_emp: int) -> str:
    """Mirror export duty-page summary chips (Employees → My Schedule → cross-link → Welcome → Training → Diff)."""
    return f"""
  <div class="summaryBar">
    <div class="summaryChip" id="summarySwitchChip">
      <div class="chipVal" id="summarySwitchVal">{total_emp}</div>
      <div class="chipLabel" id="summarySwitchLabel" data-key="employees">Employees</div>
    </div>
    <a href="{{{{BASE}}}}/my-schedules/index.html" id="myScheduleBtn" class="summaryChip" style="text-decoration:none;">
      {CHIP_SCHEDULE_HTML}
      <div class="chipLabel" data-key="mySchedule">My Schedule</div>
    </a>
    <a href="#" id="exportBtn" class="summaryChip exportChip" style="text-decoration:none;" onclick="goToExport(event)">
      {CHIP_EXPORT_HTML}
      <div class="chipLabel" data-key="exportRoster">Export</div>
    </a>
    <a href="{{{{BASE}}}}/my-schedules/index.html" id="welcomeChip" class="summaryChip welcomeChip" title="Go to your schedule" style="text-decoration:none;">
      {CHIP_WAVE_HTML}
      <div class="chipLabel" id="welcomeName"></div>
    </a>
    <a href="{{{{BASE}}}}/training/" id="trainingBtn" class="summaryChip trainingChip" style="text-decoration:none;">
      {CHIP_TRAINING_HTML}
      <div class="chipLabel" data-key="trainingPage">Training</div>
    </a>
    <a href="{{{{BASE}}}}/roster-diff/index.html" id="diffChipBtn" class="summaryChip diffChip" style="text-decoration:none;">
      {CHIP_DIFF_HTML}
      <div class="chipLabel" data-key="diffPage">Diff</div>
    </a>
  </div>
"""


def import_cta_html(
    cta_href: str = "{BASE}/now/",
) -> str:
    """Identical markup/grid classes as export duty pages (3 top + 2 bottom layout)."""
    return export_cta_html(
        cta_href=cta_href,
    )


IMPORT_BOTTOM_CTA_CSS = """    .importBottom {
      margin-top: auto;
      padding-top: 14px;
      position: relative;
      z-index: 25;
    }
    .importBottom .quickActions.roster-cta {
      margin-bottom: 6px;
      margin-top: 14px;
    }
"""

IMPORT_BOTTOM_FLEX_OLD = """    .importBottom .quickActions {
      margin-bottom: 6px;
      display: flex;
      justify-content: center;
      gap: 10px;
      flex-wrap: wrap;
    }"""


APPLY_LANG_NEW = """  function setCtaLabel(id, text) {
    var el = document.getElementById(id);
    if (!el) return;
    var lbl = el.querySelector('.roster-cta-label');
    if (lbl) lbl.textContent = text;
    else el.textContent = text;
  }
  setCtaLabel('ctaBtn', t.viewFull);
  setCtaLabel('compareBtn', t.compare);
  setCtaLabel('shareSiteBtn', t.shareSite);
  setCtaLabel('moreAppsBtn', t.moreApps);
  if(window.rosterSiteApps && window.rosterSiteApps.setLang) window.rosterSiteApps.setLang();"""

APPLY_LANG_BAD_LINE = re.compile(
    r"\s*var c3=document\.getElementById\('compareBtn'\); if\(c3\) c3\.textContent=t\.compare;\s*\n",
)

CHIP_IMG_FLIGHT_RE = re.compile(
    r'<div class="chipVal">(?:<span class="chipIconSvg chipIconSvg--flight"[^>]*>.*?</span>'
    r'|<img[^>]*(?:flightSwitchIcon|data-roster-icon="flight")[^>]*/>)</div>',
    re.DOTALL | re.IGNORECASE,
)
CHIP_IMG_DIFF_RE = re.compile(
    r'<div class="chipVal">(?:<span class="chipIconSvg chipIconSvg--diff"[^>]*>.*?</span>'
    r'|<img[^>]*(?:diffIcon|diffChipIcon|data-roster-icon="diff")[^>]*/>)</div>',
    re.DOTALL | re.IGNORECASE,
)

REMOVE_ICON_JS_RE = re.compile(
    r"function setDiffChipIcon\(\)[^}]+\}\s*"
    r"setLocalCtaLinks\(\);\s*setDiffChipIcon\(\);\s*",
    re.DOTALL,
)
REMOVE_ICON_JS_RE2 = re.compile(
    r"\(function bindFlightSwitchIcons\(\)\s*\{.*?\}\)\(\);\s*",
    re.DOTALL,
)

I18N_VIEWFULL_EN = "viewFull:'Full Roster'"
I18N_VIEWFULL_AR = "viewFull:'الجدول الكامل'"
I18N_SUB_EN = "subscribe:'Subscribe'"
I18N_SUB_AR = "subscribe:'اشتراك'"
I18N_CMP_EN = "compare:'Compare'"
I18N_CMP_AR = "compare:'مقارنة'"
I18N_SHARE_EN = "shareSite:'Share Site'"
I18N_SHARE_AR = "shareSite:'مشاركة الموقع'"
I18N_APPS_EN = "moreApps:'Apps'"
I18N_APPS_AR = "moreApps:'تطبيقات'"

# ── iOS performance: defer heavy scripts, no duplicate ios-tap-fix ──
IOS_PERF_VER = "20260719c"

LOAD_LOCAL_ENHANCEMENTS_EXPORT = """
(function loadLocalEnhancements() {
  var root = getSiteRootUrl();
  var ver = '""" + IOS_PERF_VER + """';
  function addScript(src) {
    if (document.querySelector('script[data-local-src="' + src + '"]')) return;
    var s = document.createElement('script');
    s.src = src;
    s.defer = true;
    s.setAttribute('data-local-src', src);
    document.body.appendChild(s);
  }
  addScript(root + '/roster-icons.js?v=' + ver);
  addScript(root + '/site-last-updated.js?v=' + ver);
  addScript(root + '/site-visits.js?v=' + ver);
  function loadSecondary() {
    addScript(root + '/site-share.js?v=' + ver);
    addScript(root + '/site-apps.js?v=' + ver);
    addScript(root + '/shift-copy.js?v=' + ver);
    addScript(root + '/wc-vote-promo.js?v=' + ver);
    addScript(root + '/install-pwa.js?v=' + ver);
    addScript(root + '/bg-texture-shuffle.js?v=' + ver);
    addScript(root + '/change-alert.js?v=' + ver);
    addScript(root + '/shift-swap.js?v=' + ver);
    addScript(root + '/banner-changer.js?v=' + ver);
  }
  if (window.requestIdleCallback) {
    requestIdleCallback(loadSecondary, { timeout: 3000 });
  } else {
    window.addEventListener('load', function() { setTimeout(loadSecondary, 120); }, { once: true });
  }
})();"""

LOAD_LOCAL_ENHANCEMENTS_IMPORT = """
(function loadLocalEnhancements() {
  var root = getSiteRootUrl();
  var ver = '""" + IOS_PERF_VER + """';
  function addScript(src) {
    if (document.querySelector('script[data-local-src="' + src + '"]')) return;
    var s = document.createElement('script');
    s.src = src;
    s.defer = true;
    s.setAttribute('data-local-src', src);
    document.body.appendChild(s);
  }
  addScript(root + '/site-last-updated.js?v=' + ver);
  addScript(root + '/site-visits.js?v=' + ver);
  function loadSecondary() {
    addScript(root + '/roster-icons.js?v=' + ver);
    addScript(root + '/site-share.js?v=' + ver);
    addScript(root + '/site-apps.js?v=' + ver);
    addScript(root + '/wc-vote-promo.js?v=' + ver);
    addScript(root + '/install-pwa.js?v=' + ver);
    addScript(root + '/change-alert.js?v=' + ver);
    addScript(root + '/banner-changer.js?v=' + ver);
  }
  if (window.requestIdleCallback) {
    requestIdleCallback(loadSecondary, { timeout: 3000 });
  } else {
    window.addEventListener('load', function() { setTimeout(loadSecondary, 120); }, { once: true });
  }
})();"""

EID_LOAD_BLOCK_RE = re.compile(
    r"\s*var EID_START = '[^']+';\s*"
    r"var EID_END = '[^']+';\s*"
    r"function muscatTodayIso\(\) \{[\s\S]*?"
    r"function loadEidOverlayScript\(\) \{[\s\S]*?\}\s*"
    r"(?:loadEidOverlayScript\(\);\s*)?",
    re.MULTILINE,
)

EID_CALL_RE = re.compile(r"\s*loadEidOverlayScript\(\);\s*", re.MULTILINE)

OLD_EID_LOAD_RE = re.compile(
    r"var eidDays = \[[^\]]+\];\s*"
    r"var m = \(location\.pathname[^\n]+\n\s*var activeIso[^\n]+\n\s*"
    r"if \(eidDays\.indexOf\(activeIso\) !== -1\) \{\s*"
    r"addScript\(root \+ '/eid-overlayxx\.js(?:\?v=[^']*)?'\);\s*\}",
    re.MULTILINE,
)

OLD_EID_TODAY_ONLY_RE = re.compile(
    r"function muscatTodayIso\(\) \{[\s\S]*?function isEidOverlayDay\(\) \{[\s\S]*?\}[\s\S]*?"
    r"if \(isEidOverlayDay\(\)\) \{[\s\S]*?addScript\(root \+ '/eid-overlayxx\.js[^']*'\);[\s\S]*?\}",
    re.MULTILINE,
)

LOAD_ENHANCE_BLOCK_RE = re.compile(
    r"\(function loadLocalEnhancements\(\) \{[\s\S]*?\}\)\(\);",
)

PERF_RENDER_CSS = """    .deptCard {
      content-visibility: auto;
      contain-intrinsic-size: auto 180px;
    }
"""

SHIFT_RANGE_CSS = """    .empStatus .shiftRange {
      font-size: 0.88em;
      opacity: 0.95;
      white-space: nowrap;
    }
    .empStatus .shiftRangeLabel {
      font-size: 0.78em;
      opacity: 0.85;
      font-weight: 600;
    }
"""
