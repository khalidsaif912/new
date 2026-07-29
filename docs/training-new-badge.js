/**
 * Force-visible "New" badge on homepage Training chip until 1 Aug 2026.
 * Placed BELOW the training button so it is never covered by the chip.
 */
(function () {
  'use strict';

  var HIDE_FROM = 20260801;
  var PILL_ID = 'trainingNewPillForce';
  var SLOT_ID = 'trainingChipSlot';
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
      '.summaryBar{overflow:visible!important;}',
      '#' + SLOT_ID + '{',
      'display:flex!important;flex-direction:column!important;align-items:center!important;',
      'justify-content:flex-start!important;gap:4px!important;position:relative!important;',
      'z-index:5!important;align-self:stretch!important;',
      '}',
      '#' + SLOT_ID + ' > #trainingBtn{',
      'position:relative!important;overflow:visible!important;padding-top:10px!important;',
      'margin:0!important;width:100%!important;min-width:72px!important;',
      '}',
      '#' + PILL_ID + '{',
      'position:static!important;display:inline-block!important;visibility:visible!important;',
      'opacity:1!important;z-index:6!important;order:2!important;',
      'padding:3px 8px!important;border-radius:999px!important;',
      'background:#ea580c!important;color:#fff!important;',
      'font-size:10px!important;font-weight:900!important;line-height:1.15!important;',
      'letter-spacing:.02em!important;white-space:nowrap!important;text-transform:none!important;',
      'box-shadow:0 2px 8px rgba(234,88,12,.45)!important;pointer-events:none!important;',
      'animation:thnForceBlink 1.4s ease-in-out infinite!important;',
      '}',
      '@keyframes thnForceBlink{0%,100%{opacity:1}50%{opacity:.55}}',
      '#trainingBtn .trainingNewPill{display:none!important}',
      '.dateTagRow{display:inline-flex!important;align-items:center!important;gap:10px!important;flex-wrap:wrap!important;}',
      '.dateTagNewForce{',
      'display:inline-block!important;padding:5px 10px!important;border-radius:999px!important;',
      'background:#ea580c!important;color:#fff!important;font-size:10px!important;font-weight:900!important;',
      'box-shadow:0 4px 12px rgba(234,88,12,.35)!important;animation:thnForceBlink 1.4s ease-in-out infinite!important;',
      '}'
    ].join('');
    document.head.appendChild(s);
  }

  function ensureSlot(btn) {
    var slot = document.getElementById(SLOT_ID);
    if (slot && slot.contains(btn)) return slot;
    slot = document.createElement('div');
    slot.id = SLOT_ID;
    if (btn.parentNode) {
      btn.parentNode.insertBefore(slot, btn);
      slot.appendChild(btn);
    }
    return slot;
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
    var slot = ensureSlot(btn);
    var pill = document.getElementById(PILL_ID);
    if (!pill) {
      pill = document.createElement('span');
      pill.id = PILL_ID;
      // Place AFTER the button = visually below the training chip.
      slot.appendChild(pill);
    } else if (pill.parentNode !== slot) {
      slot.appendChild(pill);
    } else if (pill.previousElementSibling !== btn) {
      slot.appendChild(pill);
    }
    pill.textContent = isAr() ? 'جديد' : 'New';
    pill.setAttribute(
      'style',
      'position:static!important;display:inline-block!important;visibility:visible!important;opacity:1!important;' +
        'z-index:6!important;padding:3px 8px!important;border-radius:999px!important;' +
        'background:#ea580c!important;color:#fff!important;font-size:10px!important;font-weight:900!important;' +
        'line-height:1.15!important;white-space:nowrap!important;margin-top:2px!important;' +
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
