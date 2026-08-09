/**
 * Force footer visitor counts on homepage (and old cached shells).
 * READ-ONLY for Abacus — never /hit. Unique visitor increments belong solely to site-visits.js.
 */
(function () {
  'use strict';
  if (window.__homeUiForceBooted) return;
  window.__homeUiForceBooted = true;

  var NS = 'khalidsaif912.github.io';

  function ensureCss() {
    if (document.getElementById('ideasStaticCssForce')) return;
    var st = document.createElement('style');
    st.id = 'ideasStaticCssForce';
    st.textContent =
      '#visitsFloatDock{position:fixed;left:12px;right:12px;bottom:calc(54px + env(safe-area-inset-bottom,0px));z-index:100055;background:rgba(255,255,255,.96);border:1px solid rgba(15,23,42,.12);border-radius:14px;box-shadow:0 8px 22px rgba(15,23,42,.14);padding:8px 12px;text-align:center;font-size:12px;line-height:1.55;color:#334155;font-weight:700;pointer-events:none}' +
      '#visitsFloatDock b{color:#1e40af;font-weight:900}';
    document.head.appendChild(st);
  }

  function ensureFooterVisits() {
    var footer = document.querySelector('.footer');
    if (!footer) return null;
    var host = document.getElementById('siteVisitsHost');
    var textHtml =
      '<span class="svPart"><span class="svLabel" id="siteVisitsDayLabel">زوار اليوم</span><span class="svNum" id="siteVisitsDay">--</span></span>' +
      '<span class="svDot" aria-hidden="true">·</span>' +
      '<span class="svPart"><span class="svLabel" id="siteVisitsMonthLabel">هذا الشهر</span><span class="svNum" id="siteVisitsMonth">--</span></span>' +
      '<span class="svDot" aria-hidden="true">·</span>' +
      '<span class="svPart"><span class="svLabel" id="siteVisitsTotalLabel">الإجمالي</span><span class="svNum" id="siteVisitsTotal">--</span></span>';
    if (!host) {
      host = document.createElement('div');
      host.id = 'siteVisitsHost';
      host.className = 'siteVisitsHost';
      host.setAttribute('dir', 'rtl');
      host.setAttribute('aria-label', 'Visitor stats');
      host.innerHTML = textHtml;
    } else if (!host.querySelector('.svPart') || host.querySelector('.svChip')) {
      host.className = 'siteVisitsHost';
      host.innerHTML = textHtml;
    }
    host.hidden = false;
    host.style.visibility = 'visible';
    host.style.opacity = '1';
    var buttons = footer.querySelector('.bgTextureShuffleWrap');
    if (host.parentNode !== footer) {
      if (buttons) footer.insertBefore(host, buttons);
      else footer.appendChild(host);
    } else if (buttons && host.nextSibling !== buttons) {
      footer.insertBefore(host, buttons);
    }
    function ensureLbl(id, ar, en) {
      var el = document.getElementById(id);
      if (!el) return;
      var t = String(el.textContent || '').trim();
      if (!t || t === '...' || t === '—') {
        var isAr = true;
        try {
          var L = localStorage.getItem('rosterLang') || '';
          if (L === 'en') isAr = false;
          else if (document.body && document.body.classList.contains('ar')) isAr = true;
        } catch (e) {}
        el.textContent = isAr ? ar : en;
      }
    }
    ensureLbl('siteVisitsDayLabel', 'زوار اليوم', 'Today');
    ensureLbl('siteVisitsMonthLabel', 'هذا الشهر', 'This month');
    ensureLbl('siteVisitsTotalLabel', 'الإجمالي', 'Total');
    return host;
  }

  function fillVisits() {
    ensureFooterVisits();
    // Only delegate to site-visits (Mantle unique log). Never paint Abacus day/month here —
    // Abacus undercounted after inflation fixes and overwritten correct log totals.
    try {
      if (window.rosterSiteVisits && typeof window.rosterSiteVisits.refresh === 'function') {
        window.rosterSiteVisits.refresh();
      }
    } catch (e0) {}
  }

  function run() {
    ensureCss();
    try {
      if (document.querySelector('.footer')) {
        ensureFooterVisits();
        fillVisits();
        setTimeout(fillVisits, 1200);
        setTimeout(ensureFooterVisits, 3500);
      }
    } catch (eVisits) {}
  }

  window.rosterForceHomeUI = run;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
  setTimeout(run, 2000);
})();
