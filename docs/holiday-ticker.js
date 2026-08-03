/**
 * News ticker — shows admin-approved employee messages (+ optional holidays).
 * The emoji opens a compose modal to submit a ticker message.
 */
(function () {
  'use strict';

  var PREVIEW_HOLIDAYS = true; // also scroll upcoming holidays while empty/previewing
  var TICKER_ID = 'holidayTicker';
  var STYLE_ID = 'holidayTickerCss';
  var MODAL_ID = 'htComposeModal';
  var MANTLE_URL = 'https://mantledb.sh/v2/roster-site-visits/ticker-messages';
  var MANTLE_KEY = '8bb6b7c45e0e18fef1b758bc6dc85d7b1bac11b42e2e53faab3b88595572189d';
  var EMOJI_DEFAULTS = { '82437': '1f349' };
  var holidaysCache = null;
  var messagesCache = null;
  var showModeCache = 'both';
  var staffById = null;
  var emojiListCache = null;
  var composeBound = false;

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

  function mantleHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-Mantle-Key': MANTLE_KEY
    };
  }

  function digitsOnly(v) {
    return String(v || '').replace(/\D+/g, '').slice(0, 12);
  }

  function readSavedIdentity() {
    try {
      return {
        id: String(
          localStorage.getItem('exportSavedEmpId') ||
            localStorage.getItem('importSavedEmpId') ||
            localStorage.getItem('savedEmpId') ||
            ''
        ).trim(),
        name: String(
          localStorage.getItem('exportSavedEmpName') ||
            localStorage.getItem('importSavedEmpName') ||
            localStorage.getItem('savedEmpName') ||
            ''
        ).trim()
      };
    } catch (e) {
      return { id: '', name: '' };
    }
  }

  function saveIdentity(id, name) {
    try {
      localStorage.setItem('exportSavedEmpId', id);
      localStorage.setItem('savedEmpId', id);
      if (name) {
        localStorage.setItem('exportSavedEmpName', name);
        localStorage.setItem('savedEmpName', name);
      }
    } catch (e) {}
  }

  function validEmojiCp(cp) {
    return /^[0-9a-f]{2,8}(_[0-9a-f]{2,8})*$/i.test(String(cp || '').trim());
  }

  function emojiHash(s) {
    var h = 0;
    for (var i = 0; i < String(s || '').length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  }

  function readLocalEmoji(empId) {
    try {
      var map = JSON.parse(localStorage.getItem('empEmojiChoiceMap') || '{}') || {};
      var cp = String(map[empId] || map.export || '').trim();
      if (!cp) cp = String(localStorage.getItem('empEmojiChoice') || '').trim();
      if (validEmojiCp(cp)) return cp.toLowerCase();
    } catch (e) {}
    if (EMOJI_DEFAULTS[empId]) return EMOJI_DEFAULTS[empId];
    return '';
  }

  async function resolveEmoji(empId) {
    var local = readLocalEmoji(empId);
    if (local) return local;
    try {
      if (!emojiListCache) {
        var res = await fetch(docsBase() + 'my-emoji/emojis.json', { cache: 'force-cache' });
        emojiListCache = res.ok ? await res.json() : [];
      }
      if (emojiListCache && emojiListCache.length) {
        var item = emojiListCache[emojiHash(empId) % emojiListCache.length];
        if (item && validEmojiCp(item.cp)) return String(item.cp).toLowerCase();
      }
    } catch (e) {}
    return '';
  }

  async function loadStaff() {
    if (staffById) return staffById;
    staffById = Object.create(null);
    try {
      var res = await fetch(docsBase() + 'schedules/index.json?ts=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) throw new Error('staff');
      var json = await res.json();
      (json.employees || []).forEach(function (e) {
        if (!e || !e.id) return;
        staffById[String(e.id)] = String(e.name || '').trim();
      });
    } catch (e) {}
    return staffById;
  }

  async function resolveEmp(rawId) {
    var id = digitsOnly(rawId);
    if (!id) return { id: '', name: '', ok: false, reason: 'empty' };
    var map = await loadStaff();
    if (map[id]) return { id: id, name: map[id], ok: true };
    if (!Object.keys(map).length && id.length >= 4) {
      return { id: id, name: '', ok: true, unverified: true };
    }
    return { id: id, name: '', ok: false, reason: 'unknown' };
  }

  async function readFullStore() {
    var res = await fetch(MANTLE_URL + '?ts=' + Date.now(), {
      headers: mantleHeaders(),
      cache: 'no-store'
    });
    if (!res.ok) throw new Error('read');
    var json = await res.json();
    return {
      pending: Array.isArray(json.pending) ? json.pending : [],
      approved: Array.isArray(json.approved) ? json.approved : [],
      showMode: normalizeMode(json.showMode),
      hidden: !!json.hidden,
      requireApproval: json.requireApproval !== false
    };
  }

  async function writeFullStore(store) {
    var payload = {
      pending: (store.pending || []).slice(0, 80),
      approved: (store.approved || []).slice(0, 40),
      showMode: normalizeMode(store.showMode),
      hidden: !!store.hidden,
      requireApproval: store.requireApproval !== false
    };
    while (JSON.stringify(payload).length > 50000 && payload.pending.length > 1) payload.pending.pop();
    while (JSON.stringify(payload).length > 50000 && payload.approved.length > 1) payload.approved.pop();
    var res = await fetch(MANTLE_URL, {
      method: 'POST',
      headers: mantleHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('write');
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
      'min-height:52px;width:auto;max-width:none;',
      'padding:0 14px 0 8px;border-radius:16px;',
      'background:#ffffff;',
      'border:1px solid rgba(15,23,42,.14);',
      'box-shadow:0 8px 24px rgba(15,23,42,.16);',
      'overflow:hidden;font-family:Tajawal,system-ui,sans-serif;',
      '-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;',
      'letter-spacing:0;text-transform:none;box-sizing:border-box;',
      'pointer-events:auto;cursor:pointer;',
      '}',
      '#' + TICKER_ID + '.on{display:flex}',
      '#' + TICKER_ID + '.solo{left:16px;right:16px}',
      '#' + TICKER_ID + '.above-dock{bottom:84px;left:16px;right:16px}',
      'html[dir="rtl"] #' + TICKER_ID + ',body.ar #' + TICKER_ID + '{left:72px;right:16px}',
      'html[dir="rtl"] #' + TICKER_ID + '.solo,body.ar #' + TICKER_ID + '.solo,',
      'html[dir="rtl"] #' + TICKER_ID + '.above-dock,body.ar #' + TICKER_ID + '.above-dock{left:16px;right:16px}',
      '#' + TICKER_ID + ' .ht-ico{',
      'flex:0 0 auto;width:38px;height:38px;border-radius:12px;border:1px solid #dbeafe;padding:0;',
      'display:grid;place-items:center;cursor:pointer;',
      'background:linear-gradient(160deg,#ffffff,#eff6ff);',
      'box-shadow:0 2px 8px rgba(37,99,235,.16);',
      '-webkit-tap-highlight-color:transparent;',
      'pointer-events:auto;',
      '}',
      '#' + TICKER_ID + ' .ht-ico img{width:24px;height:24px;object-fit:contain;display:block;pointer-events:none}',
      '#' + TICKER_ID + ' .ht-ico:active{transform:scale(.96)}',
      '#' + TICKER_ID + ' .ht-track{',
      'flex:1 1 auto;min-width:0;width:100%;overflow:hidden;cursor:pointer;',
      'mask-image:linear-gradient(90deg,transparent 0,#000 12px,#000 100%);',
      '-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 12px,#000 100%);',
      '}',
      'html[dir="rtl"] #' + TICKER_ID + ' .ht-track,body.ar #' + TICKER_ID + ' .ht-track{',
      'mask-image:linear-gradient(270deg,transparent 0,#000 12px,#000 100%);',
      '-webkit-mask-image:linear-gradient(270deg,transparent 0,#000 12px,#000 100%);',
      '}',
      '#' + TICKER_ID + ' .ht-marquee{',
      'display:inline-block;white-space:nowrap;padding-inline:8px;',
      'font-size:13px;font-weight:800;color:#1c1917;line-height:1.4;',
      'letter-spacing:0;animation:htScroll 28s linear infinite;',
      '}',
      '#' + TICKER_ID + ' .ht-msg{font-weight:900}',
      '#' + TICKER_ID + ' .ht-from{font-weight:800;display:inline-flex;align-items:center;gap:3px;vertical-align:middle}',
      '#' + TICKER_ID + ' .ht-emoji{width:16px;height:16px;object-fit:contain;flex:0 0 auto;display:inline-block;vertical-align:-2px}',
      '#' + TICKER_ID + ' .ht-sep{color:#94a3b8;opacity:.9;margin:0 .35em}',
      '#' + TICKER_ID + ' .ht-hol{color:#9a3412;font-weight:800}',
      'html[dir="rtl"] #' + TICKER_ID + ' .ht-marquee,body.ar #' + TICKER_ID + ' .ht-marquee{animation-name:htScrollRtl}',
      '#' + TICKER_ID + ' .ht-label{color:#9a3412;font-weight:900;margin-inline-end:6px}',
      '@keyframes htScroll{0%{transform:translateX(0)}100%{transform:translateX(-33.333%)}}',
      '@keyframes htScrollRtl{0%{transform:translateX(0)}100%{transform:translateX(33.333%)}}',
      '@media (prefers-reduced-motion:reduce){#' + TICKER_ID + ' .ht-marquee{animation:none;transform:none}}',
      'html.has-float-dock .wrap{padding-bottom:calc(120px + env(safe-area-inset-bottom,0px))!important}',
      'html.has-float-dock .footer{margin-bottom:calc(72px + env(safe-area-inset-bottom,0px))!important}',
      '#' + MODAL_ID + '{',
      'position:fixed;inset:0;z-index:100120;display:none;',
      'font-family:Tajawal,system-ui,sans-serif;letter-spacing:0;',
      '}',
      '#' + MODAL_ID + '.on{display:block}',
      '#' + MODAL_ID + ' .htc-sheet{',
      'position:absolute;inset:0;display:flex;flex-direction:column;',
      'background:linear-gradient(180deg,#f8fafc 0%,#eef2ff 100%);color:#0f172a;',
      '}',
      '#' + MODAL_ID + ' .htc-top{',
      'flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:10px;',
      'padding:calc(12px + env(safe-area-inset-top,0px)) 14px 12px;',
      'background:#0f172a;color:#f8fafc;border-bottom:1px solid #1e293b;',
      '}',
      '#' + MODAL_ID + ' .htc-top h2{margin:0;font-size:17px;font-weight:900}',
      '#' + MODAL_ID + ' .htc-top .htc-subline{margin:3px 0 0;font-size:11px;font-weight:700;color:#94a3b8}',
      '#' + MODAL_ID + ' .htc-close{',
      'width:40px;height:40px;border:0;border-radius:12px;background:#1e293b;color:#e2e8f0;',
      'font-size:20px;font-weight:900;cursor:pointer;flex-shrink:0;',
      '}',
      '#' + MODAL_ID + ' .htc-feed{',
      'flex:1 1 auto;min-height:0;overflow:auto;-webkit-overflow-scrolling:touch;',
      'padding:14px 12px 10px;display:flex;flex-direction:column;gap:10px;',
      '}',
      '#' + MODAL_ID + ' .htc-empty{',
      'margin:auto;text-align:center;color:#64748b;font-size:13px;font-weight:800;padding:24px 12px;line-height:1.5',
      '}',
      '#' + MODAL_ID + ' .htc-bubble{',
      'max-width:min(92%,420px);align-self:flex-start;background:#fff;',
      'border:1px solid #e2e8f0;border-radius:16px 16px 16px 6px;padding:9px 11px;',
      'box-shadow:0 4px 14px rgba(15,23,42,.06);border-inline-start:3px solid #94a3b8;',
      '}',
      '#' + MODAL_ID + ' .htc-bubble.mine{',
      'align-self:flex-end;border-radius:16px 16px 6px 16px;',
      '}',
      '#' + MODAL_ID + ' .htc-bubble .htc-meta{',
      'display:flex;align-items:center;gap:5px;margin-bottom:3px;font-size:11px;font-weight:800;',
      '}',
      '#' + MODAL_ID + ' .htc-bubble .htc-meta img{width:16px;height:16px;object-fit:contain;flex:0 0 auto}',
      '#' + MODAL_ID + ' .htc-bubble .htc-text{font-size:13px;font-weight:800;color:#1e293b;line-height:1.4;word-break:break-word}',
      '#' + MODAL_ID + ' .htc-bubble .htc-time{margin-top:4px;font-size:10px;font-weight:700;color:#94a3b8}',
      '#' + MODAL_ID + ' .htc-composer{',
      'flex:0 0 auto;background:#ffffff;border-top:1px solid #e2e8f0;',
      'padding:12px 12px calc(12px + env(safe-area-inset-bottom,0px));',
      'box-shadow:0 -6px 20px rgba(15,23,42,.06);',
      '}',
      '#' + MODAL_ID + ' .htc-whochip{',
      'display:flex;align-items:center;gap:8px;',
      'margin:0 0 10px;padding:8px 12px;border-radius:14px;',
      'background:#f1f5f9;border:1px solid #e2e8f0;',
      'font-size:12px;font-weight:800;color:#0f172a;line-height:1.3;',
      '}',
      '#' + MODAL_ID + ' .htc-whochip::before{',
      'content:"";width:8px;height:8px;border-radius:50%;background:#22c55e;flex:0 0 auto;',
      '}',
      '#' + MODAL_ID + ' .htc-composebox{',
      'display:flex;align-items:stretch;gap:8px;',
      'padding:8px;border-radius:16px;background:#f8fafc;border:1px solid #e2e8f0;',
      '}',
      '#' + MODAL_ID + ' .htc-composebox:focus-within{',
      'border-color:#f59e0b;box-shadow:0 0 0 3px rgba(245,158,11,.16);background:#fff;',
      '}',
      '#' + MODAL_ID + ' .htc-composebox .htc-grow{',
      'flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:4px;',
      '}',
      '#' + MODAL_ID + ' textarea#htcMsg{',
      'width:100%;box-sizing:border-box;border:0;border-radius:10px;',
      'padding:10px 12px;margin:0;min-height:48px;max-height:110px;height:48px;',
      'resize:none;overflow:hidden;line-height:1.45;',
      'font:inherit;font-size:14px;font-weight:700;color:#0f172a;outline:none;',
      'background:transparent;-webkit-appearance:none;appearance:none;',
      '}',
      '#' + MODAL_ID + ' textarea#htcMsg::placeholder{color:#94a3b8;font-weight:700}',
      '#' + MODAL_ID + ' .htc-hint{',
      'margin:0;padding:0 4px;font-size:11px;font-weight:700;color:#94a3b8;text-align:start;',
      '}',
      '#' + MODAL_ID + ' .htc-send{',
      'flex:0 0 auto;align-self:stretch;border:0;border-radius:12px;',
      'min-width:78px;padding:0 16px;',
      'background:linear-gradient(135deg,#f59e0b,#ea580c);color:#111;',
      'font:inherit;font-size:14px;font-weight:900;cursor:pointer;',
      'display:inline-flex;align-items:center;justify-content:center;',
      '}',
      '#' + MODAL_ID + ' .htc-send:disabled{opacity:.55;cursor:wait}',
      '#' + MODAL_ID + ' .htc-status{',
      'min-height:16px;margin-top:8px;font-size:11px;font-weight:800;color:#15803d;text-align:center;',
      '}',
      '#' + MODAL_ID + ' .htc-status.err{color:#b91c1c}'
    ].join('');
    if (!document.getElementById('htTajawalFont')) {
      var fontLink = document.createElement('link');
      fontLink.id = 'htTajawalFont';
      fontLink.rel = 'stylesheet';
      fontLink.href = 'https://fonts.googleapis.com/css2?family=Tajawal:wght@700;800;900&display=swap';
      document.head.appendChild(fontLink);
    }
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

  function formatChatTime(at) {
    try {
      return new Date(Number(at) || Date.now()).toLocaleString('ar-OM', {
        timeZone: 'Asia/Muscat',
        hour: '2-digit',
        minute: '2-digit',
        day: 'numeric',
        month: 'short'
      });
    } catch (e) {
      return '';
    }
  }

  function authorKey(m) {
    return String((m && (m.empId || m.name)) || 'guest').trim().toLowerCase();
  }

  function authorColors(key) {
    // Distinct readable palette (ink + soft bg + border)
    var palette = [
      { ink: '#1d4ed8', bg: '#eff6ff', border: '#93c5fd' },
      { ink: '#b45309', bg: '#fffbeb', border: '#fcd34d' },
      { ink: '#047857', bg: '#ecfdf5', border: '#6ee7b7' },
      { ink: '#be185d', bg: '#fdf2f8', border: '#f9a8d4' },
      { ink: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd' },
      { ink: '#0e7490', bg: '#ecfeff', border: '#67e8f9' },
      { ink: '#c2410c', bg: '#fff7ed', border: '#fdba74' },
      { ink: '#4f46e5', bg: '#eef2ff', border: '#a5b4fc' },
      { ink: '#15803d', bg: '#f0fdf4', border: '#86efac' },
      { ink: '#a16207', bg: '#fefce8', border: '#fde047' },
      { ink: '#0369a1', bg: '#f0f9ff', border: '#7dd3fc' },
      { ink: '#9f1239', bg: '#fff1f2', border: '#fda4af' }
    ];
    var s = String(key || 'guest');
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) >>> 0;
    return palette[h % palette.length];
  }

  function closeCompose() {
    var modal = document.getElementById(MODAL_ID);
    if (!modal) return;
    modal.classList.remove('on');
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
  }

  function renderChatFeed(approved, myId) {
    var feed = document.getElementById('htcFeed');
    if (!feed) return;
    var list = (approved || []).slice().reverse(); // oldest first for chat
    if (!list.length) {
      feed.innerHTML = '<div class="htc-empty">لا رسائل بعد.<br>كن أول من يكتب في الشريط الإخباري.</div>';
      return;
    }
    feed.innerHTML = list
      .map(function (m) {
        var mine = myId && String(m.empId || '') === String(myId);
        var c = authorColors(authorKey(m));
        var cp = String(m.emoji || '').trim().toLowerCase();
        var emoji = validEmojiCp(cp)
          ? '<img alt="" src="https://fonts.gstatic.com/s/e/notoemoji/latest/' +
            escapeHtml(cp) +
            '/512.webp">'
          : '';
        return (
          '<article class="htc-bubble' +
          (mine ? ' mine' : '') +
          '" style="background:' +
          c.bg +
          ';border-color:' +
          c.border +
          ';border-inline-start-color:' +
          c.ink +
          '">' +
          '<div class="htc-meta" style="color:' +
          c.ink +
          '">' +
          emoji +
          '<span></span>' +
          '</div>' +
          '<div class="htc-text"></div>' +
          '<div class="htc-time"></div>' +
          '</article>'
        );
      })
      .join('');
    Array.from(feed.children).forEach(function (el, i) {
      var m = list[i];
      el.querySelector('.htc-meta span').textContent = m.name || 'موظف';
      el.querySelector('.htc-text').textContent = m.text || '';
      el.querySelector('.htc-time').textContent = formatChatTime(m.approvedAt || m.at);
    });
    feed.scrollTop = feed.scrollHeight;
  }

  function ensureCompose() {
    injectStyles();
    var modal = document.getElementById(MODAL_ID);
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML =
      '<div class="htc-sheet" role="dialog" aria-modal="true" aria-labelledby="htcTitle">' +
        '<div class="htc-top">' +
          '<div>' +
            '<h2 id="htcTitle">🎉 دردشة الشريط</h2>' +
            '<p class="htc-subline" id="htcSub">رسائل الموظفين المعتمدة</p>' +
          '</div>' +
          '<button type="button" class="htc-close" id="htcClose" aria-label="إغلاق">×</button>' +
        '</div>' +
        '<div class="htc-feed" id="htcFeed"><div class="htc-empty">جاري التحميل…</div></div>' +
        '<div class="htc-composer">' +
          '<div class="htc-whochip" id="htcWhoChip">' +
            '<span id="htcWhoText">جاري التعرّف…</span>' +
          '</div>' +
          '<div class="htc-composebox">' +
            '<div class="htc-grow">' +
              '<textarea id="htcMsg" maxlength="120" rows="1" enterkeyhint="send" autocomplete="off" placeholder="اكتب رسالة للزملاء…"></textarea>' +
              '<p class="htc-hint"><span id="htcCount">0</span>/120</p>' +
            '</div>' +
            '<button type="button" class="htc-send" id="htcSend">نشر</button>' +
          '</div>' +
          '<div class="htc-status" id="htcStatus" aria-live="polite"></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);

    if (!composeBound) {
      composeBound = true;
      document.getElementById('htcClose').addEventListener('click', closeCompose);
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal.classList.contains('on')) closeCompose();
      });
      var msgInput = document.getElementById('htcMsg');
      var countEl = document.getElementById('htcCount');
      var statusEl = document.getElementById('htcStatus');
      var sendBtn = document.getElementById('htcSend');
      var subEl = document.getElementById('htcSub');
      var whoText = document.getElementById('htcWhoText');
      var resolvedEmp = { id: '', name: '' };

      function paintIdentity(r) {
        resolvedEmp = r && r.ok ? { id: r.id, name: r.name || '' } : { id: '', name: '' };
        if (resolvedEmp.id) {
          whoText.textContent = resolvedEmp.name || ('#' + resolvedEmp.id);
        } else {
          whoText.textContent = 'افتح «جدولي» أولاً لحفظ اسمك';
        }
      }

      async function syncEmp() {
        var saved = readSavedIdentity();
        if (!saved.id) {
          paintIdentity({ ok: false, id: '', name: '' });
          return { ok: false, id: '', name: '', reason: 'empty' };
        }
        var r = await resolveEmp(saved.id);
        if (r.ok) {
          saveIdentity(r.id, r.name || saved.name);
          paintIdentity(r);
          return r;
        }
        // Keep saved name even if roster lookup fails briefly
        paintIdentity({ ok: true, id: saved.id, name: saved.name });
        return { ok: true, id: saved.id, name: saved.name };
      }

      async function refreshFeed() {
        try {
          var store = await readFullStore();
          var need = store.requireApproval !== false;
          subEl.textContent = need
            ? 'رسائل الموظفين · تظهر بعد الاعتماد'
            : 'رسائل الموظفين · نشر مباشر';
          sendBtn.textContent = need ? 'إرسال' : 'نشر';
          renderChatFeed(store.approved || [], resolvedEmp.id || readSavedIdentity().id);
        } catch (e) {
          var feed = document.getElementById('htcFeed');
          if (feed) feed.innerHTML = '<div class="htc-empty">تعذر تحميل الرسائل.</div>';
        }
      }
      modal._htcRefreshFeed = refreshFeed;
      modal._htcSyncEmp = syncEmp;

      msgInput.addEventListener('input', function () {
        countEl.textContent = String(msgInput.value.length);
        msgInput.style.height = '48px';
        msgInput.style.overflow = 'hidden';
        var h = Math.min(110, Math.max(48, msgInput.scrollHeight));
        msgInput.style.height = h + 'px';
        if (msgInput.scrollHeight > 110) msgInput.style.overflow = 'auto';
      });

      sendBtn.addEventListener('click', async function () {
        statusEl.className = 'htc-status';
        statusEl.textContent = '';
        var emp = await syncEmp();
        var text = String(msgInput.value || '').replace(/\s+/g, ' ').trim().slice(0, 120);
        if (!emp.ok || !emp.id) {
          statusEl.className = 'htc-status err';
          statusEl.textContent = 'احفظ رقمك الوظيفي من «جدولي» ثم عد للدردشة.';
          return;
        }
        if (text.length < 3) {
          statusEl.className = 'htc-status err';
          statusEl.textContent = 'اكتب رسالة أوضح (٣ أحرف على الأقل).';
          msgInput.focus();
          return;
        }
        sendBtn.disabled = true;
        statusEl.textContent = 'جاري الإرسال…';
        try {
          var store = await readFullStore();
          var needApproval = store.requireApproval !== false;
          var emoji = await resolveEmoji(emp.id);
          var row = {
            id: 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
            text: text,
            name: emp.name || '',
            empId: emp.id,
            emoji: emoji || '',
            at: Date.now(),
            status: needApproval ? 'pending' : 'approved'
          };
          if (needApproval) {
            store.pending = [row].concat(store.pending || []).slice(0, 80);
          } else {
            row.approvedAt = Date.now();
            store.approved = [row].concat(store.approved || []).slice(0, 40);
          }
          await writeFullStore(store);
          msgInput.value = '';
          countEl.textContent = '0';
          msgInput.style.height = '48px';
          msgInput.style.overflow = 'hidden';
          statusEl.textContent = needApproval
            ? 'تم الإرسال. بانتظار اعتماد المشرف.'
            : 'تم النشر.';
          messagesCache = null;
          refresh();
          await refreshFeed();
        } catch (e) {
          statusEl.className = 'htc-status err';
          statusEl.textContent = 'تعذر الإرسال. حاول مرة أخرى.';
        } finally {
          sendBtn.disabled = false;
        }
      });
    }
    return modal;
  }

  function openCompose() {
    var ar = lang() === 'ar';
    var modal = ensureCompose();
    modal.setAttribute('dir', ar ? 'rtl' : 'ltr');
    var msgInput = document.getElementById('htcMsg');
    var statusEl = document.getElementById('htcStatus');
    statusEl.className = 'htc-status';
    statusEl.textContent = '';
    modal.classList.add('on');
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
    Promise.resolve()
      .then(function () {
        return modal._htcSyncEmp ? modal._htcSyncEmp() : null;
      })
      .then(function () {
        return modal._htcRefreshFeed ? modal._htcRefreshFeed() : null;
      })
      .finally(function () {
        setTimeout(function () { msgInput.focus(); }, 40);
      });
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
    var iconSrc = docsBase() + 'assets/live-chat.png?v=2';
    var openLabel = ar ? 'فتح دردشة الشريط' : 'Open ticker chat';
    el.innerHTML =
      '<button type="button" class="ht-ico" id="htOpenBoard" title="' +
      openLabel +
      '" aria-label="' +
      openLabel +
      '"><img src="' +
      escapeHtml(iconSrc) +
      '" alt=""></button>' +
      '<div class="ht-track" id="htOpenTrack"><div class="ht-marquee">' +
      strip +
      '</div></div>';
    el.title = plain + (ar ? ' — اضغط للكتابة' : ' — Tap to write');
    el.hidden = false;
    el.classList.add('on');
    layoutTicker(el);
    el.setAttribute('dir', ar ? 'rtl' : 'ltr');
    function onOpen(e) {
      e.preventDefault();
      e.stopPropagation();
      openCompose();
    }
    var btn = document.getElementById('htOpenBoard');
    if (btn) btn.addEventListener('click', onOpen);
    var track = document.getElementById('htOpenTrack');
    if (track) track.addEventListener('click', onOpen);
    el.onclick = function (e) {
      if (e.target && e.target.closest && e.target.closest('#' + MODAL_ID)) return;
      onOpen(e);
    };
  }

  function emojiImgHtml(cp) {
    cp = String(cp || '').trim().toLowerCase();
    if (!validEmojiCp(cp)) return '';
    return (
      '<img class="ht-emoji" alt="" aria-hidden="true" decoding="async" ' +
      'src="https://fonts.gstatic.com/s/e/notoemoji/latest/' +
      escapeHtml(cp) +
      '/512.webp">'
    );
  }

  function buildParts(approved, holidays) {
    var ar = lang() === 'ar';
    var parts = [];
    (approved || []).forEach(function (m) {
      if (!m || !m.text) return;
      var c = authorColors(authorKey(m));
      var bit =
        '<span class="ht-msg" style="color:' +
        c.ink +
        '">' +
        escapeHtml(m.text) +
        '</span>';
      if (m.name) {
        bit +=
          '<span class="ht-sep">—</span><span class="ht-from" style="color:' +
          c.ink +
          '">' +
          emojiImgHtml(m.emoji) +
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
        '<span class="ht-msg" style="color:#334155">' +
          escapeHtml(
            ar
              ? 'اضغط على الشريط أو أيقونة الدردشة لكتابة رسالة — تظهر بعد اعتماد المشرف'
              : 'Tap the ticker or chat icon to write a message — shown after admin approval'
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
          showMode: showModeCache,
          hidden: !!(json && json.hidden)
        };
      })
      .catch(function () {
        showModeCache = 'both';
        return { approved: [], showMode: 'both', hidden: false };
      });
    return messagesCache;
  }

  function refresh() {
    messagesCache = null; // always re-check approved list + mode
    Promise.all([loadTickerStore(), loadHolidays()]).then(function (pair) {
      var store = pair[0] || { approved: [], showMode: 'both', hidden: false };
      if (store.hidden) {
        paintParts([], lang() === 'ar');
        return;
      }
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

  window.rosterHolidayTicker = { refresh: refresh, openCompose: openCompose };
})();
