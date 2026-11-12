(function () {
  var CSS = [
    '.qaCard{margin-top:22px;background:#fff;border-radius:26px;overflow:hidden;box-shadow:0 8px 22px rgba(30,30,40,.2);font-family:"Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",sans-serif;}',
    '.qaCardBar{height:6px;background:linear-gradient(90deg,#F26B1D,#3B6EF0);}',
    '.qaCardHead{display:flex;align-items:center;gap:12px;padding:16px 18px;border-bottom:1px solid #E6EAF3;}',
    '.qaCardIcon{width:48px;height:48px;border-radius:14px;background:#EEF2FF;border:1px solid #C9D4FA;display:grid;place-items:center;color:#2F5FD8;flex:none;}',
    '.qaCardTitle{flex:1;margin:0;font-size:20px;font-weight:700;color:#141A2E;letter-spacing:-.2px;}',
    '.qaCardTotal{width:54px;height:48px;border-radius:14px;background:#EEF2FF;border:1px solid #C9D4FA;display:flex;flex-direction:column;align-items:center;justify-content:center;flex:none;gap:1px;}',
    '.qaCardTotal small{font-size:9px;font-weight:700;letter-spacing:.06em;color:#5B6B95;text-transform:uppercase;line-height:1;}',
    '.qaCardTotal b{font-size:17px;font-weight:700;color:#2F5FD8;line-height:1.1;}',
    '.qaCardBody{padding:16px;display:flex;flex-direction:column;gap:10px;}',
    '.qaCard .quickActions.roster-cta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:0;padding:0;max-width:none;width:100%;}',
    '.qaCard .quickActions.roster-cta>.roster-cta-btn{width:100%;min-width:0;grid-column:auto;}',
    '.qaCard #ctaBtn{grid-column:1/-1;}',
    '.qaCard .quickActions.secondaryBar{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important;margin:0!important;padding:0!important;max-width:none!important;width:100%!important;}',
    '.qaCard .roster-cta-btn{display:flex;align-items:center;justify-content:flex-start;gap:12px;width:100%;min-width:0;min-height:52px;padding:8px 14px;border-radius:18px;border:1px solid transparent;font-size:14px;font-weight:700;line-height:1.2;text-align:start;text-decoration:none;box-shadow:none;background:#fff;transition:transform .16s ease,box-shadow .16s ease,background .16s ease;}',
    '.qaCard .roster-cta-icon{width:32px;height:32px;border-radius:999px;background:#fff;border:1px solid rgba(15,23,42,.08);display:grid;place-items:center;flex:none;}',
    '.qaCard .roster-cta-icon svg{width:18px;height:18px;}',
    '.qaCard .roster-cta-label{flex:1;min-width:0;font-size:14px;font-weight:700;color:inherit;}',
    '.qaCard #ctaBtn{min-height:60px;background:#E3ECFF;border-color:#B9CCF7;color:#1B3A8C;}',
    '.qaCard #ctaBtn .roster-cta-label{font-size:16px;}',
    '.qaCard #ctaBtn .roster-cta-icon svg{stroke:#2F63E0;}',
    '.qaCard #shareSiteBtn{background:#DDF7E8;border-color:#A9E6C4;color:#0F5A33;}',
    '.qaCard #shareSiteBtn .roster-cta-icon svg{stroke:#1B7F48;}',
    '.qaCard #moreAppsBtn{background:#FFF1C9;border-color:#F3D98A;color:#6B4300;}',
    '.qaCard #moreAppsBtn .roster-cta-icon svg{stroke:#B86A00;}',
    '.qaCard #copyShiftBtn{background:#EFE5FF;border-color:#D2BEF5;color:#4A2299;}',
    '.qaCard #copyShiftBtn .roster-cta-icon svg{stroke:#6535C9;}',
    '.qaCard #alumniBtn{background:#D8F5F1!important;border:1px solid #9EE3DA!important;border-radius:18px!important;color:#0B5650!important;min-height:52px!important;padding:8px 14px!important;}',
    '.qaCard #alumniBtn .roster-cta-icon svg{stroke:#12827A!important;}',
    '.qaCard #alumniBtn .roster-cta-label{font-size:14px!important;font-weight:700!important;color:#0B5650!important;}',
    '.qaGo{width:26px;height:26px;border-radius:999px;background:#fff;display:grid;place-items:center;flex:none;color:inherit;opacity:.85;}',
    '.qaGo svg{width:14px;height:14px;display:block;}',
    'html[dir="rtl"] .qaGo svg{transform:scaleX(-1);}',
    '.qaRow{display:flex;align-items:center;gap:12px;min-height:58px;padding:8px 14px;border-radius:18px;border:1px solid #A9D8F5;background:#E0F2FE;color:#0A5A8A;text-decoration:none;font-weight:700;}',
    '.qaRow-icon{width:32px;height:32px;border-radius:999px;background:#fff;border:1px solid rgba(15,23,42,.08);display:grid;place-items:center;flex:none;color:#0E7BB8;}',
    '.qaRow-icon svg{width:18px;height:18px;}',
    '.qaRow-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px;text-align:start;}',
    '.qaRow-title{font-size:14px;font-weight:700;line-height:1.2;}',
    '.qaRow-sub{font-size:12px;font-weight:500;line-height:1.2;opacity:.9;}',
    '.qaAddRow{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;}',
    '.qaAddSlot{display:flex;align-items:center;justify-content:center;gap:5px;height:48px;border:2px dashed #7C869B;border-radius:16px;background:transparent;color:#3C4658;font-size:12px;font-weight:700;line-height:1;padding:0 6px;white-space:nowrap;}',
    '.qaAddSlot svg{width:12px;height:12px;flex:none;}',
    '.qaCard .roster-cta-btn:focus-visible,.qaCard .qaRow:focus-visible,.footer :focus-visible{outline:3px solid #1B3A8C;outline-offset:2px;}',
    '@media (hover:hover){.qaCard .roster-cta-btn:hover{transform:translateY(-2px);box-shadow:0 6px 16px rgba(30,30,40,.14);}.qaCard .qaRow:hover{transform:translateY(-2px);box-shadow:0 6px 16px rgba(30,30,40,.14);}}',
    '.qaCard .roster-cta-btn:active,.qaCard .qaRow:active{transform:scale(.98);box-shadow:none;}',
    '@media (max-width:360px){.qaAddSlot{font-size:11px;gap:3px;}}',
    '.footer{margin-top:14px!important;background:rgba(255,255,255,.88);border-radius:26px;box-shadow:0 8px 22px rgba(30,30,40,.2);padding:16px 18px;display:flex;flex-direction:column;align-items:stretch;gap:12px;text-align:center;font-size:12px;color:#2B3350;line-height:1.5;font-family:"Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",sans-serif;}',
    '.footer .statusMeta{display:flex;flex-direction:column;gap:2px;font-size:12px;color:#2B3350;}',
    '.footer .statusMeta strong{font-size:12px;font-weight:700;color:#2B3350;}',
    '.footer .siteVisitsHost{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:0;width:100%;text-align:center;}',
    '.footer .siteVisitsHost>.svPart{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;border-radius:16px;padding:8px;border:1px solid transparent;background:#fff;}',
    '.footer .siteVisitsHost>.svLabel{font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;line-height:1.1;}',
    '.footer .siteVisitsHost>.svPart .svLabel{font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;line-height:1.1;}',
    '.footer .siteVisitsHost>.svPart .svNum{font-size:20px;font-weight:700;line-height:1.1;}',
    '.footer .siteVisitsHost>.svDot{display:none;}',
    '.footer .siteVisitsHost>.svPart:nth-child(1){background:#E3ECFF;border-color:#B9CCF7;}',
    '.footer .siteVisitsHost>.svPart:nth-child(1) .svLabel,.footer .siteVisitsHost>.svPart:nth-child(1) .svNum{color:#1B3A8C;}',
    '.footer .siteVisitsHost>.svPart:nth-child(3){background:#FFF1C9;border-color:#F3D98A;}',
    '.footer .siteVisitsHost>.svPart:nth-child(3) .svLabel,.footer .siteVisitsHost>.svPart:nth-child(3) .svNum{color:#6B4300;}',
    '.footer .siteVisitsHost>.svPart:nth-child(5){background:#DDF7E8;border-color:#A9E6C4;}',
    '.footer .siteVisitsHost>.svPart:nth-child(5) .svLabel,.footer .siteVisitsHost>.svPart:nth-child(5) .svNum{color:#0F5A33;}',
    '.footer .bgTextureShuffleWrap{margin-top:2px!important;gap:12px!important;}',
    '.footer #bgScrollTopBtn,.footer #bgRefreshBtn{width:44px!important;height:44px!important;border-radius:999px!important;flex:none!important;}',
    '.footer #bgScrollTopBtn{background:#EFE5FF!important;border:1px solid #D2BEF5!important;color:#4A2299!important;}',
    '.footer #bgScrollTopBtn svg{width:18px!important;height:18px!important;stroke:#4A2299!important;}',
    '.footer #bgRefreshBtn{background:#E3ECFF!important;border:1px solid #B9CCF7!important;color:#1B3A8C!important;}',
    '.footer #bgRefreshBtn svg{width:18px!important;height:18px!important;stroke:#1B3A8C!important;}',
    '.footer #bgTextureShuffleBtn{min-height:44px!important;height:44px!important;padding:0 16px!important;border-radius:999px!important;background:#EFE5FF!important;border:1px solid #D2BEF5!important;color:#4A2299!important;font-size:12px!important;font-weight:700!important;}',
    '.footer #bgTextureShuffleBtn svg{width:18px!important;height:18px!important;stroke:#4A2299!important;}',
    '.footer .deskLogHotspot{display:none!important;}'
  ].join('');

  var st = document.createElement('style');
  st.id = 'qaCardCss';
  st.textContent = CSS;
  document.head.appendChild(st);

  var rosterNav = document.querySelector('.quickActions.roster-cta');
  var secNav = document.querySelector('.quickActions.secondaryBar');
  if (!rosterNav || !secNav) return 'missing navs';

  var card = document.createElement('section');
  card.className = 'qaCard';
  card.setAttribute('aria-label', 'Quick Actions');
  card.innerHTML =
    '<div class="qaCardBar" aria-hidden="true"></div>' +
    '<div class="qaCardHead">' +
      '<span class="qaCardIcon" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.6"/><rect x="14" y="3" width="7" height="7" rx="1.6"/><rect x="3" y="14" width="7" height="7" rx="1.6"/><rect x="14" y="14" width="7" height="7" rx="1.6"/></svg></span>' +
      '<h2 class="qaCardTitle">Quick Actions</h2>' +
      '<span class="qaCardTotal" aria-hidden="true"><small>TOTAL</small><b>6</b></span>' +
    '</div>' +
    '<div class="qaCardBody"></div>';

  var body = card.querySelector('.qaCardBody');
  rosterNav.parentNode.insertBefore(card, rosterNav);
  body.appendChild(rosterNav);
  body.appendChild(secNav);

  var goArrow = '<span class="qaGo" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg></span>';
  var cta = document.getElementById('ctaBtn');
  if (cta && !cta.querySelector('.qaGo')) cta.insertAdjacentHTML('beforeend', goArrow);

  var wa = document.createElement('a');
  wa.className = 'qaRow';
  wa.id = 'qaWhatsApp';
  wa.href = 'https://khalidsaif912.github.io/new/docs/tools/whatsapp-text/';
  wa.innerHTML =
    '<span class="qaRow-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 11.6a8.5 8.5 0 0 1-12.6 7.5L3.5 20.5l1.4-4.3A8.5 8.5 0 1 1 20.5 11.6Z"/><path d="M8.4 8.6c.4-.9 1.7-.7 1.9.1l.3 1.1c.1.4 0 .8-.3 1l-.5.4c.5 1 1.3 1.8 2.3 2.3l.4-.5c.2-.3.6-.4 1-.3l1.1.3c.8.2 1 1.5.1 1.9-1.9.9-5.9-1-7.1-4.9-.2-.5-.1-1 .2-1.4Z"/></svg></span>' +
    '<span class="qaRow-text"><span class="qaRow-title">WhatsApp</span><span class="qaRow-sub">Format text fast</span></span>' +
    goArrow;
  body.appendChild(wa);

  var addRow = document.createElement('div');
  addRow.className = 'qaAddRow';
  addRow.setAttribute('aria-hidden', 'true');
  addRow.innerHTML = new Array(4).join('<span class="qaAddSlot"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>Add Action</span>');
  body.appendChild(addRow);

  var footer = document.querySelector('.footer');
  if (footer) {
    var meta = footer.querySelector('.statusMeta');
    if (!meta) {
      meta = document.createElement('div');
      meta.className = 'statusMeta';
      var html = footer.innerHTML.split(/<div class="siteVisitsHost"|<div class="bgTextureShuffleWrap"/)[0];
      meta.innerHTML = html;
      footer.insertBefore(meta, footer.firstChild);
      Array.prototype.slice.call(footer.childNodes).forEach(function (n) {
        if (n !== meta && n.nodeType === 1 && n.className !== 'siteVisitsHost' && n.className !== 'bgTextureShuffleWrap') n.remove();
      });
    }
  }
  return 'ok';
})();
