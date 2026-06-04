/**
 * wc-vote-promo.js — World Cup fan voting promo (match-accb0)
 * Popup on roster-site; dismiss per session via sessionStorage.
 */
(function () {
  'use strict';

  var VOTE_URL = 'https://match-accb0.web.app/?utm_source=roster-site&utm_medium=popup';
  var STORAGE_KEY = 'wcVotePromoDismissed_v1';
  var STYLE_ID = 'wc-vote-promo-styles';
  var SHEET_ID = 'wcVotePromoSheet';

  var I18N = {
    en: {
      badge: 'World Cup 2026',
      title: 'Vote for your team!',
      sub: 'Join the global fan ranking — one vote every 24 hours. Live results.',
      cta: 'Vote now',
      later: 'Maybe later',
      close: 'Close',
    },
    ar: {
      badge: 'كأس العالم 2026',
      title: 'صوّت لمنتخبك!',
      sub: 'شارك في الترتيب الجماهيري العالمي — صوت واحد كل 24 ساعة. نتائج مباشرة.',
      cta: 'صوّت الآن',
      later: 'لاحقاً',
      close: 'إغلاق',
    },
  };

  function lang() {
    try {
      var l = localStorage.getItem('rosterLang') || document.documentElement.getAttribute('lang') || 'en';
      return l === 'ar' ? 'ar' : 'en';
    } catch (e) {
      return 'en';
    }
  }

  function t(key) {
    var pack = I18N[lang()] || I18N.en;
    return pack[key] || I18N.en[key] || key;
  }

  function shouldShow() {
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
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var css =
      '#' + SHEET_ID + '.wcVotePromoSheet{' +
      'position:fixed;inset:0;z-index:10050;display:flex;align-items:center;justify-content:center;' +
      'padding:16px;background:rgba(15,23,42,.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);' +
      'opacity:0;visibility:hidden;pointer-events:none;transition:opacity .35s ease,visibility .35s;' +
      '}' +
      '#' + SHEET_ID + '.wcVotePromoSheet.is-open{opacity:1;visibility:visible;pointer-events:auto;}' +
      '.wcVotePromoCard{' +
      'width:min(100%,380px);border-radius:22px;overflow:hidden;' +
      'background:linear-gradient(165deg,#0a1520 0%,#111e2e 55%,#0f1e2e 100%);' +
      'border:1px solid rgba(255,215,0,.35);box-shadow:0 24px 60px rgba(0,0,0,.45),0 0 40px rgba(255,215,0,.12);' +
      'color:#e8f4f8;text-align:center;transform:translateY(12px) scale(.96);' +
      'transition:transform .4s cubic-bezier(.34,1.56,.64,1);' +
      '}' +
      '#' + SHEET_ID + '.is-open .wcVotePromoCard{transform:translateY(0) scale(1);}' +
      '.wcVotePromoHero{padding:22px 18px 14px;position:relative;}' +
      '.wcVotePromoClose{position:absolute;top:10px;left:10px;width:36px;height:36px;border-radius:50%;' +
      'border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:#8ab4cc;' +
      'font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;' +
      '-webkit-tap-highlight-color:transparent;}' +
      'html[dir="ltr"] .wcVotePromoClose,body:not(.ar) .wcVotePromoClose{left:auto;right:10px;}' +
      '.wcVotePromoBadge{display:inline-block;font-size:11px;font-weight:800;letter-spacing:.12em;' +
      'text-transform:uppercase;color:#00d4ff;margin-bottom:8px;}' +
      'body.ar .wcVotePromoBadge{letter-spacing:.04em;text-transform:none;font-size:12px;}' +
      '.wcVotePromoEmoji{font-size:52px;line-height:1;margin:4px 0 10px;filter:drop-shadow(0 4px 12px rgba(255,215,0,.4));}' +
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
      '-webkit-tap-highlight-color:transparent;}';
    var el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = css;
    document.head.appendChild(el);
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
      '    <button type="button" class="wcVotePromoClose" id="wcVotePromoClose" aria-label="' +
      t('close') +
      '">✕</button>' +
      '    <span class="wcVotePromoBadge" id="wcVotePromoBadge"></span>' +
      '    <div class="wcVotePromoEmoji" aria-hidden="true">🏆</div>' +
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

    return sheet;
  }

  function applyI18n() {
    var isAr = lang() === 'ar';
    var sheet = document.getElementById(SHEET_ID);
    if (sheet) sheet.setAttribute('dir', isAr ? 'rtl' : 'ltr');
    var badge = document.getElementById('wcVotePromoBadge');
    var title = document.getElementById('wcVotePromoTitle');
    var sub = document.getElementById('wcVotePromoSub');
    var ctaLbl = document.getElementById('wcVotePromoCtaLbl');
    var later = document.getElementById('wcVotePromoLater');
    var closeBtn = document.getElementById('wcVotePromoClose');
    if (badge) badge.textContent = t('badge');
    if (title) title.textContent = t('title');
    if (sub) sub.textContent = t('sub');
    if (ctaLbl) ctaLbl.textContent = t('cta');
    if (later) later.textContent = t('later');
    if (closeBtn) closeBtn.setAttribute('aria-label', t('close'));
  }

  function openSheet() {
    var sheet = buildSheet();
    applyI18n();
    sheet.classList.add('is-open');
    sheet.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeSheet() {
    var sheet = document.getElementById(SHEET_ID);
    if (!sheet) return;
    sheet.classList.remove('is-open');
    sheet.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function init() {
    if (!shouldShow()) return;
    injectStyles();
    setTimeout(openSheet, 1400);
  }

  window.wcVotePromo = {
    open: openSheet,
    close: dismiss,
    setLang: applyI18n,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
