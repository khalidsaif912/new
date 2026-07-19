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
      alumni: 'Former Colleagues',
      spotlightBtn: 'Explore something random',
      spotlightBtnSub: 'A quick surprise from the site',
      spotlightTitle: 'A random pick for you',
      spotlightHint: 'Open a random app, game, tool, or former colleagues page from the site.',
      spotlightOpen: 'Open now',
      spotlightShuffle: 'Another pick',
      spotlightClose: 'Maybe later',
      pickBook: 'A Cup of Book',
      pickBookSub: 'Open the reading page',
      pickAlumni: 'Former Colleagues',
      pickAlumniSub: 'Tribute to colleagues who served with us',
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
      alumni: 'زملاء سابقون',
      spotlightBtn: 'اقتراح عشوائي',
      spotlightBtnSub: 'شيء جميل من الموقع',
      spotlightTitle: 'شيء عشوائي لك',
      spotlightHint: 'افتح تطبيقاً أو لعبة أو أداة أو صفحة الزملاء السابقين بشكل عشوائي.',
      spotlightOpen: 'افتح الآن',
      spotlightShuffle: 'اقتراح آخر',
      spotlightClose: 'لاحقًا',
      pickBook: 'A Cup of Book',
      pickBookSub: 'نافذة قراءة عشوائية',
      pickAlumni: 'زملاء سابقون',
      pickAlumniSub: 'تكريم زملاء خدموا معنا',
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
    ensureSpotlightButton();
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
    if (document.getElementById('spotlightSheet')) {
      paintSpotlightPopup(currentSpotlightItem());
    }
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

  function bookPageUrl() {
    if (typeof getSiteRootUrl === 'function') {
      return getSiteRootUrl() + '/a-cup-of-book/';
    }
    return 'https://khalidsaif912.github.io/new/docs/a-cup-of-book/';
  }

  function alumniPageUrl() {
    if (typeof getSiteRootUrl === 'function') return getSiteRootUrl() + '/alumni/';
    return 'https://khalidsaif912.github.io/new/docs/alumni/';
  }

  function spotlightItems() {
    return [
      {
        id: 'wcvote',
        title: t('wcvote'),
        sub: t('wcvoteSub'),
        href: 'https://match-accb0.web.app/?utm_source=roster-site&utm_medium=spotlight',
        external: true,
        classes: 'roster-cta-btn--apps',
        icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="#0a1520" stroke="#FFD700" stroke-width="1.5"/><path d="M8 10h8M8 14h5" stroke="#FFD700" stroke-width="1.5" stroke-linecap="round"/><circle cx="16" cy="14" r="2" fill="#00d4ff"/></svg>'
      },
      {
        id: 'flights',
        title: t('flights'),
        sub: t('flightsSub'),
        href: 'https://khalidsaif912.github.io/live-flights/',
        external: true,
        classes: 'roster-cta-btn--apps',
        icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#0284c7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.8 19.2 16 12l-3.5-1.5L3 3l4 12 4-1 2.5 3.5 3.5 1.8 4.2z"/></svg>'
      },
      {
        id: 'labels',
        title: t('labels'),
        sub: t('labelsSub'),
        href: 'https://lbit.netlify.app/',
        external: true,
        classes: 'roster-cta-btn--texture',
        icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><path d="M7 7h.01"/></svg>'
      },
      {
        id: 'calc',
        title: t('calc'),
        sub: t('calcSub'),
        href: calcPageUrl(),
        external: false,
        classes: 'roster-cta-btn--roster',
        icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#b45309" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 10h8M8 14h2M12 14h2M8 18h2M12 18h2"/></svg>'
      },
      {
        id: 'quicklist',
        title: t('quicklist'),
        sub: t('quicklistSub'),
        href: quicklistPageUrl(),
        external: false,
        classes: 'roster-cta-btn--texture',
        icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#7c3aed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>'
      },
      {
        id: 'store',
        title: t('store'),
        sub: t('storeSub'),
        href: 'https://mystore-96d8e.web.app',
        external: true,
        classes: 'roster-cta-btn--roster',
        icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#ea580c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10h18"/><path d="M5 6h14l1 4H4z"/><path d="M6 10v10h12V10"/><path d="M9 14h6"/></svg>'
      },
      {
        id: 'games',
        title: t('games'),
        sub: t('gamesSub'),
        href: 'https://dgr-exp.netlify.app/',
        external: true,
        classes: 'roster-cta-btn--apps',
        icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#db2777" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 12h4"/><path d="M8 10v4"/><path d="M15 13h.01"/><path d="M18 11h.01"/><rect x="2" y="6" width="20" height="12" rx="2"/></svg>'
      },
      {
        id: 'book',
        title: t('pickBook'),
        sub: t('pickBookSub'),
        href: bookPageUrl(),
        external: false,
        classes: 'roster-cta-btn--alumni',
        icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#0f766e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/></svg>'
      },
      {
        id: 'alumni',
        title: t('pickAlumni'),
        sub: t('pickAlumniSub'),
        href: alumniPageUrl(),
        external: false,
        classes: 'roster-cta-btn--alumni',
        icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#0f766e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
      }
    ];
  }

  function randomSpotlight(excludeId) {
    var items = spotlightItems().filter(function (item) { return item.id !== excludeId; });
    return items[Math.floor(Math.random() * items.length)];
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

  function openHref(item) {
    if (!item || !item.href) return;
    if (item.id === 'calc') rememberCalcReturnUrl();
    if (item.external) {
      window.open(item.href, '_blank', 'noopener');
      return;
    }
    window.location.assign(item.href);
  }

  function injectCompactStyles() {
    if (document.getElementById('siteAppsCompactCss')) return;
    var style = document.createElement('style');
    style.id = 'siteAppsCompactCss';
    style.textContent = [
      '.quickActions.secondaryBar{max-width:min(100%,540px)!important;margin-top:8px!important;gap:8px!important;display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;}',
      '.secondaryBar .roster-cta-btn{min-height:46px!important;padding:10px 10px!important;font-size:12.5px!important;width:100%!important;min-width:0!important;}',
      '#alumniBtn.roster-cta-btn--alumni,a.roster-cta-btn--alumni{',
      'display:inline-flex!important;align-items:center!important;justify-content:center!important;',
      'gap:8px!important;background:#f0fdfa!important;border:1.5px solid #99f6e4!important;',
      'border-radius:999px!important;color:#0f766e!important;text-decoration:none!important;',
      'box-shadow:none!important;font-weight:700!important;',
      '}',
      '#alumniBtn .roster-cta-label{font-size:11.5px!important;letter-spacing:-.01em;color:inherit!important;}',
      '#alumniBtn .roster-cta-icon svg{stroke:#0f766e!important;}',
      '@media (max-width:420px){.secondaryBar .roster-cta-btn{font-size:11.5px!important;padding:10px 8px!important;}#alumniBtn .roster-cta-label{font-size:10.8px!important;}}',
      '.quickActions.spotlightBar{margin-top:8px!important;padding:0 2px!important;display:flex!important;justify-content:center!important;width:100%!important;max-width:min(100%,540px)!important;margin-inline:auto!important;}',
      '.spotlightBar .spotlightBtn{width:min(100%,320px)!important;justify-content:center!important;text-align:center!important;min-height:50px!important;padding:10px 16px!important;gap:8px!important;margin-inline:auto!important;}',
      '.spotlightBtnLabel{display:flex!important;flex-direction:column!important;align-items:center!important;min-width:0!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important;line-height:1.15!important;}',
      '.spotlightBtnTitle{font-size:13px!important;font-weight:800!important;color:inherit!important;}',
      '.spotlightBtnSub{font-size:10px!important;font-weight:600!important;color:#64748b!important;}',
      '.spotlightSheet{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(15,23,42,.52);padding:16px;z-index:10004;pointer-events:none;visibility:hidden;}',
      '.spotlightSheet.open{display:flex;pointer-events:auto;visibility:visible;}',
      '.spotlightCard{width:min(100%,390px);background:linear-gradient(180deg,#ffffff 0%,#f8fbff 100%);border:1px solid rgba(148,163,184,.24);border-radius:22px;padding:20px 16px 14px;box-shadow:0 24px 60px rgba(15,23,42,.28);text-align:center;position:relative;}',
      '.spotlightBadge{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;margin:0 auto 10px;background:linear-gradient(135deg,#ede9fe 0%,#dbeafe 100%);color:#5b21b6;font-size:20px;font-weight:800;}',
      '.spotlightTitle{margin:0 0 4px;font-size:18px;font-weight:900;color:#0f172a;}',
      '.spotlightHint{margin:0 0 14px;font-size:12px;line-height:1.5;color:#64748b;}',
      '.spotlightPreview{display:flex;align-items:center;gap:12px;padding:12px;border-radius:16px;background:#fff;border:1px solid #e2e8f0;text-align:start;margin-bottom:12px;}',
      '.spotlightPreviewIcon{width:48px;height:48px;display:grid;place-items:center;border-radius:14px;background:#f8fafc;border:1px solid #e2e8f0;flex-shrink:0;}',
      '.spotlightPreviewText{min-width:0;flex:1;}',
      '.spotlightPreviewTitle{font-size:14px;font-weight:800;color:#0f172a;line-height:1.25;}',
      '.spotlightPreviewSub{font-size:11px;font-weight:600;color:#64748b;line-height:1.35;margin-top:3px;}',
      '.spotlightActions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;}',
      '.spotlightCloseWrap .roster-cta-btn{width:100%;}',
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
    return t('alumni');
  }

  function ensureAlumniButton() {
    var btn = document.getElementById('alumniBtn');
    if (!btn) {
      var secondary = document.querySelector('.quickActions.secondaryBar');
      if (!secondary) return;
      var a = document.createElement('a');
      a.className = 'roster-cta-btn roster-cta-btn--alumni';
      a.id = 'alumniBtn';
      a.href = '#';
      a.innerHTML =
        '<span class="roster-cta-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#0f766e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>' +
        '<span class="roster-cta-label"></span>';
      secondary.appendChild(a);
      btn = document.getElementById('alumniBtn');
    }
    if (!btn) return;
    btn.className = 'roster-cta-btn roster-cta-btn--alumni';
    btn.href = alumniPageUrl();
    var lbl = btn.querySelector('.roster-cta-label');
    if (lbl) lbl.textContent = alumniLabel();
  }

  function ensureSpotlightButton() {
    var footer = document.querySelector('.footer');
    if (!footer || !footer.parentNode) return;
    var bar = document.getElementById('spotlightBar');
    if (!bar) {
      bar = document.createElement('nav');
      bar.id = 'spotlightBar';
      bar.className = 'quickActions spotlightBar';
      bar.setAttribute('aria-label', 'Random suggestion');
      bar.innerHTML =
        '<button type="button" class="roster-cta-btn roster-cta-btn--roster spotlightBtn" id="spotlightBtn">' +
        '<span class="roster-cta-icon" id="spotlightBtnIcon" aria-hidden="true"></span>' +
        '<span class="roster-cta-label spotlightBtnLabel">' +
        '<span class="spotlightBtnTitle" id="spotlightBtnTitle"></span>' +
        '<span class="spotlightBtnSub" id="spotlightBtnSub"></span>' +
        '</span></button>';
      footer.parentNode.insertBefore(bar, footer);
    }
    var item = randomSpotlight();
    bar.dataset.itemId = item.id;
    var btn = document.getElementById('spotlightBtn');
    if (btn) btn.className = 'roster-cta-btn spotlightBtn ' + item.classes;
    var icon = document.getElementById('spotlightBtnIcon');
    if (icon) icon.innerHTML = item.icon;
    var title = document.getElementById('spotlightBtnTitle');
    if (title) title.textContent = item.title;
    var sub = document.getElementById('spotlightBtnSub');
    if (sub) sub.textContent = item.sub || t('spotlightBtnSub');
  }

  function currentSpotlightItem() {
    var bar = document.getElementById('spotlightBar');
    var item = spotlightItems().find(function (x) {
      return bar && x.id === bar.dataset.itemId;
    });
    return item || randomSpotlight();
  }

  function ensureSpotlightPopup() {
    var sheet = document.getElementById('spotlightSheet');
    if (sheet) return sheet;
    sheet = document.createElement('div');
    sheet.id = 'spotlightSheet';
    sheet.className = 'spotlightSheet';
    sheet.setAttribute('aria-hidden', 'true');
    sheet.innerHTML =
      '<div class="spotlightCard" role="dialog" aria-labelledby="spotlightTitle">' +
      '<div class="spotlightBadge">✦</div>' +
      '<h2 class="spotlightTitle" id="spotlightTitle"></h2>' +
      '<p class="spotlightHint" id="spotlightHint"></p>' +
      '<div class="spotlightPreview">' +
      '<div class="spotlightPreviewIcon" id="spotlightPreviewIcon"></div>' +
      '<div class="spotlightPreviewText">' +
      '<div class="spotlightPreviewTitle" id="spotlightPreviewTitle"></div>' +
      '<div class="spotlightPreviewSub" id="spotlightPreviewSub"></div>' +
      '</div></div>' +
      '<div class="spotlightActions">' +
      '<button type="button" class="roster-cta-btn roster-cta-btn--roster" id="spotlightOpenBtn"><span class="roster-cta-label"></span></button>' +
      '<button type="button" class="roster-cta-btn roster-cta-btn--texture" id="spotlightShuffleBtn"><span class="roster-cta-label"></span></button>' +
      '</div>' +
      '<div class="spotlightCloseWrap">' +
      '<button type="button" class="roster-cta-btn roster-cta-btn--muted" id="spotlightCloseBtn"><span class="roster-cta-label"></span></button>' +
      '</div></div>';
    document.body.appendChild(sheet);
    return sheet;
  }

  function paintSpotlightPopup(item) {
    ensureSpotlightPopup();
    document.getElementById('spotlightTitle').textContent = t('spotlightTitle');
    document.getElementById('spotlightHint').textContent = t('spotlightHint');
    document.getElementById('spotlightPreviewIcon').innerHTML = item.icon;
    document.getElementById('spotlightPreviewTitle').textContent = item.title;
    document.getElementById('spotlightPreviewSub').textContent = item.sub;
    document.querySelector('#spotlightOpenBtn .roster-cta-label').textContent = t('spotlightOpen');
    document.querySelector('#spotlightShuffleBtn .roster-cta-label').textContent = t('spotlightShuffle');
    document.querySelector('#spotlightCloseBtn .roster-cta-label').textContent = t('spotlightClose');
    document.getElementById('spotlightSheet').dataset.itemId = item.id;
  }

  function openSpotlightPopup() {
    var item = currentSpotlightItem();
    paintSpotlightPopup(item);
    var sheet = document.getElementById('spotlightSheet');
    if (!sheet) return;
    closeShareIfOpen();
    closeModal();
    sheet.classList.add('open');
    sheet.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeSpotlightPopup() {
    var sheet = document.getElementById('spotlightSheet');
    if (!sheet) return;
    sheet.classList.remove('open');
    sheet.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function bindSpotlightUi() {
    document.getElementById('spotlightBtn')?.addEventListener('click', function (e) {
      e.preventDefault();
      openSpotlightPopup();
    });
    document.getElementById('spotlightOpenBtn')?.addEventListener('click', function () {
      closeSpotlightPopup();
      openHref(currentSpotlightItem());
    });
    document.getElementById('spotlightShuffleBtn')?.addEventListener('click', function () {
      paintSpotlightPopup(randomSpotlight(currentSpotlightItem().id));
    });
    document.getElementById('spotlightCloseBtn')?.addEventListener('click', closeSpotlightPopup);
    document.getElementById('spotlightSheet')?.addEventListener('click', function (e) {
      if (e.target === e.currentTarget) closeSpotlightPopup();
    });
  }

  function init() {
    injectCompactStyles();
    ensureAlumniButton();
    ensureSpotlightButton();
    ensureSpotlightPopup();
    bindUi();
    bindSpotlightUi();
    applyI18n();
    ensureAlumniButton();
    ensureSpotlightButton();
    patchCalcLink();
    patchQuicklistLink();
    try {
      if (!sessionStorage.getItem('spotlightShown')) {
        sessionStorage.setItem('spotlightShown', '1');
        window.setTimeout(openSpotlightPopup, 700);
      }
    } catch (e) {
      window.setTimeout(openSpotlightPopup, 700);
    }
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
