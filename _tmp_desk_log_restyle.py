# -*- coding: utf-8 -*-
from pathlib import Path

p = Path("docs/desk-log/index.html")
t = p.read_text(encoding="utf-8")

NEW_CSS = r"""
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    :root {
      --safe-top: env(safe-area-inset-top, 0px);
      --safe-bottom: env(safe-area-inset-bottom, 0px);
      --bg: #08090a;
      --bg-elev: #0f1012;
      --bg-panel: #13151a;
      --bg-soft: #181a20;
      --border: rgba(255,255,255,.08);
      --border-strong: rgba(255,255,255,.12);
      --text: #ececee;
      --text-2: #a1a1aa;
      --text-3: #71717a;
      --accent: #5E6AD2;
      --accent-2: #7c86e0;
      --accent-soft: rgba(94,106,210,.16);
      --accent-glow: rgba(94,106,210,.28);
      --ok: #3dd68c;
      --warn: #f5a524;
      --danger: #f87171;
      --radius: 10px;
      --radius-lg: 12px;
      --side-w: 248px;
      --top-h: 56px;
      --shadow: 0 0 0 1px var(--border), 0 8px 30px rgba(0,0,0,.35);
      --font: Inter, "SF Pro Text", "Segoe UI", system-ui, -apple-system, sans-serif;
    }
    * { box-sizing: border-box; }
    html, body { height: 100%; }
    body {
      margin: 0;
      min-height: 100dvh;
      background:
        radial-gradient(1200px 600px at 85% -10%, rgba(94,106,210,.18), transparent 55%),
        radial-gradient(900px 500px at -10% 30%, rgba(56,189,248,.06), transparent 50%),
        var(--bg);
      color: var(--text);
      font-family: var(--font);
      font-size: 14px;
      line-height: 1.45;
      -webkit-font-smoothing: antialiased;
      letter-spacing: -0.011em;
    }
    button, input, textarea, select { font: inherit; }
    [hidden] { display: none !important; }

    /* —— Gate —— */
    .gate {
      min-height: 100dvh;
      display: grid;
      place-items: center;
      padding: calc(24px + var(--safe-top)) 20px calc(28px + var(--safe-bottom));
    }
    .gateCard {
      width: min(400px, 100%);
      background: linear-gradient(180deg, rgba(255,255,255,.03), transparent 40%), var(--bg-panel);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 32px 28px 26px;
      box-shadow: var(--shadow);
      text-align: center;
    }
    .gateBrand {
      width: 36px; height: 36px; margin: 0 auto 16px;
      border-radius: 10px;
      background: linear-gradient(135deg, var(--accent), #8b5cf6);
      display: grid; place-items: center;
      color: #fff; font-weight: 700; font-size: 15px;
      box-shadow: 0 8px 24px var(--accent-glow);
    }
    .gate h1 { font-size: 20px; margin: 0 0 6px; font-weight: 600; letter-spacing: -0.02em; }
    .gate p { margin: 0 0 22px; font-size: 13px; color: var(--text-2); font-weight: 450; }
    .gate input {
      width: 100%;
      border: 1px solid var(--border-strong);
      background: var(--bg);
      color: var(--text);
      border-radius: var(--radius);
      padding: 12px 14px;
      font-size: 16px;
      text-align: center;
      letter-spacing: .28em;
      outline: none;
      transition: border-color .15s ease, box-shadow .15s ease;
    }
    .gate input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-soft);
    }
    .gate button#pinBtn {
      margin-top: 12px;
      width: 100%;
      border: 0;
      border-radius: var(--radius);
      min-height: 42px;
      background: var(--accent);
      color: #fff;
      font-weight: 600;
      cursor: pointer;
      transition: background .15s ease, transform .12s ease;
    }
    .gate button#pinBtn:hover { background: var(--accent-2); }
    .gate button#pinBtn:active { transform: scale(.985); }
    .gateErr { min-height: 20px; margin-top: 10px; color: var(--danger); font-size: 13px; font-weight: 550; }
    .gate .homeOut {
      margin-top: 18px;
      display: inline-flex;
      min-width: 140px;
    }

    /* —— App shell —— */
    .app {
      min-height: 100dvh;
      display: grid;
      grid-template-columns: var(--side-w) minmax(0, 1fr);
      grid-template-rows: 100dvh;
    }
    .sidebar {
      position: sticky;
      top: 0;
      height: 100dvh;
      border-inline-end: 1px solid var(--border);
      background: rgba(10,11,13,.92);
      backdrop-filter: blur(12px);
      display: flex;
      flex-direction: column;
      padding: calc(14px + var(--safe-top)) 12px calc(14px + var(--safe-bottom));
      overflow: auto;
    }
    .sideBrand {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px 18px;
    }
    .sideBrandMark {
      width: 28px; height: 28px; border-radius: 8px;
      background: linear-gradient(135deg, var(--accent), #8b5cf6);
      display: grid; place-items: center;
      color: #fff; font-size: 12px; font-weight: 700;
      flex-shrink: 0;
    }
    .sideBrandText { min-width: 0; }
    .sideBrandText strong {
      display: block;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: -0.01em;
    }
    .sideBrandText span {
      display: block;
      font-size: 11px;
      color: var(--text-3);
      margin-top: 1px;
    }
    .sideGroupLabel {
      margin: 14px 10px 6px;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-3);
      letter-spacing: .04em;
      text-transform: uppercase;
    }
    .sideGroupLabel:first-of-type { margin-top: 4px; }
    #mainTabs {
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin: 0;
      padding: 0;
      background: transparent;
      border: 0;
    }
    #mainTabs .chip {
      width: 100%;
      justify-content: flex-start;
      gap: 10px;
      min-height: 36px;
      padding: 0 10px;
      border-radius: 8px;
      border: 0;
      background: transparent;
      color: var(--text-2);
      font-size: 13px;
      font-weight: 500;
      box-shadow: none;
      transition: background .14s ease, color .14s ease;
    }
    #mainTabs .chip:hover {
      background: rgba(255,255,255,.04);
      color: var(--text);
    }
    #mainTabs .chip.active {
      background: var(--accent-soft);
      color: #c7cbef;
      box-shadow: inset 0 0 0 1px rgba(94,106,210,.28);
    }
    #mainTabs .chip .navIco {
      width: 16px; height: 16px; opacity: .85; flex-shrink: 0;
    }
    .sideFoot {
      margin-top: auto;
      padding-top: 16px;
      display: grid;
      gap: 6px;
    }
    .sideFoot .homeOut,
    .sideFoot .tickerModOut,
    .sideFoot .lockOut {
      width: 100%;
      justify-content: flex-start;
      min-height: 34px;
      font-size: 12px;
      font-weight: 550;
    }

    .mainCol {
      min-width: 0;
      display: flex;
      flex-direction: column;
      height: 100dvh;
      overflow: hidden;
    }
    .topbar {
      height: var(--top-h);
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 0 24px;
      border-bottom: 1px solid var(--border);
      background: rgba(8,9,10,.72);
      backdrop-filter: blur(14px);
    }
    .crumbs {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      font-size: 13px;
      color: var(--text-3);
      font-weight: 500;
      white-space: nowrap;
    }
    .crumbs b { color: var(--text); font-weight: 600; }
    .crumbs sep { opacity: .45; }
    .searchWrap {
      margin-inline-start: auto;
      position: relative;
      width: min(320px, 42vw);
    }
    .searchWrap input {
      width: 100%;
      height: 34px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: var(--bg-soft);
      color: var(--text);
      padding: 0 12px 0 34px;
      outline: none;
      font-size: 13px;
      transition: border-color .15s ease, box-shadow .15s ease;
    }
    [dir="rtl"] .searchWrap input { padding: 0 34px 0 64px; }
    .searchWrap input:focus {
      border-color: rgba(94,106,210,.55);
      box-shadow: 0 0 0 3px var(--accent-soft);
    }
    .searchWrap .searchIco {
      position: absolute;
      top: 50%;
      inset-inline-start: 10px;
      transform: translateY(-50%);
      width: 15px; height: 15px;
      color: var(--text-3);
      pointer-events: none;
    }
    .kbdHint {
      position: absolute;
      top: 50%;
      inset-inline-end: 8px;
      transform: translateY(-50%);
      font-size: 11px;
      color: var(--text-3);
      border: 1px solid var(--border);
      border-radius: 5px;
      padding: 1px 6px;
      background: var(--bg);
      pointer-events: none;
      font-weight: 550;
    }
    .mobileNavBtn {
      display: none;
      border: 1px solid var(--border);
      background: var(--bg-soft);
      color: var(--text);
      border-radius: 8px;
      width: 34px; height: 34px;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
    }

    .content {
      flex: 1;
      overflow: auto;
      padding: 28px 28px calc(36px + var(--safe-bottom));
    }
    .pageHead {
      margin-bottom: 24px;
    }
    .pageHead h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
      letter-spacing: -0.03em;
    }
    .pageHead p {
      margin: 8px 0 0;
      font-size: 13px;
      color: var(--text-2);
      max-width: 56ch;
      line-height: 1.5;
      font-weight: 450;
    }

    /* shared controls */
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;
    }
    .chip {
      border: 1px solid var(--border);
      border-radius: 8px;
      min-height: 32px;
      padding: 0 12px;
      background: var(--bg-soft);
      color: var(--text-2);
      font-weight: 550;
      font-size: 12px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: background .14s ease, border-color .14s ease, color .14s ease;
      -webkit-tap-highlight-color: transparent;
      text-decoration: none;
    }
    .chip:hover { border-color: var(--border-strong); color: var(--text); }
    .chip.active {
      background: var(--accent-soft);
      border-color: rgba(94,106,210,.35);
      color: #d4d8f5;
    }
    .lockOut, .homeOut, .tickerModOut {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text-2);
      font-size: 12px;
      min-height: 34px;
      padding: 0 12px;
      border-radius: 8px;
      font-weight: 550;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: background .14s ease, border-color .14s ease, color .14s ease;
    }
    .homeOut:hover, .lockOut:hover, .tickerModOut:hover {
      background: rgba(255,255,255,.04);
      color: var(--text);
      border-color: var(--border-strong);
    }
    .homeOut { color: #c7cbef; border-color: rgba(94,106,210,.28); }
    .tickerModOut { color: #f0c48a; border-color: rgba(245,165,36,.28); }

    .stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 20px;
    }
    .stats.stats3 { grid-template-columns: repeat(3, 1fr); }
    .stats.stats4 { grid-template-columns: repeat(2, 1fr); }
    @media (min-width: 720px) {
      .stats.stats4 { grid-template-columns: repeat(4, 1fr); }
    }
    .stat {
      background: var(--bg-panel);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 16px;
      transition: border-color .15s ease;
    }
    .stat:hover { border-color: var(--border-strong); }
    .stat b {
      display: block;
      font-size: 26px;
      font-weight: 600;
      letter-spacing: -0.03em;
      color: var(--text);
      margin-bottom: 6px;
    }
    .stat span {
      font-size: 12px;
      color: var(--text-3);
      font-weight: 500;
    }

    .card, .statsPanel, .bannerUploadCard, .popupSection {
      background: var(--bg-panel);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 20px;
      margin-bottom: 20px;
    }
    .statsPanel { margin-bottom: 20px; }
    .statsPanelHead {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 8px;
    }
    .statsPanelHead h2, .listHead h2, .pageSectionTitle {
      margin: 0;
      font-size: 15px;
      font-weight: 600;
      letter-spacing: -0.015em;
      color: var(--text);
    }
    .countPill {
      font-size: 12px;
      font-weight: 600;
      color: #c7cbef;
      background: var(--accent-soft);
      border: 1px solid rgba(94,106,210,.25);
      border-radius: 999px;
      padding: 3px 10px;
      white-space: nowrap;
    }
    .statsPanelNote, .toolsIntro, .bannerAdminIntro, .bannerUploadHint, .popupSectionHint {
      margin: 0 0 14px;
      font-size: 12px;
      color: var(--text-3);
      font-weight: 450;
      line-height: 1.5;
    }
    .bannerUploadTitle, .popupSectionTitle {
      margin: 0 0 4px;
      font-size: 14px;
      font-weight: 600;
      color: var(--text);
    }
    .listHead {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin: 0 0 12px;
    }
    .list { display: grid; gap: 8px; }
    .row, .deviceTypeRow, .pageTypeRow {
      background: var(--bg-soft);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 12px 14px;
      transition: border-color .14s ease, background .14s ease;
    }
    .row:hover, .deviceTypeRow:hover, .pageTypeRow:hover {
      border-color: var(--border-strong);
      background: #1c1e26;
    }
    .rowName {
      font-size: 13px;
      font-weight: 600;
      color: var(--text);
      margin: 0 0 4px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .rowDevice {
      font-size: 11px;
      font-weight: 550;
      color: #c7cbef;
      background: var(--accent-soft);
      border: 1px solid rgba(94,106,210,.25);
      border-radius: 999px;
      padding: 2px 8px;
      line-height: 1.4;
    }
    .rowDevice.guest {
      color: #f0c48a;
      background: rgba(245,165,36,.12);
      border-color: rgba(245,165,36,.28);
    }
    .rowDevice.place {
      color: #86efac;
      background: rgba(61,214,140,.12);
      border-color: rgba(61,214,140,.28);
    }
    .rowMeta { font-size: 12px; color: var(--text-3); font-weight: 450; line-height: 1.45; }
    .rowPages {
      margin: 6px 0 0;
      font-size: 11px;
      font-weight: 500;
      color: #a5b4fc;
      line-height: 1.5;
      word-break: break-word;
    }
    .deviceTypeList, .pageTypeList { display: grid; gap: 8px; }
    .deviceTypeRow, .pageTypeRow {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 8px;
      align-items: start;
    }
    .deviceTypeName, .pageTypeName { font-size: 13px; font-weight: 600; color: var(--text); }
    .pageTypeName { color: #c7cbef; font-size: 12px; }
    .deviceTypeCount, .pageTypeCount { font-size: 14px; font-weight: 600; color: #c7cbef; }
    .barTrack {
      grid-column: 1 / -1;
      height: 4px;
      border-radius: 999px;
      background: rgba(255,255,255,.06);
      overflow: hidden;
      margin-top: 2px;
    }
    .barFill {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, var(--accent), #8b5cf6);
      min-width: 2px;
    }
    .deviceModelList {
      grid-column: 1 / -1;
      margin: 4px 0 0;
      padding: 0;
      list-style: none;
      display: grid;
      gap: 4px;
    }
    .deviceModelList li {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      font-size: 11px;
      font-weight: 500;
      color: var(--text-3);
    }
    .deviceModelList li b { color: var(--text-2); font-weight: 600; }
    .deviceStatsEmpty, .pageStatsEmpty, .empty, .error {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-3);
      text-align: center;
      padding: 28px 14px;
      border-radius: var(--radius-lg);
      border: 1px dashed var(--border);
    }
    .error {
      color: #fecaca;
      border-color: rgba(248,113,113,.35);
      background: rgba(127,29,29,.2);
    }

    .phoneRow {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .phoneRowMain { min-width: 0; flex: 1; }
    .phoneRow .rowName { margin-bottom: 6px; }
    .phoneDigits {
      display: inline-flex;
      align-items: center;
      direction: ltr;
      unicode-bidi: isolate;
      font-variant-numeric: tabular-nums;
      font-size: 14px;
      font-weight: 600;
      letter-spacing: .04em;
      color: var(--text);
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 8px 12px;
      margin: 0 0 6px;
    }
    .phoneActions { display: flex; flex-direction: column; gap: 8px; flex-shrink: 0; }
    .phoneAct {
      width: 40px; height: 40px;
      border: 0; border-radius: 10px;
      display: inline-flex; align-items: center; justify-content: center;
      cursor: pointer; text-decoration: none; color: #fff;
      transition: transform .12s ease, filter .12s ease;
    }
    .phoneAct:active { transform: scale(.96); }
    .phoneAct svg { width: 18px; height: 18px; display: block; }
    .phoneAct--call { background: linear-gradient(145deg, #22c55e, #15803d); }
    .phoneAct--copy { background: linear-gradient(145deg, var(--accent), #4338ca); }
    .phoneToast {
      position: fixed;
      left: 50%;
      bottom: calc(18px + var(--safe-bottom));
      transform: translateX(-50%) translateY(12px);
      background: var(--bg-panel);
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 10px 16px;
      font-size: 13px;
      font-weight: 600;
      opacity: 0;
      pointer-events: none;
      transition: opacity .18s ease, transform .18s ease;
      z-index: 40;
    }
    .phoneToast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

    .gapNote {
      margin: 0 0 14px;
      padding: 12px 14px;
      border-radius: var(--radius);
      background: rgba(245,165,36,.08);
      border: 1px solid rgba(245,165,36,.22);
      color: #f0c48a;
      font-size: 12px;
      font-weight: 500;
      line-height: 1.45;
    }
    .gapBadge {
      display: inline-flex;
      align-items: center;
      font-size: 10px;
      font-weight: 600;
      border-radius: 999px;
      padding: 2px 8px;
      border: 1px solid var(--border);
      color: var(--text-3);
      background: rgba(255,255,255,.03);
    }
    .gapBadge.phone { color: #fecaca; border-color: rgba(248,113,113,.35); background: rgba(127,29,29,.25); }
    .gapBadge.visit { color: #fde68a; border-color: rgba(245,165,36,.35); background: rgba(113,63,18,.25); }
    .gapBadge.both { color: #fda4af; border-color: rgba(244,63,94,.35); background: rgba(136,19,55,.25); }

    .toolsGrid { display: grid; gap: 10px; }
    .toolCard {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 10px 12px;
      align-items: center;
      background: var(--bg-panel);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 16px;
      text-decoration: none;
      color: inherit;
      transition: border-color .15s ease, transform .12s ease, background .15s ease;
    }
    .toolCard:hover {
      border-color: rgba(94,106,210,.4);
      background: #161821;
    }
    .toolCard:active { transform: scale(.995); }
    .toolTag {
      display: inline-flex;
      font-size: 10px;
      font-weight: 600;
      color: #c7cbef;
      background: var(--accent-soft);
      border: 1px solid rgba(94,106,210,.25);
      border-radius: 999px;
      padding: 2px 8px;
      margin-bottom: 6px;
    }
    .toolTitle { margin: 0; font-size: 14px; font-weight: 600; color: var(--text); }
    .toolDesc { margin: 5px 0 0; font-size: 12px; color: var(--text-3); line-height: 1.45; font-weight: 450; }
    .toolGo {
      flex-shrink: 0;
      min-width: 72px;
      min-height: 34px;
      border-radius: 8px;
      background: var(--accent);
      color: #fff;
      font-size: 12px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0 12px;
      pointer-events: none;
    }
    .sectionLabel {
      margin: 22px 0 10px;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-3);
      text-transform: uppercase;
      letter-spacing: .06em;
    }

    .bannerAdminToolbar, .bannerUploadActions, .popupFormActions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }
    .bannerUploadCard {
      border-style: dashed;
      border-color: rgba(94,106,210,.35);
      background: linear-gradient(180deg, rgba(94,106,210,.08), var(--bg-panel));
    }
    .bannerAddLabel {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 36px;
      padding: 0 14px;
      border-radius: 8px;
      background: var(--accent);
      color: #fff;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: 0;
    }
    .bannerAddLabel.secondary {
      background: var(--bg-soft);
      border: 1px solid var(--border);
      color: var(--text);
    }
    .bannerAddLabel input { display: none; }
    .bannerUploadPreview {
      display: none;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid var(--border);
      background: var(--bg);
      margin-top: 10px;
    }
    .bannerUploadPreview.show { display: block; }
    .bannerUploadPreview img {
      width: 100%; height: 110px; object-fit: cover; display: block;
    }
    .bannerUploadConfirm {
      border: 0; border-radius: 8px; min-height: 36px; padding: 0 16px;
      background: #16a34a; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer;
    }
    .bannerUploadConfirm:disabled { opacity: .55; cursor: not-allowed; }
    .bannerUploadCancel {
      border: 0; border-radius: 8px; min-height: 36px; padding: 0 14px;
      background: #27272a; color: var(--text); font-size: 12px; font-weight: 600; cursor: pointer;
    }
    .bannerAdminGrid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    @media (min-width: 720px) {
      .bannerAdminGrid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    }
    .bannerAdminCard {
      position: relative;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid var(--border);
      background: var(--bg);
    }
    .bannerAdminCard img {
      width: 100%; height: 88px; object-fit: cover; display: block; background: var(--bg-soft);
    }
    .bannerAdminMeta {
      padding: 8px 10px 10px;
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
    }
    .bannerAdminMeta b { font-size: 12px; color: var(--text); }
    .bannerAdminMeta span { font-size: 10px; color: var(--text-3); font-weight: 550; }
    .bannerDelBtn, .bannerRestoreBtn, .popupToggleBtn {
      border: 0; border-radius: 8px; min-height: 30px; padding: 0 10px;
      font-size: 11px; font-weight: 600; cursor: pointer;
    }
    .bannerDelBtn { background: #7f1d1d; color: #fecaca; }
    .bannerStatus {
      min-height: 20px; font-size: 12px; font-weight: 550; color: #c7cbef; margin-bottom: 8px;
    }
    .bannerStatus.err { color: #fca5a5; }

    .popupAdminForm { display: grid; gap: 14px; margin-bottom: 16px; }
    .popupSection { margin-bottom: 0; display: grid; gap: 10px; }
    .popupAdminForm label {
      display: grid; gap: 6px; font-size: 12px; font-weight: 550; color: var(--text-2);
    }
    .popupAdminForm input[type="text"],
    .popupAdminForm input[type="number"],
    .popupAdminForm input[type="url"],
    .popupAdminForm textarea,
    .popupAdminForm select {
      width: 100%;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: var(--bg);
      color: var(--text);
      font-size: 13px;
      font-weight: 500;
      padding: 10px 12px;
      outline: none;
      transition: border-color .15s ease, box-shadow .15s ease;
    }
    .popupAdminForm input:focus,
    .popupAdminForm textarea:focus {
      border-color: rgba(94,106,210,.55);
      box-shadow: 0 0 0 3px var(--accent-soft);
    }
    .popupAdminForm textarea { min-height: 78px; resize: vertical; }
    .popupAdminRow { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .popupModeRow {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }
    .popupModeRow label {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 12px; border-radius: 8px;
      border: 1px solid var(--border); background: var(--bg);
      color: var(--text); font-size: 12px; font-weight: 550; cursor: pointer;
      transition: border-color .14s ease, background .14s ease;
    }
    .popupModeRow label.on {
      border-color: rgba(94,106,210,.45);
      background: var(--accent-soft);
      color: #d4d8f5;
    }
    .popupModeRow input { accent-color: var(--accent); margin: 0; }
    .popupSlidesPreview {
      display: none;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
    }
    .popupSlidesPreview.show { display: grid; }
    .popupSlideThumb {
      position: relative; border-radius: 8px; overflow: hidden;
      border: 1px solid var(--border); background: var(--bg); aspect-ratio: 1;
    }
    .popupSlideThumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .popupSlideThumb button {
      position: absolute; top: 4px; inset-inline-end: 4px;
      width: 26px; height: 26px; border: 0; border-radius: 999px;
      background: rgba(127,29,29,.92); color: #fecaca;
      font-size: 14px; font-weight: 700; line-height: 1; cursor: pointer;
    }
    .popupSlideCount { font-size: 11px; font-weight: 550; color: var(--text-3); }
    .popupList { display: grid; gap: 10px; }
    .popupCard {
      border-radius: var(--radius-lg);
      border: 1px solid var(--border);
      background: var(--bg-panel);
      overflow: hidden;
    }
    .popupCard img {
      width: 100%; height: 120px; object-fit: cover; display: block; background: var(--bg-soft);
    }
    .popupCardBody { padding: 12px 14px 14px; display: grid; gap: 8px; }
    .popupCardBody b { font-size: 13px; color: var(--text); }
    .popupCardBody p { margin: 0; font-size: 12px; color: var(--text-3); line-height: 1.45; white-space: pre-wrap; }
    .popupMeta { display: flex; flex-wrap: wrap; gap: 6px; font-size: 10px; font-weight: 550; color: var(--text-3); }
    .popupMeta span {
      border: 1px solid var(--border); border-radius: 999px; padding: 2px 8px; background: rgba(255,255,255,.03);
    }
    .popupCardActions { display: flex; flex-wrap: wrap; gap: 8px; }
    .popupToggleBtn { background: var(--accent); color: #fff; }
    .popupToggleBtn.off { background: #27272a; color: var(--text-2); }

    .panelCard { margin-bottom: 0; }
    .is-search-hidden { display: none !important; }

    /* mobile */
    @media (max-width: 900px) {
      .app {
        grid-template-columns: 1fr;
        grid-template-rows: auto;
        min-height: 100dvh;
        height: auto;
      }
      .sidebar {
        position: fixed;
        inset: 0 auto 0 0;
        width: min(280px, 86vw);
        z-index: 50;
        transform: translateX(-105%);
        transition: transform .22s ease;
        box-shadow: 20px 0 60px rgba(0,0,0,.45);
      }
      [dir="rtl"] .sidebar {
        inset: 0 0 0 auto;
        transform: translateX(105%);
      }
      body.sideOpen .sidebar { transform: translateX(0); }
      body.sideOpen::before {
        content: "";
        position: fixed; inset: 0; background: rgba(0,0,0,.55); z-index: 45;
      }
      .mobileNavBtn { display: inline-flex; }
      .mainCol { height: auto; min-height: 100dvh; }
      .content { padding: 20px 16px calc(28px + var(--safe-bottom)); }
      .topbar { padding: 0 14px; gap: 10px; }
      .searchWrap { width: min(100%, 1fr); flex: 1; }
      .kbdHint { display: none; }
      .stats.stats3 { grid-template-columns: 1fr; }
      .toolCard { grid-template-columns: 1fr; }
      .toolGo { width: 100%; }
      .popupAdminRow, .popupModeRow { grid-template-columns: 1fr; }
      .popupSlidesPreview { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
  </style>
"""

