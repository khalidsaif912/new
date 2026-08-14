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
  var MANTLE_IMG_NS = 'https://mantledb.sh/v2/roster-site-visits/ticker-img-';
  var MANTLE_KEY = '8bb6b7c45e0e18fef1b758bc6dc85d7b1bac11b42e2e53faab3b88595572189d';
  var EMOJI_DEFAULTS = { '82437': '1f349' };
  var holidaysCache = null;
  var messagesCache = null;
  var imageCache = Object.create(null);
  var showModeCache = 'both';
  var scrollSpeedCache = 'slow';
  var staffById = null;
  var emojiListCache = null;
  var composeBound = false;

  function normalizeMode(m) {
    m = String(m || '').trim();
    if (m === 'official' || m === 'staff' || m === 'both') return m;
    return 'both';
  }

  function normalizeScrollSpeed(s) {
    s = String(s || '').trim();
    if (
      s === 'crawl' ||
      s === 'slower' ||
      s === 'slow' ||
      s === 'medium' ||
      s === 'fast' ||
      s === 'faster'
    ) {
      return s;
    }
    return 'slow';
  }

  function scrollSeconds(s) {
    var map = { crawl: 160, slower: 110, slow: 80, medium: 50, fast: 28, faster: 16 };
    return map[normalizeScrollSpeed(s)] || 80;
  }

  function normalizeExpireHours(v) {
    v = Number(v);
    if (v === 24 || v === 48) return v;
    return 0;
  }

  function messageTime(m) {
    return Number((m && (m.at || m.approvedAt)) || 0);
  }

  function pruneExpired(store) {
    var hours = normalizeExpireHours(store && store.expireHours);
    if (!hours) return 0;
    var cutoff = Date.now() - hours * 3600 * 1000;
    function keep(m) {
      var t = messageTime(m);
      return !t || t >= cutoff;
    }
    var pending = Array.isArray(store.pending) ? store.pending : [];
    var approved = Array.isArray(store.approved) ? store.approved : [];
    var nextPending = pending.filter(keep);
    var nextApproved = approved.filter(keep);
    var removed = pending.length - nextPending.length + (approved.length - nextApproved.length);
    store.pending = nextPending;
    store.approved = nextApproved;
    return removed;
  }

  function normalizeStore(json) {
    json = json || {};
    return {
      pending: Array.isArray(json.pending) ? json.pending : [],
      approved: Array.isArray(json.approved) ? json.approved : [],
      showMode: normalizeMode(json.showMode),
      hidden: !!json.hidden,
      requireApproval: json.requireApproval !== false,
      scrollSpeed: normalizeScrollSpeed(json.scrollSpeed),
      expireHours: normalizeExpireHours(json.expireHours)
    };
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

  function listSavedEmpIds() {
    var out = [];
    try {
      ['exportSavedEmpId', 'importSavedEmpId', 'savedEmpId'].forEach(function (key) {
        var id = digitsOnly(localStorage.getItem(key));
        if (id && out.indexOf(id) === -1) out.push(id);
      });
    } catch (e) {}
    return out;
  }

  function nameForSavedId(id) {
    id = digitsOnly(id);
    if (!id) return '';
    try {
      var pairs = [
        ['exportSavedEmpId', 'exportSavedEmpName'],
        ['importSavedEmpId', 'importSavedEmpName'],
        ['savedEmpId', 'savedEmpName']
      ];
      for (var i = 0; i < pairs.length; i++) {
        if (digitsOnly(localStorage.getItem(pairs[i][0])) === id) {
          var n = String(localStorage.getItem(pairs[i][1]) || '').trim();
          if (n) return n;
        }
      }
    } catch (e) {}
    return String(readSavedIdentity().name || '').trim();
  }

  function saveIdentity(id, name) {
    id = digitsOnly(id);
    if (!id) return;
    try {
      // Keep both export (جدولي) and import (الوارد) in sync for chat identity.
      localStorage.setItem('exportSavedEmpId', id);
      localStorage.setItem('importSavedEmpId', id);
      localStorage.setItem('savedEmpId', id);
      if (name) {
        localStorage.setItem('exportSavedEmpName', name);
        localStorage.setItem('importSavedEmpName', name);
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
      var cp = String(map[empId] || map.export || map.import || '').trim();
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

  async function lookupScheduleName(path, id) {
    try {
      var res = await fetch(docsBase() + path + encodeURIComponent(id) + '.json?ts=' + Date.now(), {
        cache: 'no-store'
      });
      if (!res.ok) return null;
      var json = await res.json();
      if (!json) return null;
      var name = String(json.name || '').trim();
      var foundId = digitsOnly(json.id || id);
      if (!foundId) foundId = id;
      return { id: foundId, name: name };
    } catch (e) {
      return null;
    }
  }

  async function resolveEmp(rawId) {
    var id = digitsOnly(rawId);
    if (!id) return { id: '', name: '', ok: false, reason: 'empty' };
    var map = await loadStaff();
    if (map[id]) return { id: id, name: map[id], ok: true, source: 'export' };

    // Employees from «الوارد» live under import/schedules/{id}.json
    var imp = await lookupScheduleName('import/schedules/', id);
    if (imp) {
      staffById[imp.id] = imp.name;
      return { id: imp.id, name: imp.name, ok: true, source: 'import' };
    }

    // Individual export schedule file (if index missed them)
    var exp = await lookupScheduleName('schedules/', id);
    if (exp) {
      staffById[exp.id] = exp.name;
      return { id: exp.id, name: exp.name, ok: true, source: 'export' };
    }

    var savedName = nameForSavedId(id);
    if (savedName) return { id: id, name: savedName, ok: true, source: 'saved', unverified: true };
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
    return normalizeStore(json);
  }

  async function writeFullStore(store) {
    var payload = normalizeStore(store);
    payload.pending = (payload.pending || []).slice(0, 80);
    payload.approved = (payload.approved || []).slice(0, 40);
    while (JSON.stringify(payload).length > 50000 && payload.pending.length > 1) payload.pending.pop();
    while (JSON.stringify(payload).length > 50000 && payload.approved.length > 1) payload.approved.pop();
    var res = await fetch(MANTLE_URL, {
      method: 'POST',
      headers: mantleHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('write');
  }

  function validTickerId(id) {
    return /^t[a-z0-9]{8,32}$/i.test(String(id || ''));
  }

  function messageHasImage(m) {
    return !!(m && (m.img === 1 || m.img === true || m.img === '1'));
  }

  function imageDocUrl(id) {
    return MANTLE_IMG_NS + encodeURIComponent(id);
  }

  function safeImageData(s) {
    s = String(s || '').replace(/\s+/g, '');
    if (/^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/]+=*$/i.test(s)) return s;
    return '';
  }

  async function writeTickerImage(id, dataUrl) {
    if (!validTickerId(id)) throw new Error('id');
    var safe = safeImageData(dataUrl);
    if (!safe) throw new Error('img');
    var res = await fetch(imageDocUrl(id), {
      method: 'POST',
      headers: mantleHeaders(),
      body: JSON.stringify({ d: safe, at: Date.now() })
    });
    if (!res.ok) throw new Error('imgwrite');
    imageCache[id] = safe;
  }

  async function loadTickerImage(id) {
    if (!validTickerId(id)) return '';
    if (imageCache[id]) return imageCache[id];
    try {
      var res = await fetch(imageDocUrl(id) + '?ts=' + Date.now(), {
        headers: { 'X-Mantle-Key': MANTLE_KEY },
        cache: 'no-store'
      });
      if (!res.ok) return '';
      var json = await res.json();
      var safe = safeImageData(json && json.d);
      if (safe) imageCache[id] = safe;
      return safe;
    } catch (e) {
      return '';
    }
  }

  function blobToImage(file) {
    return new Promise(function (resolve, reject) {
      function fallback() {
        var url = URL.createObjectURL(file);
        var img = new Image();
        img.onload = function () {
          URL.revokeObjectURL(url);
          resolve(img);
        };
        img.onerror = function () {
          URL.revokeObjectURL(url);
          reject(new Error('load'));
        };
        img.src = url;
      }
      if (typeof createImageBitmap === 'function') {
        createImageBitmap(file, { imageOrientation: 'from-image' })
          .then(resolve)
          .catch(fallback);
      } else {
        fallback();
      }
    });
  }

  function isLikelyImageFile(file) {
    if (!file) return false;
    var t = String(file.type || '').toLowerCase();
    if (/^image\//.test(t)) return true;
    var n = String(file.name || '').toLowerCase();
    return /\.(jpe?g|png|gif|webp|heic|heif|bmp)$/.test(n);
  }

  async function compressImage(file) {
    if (!isLikelyImageFile(file)) throw new Error('type');
    if (file.size > 25 * 1024 * 1024) throw new Error('size');
    var src = await blobToImage(file);
    var w = src.width || src.naturalWidth || 0;
    var h = src.height || src.naturalHeight || 0;
    if (!w || !h) throw new Error('load');
    var max = 720;
    if (w > max || h > max) {
      if (w >= h) {
        h = Math.round((h * max) / w);
        w = max;
      } else {
        w = Math.round((w * max) / h);
        h = max;
      }
    }
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var quality = 0.7;
    var data = '';
    function paint(cw, ch, q) {
      canvas.width = cw;
      canvas.height = ch;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(src, 0, 0, cw, ch);
      return canvas.toDataURL('image/jpeg', q);
    }
    data = paint(w, h, quality);
    while (data.length > 38000 && quality > 0.38) {
      quality -= 0.08;
      data = paint(w, h, quality);
    }
    while (data.length > 38000 && w > 280) {
      w = Math.round(w * 0.82);
      h = Math.round(h * 0.82);
      data = paint(w, h, 0.52);
    }
    if (typeof src.close === 'function') {
      try {
        src.close();
      } catch (e) {}
    }
    if (!safeImageData(data) || data.length > 45000) throw new Error('size');
    return data;
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
      'position:fixed;bottom:0;left:0;right:0;',
      'z-index:100020;display:none;align-items:center;gap:0;',
      'min-height:40px;height:40px;width:auto;max-width:none;',
      'padding:0;border-radius:0;',
      'padding-bottom:env(safe-area-inset-bottom,0px);',
      'min-height:calc(40px + env(safe-area-inset-bottom,0px));',
      'height:calc(40px + env(safe-area-inset-bottom,0px));',
      'background:#ffffff;',
      'border:0;border-top:1px solid rgba(15,23,42,.14);',
      'box-shadow:0 -4px 18px rgba(15,23,42,.12);',
      'overflow:hidden;font-family:Tajawal,system-ui,sans-serif;',
      '-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;',
      'letter-spacing:0;text-transform:none;box-sizing:border-box;',
      'pointer-events:auto;cursor:pointer;',
      '}',
      '#' + TICKER_ID + '.on{display:flex}',
      /* Soft glow fade on left + right edges */
      '#' + TICKER_ID + '::before,#' + TICKER_ID + '::after{',
      'content:"";position:absolute;top:0;bottom:0;width:42px;',
      'pointer-events:none;z-index:4;',
      '}',
      '#' + TICKER_ID + '::before{',
      'left:0;',
      'background:linear-gradient(90deg,#fff 0%,rgba(255,255,255,.95) 28%,rgba(255,255,255,.55) 58%,rgba(255,255,255,0) 100%);',
      'box-shadow:10px 0 18px rgba(255,255,255,.55);',
      '}',
      '#' + TICKER_ID + '::after{',
      'right:0;',
      'background:linear-gradient(270deg,#fff 0%,rgba(255,255,255,.95) 28%,rgba(255,255,255,.55) 58%,rgba(255,255,255,0) 100%);',
      'box-shadow:-10px 0 18px rgba(255,255,255,.55);',
      '}',
      /* Icons sit above full-bleed ticker */
      '#chg-dot,#abs-dot,#featureNotesFab{',
      'position:fixed!important;left:16px!important;bottom:16px!important;',
      'z-index:100030!important;pointer-events:auto!important;',
      '}',
      'html.has-news-ticker #chg-dot,html.has-float-dock #chg-dot,',
      'html.has-news-ticker #abs-dot,html.has-float-dock #abs-dot{',
      'bottom:calc(48px + env(safe-area-inset-bottom,0px))!important;',
      'left:16px!important;',
      '}',
      'html.has-news-ticker #featureNotesFab,html.has-float-dock #featureNotesFab{',
      'bottom:calc(48px + env(safe-area-inset-bottom,0px))!important;',
      'left:16px!important;',
      '}',
      'html.has-news-ticker #featureNotesFab.beside-alert,',
      'html.has-float-dock #featureNotesFab.beside-alert{',
      'left:72px!important;',
      'bottom:calc(48px + env(safe-area-inset-bottom,0px))!important;',
      '}',
      /* Footer stays above dock + ticker clear zone */
      'html.has-news-ticker .footer,html.has-float-dock .footer{',
      'position:relative;z-index:1!important;isolation:auto;',
      'margin-bottom:calc(100px + env(safe-area-inset-bottom,0px))!important;',
      'padding-bottom:calc(12px + env(safe-area-inset-bottom,0px))!important;',
      '}',
      'html.has-news-ticker .bgTextureShuffleWrap,html.has-float-dock .bgTextureShuffleWrap,',
      '.bgTextureShuffleWrap{',
      'position:relative;z-index:100025!important;pointer-events:auto!important;',
      '}',
      'html.has-news-ticker .bgTextureShuffleWrap button,html.has-float-dock .bgTextureShuffleWrap button,',
      '.bgTextureShuffleWrap button{pointer-events:auto!important;position:relative;z-index:1}',
      'html.has-news-ticker #siteVisitsHost{position:relative;z-index:1}',
      '#' + TICKER_ID + ' .ht-ico{display:none!important}',
      '#' + TICKER_ID + ' .ht-track{',
      'flex:1 1 auto;min-width:0;width:100%;overflow:hidden;cursor:pointer;',
      'mask-image:linear-gradient(90deg,transparent 0,#000 36px,#000 calc(100% - 36px),transparent 100%);',
      '-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 36px,#000 calc(100% - 36px),transparent 100%);',
      '}',
      'html[dir="rtl"] #' + TICKER_ID + ' .ht-track,body.ar #' + TICKER_ID + ' .ht-track{',
      'mask-image:linear-gradient(90deg,transparent 0,#000 36px,#000 calc(100% - 36px),transparent 100%);',
      '-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 36px,#000 calc(100% - 36px),transparent 100%);',
      '}',
      '#' + TICKER_ID + ' .ht-marquee{',
      'display:inline-block;white-space:nowrap;padding-inline:28px;',
      'font-size:12px;font-weight:800;color:#1c1917;line-height:1.3;',
      'letter-spacing:0;animation:htScroll 80s linear infinite;',
      '}',
      '#' + TICKER_ID + ' .ht-msg{font-weight:900;unicode-bidi:isolate}',
      '#' + TICKER_ID + ' .ht-from{font-weight:800;display:inline-flex;align-items:center;gap:3px;vertical-align:middle;unicode-bidi:isolate}',
      '#' + TICKER_ID + ' .ht-emoji{width:14px;height:14px;object-fit:contain;flex:0 0 auto;display:inline-block;vertical-align:-2px}',
      '#' + TICKER_ID + ' .ht-sep{color:#94a3b8;opacity:.9;margin:0 .3em}',
      '#' + TICKER_ID + ' .ht-hol{color:#9a3412;font-weight:800}',
      '#' + TICKER_ID + ' .ht-label{color:#9a3412;font-weight:900;margin-inline-end:6px}',
      '@keyframes htScroll{0%{transform:translateX(0)}100%{transform:translateX(-33.333%)}}',
      '@media (prefers-reduced-motion:reduce){#' + TICKER_ID + ' .ht-marquee{animation:none;transform:none}}',
      'html.has-float-dock .wrap,html.has-news-ticker .wrap{',
      'padding-bottom:calc(120px + env(safe-area-inset-bottom,0px))!important}',
      'html.has-float-dock .footer,html.has-news-ticker .footer{',
      'margin-bottom:calc(100px + env(safe-area-inset-bottom,0px))!important}',
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
      'flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:8px;',
      'padding:calc(6px + env(safe-area-inset-top,0px)) 10px 6px;',
      'background:#0f172a;color:#f8fafc;border-bottom:1px solid #1e293b;',
      'min-height:0;',
      '}',
      '#' + MODAL_ID + ' .htc-top .htc-titles{',
      'display:flex;flex-wrap:wrap;align-items:baseline;gap:6px;min-width:0;',
      '}',
      '#' + MODAL_ID + ' .htc-top h2{margin:0;font-size:13px;font-weight:900;line-height:1.2}',
      '#' + MODAL_ID + ' .htc-top .htc-subline{margin:0;font-size:10px;font-weight:700;color:#94a3b8;line-height:1.2}',
      '#' + MODAL_ID + ' .htc-close{',
      'width:28px;height:28px;border:0;border-radius:8px;background:#1e293b;color:#e2e8f0;',
      'font-size:16px;font-weight:900;cursor:pointer;flex-shrink:0;line-height:1;',
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
      'display:flex;flex-wrap:wrap;align-items:center;gap:8px;',
      'margin:0 0 10px;padding:8px 12px;border-radius:14px;',
      'background:#f1f5f9;border:1px solid #e2e8f0;',
      'font-size:12px;font-weight:800;color:#0f172a;line-height:1.3;',
      '}',
      '#' + MODAL_ID + ' .htc-whochip::before{',
      'content:"";width:8px;height:8px;border-radius:50%;background:#22c55e;flex:0 0 auto;',
      '}',
      '#' + MODAL_ID + ' .htc-idrow{',
      'display:none;width:100%;flex:1 1 100%;align-items:center;gap:6px;margin-top:2px;',
      '}',
      '#' + MODAL_ID + ' .htc-idrow.on{display:flex}',
      '#' + MODAL_ID + ' .htc-idrow input{',
      'flex:1 1 auto;min-width:0;height:34px;box-sizing:border-box;',
      'border:1px solid #cbd5e1;border-radius:10px;padding:0 10px;',
      'font:inherit;font-size:13px;font-weight:800;color:#0f172a;background:#fff;',
      'text-align:right;direction:ltr;',
      '}',
      '#' + MODAL_ID + ' .htc-idrow button{',
      'flex:0 0 auto;height:34px;padding:0 12px;border:0;border-radius:10px;',
      'background:#0f172a;color:#fff;font:inherit;font-size:12px;font-weight:900;cursor:pointer;',
      '}',
      '#' + MODAL_ID + ' .htc-composebox{',
      'display:flex;align-items:center;gap:8px;',
      'padding:0;background:transparent;border:0;',
      '}',
      '#' + MODAL_ID + ' input#htcMsg{',
      'flex:1 1 auto;min-width:0;width:100%;box-sizing:border-box;',
      'border:1px solid #e2e8f0;border-radius:12px;',
      'height:42px;min-height:42px;max-height:42px;',
      'padding:0 12px;margin:0;line-height:normal;',
      'font:inherit;font-size:14px;font-weight:700;color:#0f172a;outline:none;',
      'background:#f8fafc;-webkit-appearance:none;appearance:none;',
      'text-align:right;direction:rtl;vertical-align:middle;',
      '}',
      '#' + MODAL_ID + ' input#htcMsg:focus{',
      'border-color:#f59e0b;box-shadow:0 0 0 3px rgba(245,158,11,.16);background:#fff;',
      '}',
      '#' + MODAL_ID + ' input#htcMsg::placeholder{',
      'color:#94a3b8;font-weight:700;opacity:1;text-align:right;line-height:normal;',
      '}',
      '#' + MODAL_ID + ' input#htcMsg::-webkit-input-placeholder{',
      'color:#94a3b8;font-weight:700;text-align:right;line-height:normal;',
      '}',
      '#' + MODAL_ID + ' .htc-toolrow{',
      'display:flex;align-items:center;justify-content:space-between;gap:8px;',
      'margin-top:8px;',
      '}',
      '#' + MODAL_ID + ' .htc-emojis{',
      'display:flex;flex-wrap:nowrap;align-items:center;gap:4px;',
      'overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;',
      'flex:1 1 auto;min-width:0;padding:2px 0;',
      '}',
      '#' + MODAL_ID + ' .htc-emojis::-webkit-scrollbar{display:none}',
      '#' + MODAL_ID + ' .htc-emojis button{',
      'flex:0 0 auto;width:34px;height:34px;padding:0;margin:0;',
      'border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc;',
      'font-size:18px;line-height:1;cursor:pointer;',
      'display:inline-flex;align-items:center;justify-content:center;',
      '}',
      '#' + MODAL_ID + ' .htc-emojis button:active{transform:scale(.94);background:#fff7ed;border-color:#fdba74}',
      '#' + MODAL_ID + ' .htc-hint{',
      'margin:0;padding:0 2px;font-size:11px;font-weight:700;color:#94a3b8;',
      'text-align:right;flex:0 0 auto;white-space:nowrap;',
      '}',
      '#' + MODAL_ID + ' .htc-send{',
      'flex:0 0 auto;align-self:center;border:0;border-radius:12px;',
      'height:42px;min-height:42px;max-height:42px;min-width:72px;padding:0 16px;margin:0;',
      'background:linear-gradient(135deg,#f59e0b,#ea580c);color:#111;',
      'font:inherit;font-size:13px;font-weight:900;cursor:pointer;',
      'display:inline-flex;align-items:center;justify-content:center;',
      'line-height:1;box-sizing:border-box;',
      '}',
      '#' + MODAL_ID + ' .htc-send:disabled{opacity:.55;cursor:wait}',
      '#' + MODAL_ID + ' .htc-status{',
      'min-height:16px;margin-top:8px;font-size:11px;font-weight:800;color:#15803d;text-align:center;',
      '}',
      '#' + MODAL_ID + ' .htc-status.err{color:#b91c1c}',
      '#' + MODAL_ID + ' .htc-attach{',
      'position:relative;overflow:hidden;flex:0 0 auto;width:42px;height:42px;',
      'border:1px solid #fdba74;border-radius:12px;',
      'background:#fff7ed;color:#c2410c;cursor:pointer;padding:0;margin:0;',
      'display:inline-flex;align-items:center;justify-content:center;',
      '}',
      '#' + MODAL_ID + ' .htc-attach:active{transform:scale(.94);background:#ffedd5;border-color:#f59e0b}',
      '#' + MODAL_ID + ' .htc-attach.on{background:#ffedd5;border-color:#f59e0b;color:#9a3412}',
      '#' + MODAL_ID + ' .htc-attach input[type=file]{',
      'position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;',
      'font-size:16px;margin:0;padding:0;border:0;background:transparent;z-index:2;',
      '}',
      '#' + MODAL_ID + ' .htc-attach svg{pointer-events:none;position:relative;z-index:1}',
      '#' + MODAL_ID + ' .htc-cam{display:none}',
      '@media (pointer:coarse){#' + MODAL_ID + ' .htc-cam{display:inline-flex}}',
      '#' + MODAL_ID + ' .htc-composer.drop{outline:2px dashed #f59e0b;outline-offset:-4px;background:#fffbeb}',
      '#' + MODAL_ID + ' .htc-preview{',
      'display:none;align-items:center;gap:10px;margin:0 0 10px;padding:8px;',
      'border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc;position:relative;',
      '}',
      '#' + MODAL_ID + ' .htc-preview.on{display:flex}',
      '#' + MODAL_ID + ' .htc-preview img{',
      'width:64px;height:64px;object-fit:cover;border-radius:10px;background:#e2e8f0;flex:0 0 auto',
      '}',
      '#' + MODAL_ID + ' .htc-preview span{flex:1 1 auto;font-size:12px;font-weight:800;color:#334155}',
      '#' + MODAL_ID + ' .htc-preview button{',
      'flex:0 0 auto;width:32px;height:32px;border:0;border-radius:10px;',
      'background:#fee2e2;color:#991b1b;font-size:18px;font-weight:900;cursor:pointer;',
      '}',
      '#' + MODAL_ID + ' .htc-photo{margin:6px 0 2px}',
      '#' + MODAL_ID + ' .htc-photo img{',
      'display:block;max-width:100%;max-height:220px;border-radius:12px;',
      'object-fit:cover;cursor:zoom-in;background:#e2e8f0;',
      '}',
      '#' + MODAL_ID + ' .htc-photo-wait{display:block;font-size:11px;font-weight:800;color:#94a3b8;padding:8px 0}',
      '#' + MODAL_ID + ' .htc-lightbox{',
      'position:fixed;inset:0;z-index:100130;display:none;align-items:center;justify-content:center;',
      'background:rgba(15,23,42,.88);padding:18px;',
      '}',
      '#' + MODAL_ID + ' .htc-lightbox.on{display:flex}',
      '#' + MODAL_ID + ' .htc-lightbox img{',
      'max-width:min(96vw,920px);max-height:86vh;border-radius:14px;object-fit:contain;',
      'box-shadow:0 18px 50px rgba(0,0,0,.35);',
      '}',
      '#' + MODAL_ID + ' .htc-lightbox-x{',
      'position:absolute;top:calc(10px + env(safe-area-inset-top,0px));inset-inline-end:14px;',
      'width:42px;height:42px;border:0;border-radius:12px;background:#1e293b;color:#fff;',
      'font-size:22px;font-weight:900;cursor:pointer;',
      '}'
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

  function alertIconEl() {
    var chg = document.getElementById('chg-dot');
    if (chg && !chg.hidden && getComputedStyle(chg).display !== 'none') return chg;
    var abs = document.getElementById('abs-dot');
    if (abs && abs.classList.contains('abs-on') && getComputedStyle(abs).display !== 'none') return abs;
    return null;
  }

  function overlayVisible(el, extraOk) {
    if (!el || el.hidden) return false;
    try {
      var cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
    } catch (e) {
      return false;
    }
    return extraOk ? !!extraOk(el) : true;
  }

  function layoutOverlays() {
    var fab = document.getElementById('featureNotesFab');
    var chg = document.getElementById('chg-dot');
    var abs = document.getElementById('abs-dot');
    var alertOn =
      overlayVisible(chg) ||
      overlayVisible(abs, function (el) {
        return el.classList.contains('abs-on');
      });
    if (fab) fab.classList.toggle('beside-alert', alertOn);
  }

  function layoutTicker(el) {
    if (!el) return;
    // Edge-to-edge bar; alert icons float above it via CSS.
    el.classList.remove('lifted', 'solo', 'above-dock');
    el.style.left = '';
    el.style.right = '';
    el.style.width = '';
    el.style.maxWidth = '';
    el.style.bottom = '';
    document.documentElement.classList.toggle('has-news-ticker', el.classList.contains('on') && !el.hidden);
    layoutOverlays();
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

  function closeLightbox() {
    var box = document.getElementById('htcLightbox');
    if (!box) return;
    box.classList.remove('on');
    var img = document.getElementById('htcLightboxImg');
    if (img) img.removeAttribute('src');
  }

  function openLightbox(src) {
    var box = document.getElementById('htcLightbox');
    var img = document.getElementById('htcLightboxImg');
    src = safeImageData(src);
    if (!box || !img || !src) return;
    img.src = src;
    box.classList.add('on');
  }

  function closeCompose() {
    var modal = document.getElementById(MODAL_ID);
    if (!modal) return;
    closeLightbox();
    modal.classList.remove('on');
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
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
        var photo = messageHasImage(m)
          ? '<div class="htc-photo"><span class="htc-photo-wait">جاري تحميل الصورة…</span><img alt="صورة" hidden></div>'
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
          photo +
          '<div class="htc-text"></div>' +
          '<div class="htc-time"></div>' +
          '</article>'
        );
      })
      .join('');
    Array.from(feed.children).forEach(function (el, i) {
      var m = list[i];
      el.querySelector('.htc-meta span').textContent = m.name || 'موظف';
      var textEl = el.querySelector('.htc-text');
      textEl.textContent = m.text || '';
      if (!m.text) textEl.style.display = 'none';
      el.querySelector('.htc-time').textContent = formatChatTime(m.approvedAt || m.at);
      if (messageHasImage(m)) {
        var photoWrap = el.querySelector('.htc-photo');
        var imgEl = photoWrap && photoWrap.querySelector('img');
        var waitEl = photoWrap && photoWrap.querySelector('.htc-photo-wait');
        loadTickerImage(m.id).then(function (src) {
          if (!imgEl) return;
          if (src) {
            imgEl.src = src;
            imgEl.hidden = false;
            if (waitEl) waitEl.remove();
            imgEl.addEventListener('click', function () {
              openLightbox(src);
            });
          } else if (waitEl) {
            waitEl.textContent = 'تعذر تحميل الصورة';
          }
        });
      }
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
          '<div class="htc-titles">' +
            '<h2 id="htcTitle">🎉 دردشة الشريط</h2>' +
            '<p class="htc-subline" id="htcSub">رسائل الموظفين المعتمدة</p>' +
          '</div>' +
          '<button type="button" class="htc-close" id="htcClose" aria-label="إغلاق">×</button>' +
        '</div>' +
        '<div class="htc-feed" id="htcFeed"><div class="htc-empty">جاري التحميل…</div></div>' +
        '<div class="htc-composer">' +
          '<div class="htc-whochip" id="htcWhoChip">' +
            '<span id="htcWhoText">جاري التعرّف…</span>' +
            '<div class="htc-idrow" id="htcIdRow">' +
              '<input type="text" id="htcEmpId" inputmode="numeric" autocomplete="username" maxlength="12" placeholder="رقم الوظيفة" dir="ltr" />' +
              '<button type="button" id="htcEmpSave">حفظ</button>' +
            '</div>' +
          '</div>' +
          '<div class="htc-preview" id="htcPreview">' +
            '<img id="htcPreviewImg" alt="معاينة">' +
            '<span>صورة جاهزة للإرسال</span>' +
            '<button type="button" id="htcPreviewClear" aria-label="إزالة الصورة">×</button>' +
          '</div>' +
          '<div class="htc-composebox">' +
            '<label class="htc-attach" id="htcAttach" title="إرفاق صورة" aria-label="إرفاق صورة">' +
              '<input type="file" id="htcImgFile" accept="image/*,image/heic,image/heif,.heic,.heif" />' +
              '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5zM8 8.5A1.5 1.5 0 1 1 8 5.5 1.5 1.5 0 0 1 8 8.5z"/></svg>' +
            '</label>' +
            '<label class="htc-attach htc-cam" id="htcCam" title="التقاط صورة" aria-label="التقاط صورة">' +
              '<input type="file" id="htcCamFile" accept="image/*" capture="environment" />' +
              '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7zm8-9h-2.78l-.91-1.22A2 2 0 0 0 14.76 4.5H9.24a2 2 0 0 0-1.55.78L6.78 6.5H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2z"/></svg>' +
            '</label>' +
            '<input type="text" id="htcMsg" maxlength="120" enterkeyhint="send" autocomplete="off" inputmode="text" dir="rtl" placeholder="اكتب رسالة أو أرفق صورة…" />' +
            '<button type="button" class="htc-send" id="htcSend">نشر</button>' +
          '</div>' +
          '<div class="htc-toolrow">' +
            '<div class="htc-emojis" id="htcEmojis" role="group" aria-label="إيموجي">' +
              [
                '😀',
                '😂',
                '😍',
                '🔥',
                '👍',
                '👏',
                '🙏',
                '💪',
                '🎉',
                '✨',
                '❤️',
                '☀️',
                '☕',
                '🤝',
                '⭐',
                '🥳'
              ]
                .map(function (e) {
                  return (
                    '<button type="button" data-emoji="' +
                    e +
                    '" aria-label="إيموجي ' +
                    e +
                    '">' +
                    e +
                    '</button>'
                  );
                })
                .join('') +
            '</div>' +
            '<p class="htc-hint"><span id="htcCount">0</span>/120</p>' +
          '</div>' +
          '<div class="htc-status" id="htcStatus" aria-live="polite"></div>' +
        '</div>' +
        '<div class="htc-lightbox" id="htcLightbox">' +
          '<button type="button" class="htc-lightbox-x" id="htcLightboxClose" aria-label="إغلاق">×</button>' +
          '<img id="htcLightboxImg" alt="">' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);

    if (!composeBound) {
      composeBound = true;
      document.getElementById('htcClose').addEventListener('click', closeCompose);
      document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape' || !modal.classList.contains('on')) return;
        var box = document.getElementById('htcLightbox');
        if (box && box.classList.contains('on')) {
          closeLightbox();
          return;
        }
        closeCompose();
      });
      var msgInput = document.getElementById('htcMsg');
      var countEl = document.getElementById('htcCount');
      var statusEl = document.getElementById('htcStatus');
      var sendBtn = document.getElementById('htcSend');
      var subEl = document.getElementById('htcSub');
      var whoText = document.getElementById('htcWhoText');
      var idRow = document.getElementById('htcIdRow');
      var empIdInput = document.getElementById('htcEmpId');
      var empIdSave = document.getElementById('htcEmpSave');
      var attachBtn = document.getElementById('htcAttach');
      var imgFile = document.getElementById('htcImgFile');
      var camFile = document.getElementById('htcCamFile');
      var previewEl = document.getElementById('htcPreview');
      var previewImg = document.getElementById('htcPreviewImg');
      var previewClear = document.getElementById('htcPreviewClear');
      var lightboxEl = document.getElementById('htcLightbox');
      var lightboxClose = document.getElementById('htcLightboxClose');
      var composerEl = modal.querySelector('.htc-composer');
      var pendingImage = '';
      var resolvedEmp = { id: '', name: '' };

      function setPendingImage(dataUrl) {
        pendingImage = safeImageData(dataUrl);
        if (previewEl) previewEl.classList.toggle('on', !!pendingImage);
        if (attachBtn) attachBtn.classList.toggle('on', !!pendingImage);
        var camBtn = document.getElementById('htcCam');
        if (camBtn) camBtn.classList.toggle('on', !!pendingImage);
        if (previewImg) {
          if (pendingImage) previewImg.src = pendingImage;
          else previewImg.removeAttribute('src');
        }
        if (msgInput) {
          msgInput.placeholder = pendingImage
            ? 'تعليق على الصورة (اختياري)…'
            : 'اكتب رسالة أو أرفق صورة…';
        }
      }

      async function pickImageFile(file) {
        if (!file) return;
        statusEl.className = 'htc-status';
        statusEl.textContent = 'جاري تجهيز الصورة…';
        try {
          var data = await compressImage(file);
          setPendingImage(data);
          statusEl.textContent = 'تم إرفاق الصورة. يمكنك إضافة تعليق ثم الإرسال.';
        } catch (err) {
          statusEl.className = 'htc-status err';
          var why = String((err && err.message) || err || '');
          statusEl.textContent =
            why === 'type'
              ? 'اختر ملف صورة (JPG أو PNG أو من الكاميرا).'
              : why === 'size'
                ? 'الصورة كبيرة جداً. جرّب صورة أصغر.'
                : 'تعذر تجهيز الصورة. جرّب صورة أصغر أو صيغة JPG.';
        }
        if (imgFile) imgFile.value = '';
        if (camFile) camFile.value = '';
      }

      function paintIdentity(r) {
        resolvedEmp = r && r.ok ? { id: r.id, name: r.name || '' } : { id: '', name: '' };
        if (resolvedEmp.id) {
          whoText.textContent = resolvedEmp.name
            ? resolvedEmp.name + ' · #' + resolvedEmp.id
            : '#' + resolvedEmp.id;
          if (idRow) idRow.classList.remove('on');
        } else {
          whoText.textContent = 'أدخل رقم وظيفتك (جدولي أو الوارد)';
          if (idRow) idRow.classList.add('on');
        }
      }

      async function resolveFromCandidates(extraId) {
        var ids = listSavedEmpIds();
        var extra = digitsOnly(extraId);
        if (extra && ids.indexOf(extra) === -1) ids.unshift(extra);
        for (var i = 0; i < ids.length; i++) {
          var r = await resolveEmp(ids[i]);
          if (r && r.ok && r.id) {
            saveIdentity(r.id, r.name || nameForSavedId(r.id));
            paintIdentity(r);
            return r;
          }
        }
        if (!ids.length) {
          paintIdentity({ ok: false, id: '', name: '' });
          return { ok: false, id: '', name: '', reason: 'empty' };
        }
        // Saved id(s) but not found in either roster
        paintIdentity({ ok: false, id: '', name: '' });
        return { ok: false, id: ids[0] || '', name: '', reason: 'unknown' };
      }

      async function syncEmp() {
        var typed = empIdInput && idRow && idRow.classList.contains('on') ? empIdInput.value : '';
        return resolveFromCandidates(typed);
      }

      if (empIdSave) {
        empIdSave.addEventListener('click', async function () {
          statusEl.className = 'htc-status';
          statusEl.textContent = 'جاري التحقق…';
          var r = await resolveFromCandidates(empIdInput ? empIdInput.value : '');
          if (r.ok) {
            statusEl.textContent = r.name ? 'مرحباً ' + r.name : 'تم حفظ الرقم.';
          } else {
            statusEl.className = 'htc-status err';
            statusEl.textContent = r.reason === 'empty'
              ? 'أدخل رقم الوظيفة.'
              : 'الرقم غير موجود في جدولي أو الوارد.';
          }
        });
      }
      if (empIdInput) {
        empIdInput.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (empIdSave) empIdSave.click();
          }
        });
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
      });
      msgInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          sendBtn.click();
        }
      });
      if (imgFile) {
        imgFile.addEventListener('change', function () {
          pickImageFile(imgFile.files && imgFile.files[0]);
        });
      }
      if (camFile) {
        camFile.addEventListener('change', function () {
          pickImageFile(camFile.files && camFile.files[0]);
        });
      }
      if (previewClear) {
        previewClear.addEventListener('click', function () {
          setPendingImage('');
          statusEl.className = 'htc-status';
          statusEl.textContent = '';
        });
      }
      if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
      if (lightboxEl) {
        lightboxEl.addEventListener('click', function (ev) {
          if (ev.target === lightboxEl) closeLightbox();
        });
      }
      function isFileDrag(ev) {
        var types = ev.dataTransfer && ev.dataTransfer.types;
        if (!types) return false;
        for (var i = 0; i < types.length; i++) {
          if (types[i] === 'Files') return true;
        }
        return false;
      }
      modal.addEventListener('dragover', function (ev) {
        if (!isFileDrag(ev)) return;
        ev.preventDefault();
        if (composerEl) composerEl.classList.add('drop');
      });
      modal.addEventListener('dragleave', function (ev) {
        if (ev.target === modal || (composerEl && ev.target === composerEl)) {
          if (composerEl) composerEl.classList.remove('drop');
        }
      });
      modal.addEventListener('drop', function (ev) {
        if (composerEl) composerEl.classList.remove('drop');
        var files = ev.dataTransfer && ev.dataTransfer.files;
        if (!files || !files.length) return;
        ev.preventDefault();
        pickImageFile(files[0]);
      });
      modal.addEventListener('paste', function (ev) {
        var items = ev.clipboardData && ev.clipboardData.items;
        if (!items) return;
        for (var i = 0; i < items.length; i++) {
          if (items[i] && items[i].type && items[i].type.indexOf('image/') === 0) {
            var blob = items[i].getAsFile();
            if (blob) {
              ev.preventDefault();
              pickImageFile(blob);
            }
            break;
          }
        }
      });

      var emojiBar = document.getElementById('htcEmojis');
      if (emojiBar) {
        emojiBar.addEventListener('click', function (ev) {
          var btn = ev.target && ev.target.closest ? ev.target.closest('button[data-emoji]') : null;
          if (!btn) return;
          var emo = btn.getAttribute('data-emoji') || '';
          if (!emo) return;
          var max = 120;
          var start = typeof msgInput.selectionStart === 'number' ? msgInput.selectionStart : msgInput.value.length;
          var end = typeof msgInput.selectionEnd === 'number' ? msgInput.selectionEnd : start;
          var val = msgInput.value || '';
          var room = max - (val.length - (end - start));
          if (room <= 0) {
            msgInput.focus();
            return;
          }
          var piece = emo.slice(0, room);
          var next = val.slice(0, start) + piece + val.slice(end);
          if (next.length > max) next = next.slice(0, max);
          msgInput.value = next;
          var pos = Math.min(start + piece.length, next.length);
          try {
            msgInput.setSelectionRange(pos, pos);
          } catch (e) {}
          countEl.textContent = String(msgInput.value.length);
          msgInput.focus();
        });
      }

      sendBtn.addEventListener('click', async function () {
        statusEl.className = 'htc-status';
        statusEl.textContent = '';
        var emp = await syncEmp();
        var text = String(msgInput.value || '').replace(/\s+/g, ' ').trim().slice(0, 120);
        if (!emp.ok || !emp.id) {
          statusEl.className = 'htc-status err';
          statusEl.textContent = emp.reason === 'unknown'
            ? 'الرقم غير موجود في جدولي أو الوارد.'
            : 'أدخل رقم وظيفتك (من جدولي أو الوارد) ثم أرسل.';
          if (idRow) idRow.classList.add('on');
          if (empIdInput) empIdInput.focus();
          return;
        }
        if (!pendingImage && text.length < 3) {
          statusEl.className = 'htc-status err';
          statusEl.textContent = 'اكتب رسالة أو أرفق صورة.';
          msgInput.focus();
          return;
        }
        sendBtn.disabled = true;
        statusEl.textContent = pendingImage ? 'جاري رفع الصورة…' : 'جاري الإرسال…';
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
          if (pendingImage) {
            row.img = 1;
            await writeTickerImage(row.id, pendingImage);
          }
          if (needApproval) {
            store.pending = [row].concat(store.pending || []).slice(0, 80);
          } else {
            row.approvedAt = Date.now();
            store.approved = [row].concat(store.approved || []).slice(0, 40);
          }
          await writeFullStore(store);
          msgInput.value = '';
          countEl.textContent = '0';
          setPendingImage('');
          statusEl.textContent = needApproval
            ? 'تم الإرسال. بانتظار اعتماد المشرف.'
            : 'تم النشر.';
          try {
            if (window.rosterAlertSound) {
              window.rosterAlertSound.unlock();
              window.rosterAlertSound.play('send');
            }
          } catch (soundErr) {}
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
    document.body.style.overflow = 'hidden';
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
      document.documentElement.classList.remove('has-news-ticker');
      layoutOverlays();
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
      '<div class="ht-track" id="htOpenTrack"><div class="ht-marquee">' +
      strip +
      '</div></div>';
    el.title = plain + (ar ? ' — اضغط للكتابة' : ' — Tap to write');
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', ar ? 'فتح كتابة رسالة للشريط' : 'Open ticker message compose');
    el.hidden = false;
    el.classList.add('on');
    layoutTicker(el);
    el.setAttribute('dir', 'ltr');
    var mq = el.querySelector('.ht-marquee');
    if (mq) mq.style.animationDuration = scrollSeconds(scrollSpeedCache) + 's';
    function onOpen(e) {
      e.preventDefault();
      e.stopPropagation();
      openCompose();
    }
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

  function sortMessagesNewestFirst(list) {
    return (list || [])
      .slice()
      .sort(function (a, b) {
        var ta = Number((a && (a.approvedAt || a.at)) || 0);
        var tb = Number((b && (b.approvedAt || b.at)) || 0);
        return tb - ta;
      });
  }

  function buildParts(approved, holidays) {
    var ar = lang() === 'ar';
    var parts = [];
    sortMessagesNewestFirst(approved)
      .filter(function (m) {
        return m && (String(m.text || '').trim() || messageHasImage(m));
      })
      .slice(0, 8)
      .forEach(function (m) {
      var hasImg = messageHasImage(m);
      var text = String((m && m.text) || '').trim();
      if (!m || (!text && !hasImg)) return;
      var c = authorColors(authorKey(m));
      var label = text || (ar ? 'صورة' : 'Photo');
      if (hasImg && text) label = '📷 ' + text;
      else if (hasImg) label = '📷 ' + label;
      var bit =
        '<span class="ht-msg" dir="auto" style="color:' +
        c.ink +
        '">' +
        escapeHtml(label) +
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
    messagesCache = readFullStore().catch(function () {
      showModeCache = 'both';
      scrollSpeedCache = 'slow';
      return normalizeStore({});
    });
    return messagesCache;
  }

  function refresh() {
    messagesCache = null;
    Promise.all([loadTickerStore(), loadHolidays()]).then(function (pair) {
      var store = pair[0] || normalizeStore({});
      showModeCache = store.showMode;
      scrollSpeedCache = store.scrollSpeed;
      var removed = pruneExpired(store);
      if (removed) {
        writeFullStore(store).catch(function () {});
      }
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
      else layoutOverlays();
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
