"""Canonical homepage date banner: large day + weekday/month split.

This must live in the generators, not as a post-patch on docs/*.html.
"""

from __future__ import annotations

SPLIT_MARKERS = ("homeDateSplit", "dateTagDay", "dateTagWeek", "dateTagMonth")

DATE_FONT_LINKS = """  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700;800&family=IBM+Plex+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">"""

DATE_FONT_VARS = """      --date-font-en: 'IBM Plex Sans', system-ui, -apple-system, sans-serif;
      --date-font-ar: 'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, sans-serif;"""

# Single-brace CSS: interpolate into generator f-strings as {DATE_SPLIT_CSS}.
DATE_SPLIT_CSS = r"""
    /* Date — with-me split layout */
    .header.homeDateSplit {
      display:grid;
      grid-template-columns:28px minmax(0,1fr) 28px;
      grid-template-rows:auto auto;
      align-items:center;
      direction:ltr;
      padding:26px 18px 12px;
      min-height:0;
    }
    .header.homeDateSplit .bannerTitle,
    .header.homeDateSplit > h1 {
      grid-column:1 / -1;
      grid-row:1;
    }
    .header.homeDateSplit #banner-changer-btn {
      grid-column:1;
      grid-row:2;
      position:relative !important;
      inset:auto !important;
      bottom:auto !important;
      top:auto !important;
      left:auto !important;
      right:auto !important;
      justify-self:center;
      align-self:center;
      transform:none !important;
      z-index:31;
    }
    .header.homeDateSplit .langToggle,
    .header.homeDateSplit #langToggle {
      grid-column:3;
      grid-row:2;
      position:relative !important;
      inset:auto !important;
      bottom:auto !important;
      top:auto !important;
      left:auto !important;
      right:auto !important;
      justify-self:center;
      align-self:center;
      transform:none !important;
      z-index:31;
    }
    .header.homeDateSplit .langToggle:hover,
    .header.homeDateSplit #banner-changer-btn:hover {
      transform:scale(1.08) !important;
    }
    body.ar .header.homeDateSplit .langToggle,
    body.ar .header.homeDateSplit #langToggle {
      grid-column:3;
      right:auto !important;
      left:auto !important;
    }
    body.ar .header.homeDateSplit #banner-changer-btn {
      grid-column:1;
      left:auto !important;
      right:auto !important;
    }
    .header.homeDateSplit .langToggle,
    .header.homeDateSplit #langToggle,
    .header.homeDateSplit #banner-changer-btn {
      padding:2px;
      min-width:0;
      min-height:0;
      width:auto;
      height:auto;
    }
    .header.homeDateSplit .langToggle-icon svg,
    .header.homeDateSplit #banner-changer-btn .banner-changer-icon svg {
      width:13px;
      height:13px;
    }
    .header.homeDateSplit .langToggle-label { font-size:8px; }
    .header.homeDateSplit .datePickerWrapper {
      grid-column:2;
      grid-row:2;
      position:relative;
      display:block;
      width:100%;
      max-width:100%;
      margin-top:0;
      z-index:20;
      min-height:56px;
      touch-action:manipulation;
      -webkit-tap-highlight-color:transparent;
    }
    .header.homeDateSplit .dateTag {
      display:flex;
      align-items:center;
      justify-content:center;
      min-height:56px;
      padding:0;
      border:none;
      border-radius:0;
      background:transparent;
      color:#fff;
      cursor:pointer;
      user-select:none;
      -webkit-user-select:none;
      text-align:center;
      line-height:1;
      position:relative;
      z-index:3;
      pointer-events:auto;
      -webkit-tap-highlight-color:transparent;
    }
    .header.homeDateSplit .dateTagMain {
      position:relative;
      display:flex;
      align-items:center;
      justify-content:center;
      gap:min(2.4vw, 12px);
      pointer-events:none;
      padding-bottom:0;
      direction:ltr;
      width:max-content;
      max-width:100%;
      margin-inline:auto;
    }
    body.ar .header.homeDateSplit .dateTagMain,
    html[lang="ar"] .header.homeDateSplit .dateTagMain {
      direction:rtl;
    }
    .header.homeDateSplit .dateTagDay,
    .header.homeDateSplit .dateTagWeek,
    .header.homeDateSplit .dateTagMonth {
      font-family: var(--date-font-en);
      color:rgba(255,255,255,.72);
      text-shadow:0 1px 2px rgba(0,0,0,.55),0 0 1px rgba(255,255,255,.45);
      -webkit-text-stroke:0.15px rgba(0,0,0,.28);
      paint-order:stroke fill;
    }
    body.ar .header.homeDateSplit .dateTagDay,
    body.ar .header.homeDateSplit .dateTagWeek,
    body.ar .header.homeDateSplit .dateTagMonth,
    html[lang="ar"] .header.homeDateSplit .dateTagDay,
    html[lang="ar"] .header.homeDateSplit .dateTagWeek,
    html[lang="ar"] .header.homeDateSplit .dateTagMonth {
      font-family: var(--date-font-ar);
    }
    .header.homeDateSplit .dateTagSide {
      display:flex;
      flex-direction:column;
      align-items:flex-start;
      justify-content:center;
      gap:3px;
      line-height:1;
      padding-inline-start:min(1.8vw, 10px);
      border-inline-start:1px solid rgba(255,255,255,.35);
      flex:0 0 auto;
      direction:ltr;
      unicode-bidi:isolate;
      min-width:0;
      width:max-content;
      max-width:none;
    }
    body.ar .header.homeDateSplit .dateTagSide,
    html[lang="ar"] .header.homeDateSplit .dateTagSide {
      align-items:flex-end;
      padding-inline-start:0;
      padding-inline-end:min(1.8vw, 10px);
      border-inline-start:none;
      border-inline-end:1px solid rgba(255,255,255,.35);
    }
    .header.homeDateSplit .dateTagWeek {
      display:block;
      font-size:clamp(13px, 3.8vw, 17px);
      font-weight:700;
      letter-spacing:-.01em;
      line-height:1.05;
      text-align:left;
      white-space:nowrap;
      width:100%;
      overflow:visible;
      pointer-events:none;
    }
    body.ar .header.homeDateSplit .dateTagWeek {
      letter-spacing:0;
      text-align:right;
    }
    .header.homeDateSplit .dateTagDay {
      display:block;
      font-size:clamp(56px, 18vw, 88px);
      font-weight:800;
      letter-spacing:-.04em;
      line-height:.9;
      font-variant-numeric:tabular-nums;
      flex:0 0 auto;
      pointer-events:none;
    }
    body.ar .header.homeDateSplit .dateTagDay { letter-spacing:0; }
    .header.homeDateSplit .dateTagMonthWrap {
      display:block;
      line-height:1;
      text-align:left;
      width:100%;
    }
    body.ar .header.homeDateSplit .dateTagMonthWrap,
    html[lang="ar"] .header.homeDateSplit .dateTagMonthWrap {
      text-align:right;
    }
    .header.homeDateSplit .dateTagMonth {
      display:block;
      font-size:clamp(22px, 7vw, 36px);
      font-weight:700;
      letter-spacing:-.02em;
      line-height:1;
      text-transform:none;
      text-align:left;
      white-space:nowrap;
      max-width:100%;
      overflow:visible;
      pointer-events:none;
    }
    body.ar .header.homeDateSplit .dateTagMonth {
      letter-spacing:0;
      text-align:right;
    }
    .header.homeDateSplit .datePickerWrapper #datePicker {
      position:absolute;
      inset:0;
      width:100%;
      height:100%;
      min-height:56px;
      margin:0;
      padding:0;
      opacity:0;
      cursor:pointer;
      font-size:16px;
      border:none;
      z-index:5;
      pointer-events:auto;
      color:transparent;
      background:transparent;
      touch-action:manipulation;
    }
    .header.homeDateSplit .datePickerWrapper #datePicker.datePicker-center-open {
      position:fixed;
      left:50%;
      top:max(18vh, calc(env(safe-area-inset-top, 0px) + 72px));
      right:auto;
      bottom:auto;
      width:1px;
      height:1px;
      min-height:0;
      transform:translate(-50%, -50%);
      z-index:10000;
    }
"""


def assert_split_date_banner(html: str, where: str = "generated HTML") -> None:
    missing = [m for m in SPLIT_MARKERS if m not in html]
    if missing:
        raise RuntimeError(f"Split date banner missing from {where}: {missing}")
    if 'id="dateTagLabel"' in html and 'id="dateTagDay"' not in html:
        raise RuntimeError(f"Old chip date label returned in {where}")