NEW_BODY = r"""
  <div class="gate" id="gate">
    <div class="gateCard">
      <div class="gateBrand">R</div>
      <h1>دخول خاص</h1>
      <p>أدخل الرمز للمتابعة إلى لوحة الإعدادات</p>
      <input id="pinInput" type="password" inputmode="numeric" maxlength="12" autocomplete="off" autofocus>
      <div>
        <button type="button" id="pinBtn">دخول</button>
      </div>
      <div class="gateErr" id="gateErr"></div>
      <a class="homeOut" id="gateHomeOut" href="../index.html">الرئيسية</a>
    </div>
  </div>

  <div class="app" id="app" hidden>
    <aside class="sidebar" id="sidebar">
      <div class="sideBrand">
        <div class="sideBrandMark">R</div>
        <div class="sideBrandText">
          <strong>Roster Desk</strong>
          <span>Settings</span>
        </div>
      </div>

      <div class="sideGroupLabel">المراقبة</div>
      <nav class="toolbar mainTabs" id="mainTabs" aria-label="أقسام الإعدادات">
        <button type="button" class="chip active" data-view="visits" id="tabVisits">
          <svg class="navIco" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></svg>
          الزيارات
        </button>
        <button type="button" class="chip" data-view="devices" id="tabDevices">
          <svg class="navIco" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="6" y="3" width="12" height="18" rx="2"/><path d="M11 17h2"/></svg>
          الأجهزة
        </button>
        <button type="button" class="chip" data-view="pages" id="tabPages">
          <svg class="navIco" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 3h6l5 5v13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5"/></svg>
          الصفحات
        </button>

        <div class="sideGroupLabel">البيانات</div>
        <button type="button" class="chip" data-view="phones" id="tabPhones">
          <svg class="navIco" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 16.9v2a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h2a2 2 0 0 1 2 1.7c.1.8.3 1.6.6 2.3a2 2 0 0 1-.5 2.1L7.1 9.1a16 16 0 0 0 6 6l1.9-1.1a2 2 0 0 1 2.1-.4c.7.3 1.5.5 2.3.6a2 2 0 0 1 1.7 2z"/></svg>
          الهواتف
        </button>
        <button type="button" class="chip" data-view="gaps" id="tabGaps">
          <svg class="navIco" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><path d="M12 16h.01"/></svg>
          نواقص
        </button>

        <div class="sideGroupLabel">المحتوى</div>
        <button type="button" class="chip" data-view="banners" id="tabBanners">
          <svg class="navIco" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10.5" r="1.5"/><path d="M21 16l-5-5-4 4-2-2-5 5"/></svg>
          بنرات
        </button>
        <button type="button" class="chip" data-view="popups" id="tabPopups">
          <svg class="navIco" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7"/><path d="M10 19a2 2 0 0 0 4 0"/></svg>
          إعلانات
        </button>

        <div class="sideGroupLabel">أدوات</div>
        <button type="button" class="chip" data-view="tools" id="tabTools">
          <svg class="navIco" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14.7 6.3a4 4 0 0 0-5.6 5.6L3 18v3h3l6.1-6.1a4 4 0 0 0 5.6-5.6l-2.5 2.5-2.5-2.5z"/></svg>
          أدوات خاصة
        </button>
      </nav>

      <div class="sideFoot">
        <a class="homeOut" id="homeOut" href="../index.html">الرئيسية</a>
        <a class="tickerModOut" href="../ticker-board/moderate.html">اعتماد الشريط</a>
        <button type="button" class="lockOut" id="lockOut">قفل الجلسة</button>
      </div>
    </aside>

    <div class="mainCol">
      <header class="topbar">
        <button type="button" class="mobileNavBtn" id="mobileNavBtn" aria-label="القائمة">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
        </button>
        <div class="crumbs" id="crumbs">
          <span>Settings</span>
          <span class="sep">/</span>
          <b id="crumbCurrent">الزيارات</b>
        </div>
        <div class="searchWrap">
          <svg class="searchIco" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
          <input type="search" id="deskSearch" placeholder="بحث في الصفحة…" autocomplete="off">
          <span class="kbdHint">/</span>
        </div>
      </header>

      <main class="content">
        <div class="pageHead">
          <h1 id="pageTitle">الزيارات</h1>
          <p id="pageDesc">سجل الزيارات، أرقام الهواتف، وروابط الأدوات الخاصة حتى لا تُنسى.</p>
        </div>

        <div id="visitsChrome">
          <div class="toolbar">
            <button type="button" class="chip active" data-filter="today" id="fToday">اليوم</button>
            <button type="button" class="chip" data-filter="month" id="fMonth">هذا الشهر</button>
            <button type="button" class="chip" data-filter="all" id="fAll">الكل</button>
            <button type="button" class="chip" id="refreshBtn">تحديث</button>
          </div>
          <div class="stats stats3">
            <div class="stat"><b id="statToday">0</b><span>زوار اليوم</span></div>
            <div class="stat"><b id="statMonth">0</b><span>هذا الشهر</span></div>
            <div class="stat"><b id="statTotal">—</b><span>إجمالي الزوار</span></div>
          </div>
        </div>

        <div class="card panelCard" id="visitsPanel">
          <div class="listHead">
            <h2>سجل الزيارات</h2>
            <span class="countPill" id="listCountPill">0</span>
          </div>
          <div class="list" id="list"></div>
        </div>

        <section class="statsPanel" id="devicesPanel" hidden>
          <div class="statsPanelHead">
            <h2>إحصائية الأجهزة</h2>
            <span class="countPill" id="deviceCountPill">0</span>
          </div>
          <p class="statsPanelNote">حسب الفلتر الحالي · موديل الآيفون تقديري من حجم الشاشة (آبل لا تُظهر الموديل بدقة).</p>
          <div class="deviceTypeList" id="deviceTypeList"></div>
        </section>

        <section class="statsPanel" id="pagesPanel" hidden>
          <div class="statsPanelHead">
            <h2>إحصائية الصفحات</h2>
            <span class="countPill" id="pageCountPill">0</span>
          </div>
          <p class="statsPanelNote">حسب الفلتر الحالي · كل صفحة زارها الشخص في ذلك اليوم (حتى 30 صفحة/يوم).</p>
          <div class="pageTypeList" id="pageTypeList"></div>
          <div class="statsPanelHead" style="margin-top:18px">
            <h2>أرقام شوهدت في جدولي</h2>
            <span class="countPill" id="scheduleViewPill">0</span>
          </div>
          <p class="statsPanelNote">أرقام الوظيفة التي فتح أحد الزوار جدولها من صفحة «جدولي» (حسب الفلتر).</p>
          <div class="pageTypeList" id="scheduleViewList"></div>
        </section>

        <div id="phonesPanel" hidden>
          <div class="toolbar">
            <button type="button" class="chip" id="refreshPhonesBtn">تحديث</button>
            <a class="chip" href="../tools/phone-match/" style="text-decoration:none;display:inline-flex;align-items:center">مطابقة أرقام</a>
          </div>
          <div class="stats">
            <div class="stat"><b id="statPhones">0</b><span>أرقام محفوظة</span></div>
            <div class="stat"><b id="statPhonesHint">—</b><span>آخر تحديث</span></div>
          </div>
          <div class="list" id="phonesList"></div>
        </div>

        <div id="gapsPanel" hidden>
          <p class="toolsIntro">مقارنة موظفي الروستر الحالي مع سجل الزيارات وأرقام الهواتف المحفوظة.</p>
          <div class="toolbar" id="gapsFilters">
            <button type="button" class="chip active" data-gap="noPhone">بدون هاتف</button>
            <button type="button" class="chip" data-gap="noVisit">لم يزوروا</button>
            <button type="button" class="chip" data-gap="noId">بدون رقم وظيفة*</button>
            <button type="button" class="chip" data-gap="both">بدون زيارة وهاتف</button>
            <button type="button" class="chip" id="refreshGapsBtn">تحديث</button>
          </div>
          <div class="stats stats4">
            <div class="stat"><b id="gapStatStaff">0</b><span>موظف حالي</span></div>
            <div class="stat"><b id="gapStatNoPhone">0</b><span>بدون هاتف</span></div>
            <div class="stat"><b id="gapStatNoVisit">0</b><span>لم يزوروا بهويتهم</span></div>
            <div class="stat"><b id="gapStatGuests">0</b><span>زيارات ضيف (بدون رقم وظيفة)</span></div>
          </div>
          <p class="gapNote" id="gapNote">* «بدون رقم وظيفة» = زيارات كضيف دون حفظ رقم الموظف. لا يمكن معرفة أسمائهم، لذلك يُعرض العدد فقط مع قائمة الموظفين الذين لم يظهروا بهويتهم.</p>
          <div class="list" id="gapsList"></div>
        </div>

        <div id="toolsPanel" hidden>
          <p class="toolsIntro">صفحات وأدوات خاصة للاستخدام عند الحاجة — مطابقة الأرقام، مراجعة المغادرين، وغيرها.</p>
          <div class="toolsGrid" id="toolsGrid">
            <div class="empty">جاري تحميل الأدوات...</div>
          </div>
        </div>

        <div id="bannersPanel" hidden>
          <p class="bannerAdminIntro">إدارة صور بنر الهيدر — ارفع صورة جديدة أو احذف بنراً. الحذف نهائي ويختفي من قائمة اختيار الخلفية لجميع الزوار.</p>
          <div class="bannerUploadCard">
            <p class="bannerUploadTitle">رفع صورة بنر</p>
            <p class="bannerUploadHint">اختر صورة من الجهاز أو الكاميرا (JPG / PNG / WebP). تُضغط تلقائياً قبل الرفع.</p>
            <div class="bannerUploadActions">
              <label class="bannerAddLabel">
                <input type="file" id="bannerAddInput" accept="image/jpeg,image/png,image/webp,image/*">
                اختيار صورة
              </label>
              <label class="bannerAddLabel secondary">
                <input type="file" id="bannerCameraInput" accept="image/*" capture="environment">
                كاميرا
              </label>
              <button type="button" class="chip" id="refreshBannersBtn">تحديث القائمة</button>
            </div>
            <div class="bannerUploadPreview" id="bannerUploadPreview">
              <img id="bannerUploadPreviewImg" alt="معاينة البنر">
            </div>
            <div class="bannerUploadActions" id="bannerUploadConfirmRow" hidden>
              <button type="button" class="bannerUploadConfirm" id="bannerUploadConfirm">رفع البنر</button>
              <button type="button" class="bannerUploadCancel" id="bannerUploadCancel">إلغاء</button>
            </div>
          </div>
          <div class="bannerStatus" id="bannerAdminStatus"></div>
          <div class="bannerAdminGrid" id="bannerAdminGrid"></div>
        </div>

        <div id="popupsPanel" hidden>
          <p class="bannerAdminIntro">إعلانات تظهر عند دخول الموقع. استخدم «شرائح صور» للملاحظات المصورة: الصورة الأولى ثم «التالي» حتى آخر صورة ثم العودة للصفحة الرئيسية.</p>
          <div class="popupAdminForm" id="popupAdminForm">
            <section class="popupSection">
              <p class="popupSectionTitle">نوع الإعلان</p>
              <p class="popupSectionHint">اختر الشكل المناسب ثم أكمل الحقول الظاهرة فقط.</p>
              <div class="popupModeRow" role="radiogroup" aria-label="نوع المحتوى">
                <label><input type="radio" name="popupMode" value="text" checked> نص فقط</label>
                <label><input type="radio" name="popupMode" value="image"> صورة فقط</label>
                <label><input type="radio" name="popupMode" value="both"> نص وصورة</label>
                <label><input type="radio" name="popupMode" value="slides"> شرائح صور</label>
              </div>
            </section>

            <section class="popupSection" id="popupContentSection">
              <p class="popupSectionTitle">المحتوى</p>
              <label>العنوان (اختياري)
                <input type="text" id="popupTitle" maxlength="120" placeholder="مثال: تنويه مهم / ملاحظات الوردية">
              </label>
              <label id="popupTextWrap">النص
                <textarea id="popupText" maxlength="800" placeholder="اكتب نص الإعلان هنا"></textarea>
              </label>
              <div class="popupAdminRow" id="popupLinkRow">
                <label>رابط الزر (اختياري)
                  <input type="url" id="popupLinkUrl" maxlength="500" placeholder="https://example.com">
                </label>
                <label>نص زر الرابط
                  <input type="text" id="popupLinkLabel" maxlength="40" placeholder="افتح الرابط">
                </label>
              </div>
            </section>

            <section class="popupSection">
              <p class="popupSectionTitle">الظهور</p>
              <div class="popupAdminRow">
                <label>عدد أيام الظهور
                  <input type="number" id="popupDays" min="1" max="90" value="3">
                </label>
                <label id="popupDurationWrap">مدة الظهور (ثوانٍ)
                  <input type="number" id="popupDuration" min="3" max="300" value="12">
                </label>
              </div>
              <p class="popupSectionHint" id="popupSlidesHint" hidden>شرائح الصور تنتقل يدوياً بزر «التالي» — لا يوجد مؤقت تلقائي.</p>
            </section>

            <section class="popupSection" id="popupImageWrap" hidden>
              <p class="popupSectionTitle" id="popupImageTitle">الصورة</p>
              <p class="bannerUploadHint" id="popupImageHint">أرفق صورة (JPG / PNG / WebP / GIF). الصور تُضغط تلقائياً، وملفات GIF تُرفع كما هي (حتى نحو 160 ك.ب).</p>
              <div class="bannerUploadActions">
                <label class="bannerAddLabel">
                  <input type="file" id="popupAddInput" accept="image/jpeg,image/png,image/webp,image/gif,image/*">
                  اختيار صورة
                </label>
                <label class="bannerAddLabel secondary" id="popupCameraLabel">
                  <input type="file" id="popupCameraInput" accept="image/*" capture="environment">
                  كاميرا
                </label>
              </div>
              <div class="bannerUploadPreview" id="popupUploadPreview">
                <img id="popupUploadPreviewImg" alt="معاينة الإعلان">
              </div>
              <div class="popupSlideCount" id="popupSlideCount" hidden></div>
              <div class="popupSlidesPreview" id="popupSlidesPreview" aria-live="polite"></div>
            </section>

            <div class="popupFormActions">
              <button type="button" class="bannerUploadConfirm" id="popupSaveBtn">نشر الإعلان</button>
              <button type="button" class="chip" id="refreshPopupsBtn">تحديث القائمة</button>
            </div>
          </div>
          <div class="bannerStatus" id="popupAdminStatus"></div>
          <div class="popupList" id="popupAdminList"></div>
        </div>
      </main>
    </div>
  </div>
"""

