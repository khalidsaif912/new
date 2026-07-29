/**
 * Small "New" badge on homepage Training chip until 1 Aug 2026.
 * Floats above the chip (slightly aside) without changing chip size/alignment.
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

  function unwrapSlot() {
    var slot = document.getElementById('trainingChipSlot');
    if (!slot || !slot.parentNode) return;
    var parent = slot.parentNode;
    while (slot.firstChild) parent.insertBefore(slot.firstChild, slot);
    slot.remove();
  }

  function injectCss() {
    var existing = document.getElementById(STYLE_ID);
    if (existing) existing.remove();
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = [
      '.summaryBar{overflow:visible!important;}',
      '#trainingBtn.summaryChip{',
      'position:relative!important;overflow:visible!important;',
      '}',
      '#' + PILL_ID + '{',
      'position:absolute!important;',
      'top:-7px!important;',
      'inset-inline-end:-6px!important;',
      'left:auto!important;right:auto!important;',
      'transform:none!important;',
      'z-index:20!important;',
      'display:inline-flex!important;',
      'align-items:center!important;',
      'justify-content:center!important;',
      'visibility:visible!important;',
      'opacity:1!important;',
      'min-width:0!important;',
      'height:auto!important;',
      'padding:2px 6px!important;',
      'border-radius:999px!important;',
      'background:linear-gradient(135deg,#fb923c,#ea580c)!important;',
      'color:#fff!important;',
      'font-size:8px!important;',
      'font-weight:900!important;',
      'line-height:1.1!important;',
      'letter-spacing:.02em!important;',
      'white-space:nowrap!important;',
      'text-transform:none!important;',
      'box-shadow:0 2px 6px rgba(234,88,12,.35)!important;',
      'pointer-events:none!important;',
      'animation:thnForceBlink 1.6s ease-in-out infinite!important;',
      '}',
      'html[dir="rtl"] #' + PILL_ID + ',body.ar #' + PILL_ID + '{',
      'inset-inline-end:auto!important;',
      'inset-inline-start:-6px!important;',
      '}',
      '@keyframes thnForceBlink{0%,100%{opacity:1}50%{opacity:.62}}',
      '#trainingBtn .trainingNewPill{display:none!important}',
      '#trainingChipSlot{display:contents!important}',
      '.dateTagRow{display:inline-flex!important;align-items:center!important;gap:10px!important;flex-wrap:wrap!important;}',
      '.dateTagNewForce{',
      'display:inline-block!important;padding:5px 10px!important;border-radius:999px!important;',
      'background:#ea580c!important;color:#fff!important;font-size:10px!important;font-weight:900!important;',
      'box-shadow:0 4px 12px rgba(234,88,12,.35)!important;animation:thnForceBlink 1.6s ease-in-out infinite!important;',
      '}'
    ].join('');
    document.head.appendChild(s);
  }

  function paintHomeBadge() {
    var btn = document.getElementById('trainingBtn');
    if (!btn) return;
    unwrapSlot();
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
    } else if (pill.parentNode !== btn) {
      btn.appendChild(pill);
    }
    pill.textContent = isAr() ? 'جديد' : 'New';
    var rtl = isAr() || (document.documentElement.dir || '') === 'rtl';
    pill.setAttribute(
      'style',
      'position:absolute!important;top:-7px!important;z-index:20!important;' +
        (rtl ? 'left:-6px!important;right:auto!important;' : 'right:-6px!important;left:auto!important;') +
        'display:inline-flex!important;align-items:center!important;justify-content:center!important;' +
        'visibility:visible!important;opacity:1!important;padding:2px 6px!important;border-radius:999px!important;' +
        'background:linear-gradient(135deg,#fb923c,#ea580c)!important;color:#fff!important;' +
        'font-size:8px!important;font-weight:900!important;line-height:1.1!important;white-space:nowrap!important;' +
        'box-shadow:0 2px 6px rgba(234,88,12,.35)!important;pointer-events:none!important;transform:none!important;'
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
    var onTraining = /\/training(\/|$)/i.test(location.pathname || '');
    if (!onTraining) return;

    var badge = document.getElementById('dateTagNewForce');
    if (!badge) {
      badge = document.createElement('span');
      badge.id = 'dateTagNewForce';
      badge.className = 'dateTagNewForce';
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
