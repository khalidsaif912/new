/**
 * Related apps launcher — grid of external tools (same modal style as site share).
 */
(function () {
  'use strict';

  var CALC_VER = '20260703';
  var CALC_WRAPPER = 'https://iammrk-8af39.web.app/calculator/index.html';

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

  function siteRootUrl() {
    if (typeof getSiteRootUrl === 'function') {
      return getSiteRootUrl();
    }
    if (location.protocol === 'file:') {
      return '';
    }
    var path = location.pathname || '/';
    if (path.indexOf('/roster-site/') !== -1) {
      return location.origin + '/roster-site';
    }
    if (location.hostname && location.hostname.endsWith('github.io')) {
      var segs = path.split('/').filter(Boolean);
      if (segs.length >= 2 && segs[1] === 'docs') {
        return location.origin + '/' + segs[0] + '/docs';
      }
      if (segs.length) {
        return location.origin + '/' + segs[0];
      }
    }
    return location.origin;
  }

  function calcWrapperUrl() {
    return CALC_WRAPPER + '?pwa=1&v=' + CALC_VER + '&_=' + Date.now();
  }

  function isStandaloneApp() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );
  }

  function patchCalcLink() {
    var link = document.querySelector('.siteAppsLink--calc');
    if (!link) return;
    link.href = calcWrapperUrl();
    link.removeAttribute('target');
    link.setAttribute('data-pwa-calc', '1');
  }

  function openCalcFromPwa(e) {
    var link = e.target.closest('a.siteAppsLink--calc');
    if (!link) return;
    e.preventDefault();
    closeModal();
    window.location.assign(calcWrapperUrl());
  }

  function applyI18n() {
    var btn = document.getElementById('moreAppsBtn');
    if (btn) {
      var lbl = btn.querySelector('.roster-cta-label');
      if (lbl) lbl.textContent = t('btn');
      else btn.textContent = t('btn');
    }
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

  function openModal() {
    var sheet = document.getElementById('siteAppsSheet');
    if (!sheet) return;
    closeShareIfOpen();
    applyI18n();
    patchCalcLink();
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

  function bindExternalAppLinks() {
    var grid = document.getElementById('siteAppsGrid');
    if (!grid) return;
    patchCalcLink();
    grid.addEventListener('click', function (e) {
      if (e.target.closest('a.siteAppsLink--calc')) {
        openCalcFromPwa(e);
        return;
      }
      var link = e.target.closest('a.siteAppsLink[data-open-same="1"]');
      if (!link || !isStandaloneApp()) return;
      e.preventDefault();
      closeModal();
      window.location.assign(link.href);
    });
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

  function init() {
    bindUi();
    applyI18n();
    patchCalcLink();
  }

  window.rosterSiteApps = {
    setLang: applyI18n,
    open: openModal,
    close: closeModal,
    calcUrl: calcWrapperUrl,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
