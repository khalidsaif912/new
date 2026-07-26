(function () {
  'use strict';

  var TOUR_KEY = 'seenDayNotesTour_v1';
  var FAB_DISMISS_KEY = 'featureNotesFabDismissed_v1';
  var FAB_CLICKS_KEY = 'featureNotesFabClicks_v1';
  var FAB_CLICKS_NEEDED = 3;
  var STYLE_ID = 'featureUpdateBadgeCss';
  var FAB_ID = 'featureNotesFab';

  function hasSeenTour() {
    try {
      return localStorage.getItem(TOUR_KEY) === '1';
    } catch (e) {
      return true;
    }
  }

  function getFabClicks() {
    try {
      // Clear legacy one-click dismiss so the 3-click rule applies.
      if (localStorage.getItem(FAB_DISMISS_KEY) === '1') {
        localStorage.removeItem(FAB_DISMISS_KEY);
      }
      var n = parseInt(localStorage.getItem(FAB_CLICKS_KEY) || '0', 10);
      return isNaN(n) || n < 0 ? 0 : n;
    } catch (e) {
      return 0;
    }
  }

  function isFabDismissed() {
    return getFabClicks() >= FAB_CLICKS_NEEDED;
  }

  function registerFabClick() {
    var n = getFabClicks() + 1;
    try { localStorage.setItem(FAB_CLICKS_KEY, String(n)); } catch (e) {}
    return n;
  }

  function isAr() {
    try {
      var lang = localStorage.getItem('rosterLang') || localStorage.getItem('appLang') || localStorage.getItem('prefLang') || '';
      if (lang === 'ar' || lang === 'en') return lang === 'ar';
    } catch (e) {}
    return (document.documentElement.lang || '').toLowerCase().indexOf('ar') === 0 ||
      document.body.classList.contains('ar') ||
      (document.documentElement.dir || '') === 'rtl';
  }

  function siteRoot() {
    if (typeof getSiteRootUrl === 'function') return getSiteRootUrl();
    var path = location.pathname || '/';
    var segs = path.split('/').filter(Boolean);
    if (path.indexOf('/roster-site/') !== -1) return location.origin + '/roster-site';
    if (location.hostname && location.hostname.indexOf('github.io') !== -1) {
      if (segs.length >= 2 && segs[1] === 'docs') return location.origin + '/' + segs[0] + '/docs';
      return location.origin + (segs.length ? '/' + segs[0] : '');
    }
    return location.origin + (segs.length && segs[0] === 'docs' ? '' : '');
  }

  function scheduleTourUrl() {
    return siteRoot() + '/my-schedules/?tour=1';
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '.summaryChip{position:relative}',
      '.feature-new-badge{',
      'position:absolute;top:-6px;inset-inline-end:-6px;z-index:3;',
      'min-width:18px;height:18px;padding:0 6px;border-radius:999px;',
      'display:inline-flex;align-items:center;justify-content:center;',
      'background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff;',
      'font-size:9px;font-weight:900;letter-spacing:.2px;line-height:1;',
      'box-shadow:0 4px 10px rgba(239,68,68,.35);',
      'pointer-events:none;animation:featureNewPulse 1.8s ease-in-out infinite;',
      '}',
      '@keyframes featureNewPulse{',
      '0%,100%{transform:scale(1)}',
      '50%{transform:scale(1.08)}',
      '}',
      '#' + FAB_ID + '{',
      'position:fixed;z-index:100021;left:16px;bottom:24px;',
      'display:inline-flex;align-items:center;gap:8px;',
      'height:48px;padding:0 12px 0 10px;border:1px solid rgba(15,23,42,.1);',
      'border-radius:16px;background:rgba(255,255,255,.94);',
      'box-shadow:0 8px 24px rgba(15,23,42,.14);cursor:pointer;',
      'font:inherit;color:#0f172a;-webkit-tap-highlight-color:transparent;',
      'animation:featureFabIn .35s cubic-bezier(.22,1,.36,1);',
      '}',
      '#' + FAB_ID + '[hidden]{display:none!important}',
      '#' + FAB_ID + '.beside-alert{left:72px}',
      '#' + FAB_ID + ' .feature-fab-emoji{font-size:22px;line-height:1}',
      '#' + FAB_ID + ' .feature-fab-text{display:flex;flex-direction:column;align-items:flex-start;gap:1px;line-height:1.15}',
      'html[dir="rtl"] #' + FAB_ID + ' .feature-fab-text,body.ar #' + FAB_ID + ' .feature-fab-text{align-items:flex-end}',
      '#' + FAB_ID + ' .feature-fab-title{font-size:11px;font-weight:900}',
      '#' + FAB_ID + ' .feature-fab-sub{font-size:9px;font-weight:700;color:#64748b}',
      '#' + FAB_ID + ' .feature-fab-pill{',
      'margin-inline-start:2px;padding:3px 7px;border-radius:999px;',
      'background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff;',
      'font-size:9px;font-weight:900;letter-spacing:.3px;',
      '}',
      '@keyframes featureFabIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}',
      'html.has-float-dock .wrap{',
      'padding-bottom:calc(130px + env(safe-area-inset-bottom,0px))!important;',
      '}',
      'html.has-float-dock .footer{',
      'padding-bottom:calc(18px + env(safe-area-inset-bottom,0px));',
      '}',
      'html.has-float-dock .quickActions.roster-cta,',
      'html.has-float-dock .quickActions.secondaryBar,',
      'html.has-float-dock .quickActions.spotlightBar{',
      'margin-bottom:12px;',
      '}'
    ].join('');
    document.head.appendChild(style);
    document.documentElement.classList.add('has-float-dock');
  }

  function ensureChipBadge(el) {
    if (!el || hasSeenTour()) return;
    if (el.querySelector('.feature-new-badge')) return;
    var badge = document.createElement('span');
    badge.className = 'feature-new-badge';
    badge.textContent = isAr() ? 'جديد' : 'NEW';
    badge.setAttribute('aria-hidden', 'true');
    el.appendChild(badge);
    try {
      var href = el.getAttribute('href') || '';
      if (href && href.indexOf('tour=') === -1) {
        el.setAttribute('href', href + (href.indexOf('?') >= 0 ? '&' : '?') + 'tour=1');
      }
    } catch (e) {}
  }

  function removeChipBadges() {
    document.querySelectorAll('.feature-new-badge').forEach(function (el) {
      el.remove();
    });
  }

  function alertIconVisible() {
    var chg = document.getElementById('chg-dot');
    var abs = document.getElementById('abs-dot');
    var chgOn = chg && !chg.hidden && getComputedStyle(chg).display !== 'none';
    var absOn = abs && abs.classList.contains('abs-on') && getComputedStyle(abs).display !== 'none';
    return !!(chgOn || absOn);
  }

  function ensureFab() {
    if (isFabDismissed()) {
      var old = document.getElementById(FAB_ID);
      if (old) old.hidden = true;
      return;
    }
    var fab = document.getElementById(FAB_ID);
    if (!fab) {
      fab = document.createElement('button');
      fab.id = FAB_ID;
      fab.type = 'button';
      document.body.appendChild(fab);
      fab.addEventListener('click', function () {
        registerFabClick();
        location.href = scheduleTourUrl();
      });
    }
    var ar = isAr();
    var clicks = getFabClicks();
    var left = Math.max(0, FAB_CLICKS_NEEDED - clicks);
    fab.innerHTML =
      '<span class="feature-fab-emoji" aria-hidden="true">📌</span>' +
      '<span class="feature-fab-text">' +
        '<span class="feature-fab-title">' + (ar ? 'ملاحظة اليوم' : 'Day notes') + '</span>' +
        '<span class="feature-fab-sub">' + (ar ? 'تحديث في جدولي' : 'Update in My Schedule') + '</span>' +
      '</span>' +
      '<span class="feature-fab-pill">' + (ar ? 'جديد' : 'NEW') + '</span>';
    fab.setAttribute('aria-label', ar ? 'تحديث جديد: ملاحظات اليوم' : 'New update: day notes');
    fab.title = ar
      ? ('اضغط لمعرفة التحديث' + (left > 0 ? ' · يبقى ' + left + ' حتى يختفي' : ''))
      : ('Tap to see the update' + (left > 0 ? ' · ' + left + ' left until hide' : ''));
    fab.hidden = false;
    fab.removeAttribute('hidden');
    fab.style.display = 'inline-flex';
    fab.classList.toggle('beside-alert', alertIconVisible());
  }

  function refresh() {
    injectStyles();
    if (isFabDismissed()) {
      removeChipBadges();
      var fab = document.getElementById(FAB_ID);
      if (fab) {
        fab.hidden = true;
        fab.style.display = 'none';
      }
      return;
    }
    ensureChipBadge(document.getElementById('myScheduleBtn'));
    ensureChipBadge(document.getElementById('welcomeChip'));
    ensureFab();
  }

  function boot() {
    refresh();
    // Alert icons may appear later after async fetch.
    var n = 0;
    var timer = setInterval(function () {
      refresh();
      n += 1;
      if (n >= 12 || hasSeenTour()) clearInterval(timer);
    }, 800);
    window.addEventListener('storage', function (e) {
      if (e && e.key === TOUR_KEY) refresh();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
