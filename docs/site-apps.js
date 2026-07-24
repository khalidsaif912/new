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
      gamePairs: 'Picture Pairs',
      gamePairsSub: 'Match A1 ↔ A2',
      gameSimilarity: 'Similarity',
      gameSimilaritySub: 'Match A2 with A2',
      gameQuiz: 'The Question',
      gameQuizSub: 'Quiz with choices',
      gameAirLogo: 'Air Logo',
      gameAirLogoSub: 'Airline logo challenge',
      gameCargoDash: 'Cargo Dash',
      gameCargoDashSub: 'Accept or reject shipments',
      store: 'Mobhar Store · متجر مُبهر',
      storeSub: 'Electronics & gadgets',
      alumni: 'Former Colleagues',
      spotlightBtn: 'Surprise me',
      spotlightBtnSub: 'A quick pick from the site',
      spotlightTitle: 'For you',
      spotlightHint: 'Tap the card to open',
      spotlightOpen: 'Open now',
      spotlightShuffle: 'Another pick',
      spotlightClose: 'Close',
      spotlightTap: 'Tap to open',
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
      gamePairs: 'قرائن الصور',
      gamePairsSub: 'قرائن A1 ↔ A2',
      gameSimilarity: 'التشابه العادي',
      gameSimilaritySub: 'A2 مع A2',
      gameQuiz: 'السؤال',
      gameQuizSub: 'سؤال وخيارات',
      gameAirLogo: 'Air Logo',
      gameAirLogoSub: 'لعبة شعارات الطيران',
      gameCargoDash: 'شريط التفتيش',
      gameCargoDashSub: 'قبول أو رفض الشحنات',
      store: 'متجر مُبهر · Mobhar Store',
      storeSub: 'أجهزة وتسوق',
      alumni: 'زملاء سابقون',
      spotlightBtn: 'اقتراح',
      spotlightBtnSub: 'شيء جميل من الموقع',
      spotlightTitle: 'اقتراح لك',
      spotlightHint: 'اضغط على البطاقة للفتح',
      spotlightOpen: 'افتح الآن',
      spotlightShuffle: 'اقتراح آخر',
      spotlightClose: 'إغلاق',
      spotlightTap: 'اضغط للفتح',
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

  function appsAsset(name) {
    var root = typeof getSiteRootUrl === 'function' ? getSiteRootUrl() : '';
    return root + '/assets/icons/' + name;
  }

  /* Flat illustrated icons (Flaticon-like: bold outline + color fills) */
  var APP_ICONS = {
    flights:
      '<svg class="siteAppsFlatSvg" viewBox="0 0 64 64" width="30" height="30" aria-hidden="true">' +
      '<ellipse cx="32" cy="56" rx="18" ry="4" fill="#bae6fd" opacity=".55"/>' +
      '<path d="M10 36c8-2 18-14 22-22 1.2-2.4 4.8-2.2 5.6.4L42 30l14 4c2.2.6 2.2 3.6 0 4.2L42 42l-4.4 15.2c-.8 2.6-4.4 2.8-5.6.4C28 50 16 40 10 38c-2-.6-2-1.8 0-2z" fill="#38bdf8" stroke="#0f172a" stroke-width="2.4" stroke-linejoin="round"/>' +
      '<path d="M28 34 16 28" stroke="#0f172a" stroke-width="2.4" stroke-linecap="round"/>' +
      '<circle cx="40" cy="34" r="2.2" fill="#fff"/>' +
      '</svg>',
    labels:
      '<svg class="siteAppsFlatSvg" viewBox="0 0 64 64" width="30" height="30" aria-hidden="true">' +
      '<path d="M10 12h24l18 18-22 22L8 34V12z" fill="#34d399" stroke="#0f172a" stroke-width="2.4" stroke-linejoin="round"/>' +
      '<path d="M10 12h24l18 18-6 6L28 18H10z" fill="#6ee7b7"/>' +
      '<circle cx="22" cy="24" r="4.2" fill="#fff" stroke="#0f172a" stroke-width="2"/>' +
      '<path d="M30 42l8-8" stroke="#0f172a" stroke-width="2.2" stroke-linecap="round"/>' +
      '</svg>',
    calc:
      '<svg class="siteAppsFlatSvg" viewBox="0 0 64 64" width="30" height="30" aria-hidden="true">' +
      '<rect x="12" y="6" width="40" height="52" rx="8" fill="#fbbf24" stroke="#0f172a" stroke-width="2.4"/>' +
      '<rect x="18" y="12" width="28" height="12" rx="4" fill="#fff7ed" stroke="#0f172a" stroke-width="2"/>' +
      '<rect x="18" y="30" width="10" height="8" rx="2" fill="#fff" stroke="#0f172a" stroke-width="1.8"/>' +
      '<rect x="31" y="30" width="10" height="8" rx="2" fill="#fff" stroke="#0f172a" stroke-width="1.8"/>' +
      '<rect x="44" y="30" width="4" height="8" rx="1.5" fill="#fb7185" stroke="#0f172a" stroke-width="1.6"/>' +
      '<rect x="18" y="42" width="10" height="8" rx="2" fill="#fff" stroke="#0f172a" stroke-width="1.8"/>' +
      '<rect x="31" y="42" width="10" height="8" rx="2" fill="#fff" stroke="#0f172a" stroke-width="1.8"/>' +
      '<rect x="44" y="42" width="4" height="8" rx="1.5" fill="#38bdf8" stroke="#0f172a" stroke-width="1.6"/>' +
      '</svg>',
    quicklist:
      '<svg class="siteAppsFlatSvg" viewBox="0 0 64 64" width="30" height="30" aria-hidden="true">' +
      '<path d="M18 18h28l4 34H14l4-34z" fill="#c4b5fd" stroke="#0f172a" stroke-width="2.4" stroke-linejoin="round"/>' +
      '<path d="M22 18a10 10 0 0 1 20 0" fill="none" stroke="#0f172a" stroke-width="2.4" stroke-linecap="round"/>' +
      '<path d="M18 18h28l-2 10H20z" fill="#a78bfa"/>' +
      '<circle cx="26" cy="40" r="2.4" fill="#0f172a"/><circle cx="38" cy="40" r="2.4" fill="#0f172a"/>' +
      '</svg>',
    store:
      '<svg class="siteAppsFlatSvg siteAppsStoreSvg" viewBox="0 0 64 64" width="30" height="30" aria-hidden="true">' +
      '<path d="M10 24h44v28a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4V24z" fill="#fdba74" stroke="#0f172a" stroke-width="2.4"/>' +
      '<path d="M8 24l6-12h36l6 12H8z" fill="#fb923c" stroke="#0f172a" stroke-width="2.4" stroke-linejoin="round"/>' +
      '<path d="M8 24h48" stroke="#0f172a" stroke-width="2.2"/>' +
      '<rect x="26" y="34" width="12" height="22" rx="2" fill="#fff7ed" stroke="#0f172a" stroke-width="2"/>' +
      '<rect x="16" y="32" width="8" height="10" rx="1.5" fill="#fff" stroke="#0f172a" stroke-width="1.8"/>' +
      '<rect x="40" y="32" width="8" height="10" rx="1.5" fill="#fff" stroke="#0f172a" stroke-width="1.8"/>' +
      '</svg>',
    games: null
  };

  function gamesIconHtml() {
    return (
      '<img class="siteAppsFlatImg" src="' +
      appsAsset('app-games.png') +
      '" width="30" height="30" alt="" decoding="async">'
    );
  }

  function iconForApp(id) {
    if (id === 'games') return gamesIconHtml();
    return APP_ICONS[id] || '';
  }

  function upgradeAppIcons() {
    var grid = document.getElementById('siteAppsGrid');
    if (!grid) return;
    grid.querySelectorAll('.siteAppsLink[data-app-id]').forEach(function (link) {
      var id = link.getAttribute('data-app-id');
      var icon = link.querySelector('.siteAppsLink-icon');
      var html = iconForApp(id);
      if (icon && html) icon.innerHTML = html;
    });
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
    upgradeAppIcons();
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
        id: 'flights',
        title: t('flights'),
        sub: t('flightsSub'),
        href: 'https://khalidsaif912.github.io/live-flights/',
        external: true,
        classes: 'roster-cta-btn--apps',
        icon: iconForApp('flights')
      },
      {
        id: 'labels',
        title: t('labels'),
        sub: t('labelsSub'),
        href: 'https://lbit.netlify.app/',
        external: true,
        classes: 'roster-cta-btn--texture',
        icon: iconForApp('labels')
      },
      {
        id: 'calc',
        title: t('calc'),
        sub: t('calcSub'),
        href: calcPageUrl(),
        external: false,
        classes: 'roster-cta-btn--roster',
        icon: iconForApp('calc')
      },
      {
        id: 'quicklist',
        title: t('quicklist'),
        sub: t('quicklistSub'),
        href: quicklistPageUrl(),
        external: false,
        classes: 'roster-cta-btn--texture',
        icon: iconForApp('quicklist')
      },
      {
        id: 'store',
        title: t('store'),
        sub: t('storeSub'),
        href: 'https://mystore-96d8e.web.app',
        external: true,
        classes: 'roster-cta-btn--roster',
        icon: iconForApp('store')
      },
      {
        id: 'gamePairs',
        title: t('gamePairs'),
        sub: t('gamePairsSub'),
        href: 'https://dgr-exp.netlify.app/m1/pairs.html',
        external: true,
        classes: 'roster-cta-btn--apps',
        icon: '<span style="font-size:22px;line-height:1">🧩</span>'
      },
      {
        id: 'gameSimilarity',
        title: t('gameSimilarity'),
        sub: t('gameSimilaritySub'),
        href: 'https://dgr-exp.netlify.app/g2/similarity.html',
        external: true,
        classes: 'roster-cta-btn--apps',
        icon: '<span style="font-size:22px;line-height:1">🧠</span>'
      },
      {
        id: 'gameQuiz',
        title: t('gameQuiz'),
        sub: t('gameQuizSub'),
        href: 'https://dgr-exp.netlify.app/Q/Q.HTML',
        external: true,
        classes: 'roster-cta-btn--apps',
        icon: '<span style="font-size:22px;line-height:1">🎯</span>'
      },
      {
        id: 'gameAirLogo',
        title: t('gameAirLogo'),
        sub: t('gameAirLogoSub'),
        href: 'https://dgr-exp.netlify.app/g1/airlogo.html',
        external: true,
        classes: 'roster-cta-btn--apps',
        icon: '<span style="font-size:22px;line-height:1">✈️</span>'
      },
      {
        id: 'gameCargoDash',
        title: t('gameCargoDash'),
        sub: t('gameCargoDashSub'),
        href: 'https://dgr-exp.netlify.app/g3/cargo-dash.html',
        external: true,
        classes: 'roster-cta-btn--apps',
        icon: '<span style="font-size:22px;line-height:1">📦</span>'
      },
      {
        id: 'book',
        title: t('pickBook'),
        sub: t('pickBookSub'),
        href: bookPageUrl(),
        external: false,
        classes: 'roster-cta-btn--alumni',
        icon: '<svg class="siteAppsFlatSvg" viewBox="0 0 64 64" width="22" height="22" aria-hidden="true"><path d="M12 10h18c6 0 10 4 10 10v34c0-4-4-8-10-8H12V10z" fill="#5eead4" stroke="#0f172a" stroke-width="2.2"/><path d="M52 10H34c-6 0-10 4-10 10v34c0-4 4-8 10-8h18V10z" fill="#99f6e4" stroke="#0f172a" stroke-width="2.2"/></svg>'
      },
      {
        id: 'alumni',
        title: t('pickAlumni'),
        sub: t('pickAlumniSub'),
        href: alumniPageUrl(),
        external: false,
        classes: 'roster-cta-btn--alumni',
        icon: '<svg class="siteAppsFlatSvg" viewBox="0 0 64 64" width="22" height="22" aria-hidden="true"><circle cx="24" cy="22" r="10" fill="#5eead4" stroke="#0f172a" stroke-width="2.2"/><circle cx="42" cy="24" r="8" fill="#99f6e4" stroke="#0f172a" stroke-width="2.2"/><path d="M8 54c2-10 10-16 16-16s14 6 16 16" fill="#ccfbf1" stroke="#0f172a" stroke-width="2.2"/><path d="M34 54c1-8 7-12 12-12s9 4 10 12" fill="#99f6e4" stroke="#0f172a" stroke-width="2.2"/></svg>'
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
      '.quickActions.spotlightBar{display:none!important;}',
      '.spotlightSheet{position:fixed;inset:0;display:none;align-items:flex-end;justify-content:center;background:rgba(15,23,42,.45);padding:12px 12px calc(12px + env(safe-area-inset-bottom,0px));z-index:10004;pointer-events:none;visibility:hidden;}',
      '@media (min-width:520px){.spotlightSheet{align-items:center;padding:16px;}}',
      '.spotlightSheet.open{display:flex;pointer-events:auto;visibility:visible;}',
      '.spotlightCard{width:min(100%,320px);background:linear-gradient(180deg,#ffffff 0%,#f7faff 100%);border:1px solid rgba(148,163,184,.22);border-radius:20px;padding:14px 14px 12px;box-shadow:0 18px 48px rgba(15,23,42,.28);text-align:center;position:relative;animation:spotlightPop .22s ease-out;}',
      '@keyframes spotlightPop{from{opacity:0;transform:translateY(10px) scale(.96)}to{opacity:1;transform:none}}',
      '.spotlightCloseX{position:absolute;top:8px;inset-inline-end:8px;width:28px;height:28px;border:none;border-radius:999px;background:rgba(15,23,42,.06);color:#64748b;font-size:16px;line-height:1;cursor:pointer;display:grid;place-items:center;}',
      '.spotlightBadge{width:36px;height:36px;border-radius:12px;display:grid;place-items:center;margin:0 auto 8px;overflow:hidden;background:linear-gradient(135deg,#fef3c7 0%,#dbeafe 100%);box-shadow:0 4px 12px rgba(15,23,42,.08);}',
      '.spotlightBadge img{width:28px;height:28px;object-fit:contain;display:block;}',
      '.spotlightTitle{margin:0 0 2px;font-size:16px;font-weight:900;color:#0f172a;}',
      '.spotlightHint{margin:0 0 10px;font-size:11px;line-height:1.4;color:#64748b;}',
      '.spotlightPreview{display:flex;align-items:center;gap:10px;padding:11px;border-radius:16px;background:#fff;border:1.5px solid #dbeafe;text-align:start;margin:0;cursor:pointer;width:100%;font:inherit;color:inherit;box-shadow:0 6px 16px rgba(37,99,235,.08);transition:transform .15s,box-shadow .15s,border-color .15s;}',
      '.spotlightPreview:hover,.spotlightPreview:focus-visible{transform:translateY(-1px);border-color:#93c5fd;box-shadow:0 10px 22px rgba(37,99,235,.14);outline:none;}',
      '.spotlightPreviewIcon{width:46px;height:46px;display:grid;place-items:center;border-radius:14px;background:#f8fafc;border:1px solid #e2e8f0;flex-shrink:0;overflow:hidden;}',
      '.spotlightPreviewIcon svg,.spotlightPreviewIcon img{width:28px;height:28px;object-fit:contain;display:block;}',
      '.spotlightPreviewText{min-width:0;flex:1;text-align:start;}',
      '.spotlightPreviewTitle{font-size:13.5px;font-weight:800;color:#0f172a;line-height:1.25;}',
      '.spotlightPreviewSub{font-size:10.5px;font-weight:600;color:#64748b;line-height:1.35;margin-top:2px;}',
      '.spotlightPreviewGo{flex-shrink:0;font-size:10px;font-weight:800;color:#2563eb;background:#eff6ff;border-radius:999px;padding:5px 8px;white-space:nowrap;}',
      '#spotlightEmojiBtn{position:absolute;z-index:31;width:40px;height:40px;padding:0;border:none;border-radius:999px;background:rgba(255,255,255,.18);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);box-shadow:0 4px 14px rgba(0,0,0,.22),inset 0 0 0 1px rgba(255,255,255,.28);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;line-height:0;-webkit-tap-highlight-color:transparent;touch-action:manipulation;transition:transform .18s ease,box-shadow .18s ease,opacity .18s ease;}',
      '#spotlightEmojiBtn:hover{transform:scale(1.08);opacity:.96;}',
      '#spotlightEmojiBtn img{width:30px;height:30px;object-fit:contain;display:block;filter:drop-shadow(0 1px 2px rgba(0,0,0,.35));pointer-events:none;}',
      '#spotlightEmojiBtn.corner-bl{left:12px;bottom:12px;right:auto;top:auto;}',
      '#spotlightEmojiBtn.corner-br{right:12px;bottom:12px;left:auto;top:auto;}',
      '@media (max-width:720px){#spotlightEmojiBtn{width:44px;height:44px;}#spotlightEmojiBtn img{width:32px;height:32px;}}',
      'html.header-chrome-dim #spotlightEmojiBtn{opacity:.22!important;filter:saturate(.55)!important;}',
      '.langToggle,.banner-changer-btn,#banner-changer-btn{border-radius:999px!important;}',
      '.langToggle{width:40px!important;min-height:40px!important;padding:4px!important;background:rgba(255,255,255,.14)!important;backdrop-filter:blur(8px)!important;-webkit-backdrop-filter:blur(8px)!important;box-shadow:0 4px 14px rgba(0,0,0,.18),inset 0 0 0 1px rgba(255,255,255,.22)!important;}',
      '#banner-changer-btn{width:40px!important;height:40px!important;background:rgba(255,255,255,.14)!important;backdrop-filter:blur(8px)!important;-webkit-backdrop-filter:blur(8px)!important;box-shadow:0 4px 14px rgba(0,0,0,.18),inset 0 0 0 1px rgba(255,255,255,.22)!important;}',
      '@media (max-width:720px){.langToggle,#banner-changer-btn{width:44px!important;height:44px!important;min-height:44px!important;}}',
      '.spotlightActions,.spotlightCloseWrap{display:none!important;}',
      '.siteAppsSheet{padding:12px!important;overscroll-behavior:none;background:rgba(15,23,42,.5)!important;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);}',
      '.siteAppsCard{width:min(100%,400px)!important;max-height:calc(100vh - 24px)!important;max-height:calc(100dvh - 24px)!important;overflow:hidden!important;display:flex!important;flex-direction:column!important;padding:16px 14px 12px!important;border-radius:22px!important;border:1px solid rgba(148,163,184,.22)!important;background:linear-gradient(180deg,#ffffff 0%,#f5f9ff 100%)!important;box-shadow:0 28px 70px rgba(15,23,42,.28)!important;-webkit-overflow-scrolling:auto!important;}',
      '.siteAppsTitle{font-size:17px!important;margin:0 0 2px!important;flex-shrink:0;letter-spacing:-.01em;}',
      '.siteAppsHint{font-size:12px!important;margin:0 0 12px!important;line-height:1.4!important;flex-shrink:0;color:#64748b!important;}',
      '.siteAppsGrid{gap:10px!important;margin-bottom:10px!important;min-height:0;flex:1 1 auto;align-content:start;}',
      '.siteAppsLink{min-height:0!important;padding:12px 8px!important;gap:8px!important;border-radius:16px!important;background:#fff!important;border:1px solid #e2e8f0!important;box-shadow:0 4px 14px rgba(15,23,42,.04)!important;}',
      '.siteAppsLink-icon{width:48px!important;height:48px!important;border-radius:16px!important;flex-shrink:0;box-shadow:0 6px 14px rgba(15,23,42,.08)!important;}',
      '.siteAppsLink-icon svg,.siteAppsFlatSvg{width:30px!important;height:30px!important;display:block;}',
      '.siteAppsFlatImg{width:30px!important;height:30px!important;object-fit:contain;display:block;filter:drop-shadow(0 2px 4px rgba(15,23,42,.12));}',
      '.siteAppsLink-text{display:flex;flex-direction:column;align-items:center;gap:2px;min-width:0;}',
      '.siteAppsLink-title{font-size:12px!important;line-height:1.25!important;font-weight:800!important;}',
      '.siteAppsLink-sub{font-size:10px!important;line-height:1.3!important;}',
      '.siteAppsLink--flights .siteAppsLink-icon{background:linear-gradient(160deg,#e0f2fe,#bae6fd)!important;border-color:#7dd3fc!important;}',
      '.siteAppsLink--labels .siteAppsLink-icon{background:linear-gradient(160deg,#ecfdf5,#a7f3d0)!important;border-color:#6ee7b7!important;}',
      '.siteAppsLink--calc .siteAppsLink-icon{background:linear-gradient(160deg,#fffbeb,#fde68a)!important;border-color:#fbbf24!important;}',
      '.siteAppsLink--quicklist .siteAppsLink-icon{background:linear-gradient(160deg,#f5f3ff,#ddd6fe)!important;border-color:#c4b5fd!important;}',
      '.siteAppsLink--store{background:linear-gradient(135deg,#fff7ed 0%,#ffedd5 100%)!important;border-color:#fdba74!important;}',
      '.siteAppsLink--games{background:linear-gradient(135deg,#fdf2f8 0%,#fce7f3 100%)!important;border-color:#f9a8d4!important;}',
      '.siteAppsLink--store .siteAppsLink-icon{background:linear-gradient(160deg,#ffedd5,#fdba74)!important;border-color:#fb923c!important;}',
      '.siteAppsLink--games .siteAppsLink-icon{background:linear-gradient(160deg,#fce7f3,#fbcfe8)!important;border-color:#f9a8d4!important;}',
      '.siteAppsLink--store,.siteAppsLink--games{min-height:64px!important;padding:10px 14px!important;gap:12px!important;}',
      '.siteAppsLink--store .siteAppsLink-text,.siteAppsLink--games .siteAppsLink-text{align-items:flex-start;flex:1;}',
      '.siteAppsCloseWrap{margin-top:4px!important;flex-shrink:0;}',
      '.siteAppsCloseWrap .roster-cta-btn{width:100%;min-height:42px;padding-top:9px;padding-bottom:9px;border-radius:14px!important;}',
      '@media (hover:hover){.siteAppsLink:hover{transform:translateY(-2px)!important;box-shadow:0 10px 22px rgba(15,23,42,.1)!important;}}',
      '@media (max-height:720px){',
      '.siteAppsHint{display:none!important;}',
      '.siteAppsCard{padding:12px 12px 10px!important;border-radius:18px!important;}',
      '.siteAppsGrid{gap:8px!important;margin-bottom:8px!important;}',
      '.siteAppsLink{padding:8px 6px!important;gap:6px!important;}',
      '.siteAppsLink-icon{width:42px!important;height:42px!important;border-radius:14px!important;}',
      '.siteAppsLink-icon svg,.siteAppsFlatSvg,.siteAppsFlatImg{width:26px!important;height:26px!important;}',
      '.siteAppsLink-title{font-size:11px!important;}',
      '.siteAppsLink-sub{display:none!important;}',
      '.siteAppsLink--store,.siteAppsLink--games{min-height:52px!important;padding:8px 12px!important;}',
      '.siteAppsTitle{font-size:15px!important;}',
      '}',
      '@media (max-height:560px){',
      '.siteAppsSheet{padding:8px!important;}',
      '.siteAppsCard{max-height:calc(100vh - 16px)!important;max-height:calc(100dvh - 16px)!important;padding:10px!important;}',
      '.siteAppsGrid{gap:6px!important;}',
      '.siteAppsLink{padding:6px 5px!important;border-radius:12px!important;}',
      '.siteAppsLink-icon{width:34px!important;height:34px!important;}',
      '.siteAppsLink-icon svg,.siteAppsFlatSvg,.siteAppsFlatImg{width:22px!important;height:22px!important;}',
      '.siteAppsCloseWrap .roster-cta-btn{min-height:36px;padding-top:6px;padding-bottom:6px;font-size:13px;}',
      '}'
    ].join('');
    document.head.appendChild(style);
  }

  function bindUi() {
    var sheet = document.getElementById('siteAppsSheet');
    if (!sheet) return;
    upgradeAppIcons();
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

  var SPOTLIGHT_EMOJIS = [
    'cool.png',
    'cool2.png',
    'grin.png',
    'heart-eyes.png',
    'starstruck.png',
    'surprised.png',
    'astonished.png',
    'thinking.png',
    'angry.png',
    'frown.png'
  ];

  function emojiAssetUrl(name) {
    if (typeof getSiteRootUrl === 'function') {
      return getSiteRootUrl() + '/assets/emojis/' + name;
    }
    return 'https://khalidsaif912.github.io/new/docs/assets/emojis/' + name;
  }

  function pickRandomEmoji() {
    return SPOTLIGHT_EMOJIS[Math.floor(Math.random() * SPOTLIGHT_EMOJIS.length)];
  }

  function pickRandomCorner() {
    return Math.random() < 0.5 ? 'corner-bl' : 'corner-br';
  }

  function ensureSpotlightEmojiButton() {
    var header = document.querySelector('.header, .topbar');
    if (!header) return;
    if (getComputedStyle(header).position === 'static') {
      header.style.position = 'relative';
    }
    var btn = document.getElementById('spotlightEmojiBtn');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'spotlightEmojiBtn';
      btn.type = 'button';
      btn.innerHTML = '<img alt="" width="30" height="30" decoding="async">';
      header.appendChild(btn);
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        openSpotlightPopup(true);
      });
    }
    var emoji = pickRandomEmoji();
    var corner = pickRandomCorner();
    btn.className = corner;
    btn.title = t('spotlightBtn');
    btn.setAttribute('aria-label', t('spotlightBtn'));
    var img = btn.querySelector('img');
    if (img) {
      img.src = emojiAssetUrl(emoji);
      img.alt = '';
    }
    btn.dataset.emoji = emoji;
  }

  function ensureSpotlightButton() {
    /* Bottom suggestion bar replaced by banner emoji button. */
    var bar = document.getElementById('spotlightBar');
    if (bar) bar.style.display = 'none';
    ensureSpotlightEmojiButton();
  }

  function currentSpotlightItem() {
    var sheet = document.getElementById('spotlightSheet');
    var item = spotlightItems().find(function (x) {
      return sheet && x.id === sheet.dataset.itemId;
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
      '<button type="button" class="spotlightCloseX" id="spotlightCloseBtn" aria-label="Close">×</button>' +
      '<div class="spotlightBadge" id="spotlightBadge"></div>' +
      '<h2 class="spotlightTitle" id="spotlightTitle"></h2>' +
      '<p class="spotlightHint" id="spotlightHint"></p>' +
      '<button type="button" class="spotlightPreview" id="spotlightPreviewBtn">' +
      '<div class="spotlightPreviewIcon" id="spotlightPreviewIcon"></div>' +
      '<div class="spotlightPreviewText">' +
      '<div class="spotlightPreviewTitle" id="spotlightPreviewTitle"></div>' +
      '<div class="spotlightPreviewSub" id="spotlightPreviewSub"></div>' +
      '</div>' +
      '<span class="spotlightPreviewGo" id="spotlightPreviewGo"></span>' +
      '</button></div>';
    document.body.appendChild(sheet);
    return sheet;
  }

  function paintSpotlightPopup(item) {
    ensureSpotlightPopup();
    var emojiBtn = document.getElementById('spotlightEmojiBtn');
    var badge = document.getElementById('spotlightBadge');
    if (badge) {
      var emoji = (emojiBtn && emojiBtn.dataset.emoji) || pickRandomEmoji();
      badge.innerHTML = '<img src="' + emojiAssetUrl(emoji) + '" alt="" width="28" height="28">';
    }
    document.getElementById('spotlightTitle').textContent = t('spotlightTitle');
    document.getElementById('spotlightHint').textContent = t('spotlightHint');
    document.getElementById('spotlightPreviewIcon').innerHTML = item.icon;
    document.getElementById('spotlightPreviewTitle').textContent = item.title;
    document.getElementById('spotlightPreviewSub').textContent = item.sub;
    var go = document.getElementById('spotlightPreviewGo');
    if (go) go.textContent = t('spotlightTap');
    document.getElementById('spotlightSheet').dataset.itemId = item.id;
  }

  function openSpotlightPopup(fresh) {
    var item = fresh ? randomSpotlight() : currentSpotlightItem();
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
    ensureSpotlightPopup();
    document.getElementById('spotlightPreviewBtn')?.addEventListener('click', function () {
      var item = currentSpotlightItem();
      closeSpotlightPopup();
      openHref(item);
    });
    document.getElementById('spotlightCloseBtn')?.addEventListener('click', closeSpotlightPopup);
    document.getElementById('spotlightSheet')?.addEventListener('click', function (e) {
      if (e.target === e.currentTarget) closeSpotlightPopup();
    });
    document.addEventListener('keydown', function (e) {
      var sheet = document.getElementById('spotlightSheet');
      if (e.key === 'Escape' && sheet && sheet.classList.contains('open')) closeSpotlightPopup();
    });
  }

  // Temporarily disable auto random-pick popup (WC celebration period).
  var SPOTLIGHT_AUTO_POPUP = false;

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
    if (!SPOTLIGHT_AUTO_POPUP) return;
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
