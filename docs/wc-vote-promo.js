/**
 * wc-vote-promo.js — World Cup fan voting promo (match-accb0)
 * Arabic-first popup; floating trophy icon after dismiss (right of change-alert bell).
 */
(function () {
  'use strict';

  var VOTE_URL = 'https://match-accb0.web.app/?utm_source=roster-site&utm_medium=popup';
  var STORAGE_KEY = 'wcVotePromoDismissed_v1';
  var PROMO_LANG_KEY = 'wcVotePromoLang';
  var STYLE_ID = 'wc-vote-promo-styles';
  var SHEET_ID = 'wcVotePromoSheet';
  var DOT_ID = 'wc-vote-dot';

  var I18N = {
    en: {
      trial: 'Trial',
      badge: 'World Cup 2026',
      title: 'Vote for your team!',
      sub: 'Join the global fan ranking — one vote every 24 hours. Live results.',
      cta: 'Vote now',
      later: 'Maybe later',
      close: 'Close',
      langBtn: 'ع',
      langAria: 'Arabic',
      dotAria: 'Open World Cup vote trial',
    },
    ar: {
      trial: 'تجربة',
      badge: 'كأس العالم 2026',
      title: 'ترتيب جماهير',
      sub: 'صوّت لمنتخبك المفضل وساعده على الوصول إلى المركز الأول في التصنيف الجماهيري العالمي',
      cta: 'صوّت الآن',
      later: 'لاحقاً',
      close: 'إغلاق',
      langBtn: 'EN',
      langAria: 'English',
      dotAria: 'فتح تجربة التصويت لكأس العالم',
    },
  };

  function lang() {
    try {
      var pl = localStorage.getItem(PROMO_LANG_KEY);
      if (pl === 'ar' || pl === 'en') return pl;
    } catch (e) {}
    return 'ar';
  }

  function t(key) {
    var pack = I18N[lang()] || I18N.ar;
    return pack[key] || I18N.ar[key] || key;
  }

  var TROPHY_ICON_VER = '20260604g';

  function getDocsAssetRoot() {
    var path = location.pathname || '/';
    if (location.protocol === 'file:') {
      return path.indexOf('/import/') !== -1 ? '../../..' : '../..';
    }
    if (path.indexOf('/roster-site/') !== -1) return '/roster-site';
    if (location.hostname && location.hostname.indexOf('github.io') !== -1) {
      var segs = path.split('/').filter(Boolean);
      var docsIdx = segs.indexOf('docs');
      if (docsIdx >= 0) return '/' + segs.slice(0, docsIdx + 1).join('/');
      if (segs.length >= 2 && segs[1] === 'docs') return '/' + segs[0] + '/docs';
      return segs.length ? '/' + segs[0] : '';
    }
    return '';
  }

  function getTrophyIconUrl() {
    var root = getDocsAssetRoot();
    if (location.protocol === 'file:') {
      return root + '/assets/icons/wc-trophy.png';
    }
    return root + '/assets/icons/wc-trophy.png';
  }

  /** Same flat gold cup as reference asset (PNG), not a hand-drawn SVG. */
  function trophyIconHtml(size) {
    var src = getTrophyIconUrl() + '?v=' + TROPHY_ICON_VER;
    return (
      '<img class="wc-trophy-icon-img" src="' +
      src +
      '" width="' +
      size +
      '" height="' +
      size +
      '" alt="" decoding="async" draggable="false"/>'
    );
  }

  function isDismissed() {
    try {
      if ((new URLSearchParams(location.search).get('wcvote') || '') === '1') return false;
      return sessionStorage.getItem(STORAGE_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function shouldAutoOpen() {
    try {
      if ((new URLSearchParams(location.search).get('wcvote') || '') === '1') return true;
      if (sessionStorage.getItem(STORAGE_KEY) === '1') return false;
    } catch (e) {}
    return true;
  }

  function dismiss() {
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch (e) {}
    closeSheet();
    showFloatingDot();
  }

  function togglePromoLang() {
    var next = lang() === 'ar' ? 'en' : 'ar';
    try {
      localStorage.setItem(PROMO_LANG_KEY, next);
    } catch (e) {}
    applyI18n();
  }

  function injectStyles() {
    var css =
      '#' +
      SHEET_ID +
      '.wcVotePromoSheet{' +
      'position:fixed;inset:0;z-index:10050;display:flex;align-items:center;justify-content:center;' +
      'padding:16px;background:rgba(15,23,42,.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);' +
      'opacity:0;visibility:hidden;pointer-events:none;transition:opacity .35s ease,visibility .35s;' +
      '}' +
      '#' +
      SHEET_ID +
      '.wcVotePromoSheet.is-open{opacity:1;visibility:visible;pointer-events:auto;}' +
      '.wcVotePromoCard{' +
      'width:min(100%,380px);border-radius:22px;overflow:hidden;' +
      'background:linear-gradient(165deg,#0a1520 0%,#111e2e 55%,#0f1e2e 100%);' +
      'border:1px solid rgba(255,215,0,.35);box-shadow:0 24px 60px rgba(0,0,0,.45),0 0 40px rgba(255,215,0,.12);' +
      'color:#e8f4f8;text-align:center;transform:translateY(12px) scale(.96);' +
      'transition:transform .4s cubic-bezier(.34,1.56,.64,1);' +
      '}' +
      '#' +
      SHEET_ID +
      '.is-open .wcVotePromoCard{transform:translateY(0) scale(1);}' +
      '.wcVotePromoHero{padding:22px 18px 14px;position:relative;}' +
      '.wcVotePromoClose,.wcVotePromoLangToggle{position:absolute;top:10px;width:36px;height:36px;border-radius:50%;' +
      'border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:#8ab4cc;' +
      'font-size:13px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;' +
      '-webkit-tap-highlight-color:transparent;letter-spacing:.02em;}' +
      '.wcVotePromoClose{left:10px;font-size:18px;}' +
      '.wcVotePromoLangToggle{right:10px;}' +
      '[dir="rtl"] .wcVotePromoClose{left:auto;right:10px;}' +
      '[dir="rtl"] .wcVotePromoLangToggle{right:auto;left:10px;}' +
      '.wcVotePromoTrial{display:inline-block;margin:0 0 6px;padding:4px 14px;border-radius:999px;' +
      'font-size:13px;font-weight:900;letter-spacing:.06em;color:#0a1520;' +
      'background:linear-gradient(135deg,#FFD700,#f59e0b);box-shadow:0 4px 14px rgba(255,215,0,.35);}' +
      '.wcVotePromoBadge{display:inline-block;font-size:11px;font-weight:800;letter-spacing:.12em;' +
      'text-transform:uppercase;color:#00d4ff;margin-bottom:8px;}' +
      '[dir="rtl"] .wcVotePromoBadge{letter-spacing:.04em;text-transform:none;font-size:12px;}' +
      '.wcVotePromoTrophy{display:flex;justify-content:center;margin:6px 0 8px;line-height:0;}' +
      '.wcVotePromoTrophy .wc-trophy-icon-img{filter:drop-shadow(0 3px 8px rgba(15,23,42,.18)) drop-shadow(0 1px 3px rgba(0,0,0,.1));animation:wcTrophyHero 2.5s ease-in-out infinite;transform-origin:center bottom;}' +
      '@keyframes wcTrophyHero{0%,100%{transform:translateY(0) rotate(0deg) scale(1);}25%{transform:translateY(-4px) rotate(-5deg) scale(1.04);}50%{transform:translateY(-2px) rotate(3deg) scale(1.02);}75%{transform:translateY(-5px) rotate(5deg) scale(1.05);}}' +
      '.wcVotePromoTitle{margin:0 0 8px;font-size:22px;font-weight:900;color:#FFD700;line-height:1.2;}' +
      '.wcVotePromoSub{margin:0 0 16px;font-size:13px;line-height:1.55;color:#8ab4cc;padding:0 8px;}' +
      '.wcVotePromoQr{margin:0 auto 14px;width:120px;height:120px;padding:8px;background:#fff;border-radius:14px;}' +
      '.wcVotePromoQr img{display:block;width:100%;height:100%;border-radius:8px;}' +
      '.wcVotePromoActions{display:flex;flex-direction:column;gap:10px;padding:0 18px 20px;}' +
      '.wcVotePromoCta{display:flex;align-items:center;justify-content:center;gap:8px;min-height:48px;' +
      'padding:12px 18px;border-radius:999px;border:none;font-size:16px;font-weight:800;cursor:pointer;' +
      'background:linear-gradient(135deg,#FFD700,#B8860B);color:#000;text-decoration:none;' +
      'box-shadow:0 6px 20px rgba(255,215,0,.35);-webkit-tap-highlight-color:transparent;}' +
      '.wcVotePromoLater{min-height:44px;padding:10px;border-radius:999px;border:1px solid rgba(255,255,255,.12);' +
      'background:transparent;color:#8ab4cc;font-size:14px;font-weight:700;cursor:pointer;' +
      '-webkit-tap-highlight-color:transparent;}' +
      '#' +
      DOT_ID +
      '{position:fixed;left:16px;bottom:26px;width:auto;height:auto;display:none;align-items:center;' +
      'justify-content:center;background:transparent;border:none;border-radius:0;box-shadow:none;' +
      'z-index:100019;cursor:pointer;padding:0;-webkit-tap-highlight-color:transparent;}' +
      '#' +
      DOT_ID +
      '.is-on{display:flex;}' +
      'body:has(#chg-dot:not([hidden])) #' +
      DOT_ID +
      '.is-on{left:72px;}' +
      '#' +
      DOT_ID +
      '.is-on{animation:wcDotIn .45s cubic-bezier(.34,1.4,.64,1) forwards;}' +
      '@keyframes wcDotIn{from{opacity:0;transform:translateY(8px) scale(.92);}to{opacity:1;transform:translateY(0) scale(1);}}' +
      '@keyframes wcTrophyFloat{0%,100%{transform:translateY(0) rotate(0deg) scale(1);}30%{transform:translateY(-3px) rotate(-5deg) scale(1.05);}55%{transform:translateY(-1px) rotate(3deg) scale(1.02);}80%{transform:translateY(-3px) rotate(5deg) scale(1.05);}}' +
      '#' +
      DOT_ID +
      ' .wc-vote-dot-icon{line-height:0;display:block;animation:wcTrophyFloat 1.85s ease-in-out infinite;transform-origin:center bottom;}' +
      '#' +
      DOT_ID +
      ' .wc-trophy-icon-img{display:block;width:42px;height:40px;object-fit:contain;' +
      'filter:drop-shadow(0 2px 5px rgba(15,23,42,.2)) drop-shadow(0 1px 2px rgba(0,0,0,.1));}';
    var el = document.getElementById(STYLE_ID);
    if (!el) {
      el = document.createElement('style');
      el.id = STYLE_ID;
      document.head.appendChild(el);
    }
    el.textContent = css;
  }

  function buildSheet() {
    if (document.getElementById(SHEET_ID)) return document.getElementById(SHEET_ID);

    var qrSrc =
      'https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=8&data=' +
      encodeURIComponent(VOTE_URL);

    var sheet = document.createElement('div');
    sheet.id = SHEET_ID;
    sheet.className = 'wcVotePromoSheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-hidden', 'true');
    sheet.innerHTML =
      '<div class="wcVotePromoCard">' +
      '  <div class="wcVotePromoHero">' +
      '    <button type="button" class="wcVotePromoClose" id="wcVotePromoClose" aria-label="">✕</button>' +
      '    <button type="button" class="wcVotePromoLangToggle" id="wcVotePromoLangToggle" aria-label=""></button>' +
      '    <div class="wcVotePromoTrial" id="wcVotePromoTrial"></div>' +
      '    <span class="wcVotePromoBadge" id="wcVotePromoBadge"></span>' +
      '    <div class="wcVotePromoTrophy" aria-hidden="true">' +
      trophyIconHtml(96) +
      '</div>' +
      '    <h2 class="wcVotePromoTitle" id="wcVotePromoTitle"></h2>' +
      '    <p class="wcVotePromoSub" id="wcVotePromoSub"></p>' +
      '    <div class="wcVotePromoQr"><img src="' +
      qrSrc +
      '" width="104" height="104" alt="QR"></div>' +
      '  </div>' +
      '  <div class="wcVotePromoActions">' +
      '    <a class="wcVotePromoCta" id="wcVotePromoCta" href="' +
      VOTE_URL +
      '" target="_blank" rel="noopener noreferrer">🗳️ <span id="wcVotePromoCtaLbl"></span></a>' +
      '    <button type="button" class="wcVotePromoLater" id="wcVotePromoLater"></button>' +
      '  </div>' +
      '</div>';

    document.body.appendChild(sheet);

    sheet.addEventListener('click', function (e) {
      if (e.target === sheet) dismiss();
    });

    document.getElementById('wcVotePromoClose').addEventListener('click', dismiss);
    document.getElementById('wcVotePromoLater').addEventListener('click', dismiss);
    document.getElementById('wcVotePromoLangToggle').addEventListener('click', togglePromoLang);

    return sheet;
  }

  function buildFloatingDot() {
    if (document.getElementById(DOT_ID)) return document.getElementById(DOT_ID);
    var btn = document.createElement('button');
    btn.id = DOT_ID;
    btn.type = 'button';
    btn.className = 'wc-vote-dot';
    btn.innerHTML = '<span class="wc-vote-dot-icon" aria-hidden="true">' + trophyIconHtml(40) + '</span>';
    btn.addEventListener('click', function () {
      openSheet();
    });
    document.body.appendChild(btn);
    return btn;
  }

  function showFloatingDot() {
    injectStyles();
    var dot = buildFloatingDot();
    var icon = dot.querySelector('.wc-vote-dot-icon');
    if (icon) icon.innerHTML = trophyIconHtml(40);
    dot.classList.add('is-on');
    dot.setAttribute('aria-label', t('dotAria'));
  }

  function hideFloatingDot() {
    var dot = document.getElementById(DOT_ID);
    if (dot) dot.classList.remove('is-on');
  }

  function applyI18n() {
    var isAr = lang() === 'ar';
    var sheet = document.getElementById(SHEET_ID);
    if (sheet) sheet.setAttribute('dir', isAr ? 'rtl' : 'ltr');
    var trial = document.getElementById('wcVotePromoTrial');
    var badge = document.getElementById('wcVotePromoBadge');
    var title = document.getElementById('wcVotePromoTitle');
    var sub = document.getElementById('wcVotePromoSub');
    var ctaLbl = document.getElementById('wcVotePromoCtaLbl');
    var later = document.getElementById('wcVotePromoLater');
    var closeBtn = document.getElementById('wcVotePromoClose');
    var langBtn = document.getElementById('wcVotePromoLangToggle');
    var dot = document.getElementById(DOT_ID);
    if (trial) trial.textContent = t('trial');
    if (badge) badge.textContent = t('badge');
    if (title) title.textContent = t('title');
    if (sub) sub.textContent = t('sub');
    if (ctaLbl) ctaLbl.textContent = t('cta');
    if (later) later.textContent = t('later');
    if (closeBtn) closeBtn.setAttribute('aria-label', t('close'));
    if (langBtn) {
      langBtn.textContent = t('langBtn');
      langBtn.setAttribute('aria-label', t('langAria'));
    }
    if (dot && dot.classList.contains('is-on')) dot.setAttribute('aria-label', t('dotAria'));
  }

  function openSheet() {
    injectStyles();
    var sheet = buildSheet();
    applyI18n();
    sheet.classList.add('is-open');
    sheet.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    hideFloatingDot();
  }

  function closeSheet() {
    var sheet = document.getElementById(SHEET_ID);
    if (!sheet) return;
    sheet.classList.remove('is-open');
    sheet.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (isDismissed()) showFloatingDot();
  }

  function init() {
    injectStyles();
    if (shouldAutoOpen()) {
      setTimeout(openSheet, 1400);
    } else if (isDismissed()) {
      showFloatingDot();
    }
  }

  window.wcVotePromo = {
    open: openSheet,
    close: dismiss,
    setLang: applyI18n,
    toggleLang: togglePromoLang,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
