/**
 * News ticker — shows admin-approved employee messages (+ optional holidays).
 * The emoji opens /ticker-board/ where staff can submit messages for approval.
 */
(function () {
  'use strict';

  var PREVIEW_HOLIDAYS = true; // also scroll upcoming holidays while empty/previewing
  var TICKER_ID = 'holidayTicker';
  var STYLE_ID = 'holidayTickerCss';
  var MANTLE_URL = 'https://mantledb.sh/v2/roster-site-visits/ticker-messages';
  var MANTLE_KEY = '8bb6b7c45e0e18fef1b758bc6dc85d7b1bac11b42e2e53faab3b88595572189d';
  var holidaysCache = null;
  var messagesCache = null;
  var showModeCache = 'both';

  function normalizeMode(m) {
    m = String(m || '').trim();
    if (m === 'official' || m === 'staff' || m === 'both') return m;
    return 'both';
  }

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
      if (m) return m[1];
      if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return '/';
    } catch (e2) {}
    return '/docs/';
  }

  function boardUrl() {
    return docsBase() + 'ticker-board/';
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

  function weekBounds(ymd) {
    var p = ymd.split('-').map(Number);
    var dt = new Date(Date.UTC(p[0], p[1] - 1, p[2], 8, 0, 0));
    var dow = dt.getUTCDay();
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
    if (!PREVIEW_HOLIDAYS) return [];
    var out = [];
    var seen = Object.create(null);
    (list || []).forEach(function (h) {
      if (!h || h.date < muscatToday()) return;
      var key = String(h.name_ar || h.name_en || '');
      if (!key || seen[key]) return;
      seen[key] = 1;
      out.push(h);
    });
    return out.slice(0, 3);
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
      'padding:0 14px 0 8px;border-radius:16px;',
      'background:rgba(255,255,255,.94);',
      'border:1px solid rgba(15,23,42,.1);',
      'box-shadow:0 8px 24px rgba(15,23,42,.14);',
      'backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);',
      'overflow:hidden;font-family:Tajawal,Sora,system-ui,sans-serif;',
      'letter-spacing:0;text-transform:none;box-sizing:border-box;',
      /* let footer refresh/texture/secret buttons receive clicks through the bar */
      'pointer-events:none;',
      '}',
      '#' + TICKER_ID + '.on{display:flex}',
      '#' + TICKER_ID + '.solo{left:16px;right:16px}',
      '#' + TICKER_ID + '.above-dock{bottom:84px;left:16px;right:16px}',
      'html[dir="rtl"] #' + TICKER_ID + ',body.ar #' + TICKER_ID + '{left:72px;right:16px}',
      'html[dir="rtl"] #' + TICKER_ID + '.solo,body.ar #' + TICKER_ID + '.solo,',
      'html[dir="rtl"] #' + TICKER_ID + '.above-dock,body.ar #' + TICKER_ID + '.above-dock{left:16px;right:16px}',
      '#' + TICKER_ID + ' .ht-ico{',
      'flex:0 0 auto;width:34px;height:34px;border-radius:12px;border:0;',
      'display:grid;place-items:center;font-size:17px;cursor:pointer;',
      'background:linear-gradient(135deg,#fff7ed,#ffedd5);',
      'box-shadow:0 2px 8px rgba(234,88,12,.18);',
      '-webkit-tap-highlight-color:transparent;',
      'pointer-events:auto;',
      '}',
      '#' + TICKER_ID + ' .ht-ico:active{transform:scale(.96)}',
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
      '#' + TICKER_ID + ' .ht-msg{color:#9a3412;font-weight:900}',
      '#' + TICKER_ID + ' .ht-from{color:#0369a1;font-weight:800}',
      '#' + TICKER_ID + ' .ht-sep{color:#c2410c;opacity:.55;margin:0 .35em}',
      '#' + TICKER_ID + ' .ht-hol{color:#b45309;font-weight:800}',
      'html[dir="rtl"] #' + TICKER_ID + ' .ht-marquee,body.ar #' + TICKER_ID + ' .ht-marquee{animation-name:htScrollRtl}',
      '#' + TICKER_ID + ' .ht-label{color:#c2410c;font-weight:900;margin-inline-end:6px}',
      '@keyframes htScroll{0%{transform:translateX(0)}100%{transform:translateX(-33.333%)}}',
      '@keyframes htScrollRtl{0%{transform:translateX(0)}100%{transform:translateX(33.333%)}}',
      '@media (prefers-reduced-motion:reduce){#' + TICKER_ID + ' .ht-marquee{animation:none;transform:none}}',
      'html.has-float-dock .wrap{padding-bottom:calc(120px + env(safe-area-inset-bottom,0px))!important}',
      'html.has-float-dock .footer{margin-bottom:calc(72px + env(safe-area-inset-bottom,0px))!important}'
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
    // Keep bar pinned — never lift on scroll.
    el.style.bottom = '';
    el.classList.remove('lifted');
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

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function paintParts(parts, ar) {
    injectStyles();
    var el = ensureTicker();
    if (!parts || !parts.length) {
      el.classList.remove('on');
      el.hidden = true;
      el.innerHTML = '';
      return;
    }
    var joinedHtml = parts.join('<span class="ht-sep">•</span>');
    var plain = parts.map(function (p) {
      return String(p).replace(/<[^>]+>/g, '');
    }).join('  •  ');
    var strip =
      joinedHtml +
      '<span class="ht-sep">•</span>' +
      joinedHtml +
      '<span class="ht-sep">•</span>' +
      joinedHtml;
    el.innerHTML =
      '<button type="button" class="ht-ico" id="htOpenBoard" title="' +
      (ar ? 'اكتب رسالة للشريط' : 'Write a ticker message') +
      '" aria-label="' +
      (ar ? 'فتح صفحة كتابة رسالة الشريط' : 'Open ticker message page') +
      '">🎉</button>' +
      '<div class="ht-track"><div class="ht-marquee">' + strip + '</div></div>';
    el.title = plain;
    el.hidden = false;
    el.classList.add('on');
    layoutTicker(el);
    el.setAttribute('dir', ar ? 'rtl' : 'ltr');
    var btn = document.getElementById('htOpenBoard');
    if (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        location.href = boardUrl();
      });
    }
  }

  function buildParts(approved, holidays) {
    var ar = lang() === 'ar';
    var parts = [];
    (approved || []).forEach(function (m) {
      if (!m || !m.text) return;
      var bit = '<span class="ht-msg">' + escapeHtml(m.text) + '</span>';
      if (m.name) {
        bit +=
          '<span class="ht-sep">—</span><span class="ht-from">' +
          escapeHtml(String(m.name)) +
          '</span>';
      }
      parts.push(bit);
    });
    (holidays || []).forEach(function (h) {
      var name = ar ? (h.name_ar || h.name_en) : (h.name_en || h.name_ar);
      parts.push(
        '<span class="ht-hol">' +
          escapeHtml((ar ? 'إجازة رسمية: ' : 'Holiday: ') + name + ' · ' + formatDay(h.date, ar)) +
          '</span>'
      );
    });
    if (!parts.length) {
      parts.push(
        '<span class="ht-msg">' +
          escapeHtml(
            ar
              ? 'اضغط 🎉 لكتابة رسالة للشريط الإخباري — تظهر بعد اعتماد المشرف'
              : 'Tap 🎉 to write a ticker message — shown after admin approval'
          ) +
          '</span>'
      );
    }
    return parts;
  }

  function loadHolidays() {
    if (holidaysCache) return holidaysCache;
    var url = docsBase() + 'data/oman-holidays.json?v=20260802b';
    holidaysCache = fetch(url, { cache: 'no-store' })
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
    return holidaysCache;
  }

  function loadTickerStore() {
    if (messagesCache) return messagesCache;
    messagesCache = fetch(MANTLE_URL + '?ts=' + Date.now(), {
      headers: { 'X-Mantle-Key': MANTLE_KEY },
      cache: 'no-store'
    })
      .then(function (r) {
        if (!r.ok) throw new Error('msgs');
        return r.json();
      })
      .then(function (json) {
        showModeCache = normalizeMode(json && json.showMode);
        return {
          approved: Array.isArray(json && json.approved) ? json.approved : [],
          showMode: showModeCache
        };
      })
      .catch(function () {
        showModeCache = 'both';
        return { approved: [], showMode: 'both' };
      });
    return messagesCache;
  }

  function refresh() {
    messagesCache = null; // always re-check approved list + mode
    Promise.all([loadTickerStore(), loadHolidays()]).then(function (pair) {
      var store = pair[0] || { approved: [], showMode: 'both' };
      var mode = normalizeMode(store.showMode);
      var approved = mode === 'official' ? [] : (store.approved || []);
      var holidays =
        mode === 'staff' ? [] : holidaysForTicker(pair[1] || [], activeDate());
      paintParts(buildParts(approved, holidays), lang() === 'ar');
    });
  }

  function boot() {
    refresh();
    setInterval(function () {
      var el = document.getElementById(TICKER_ID);
      if (el && el.classList.contains('on')) layoutTicker(el);
    }, 1500);
    // Refresh approved messages periodically
    setInterval(function () {
      messagesCache = null;
      refresh();
    }, 60000);
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
