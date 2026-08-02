/**
 * Official Oman holiday news ticker — beside the bottom alert bell.
 * Preview mode shows upcoming holidays now so the marquee can be tried;
 * later it can be limited to the Muscat week that contains a holiday.
 */
(function () {
  'use strict';

  // Trial: keep the ticker visible with upcoming official holidays.
  var PREVIEW = true;
  var TICKER_ID = 'holidayTicker';
  var STYLE_ID = 'holidayTickerCss';
  var DATA_URL_CACHE = null;

  function lang() {
    try {
      var l = localStorage.getItem('rosterLang') || document.documentElement.getAttribute('lang') || 'en';
      return l === 'ar' ? 'ar' : 'en';
    } catch (e) {
      return 'en';
    }
  }

  function docsBase() {
    try {
      if (typeof getSiteRootUrl === 'function') {
        var r = getSiteRootUrl();
        if (r) return r.replace(/\/?$/, '/');
      }
    } catch (e) {}
    try {
      var m = String(location.pathname || '').match(/^(.*?\/docs\/)/);
      return m ? m[1] : '/docs/';
    } catch (e2) {
      return '/docs/';
    }
  }

  function muscatToday() {
    try {
      var parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Muscat',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).formatToParts(new Date());
      var map = {};
      parts.forEach(function (p) {
        if (p.type !== 'literal') map[p.type] = p.value;
      });
      return map.year + '-' + map.month + '-' + map.day;
    } catch (e) {
      var d = new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
  }

  /** Sunday–Saturday week bounds for a YYYY-MM-DD (Muscat civil date). */
  function weekBounds(ymd) {
    var p = ymd.split('-').map(Number);
    // noon UTC avoids DST edge cases; Oman has no DST
    var dt = new Date(Date.UTC(p[0], p[1] - 1, p[2], 8, 0, 0));
    var dow = dt.getUTCDay(); // 0=Sun
    var start = new Date(dt);
    start.setUTCDate(start.getUTCDate() - dow);
    var end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    function fmt(d) {
      return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
    }
    return { start: fmt(start), end: fmt(end) };
  }

  function formatDay(ymd, ar) {
    try {
      var p = ymd.split('-').map(Number);
      var d = new Date(Date.UTC(p[0], p[1] - 1, p[2], 8, 0, 0));
      return d.toLocaleDateString(ar ? 'ar-OM' : 'en-GB', {
        timeZone: 'UTC',
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });
    } catch (e) {
      return ymd;
    }
  }

  function activeDate() {
    try {
      var m = String(location.pathname || '').match(/\/date\/(\d{4}-\d{2}-\d{2})(?:\/|$)/);
      if (m) return m[1];
    } catch (e) {}
    return muscatToday();
  }

  function holidaysForTicker(list, today) {
    var w = weekBounds(today);
    var inWeek = (list || []).filter(function (h) {
      return h && h.date >= w.start && h.date <= w.end;
    });
    if (inWeek.length) return inWeek;

    // Preview / trial: scroll the next official holidays so the bar can be tested now.
    if (PREVIEW) {
      var out = [];
      var seen = Object.create(null);
      (list || []).forEach(function (h) {
        if (!h || h.date < muscatToday()) return;
        var key = String(h.name_ar || h.name_en || '');
        if (!key || seen[key]) return;
        seen[key] = 1;
        out.push(h);
      });
      return out.slice(0, 4);
    }

    try {
      if (/(?:\?|&)htDemo=1(?:&|$)/.test(location.search || '')) {
        try { sessionStorage.setItem('htDemo', '1'); } catch (e0) {}
      }
      var demo = false;
      try { demo = sessionStorage.getItem('htDemo') === '1'; } catch (e1) {}
      if (demo) {
        return (list || []).filter(function (h) { return h && h.date >= muscatToday(); }).slice(0, 1);
      }
    } catch (e) {}
    return inWeek;
  }

  function injectStyles() {
    var style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }
    style.textContent = [
      '#' + TICKER_ID + '{',
      'position:fixed;bottom:24px;left:72px;right:16px;',
      'z-index:100015;display:none;align-items:center;gap:8px;',
      'min-height:48px;width:auto;max-width:none;',
      'padding:0 14px 0 10px;border-radius:16px;',
      'background:rgba(255,255,255,.94);',
      'border:1px solid rgba(15,23,42,.1);',
      'box-shadow:0 8px 24px rgba(15,23,42,.14);',
      'backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);',
      'overflow:hidden;font-family:Tajawal,Sora,system-ui,sans-serif;',
      'letter-spacing:0;text-transform:none;',
      'box-sizing:border-box;',
      '}',
      '#' + TICKER_ID + '.on{display:flex}',
      /* bell (#chg-dot) is always fixed to the left, even in Arabic */
      '#' + TICKER_ID + '.solo{left:16px;right:16px}',
      '#' + TICKER_ID + '.above-dock{bottom:84px;left:16px;right:16px}',
      'html[dir="rtl"] #' + TICKER_ID + ',body.ar #' + TICKER_ID + '{',
      'left:72px;right:16px;padding:0 14px 0 10px;',
      '}',
      'html[dir="rtl"] #' + TICKER_ID + '.solo,body.ar #' + TICKER_ID + '.solo,',
      'html[dir="rtl"] #' + TICKER_ID + '.above-dock,body.ar #' + TICKER_ID + '.above-dock{',
      'left:16px;right:16px;',
      '}',
      '#' + TICKER_ID + ' .ht-ico{',
      'flex:0 0 auto;width:28px;height:28px;border-radius:10px;',
      'display:grid;place-items:center;font-size:15px;',
      'background:linear-gradient(135deg,#fff7ed,#ffedd5);',
      '}',
      '#' + TICKER_ID + ' .ht-track{',
      'flex:1 1 auto;min-width:0;width:100%;overflow:hidden;',
      'mask-image:linear-gradient(90deg,transparent 0,#000 14px,#000 100%);',
      '-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 14px,#000 100%);',
      '}',
      'html[dir="rtl"] #' + TICKER_ID + ' .ht-track,body.ar #' + TICKER_ID + ' .ht-track{',
      'mask-image:linear-gradient(270deg,transparent 0,#000 14px,#000 100%);',
      '-webkit-mask-image:linear-gradient(270deg,transparent 0,#000 14px,#000 100%);',
      '}',
      '#' + TICKER_ID + ' .ht-marquee{',
      'display:inline-block;white-space:nowrap;padding-inline:8px;',
      'font-size:12.5px;font-weight:800;color:#9a3412;line-height:1.35;',
      'letter-spacing:0;animation:htScroll 28s linear infinite;',
      '}',
      'html[dir="rtl"] #' + TICKER_ID + ' .ht-marquee,body.ar #' + TICKER_ID + ' .ht-marquee{',
      'animation-name:htScrollRtl;',
      '}',
      '#' + TICKER_ID + ' .ht-label{color:#c2410c;font-weight:900;margin-inline-end:6px}',
      '@keyframes htScroll{0%{transform:translateX(0)}100%{transform:translateX(-33.333%)}}',
      '@keyframes htScrollRtl{0%{transform:translateX(0)}100%{transform:translateX(33.333%)}}',
      '@media (prefers-reduced-motion:reduce){#' + TICKER_ID + ' .ht-marquee{animation:none;transform:none}}',
      'html.has-float-dock .wrap{padding-bottom:calc(130px + env(safe-area-inset-bottom,0px))!important}'
    ].join('');
    document.documentElement.classList.add('has-float-dock');
  }

  function fabVisible() {
    var fab = document.getElementById('featureNotesFab');
    return !!(fab && !fab.hidden && getComputedStyle(fab).display !== 'none');
  }

  function alertIconVisible() {
    var chg = document.getElementById('chg-dot');
    var abs = document.getElementById('abs-dot');
    var chgOn = chg && !chg.hidden && getComputedStyle(chg).display !== 'none';
    var absOn = abs && abs.classList.contains('abs-on') && getComputedStyle(abs).display !== 'none';
    return !!(chgOn || absOn);
  }

  function layoutTicker(el) {
    if (!el) return;
    var fabOn = fabVisible();
    var alertOn = alertIconVisible();
    el.classList.toggle('above-dock', fabOn);
    el.classList.toggle('solo', !fabOn && !alertOn);
  }

  function ensureTicker() {
    var el = document.getElementById(TICKER_ID);
    if (el) return el;
    el = document.createElement('div');
    el.id = TICKER_ID;
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
    return el;
  }

  function paint(items) {
    injectStyles();
    var el = ensureTicker();
    if (!items || !items.length) {
      el.classList.remove('on');
      el.hidden = true;
      el.innerHTML = '';
      return;
    }
    var ar = lang() === 'ar';
    var prefix = PREVIEW
      ? (ar ? 'تجربة الشريط الإخباري · الإجازات الرسمية:' : 'News ticker trial · Official holidays:')
      : (ar ? 'إجازة رسمية هذا الأسبوع:' : 'Official holiday this week:');
    var parts = items.map(function (h) {
      var name = ar ? (h.name_ar || h.name_en) : (h.name_en || h.name_ar);
      return name + ' · ' + formatDay(h.date, ar);
    });
    var joined = parts.join('  •  ');
    var text = prefix + ' ' + joined;
    // Triple the strip so the marquee feels continuous while scrolling
    var strip =
      '<span class="ht-label">' + prefix + '</span> ' + escapeHtml(joined) +
      '&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;' +
      '<span class="ht-label">' + prefix + '</span> ' + escapeHtml(joined) +
      '&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;' +
      '<span class="ht-label">' + prefix + '</span> ' + escapeHtml(joined);
    el.innerHTML =
      '<span class="ht-ico" aria-hidden="true">🎉</span>' +
      '<div class="ht-track"><div class="ht-marquee">' + strip + '</div></div>';
    el.title = text;
    el.hidden = false;
    el.classList.add('on');
    layoutTicker(el);
    el.setAttribute('dir', ar ? 'rtl' : 'ltr');
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function loadHolidays() {
    var url = docsBase() + 'data/oman-holidays.json?v=20260802b';
    if (DATA_URL_CACHE) return DATA_URL_CACHE;
    DATA_URL_CACHE = fetch(url, { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('holidays');
        return r.json();
      })
      .then(function (json) {
        return Array.isArray(json && json.holidays) ? json.holidays : [];
      })
      .catch(function () {
        return [];
      });
    return DATA_URL_CACHE;
  }

  function refresh() {
    loadHolidays().then(function (list) {
      paint(holidaysForTicker(list, activeDate()));
    });
  }

  function boot() {
    refresh();
    // Re-position when alert icons appear/disappear
    setInterval(function () {
      var el = document.getElementById(TICKER_ID);
      if (el && el.classList.contains('on')) layoutTicker(el);
    }, 1500);
    document.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest('#langToggle, #langBtn')) {
        setTimeout(refresh, 50);
      }
    });
    window.addEventListener('storage', function (e) {
      if (e.key === 'rosterLang' || e.key === 'prefLang') setTimeout(refresh, 30);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.rosterHolidayTicker = { refresh: refresh };
})();