# Replace style
s0 = t.find("<style>")
s1 = t.find("</style>") + len("</style>")
if s0 < 0 or s1 < s0:
    raise SystemExit("style block not found")
t = t[:s0] + NEW_CSS.strip() + "\n" + t[s1:]

# Replace gate+app body (before first script src)
b0 = t.find('<div class="gate"')
b1 = t.find('<script src="../banner-store.js')
if b0 < 0 or b1 < 0:
    raise SystemExit("body markers not found")
t = t[:b0] + NEW_BODY.strip() + "\n\n  " + t[b1:]

# Bump build meta + title
t = t.replace('content="20261017mantle64k"', 'content="20261020linear"')
t = t.replace("<title>·</title>", "<title>Settings · Desk</title>")

# Patch setView to update crumbs/title and close mobile nav
needle = """        document.querySelectorAll('#mainTabs .chip[data-view]').forEach((c) => {
          c.classList.toggle('active', c.getAttribute('data-view') === view);
        });
        if (view === 'phones') loadPhones();"""

insert = """        document.querySelectorAll('#mainTabs .chip[data-view]').forEach((c) => {
          c.classList.toggle('active', c.getAttribute('data-view') === view);
        });
        const titles = {
          visits: ['الزيارات', 'متابعة من دخل الموقع اليوم أو هذا الشهر، مع تفاصيل الجهاز والصفحات.'],
          devices: ['الأجهزة', 'توزيع الأجهزة وأنظمة التشغيل حسب الفلتر الحالي.'],
          pages: ['الصفحات', 'أكثر الصفحات زيارة وأرقام الجداول التي فُتحت من «جدولي».'],
          phones: ['الهواتف', 'الأرقام المحفوظة مع اتصال ونسخ سريع.'],
          gaps: ['نواقص', 'موظفون بلا هاتف أو بلا زيارة بهويتهم مقارنة بالروستر الحالي.'],
          tools: ['أدوات', 'اختصارات للوحات والأدوات الخاصة.'],
          banners: ['بنرات', 'رفع وحذف صور بنر الهيدر الظاهرة للزوار.'],
          popups: ['إعلانات', 'إنشاء وإدارة إعلانات الدخول وشرائح الصور.']
        };
        const meta = titles[view] || titles.visits;
        const crumb = document.getElementById('crumbCurrent');
        const pageTitle = document.getElementById('pageTitle');
        const pageDesc = document.getElementById('pageDesc');
        if (crumb) crumb.textContent = meta[0];
        if (pageTitle) pageTitle.textContent = meta[0];
        if (pageDesc) pageDesc.textContent = meta[1];
        document.body.classList.remove('sideOpen');
        const search = document.getElementById('deskSearch');
        if (search) { search.value = ''; applyDeskSearch(''); }
        if (view === 'phones') loadPhones();"""

