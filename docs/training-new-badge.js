/**
 * Force-visible "New" badge on homepage Training chip until 1 Aug 2026.
 * Uses inline styles so other CSS cannot hide it.
 */
(function () {
  'use strict';

  var HIDE_FROM = 20260801;
  var PILL_ID = 'trainingNewPillForce';
  var STYLE_ID = 'trainingNewPillForceCss';

  function stampNow() {
    var d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  }

  function isAr() {
    try {
      var l = localStorage.getItem('rosterLang') || '';
      if (l === 'ar' || l === 'en') return l === 'ar';
    } catch (e) {}
    return (document.documentElement.lang || '').toLowerCase().indexOf('ar') === 0 ||
      document.body.classList.contains('ar');
  }

  function injectCss() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = [
      '#trainingBtn.summaryChip{position:relative!important;overflow:visible!important;padding-top:20px!important;}',
      '.summaryBar{overflow:visible!important;padding-top:4px!important;}',
      '#' + PILL_ID + '{',
      'position:absolute!important;top:3px!important;left:50%!important;transform:translateX(-50%)!important;',
      'z-index:40!important;display:inline-block!important;visibility:visible!important;opacity:1!important;',
      'padding:3px 8px!important;border-radius:999px!important;',
      'background:#ea580c!important;background-color:#ea580c!important;color:#fff!important;',
      'font-size:10px!important;font-weight:900!important;line-height:1.15!important;',
      'letter-spacing:.02em!important;white-space:nowrap!important;text-transform:none!important;',
      'box-shadow:0 2px 8px rgba(234,88,12,.45)!important;pointer-events:none!important;',
      'animation:thnForceBlink 1.2s ease-in-out infinite!important;',
      '}',
      '@keyframes thnForceBlink{0%,100%{opacity:1}50%{opacity:.42}}',
      '#trainingBtn .trainingNewPill{display:none!important}',
      '.dateTagRow{display:inline-flex!important;align-items:center!important;gap:10px!important;flex-wrap:wrap!important;}',
      '.dateTagNewForce{',
      'display:inline-block!important;padding:5px 10px!important;border-radius:999px!important;',
      'background:#ea580c!important;color:#fff!important;font-size:10px!important;font-weight:900!important;',
      'box-shadow:0 4px 12px rgba(234,88,12,.35)!important;animation:thnForceBlink 1.2s ease-in-out infinite!important;',
      '}'
    ].join('');
    document.head.appendChild(s);
  }

  function paintHomeBadge() {
    var btn = document.getElementById('trainingBtn');
    if (!btn) return;
    if (stampNow() >= HIDE_FROM) {
      var old = document.getElementById(PILL_ID);
      if (old) old.remove();
      btn.classList.add('is-new-off');
      return;
    }
    injectCss();
    btn.classList.remove('is-new-off');
    var pill = document.getElementById(PILL_ID);
    if (!pill) {
      pill = document.createElement('span');
      pill.id = PILL_ID;
      btn.appendChild(pill);
    }
    pill.textContent = isAr() ? 'جديد' : 'New';
    // Inline styles beat almost every stylesheet conflict.
    pill.setAttribute(
      'style',
      'position:absolute!important;top:3px!important;left:50%!important;transform:translateX(-50%)!important;' +
        'z-index:40!important;display:inline-block!important;visibility:visible!important;opacity:1!important;' +
        'padding:3px 8px!important;border-radius:999px!important;background:#ea580c!important;color:#fff!important;' +
        'font-size:10px!important;font-weight:900!important;line-height:1.15!important;white-space:nowrap!important;' +
        'box-shadow:0 2px 8px rgba(234,88,12,.45)!important;pointer-events:none!important;'
    );
  }

  function paintTrainingDateBadge() {
    var dateTag = document.querySelector('.dateTag');
    if (!dateTag) return;
    if (stampNow() >= HIDE_FROM) {
      var gone = document.getElementById('dateTagNewForce');
      if (gone) gone.remove();
      return;
    }
    injectCss();
    var path = (location.pathname || '') + (location.href || '');
    var isAug = /2026-08|August|أغسطس/i.test(path) || /August/i.test(dateTag.textContent || '');
    // Show near date on training pages (July promo for August, or August itself).
    var onTraining = /\/training(\/|$)/i.test(location.pathname || '');
    if (!onTraining) return;

    var badge = document.getElementById('dateTagNewForce');
    if (!badge) {
      badge = document.createElement('span');
      badge.id = 'dateTagNewForce';
      badge.className = 'dateTagNewForce';
      // Place outside the date pill when possible.
      var row = dateTag.parentElement;
      if (row && row.classList && row.classList.contains('dateTagRow')) {
        row.appendChild(badge);
      } else if (dateTag.parentElement) {
        var wrap = document.createElement('div');
        wrap.className = 'dateTagRow';
        dateTag.parentElement.insertBefore(wrap, dateTag);
        wrap.appendChild(dateTag);
        wrap.appendChild(badge);
      } else {
        dateTag.insertAdjacentElement('afterend', badge);
      }
    }
    badge.textContent = isAr() ? 'جديد' : 'New';
    badge.setAttribute(
      'style',
      'display:inline-block!important;padding:5px 10px!important;border-radius:999px!important;' +
        'background:#ea580c!important;color:#fff!important;font-size:10px!important;font-weight:900!important;' +
        'box-shadow:0 4px 12px rgba(234,88,12,.35)!important;'
    );
  }

  function run() {
    try {
      paintHomeBadge();
      paintTrainingDateBadge();
    } catch (e) {}
  }

  run();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  }
  window.addEventListener('load', run);
  setTimeout(run, 200);
  setTimeout(run, 800);
  setTimeout(run, 2000);
  setInterval(run, 4000);
  window.addEventListener('storage', function (e) {
    if (!e || e.key === 'rosterLang') run();
  });
})();
