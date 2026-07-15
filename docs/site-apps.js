/**
 * Related apps launcher — grid of external tools (same modal style as site share).
 */
(function () {
  'use strict';

  var I18N = {
    en: {
      btn: 'Apps',
      title: 'Related apps',
      hint: 'Quick links to other tools',
      close: 'Close',
      flights: 'Muscat Flights',
      flightsSub: 'Airport board',
      labels: 'SATS Labels',
      labelsSub: 'Cargo labels',
      calc: 'Quantities',
      calcSub: 'Shipment calc',
      quicklist: 'QuickList',
      quicklistSub: 'Shopping lists',
      games: 'Memory Games',
      gamesSub: 'Roster games hub',
      store: 'Mobhar Store · متجر مُبهر',
      storeSub: 'Electronics & gadgets',
      wcvote: 'World Cup Fan Vote',
      wcvoteSub: 'Vote for your team',
    },
    ar: {
      btn: 'تطبيقات',
      title: 'تطبيقات مرتبطة',
      hint: 'روابط سريعة لأدوات أخرى',
      close: 'إغلاق',
      flights: 'رحلات مسقط',
      flightsSub: 'لوحة المطار',
      labels: 'ملصقات SATS',
      labelsSub: 'ملصقات الشحن',
      calc: 'حساب الكميات',
      calcSub: 'حساب الشحنات',
      quicklist: 'قوائم المشتريات',
      quicklistSub: 'سجل المنزل',
      games: 'ألعاب الذاكرة',
      gamesSub: 'مركز ألعاب الروستر',
      store: 'متجر مُبهر · Mobhar Store',
      storeSub: 'أجهزة وتسوق',
      wcvote: 'تصويت جماهير كأس العالم',
      wcvoteSub: 'صوّت لمنتخبك',
    },
  };

  function lang() {
    var l = localStorage.getItem('rosterLang') || document.documentElement.getAttribute('lang') || 'en';
    return l === 'ar' ? 'ar' : 'en';
  }

  function t(key) {
    var pack = I18N[lang()] || I18N.en;
    return pack[key] || I18N.en[key] || key;
  }

  function closeShareIfOpen() {
    var share = document.getElementById('siteShareSheet');
    if (share && share.classList.contains('open')) {
      share.classList.remove('open');
      share.setAttribute('aria-hidden', 'true');
      if (window.rosterSiteShare && window.rosterSiteShare.close) {
        window.rosterSiteShare.close();
      }
    }
  }

  function applyI18n() {
    var btn = document.getElementById('moreAppsBtn');
    if (btn) {
      var lbl = btn.querySelector('.roster-cta-label');
      if (lbl) lbl.textContent = t('btn');
      else btn.textContent = t('btn');
    }
    ensureAlumniButton();
    var sheet = document.getElementById('siteAppsSheet');
    if (!sheet) return;
    var title = document.getElementById('siteAppsTitle');
    var hint = document.getElementById('siteAppsHint');
    if (title) title.textContent = t('title');
    if (hint) hint.textContent = t('hint');
    var closeBtn = document.getElementById('siteAppsCloseBtn');
    if (closeBtn) {
      var closeLbl = closeBtn.querySelector('.roster-cta-label');
      if (closeLbl) closeLbl.textContent = t('close');
      else closeBtn.textContent = t('close');
    }
    sheet.querySelectorAll('[data-i18n]').forEach(function (el) {
      var id = el.getAttribute('data-i18n');
      if (!id) return;
      var val = t(id);
      if (val && val !== id) el.textContent = val;
    });
    sheet.querySelectorAll('[data-i18n-sub]').forEach(function (el) {
      var id = el.getAttribute('data-i18n-sub');
      if (!id) return;
      var subKey = id + 'Sub';
      var val = t(subKey);
      if (val && val !== subKey) el.textContent = val;
    });
    sheet.setAttribute('dir', lang() === 'ar' ? 'rtl' : 'ltr');
  }

  function openModal() {
    var sheet = document.getElementById('siteAppsSheet');
    if (!sheet) return;
    closeShareIfOpen();
    applyI18n();
    patchCalcLink();
    patchQuicklistLink();
    sheet.classList.add('open');
    sheet.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    var sheet = document.getElementById('siteAppsSheet');
    if (!sheet) return;
    sheet.classList.remove('open');
    sheet.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function rememberCalcReturnUrl() {
    try {
      var path = location.pathname || '';
      if (/\/calculator(\/|$)/.test(path)) return;
      sessionStorage.setItem('calcReturnUrl', location.href);
    } catch (e) {}
  }

  function calcPageUrl() {
    if (typeof getSiteRootUrl === 'function') {
      return getSiteRootUrl() + '/calculator/index.html';
    }
    return 'https://khalidsaif912.github.io/new/docs/calculator/index.html';
  }

  function quicklistPageUrl() {
    if (typeof getSiteRootUrl === 'function') {
      return getSiteRootUrl() + '/QuickList/index.html';
    }
    return 'https://khalidsaif912.github.io/new/docs/QuickList/index.html';
  }

  function patchCalcLink() {
    var link = document.querySelector('.siteAppsLink--calc');
    if (!link) return;
    link.href = calcPageUrl();
    link.setAttribute('data-open-same', '1');
    link.removeAttribute('target');
    link.removeAttribute('rel');
  }

  function patchQuicklistLink() {
    var link = document.querySelector('.siteAppsLink--quicklist');
    if (!link) return;
    link.href = quicklistPageUrl();
    link.setAttribute('data-open-same', '1');
    link.removeAttribute('target');
    link.removeAttribute('rel');
  }

  function openCalcFromPwa(e) {
    var link = e.target.closest('a.siteAppsLink--calc');
    if (!link) return;
    if (!isStandaloneApp()) return;
    e.preventDefault();
    closeModal();
    rememberCalcReturnUrl();
    window.location.assign(calcPageUrl());
  }

  function openQuicklistFromPwa(e) {
    var link = e.target.closest('a.siteAppsLink--quicklist');
    if (!link) return;
    if (!isStandaloneApp()) return;
    e.preventDefault();
    closeModal();
    window.location.assign(quicklistPageUrl());
  }

  function isStandaloneApp() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );
  }

  function bindExternalAppLinks() {
    var grid = document.getElementById('siteAppsGrid');
    if (!grid) return;
    patchCalcLink();
    patchQuicklistLink();
    grid.addEventListener('click', function (e) {
      if (e.target.closest('a.siteAppsLink--calc')) {
        rememberCalcReturnUrl();
        openCalcFromPwa(e);
        return;
      }
      if (e.target.closest('a.siteAppsLink--quicklist')) {
        openQuicklistFromPwa(e);
        return;
      }
      var link = e.target.closest('a.siteAppsLink[data-open-same="1"]');
      if (!link || !isStandaloneApp()) return;
      e.preventDefault();
      closeModal();
      window.location.assign(link.href);
    });
  }

  function injectCompactStyles() {
    if (document.getElementById('siteAppsCompactCss')) return;
    var style = document.createElement('style');
    style.id = 'siteAppsCompactCss';
    style.textContent = [
      '.siteAppsSheet{padding:10px!important;overscroll-behavior:none;}',
      '.siteAppsCard{width:min(100%,380px)!important;max-height:calc(100vh - 20px)!important;max-height:calc(100dvh - 20px)!important;overflow:hidden!important;display:flex!important;flex-direction:column!important;padding:12px 12px 10px!important;border-radius:16px!important;-webkit-overflow-scrolling:auto!important;}',
      '.siteAppsTitle{font-size:15px!important;margin:0 0 2px!important;flex-shrink:0;}',
      '.siteAppsHint{font-size:11px!important;margin:0 0 8px!important;line-height:1.35!important;flex-shrink:0;}',
      '.siteAppsGrid{gap:8px!important;margin-bottom:8px!important;min-height:0;flex:1 1 auto;align-content:start;}',
      '.siteAppsLink{min-height:0!important;padding:8px 6px!important;gap:5px!important;border-radius:12px!important;}',
      '.siteAppsLink-icon{width:34px!important;height:34px!important;border-radius:10px!important;flex-shrink:0;}',
      '.siteAppsLink-icon svg{width:18px!important;height:18px!important;}',
      '.siteAppsLink-text{display:flex;flex-direction:column;align-items:center;gap:1px;min-width:0;}',
      '.siteAppsLink-title{font-size:11px!important;line-height:1.2!important;}',
      '.siteAppsLink-sub{font-size:9px!important;line-height:1.25!important;}',
      '.siteAppsLink--games{min-height:48px!important;padding:8px 12px!important;gap:10px!important;}',
      '.siteAppsLink--games .siteAppsLink-text{align-items:flex-start;flex:1;}',
      '.siteAppsCloseWrap{margin-top:2px!important;flex-shrink:0;}',
      '.siteAppsCloseWrap .roster-cta-btn{width:100%;min-height:40px;padding-top:8px;padding-bottom:8px;}',
      '@media (max-height:720px){',
      '.siteAppsHint{display:none!important;}',
      '.siteAppsCard{padding:10px 10px 8px!important;border-radius:14px!important;}',
      '.siteAppsGrid{gap:6px!important;margin-bottom:6px!important;}',
      '.siteAppsLink{padding:6px 5px!important;gap:4px!important;}',
      '.siteAppsLink-icon{width:30px!important;height:30px!important;border-radius:8px!important;}',
      '.siteAppsLink-icon svg{width:16px!important;height:16px!important;}',
      '.siteAppsLink-title{font-size:10.5px!important;}',
      '.siteAppsLink-sub{display:none!important;}',
      '.siteAppsLink--games{min-height:42px!important;padding:6px 10px!important;}',
      '.siteAppsTitle{font-size:14px!important;}',
      '}',
      '@media (max-height:560px){',
      '.siteAppsSheet{padding:6px!important;}',
      '.siteAppsCard{max-height:calc(100vh - 12px)!important;max-height:calc(100dvh - 12px)!important;padding:8px!important;}',
      '.siteAppsGrid{gap:5px!important;}',
      '.siteAppsLink{padding:5px 4px!important;border-radius:10px!important;}',
      '.siteAppsLink-icon{width:26px!important;height:26px!important;}',
      '.siteAppsLink-icon svg{width:14px!important;height:14px!important;}',
      '.siteAppsCloseWrap .roster-cta-btn{min-height:36px;padding-top:6px;padding-bottom:6px;font-size:13px;}',
      '}'
    ].join('');
    document.head.appendChild(style);
  }

  function bindUi() {
    var sheet = document.getElementById('siteAppsSheet');
    if (!sheet) return;
    document.getElementById('moreAppsBtn')?.addEventListener('click', function (e) {
      e.preventDefault();
      openModal();
    });
    document.getElementById('siteAppsCloseBtn')?.addEventListener('click', closeModal);
    bindExternalAppLinks();
    sheet.addEventListener('click', function (e) {
      if (e.target === sheet) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sheet.classList.contains('open')) closeModal();
    });
  }

  function alumniLabel() {
    return lang() === 'ar' ? 'زملاء سابقون' : 'Former Colleagues';
  }

  function alumniPageUrl() {
    if (typeof getSiteRootUrl === 'function') return getSiteRootUrl() + '/alumni/';
    return 'https://khalidsaif912.github.io/new/docs/alumni/';
  }

  function ensureAlumniButton() {
    var btn = document.getElementById('alumniBtn');
    var footer = document.querySelector('.footer');
    if (!btn) {
      if (!footer || !footer.parentNode) return;
      var nav = document.createElement('nav');
      nav.className = 'quickActions alumniBar';
      nav.setAttribute('aria-label', 'Former colleagues');
      nav.innerHTML =
        '<a class="roster-cta-btn roster-cta-btn--alumni" id="alumniBtn" href="#">' +
        '<span class="roster-cta-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#0f766e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>' +
        '<span class="roster-cta-label"></span></a>';
      footer.parentNode.insertBefore(nav, footer);
      btn = document.getElementById('alumniBtn');
    }
    if (!btn) return;
    btn.href = alumniPageUrl();
    var lbl = btn.querySelector('.roster-cta-label');
    if (lbl) lbl.textContent = alumniLabel();
    if (!document.getElementById('alumniBtnForceCss')) {
      var style = document.createElement('style');
      style.id = 'alumniBtnForceCss';
      style.textContent = [
        '.quickActions.alumniBar{display:grid!important;grid-template-columns:1fr!important;margin:12px 2px 4px!important;padding:0!important;width:100%!important;max-width:100%!important;visibility:visible!important;opacity:1!important;}',
        '.alumniBar .roster-cta-btn,#alumniBtn.roster-cta-btn{display:flex!important;align-items:center!important;justify-content:center!important;grid-column:1/-1!important;width:100%!important;min-height:50px!important;border-radius:14px!important;border:2px solid #0f766e!important;background:#ecfdf5!important;color:#0f766e!important;font-size:15px!important;font-weight:800!important;box-shadow:0 2px 10px rgba(15,118,110,.16)!important;text-decoration:none!important;}'
      ].join('');
      document.head.appendChild(style);
    }
  }

  function init() {
    injectCompactStyles();
    ensureAlumniButton();
    bindUi();
    applyI18n();
    ensureAlumniButton();
    patchCalcLink();
    patchQuicklistLink();
  }

  window.rosterSiteApps = {
    setLang: applyI18n,
    open: openModal,
    close: closeModal,
    calcUrl: calcPageUrl,
    quicklistUrl: quicklistPageUrl,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