if needle not in t:
    raise SystemExit("setView needle not found")
t = t.replace(needle, insert, 1)

# Add search + mobile nav helpers near end before closing of IIFE — after mainTabs listeners
hook = """      document.querySelectorAll('#mainTabs .chip[data-view]').forEach((c) => {
        c.addEventListener('click', () => {
          setView(c.getAttribute('data-view') || 'visits');
        });
      });"""

hook_extra = """      document.querySelectorAll('#mainTabs .chip[data-view]').forEach((c) => {
        c.addEventListener('click', () => {
          setView(c.getAttribute('data-view') || 'visits');
        });
      });

      function applyDeskSearch(q) {
        const query = String(q || '').trim().toLowerCase();
        const sels = [
          '#list .row',
          '#phonesList .row',
          '#gapsList .row',
          '#deviceTypeList .deviceTypeRow',
          '#pageTypeList .pageTypeRow',
          '#scheduleViewList .pageTypeRow',
          '#toolsGrid .toolCard',
          '#bannerAdminGrid .bannerAdminCard',
          '#popupAdminList .popupCard'
        ];
        sels.forEach((sel) => {
          document.querySelectorAll(sel).forEach((el) => {
            if (!query) {
              el.classList.remove('is-search-hidden');
              return;
            }
            const hit = (el.textContent || '').toLowerCase().indexOf(query) >= 0;
            el.classList.toggle('is-search-hidden', !hit);
          });
        });
      }

      const deskSearch = document.getElementById('deskSearch');
      if (deskSearch) {
        deskSearch.addEventListener('input', () => applyDeskSearch(deskSearch.value));
      }
      document.addEventListener('keydown', (ev) => {
        if (ev.key === '/' && !ev.metaKey && !ev.ctrlKey && !ev.altKey) {
          const tag = (ev.target && ev.target.tagName) || '';
          if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
          if (app.hidden) return;
          ev.preventDefault();
          if (deskSearch) deskSearch.focus();
        }
        if (ev.key === 'Escape') document.body.classList.remove('sideOpen');
      });
      const mobileNavBtn = document.getElementById('mobileNavBtn');
      if (mobileNavBtn) {
        mobileNavBtn.addEventListener('click', () => {
          document.body.classList.toggle('sideOpen');
        });
      }
      document.addEventListener('click', (ev) => {
        if (!document.body.classList.contains('sideOpen')) return;
        const side = document.getElementById('sidebar');
        if (side && side.contains(ev.target)) return;
        if (mobileNavBtn && mobileNavBtn.contains(ev.target)) return;
        document.body.classList.remove('sideOpen');
      });"""

if hook not in t:
    raise SystemExit("mainTabs hook not found")
t = t.replace(hook, hook_extra, 1)

p.write_text(t, encoding="utf-8")
print("ok", p.stat().st_size)
