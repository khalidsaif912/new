/**
 * Announcement popups — Mantle-backed ads from desk-log.
 * Modes: text | image | both. Campaign days + on-screen duration (seconds).
 */
(function (global) {
  'use strict';

  (function attachRosterMantle(g) {
    if (!g || g.RosterMantle) return;
    var BACKOFF_KEY = 'rosterMantleBackoffUntil';
    var BACKOFF_N_KEY = 'rosterMantleBackoffN';
    var inflight = Object.create(null);
    function now() { return Date.now(); }
    function readNum(key) {
      try { return Number(g.localStorage.getItem(key) || 0) || 0; } catch (e) { return 0; }
    }
    function writeNum(key, n) {
      try { g.localStorage.setItem(key, String(n)); } catch (e) {}
    }
    function backoffUntil() { return readNum(BACKOFF_KEY); }
    function backingOff() { return now() < backoffUntil(); }
    function remainingMs() { return Math.max(0, backoffUntil() - now()); }
    function markRateLimit(res) {
      var n = Math.min(readNum(BACKOFF_N_KEY) + 1, 6);
      writeNum(BACKOFF_N_KEY, n);
      var wait = Math.min(3600000, Math.round(600000 * Math.pow(1.5, n - 1)));
      try {
        var ra = res && res.headers && res.headers.get && Number(res.headers.get('retry-after'));
        if (ra > 0) wait = Math.max(wait, Math.min(ra * 1000, 3600000));
      } catch (e) {}
      writeNum(BACKOFF_KEY, now() + wait);
      return wait;
    }
    function clearBackoff() {
      try { g.localStorage.removeItem(BACKOFF_N_KEY); } catch (e) {}
    }
    function fetchRes(url, opts) {
      opts = opts || {};
      var method = String(opts.method || 'GET').toUpperCase();
      if (backingOff() && !opts.force) {
        var err = new Error('backoff');
        err.code = 'backoff';
        return Promise.reject(err);
      }
      var key = method + ' ' + String(url).replace(/\?ts=\d+/g, '');
      if (method === 'GET' && inflight[key]) return inflight[key];
      var p = fetch(url, opts).then(function (res) {
        if (res.status === 429) {
          markRateLimit(res);
          var err = new Error('rate');
          err.code = 'rate';
          err.status = 429;
          throw err;
        }
        if (res.ok) clearBackoff();
        return res;
      }).finally(function () {
        if (inflight[key] === p) delete inflight[key];
      });
      if (method === 'GET') inflight[key] = p;
      return p;
    }
    function readCache(key) {
      try {
        var raw = g.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
    }
    function writeCache(key, value) {
      try { g.localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
    }
    g.RosterMantle = {
      backingOff: backingOff,
      remainingMs: remainingMs,
      markRateLimit: markRateLimit,
      clearBackoff: clearBackoff,
      fetchRes: fetchRes,
      readCache: readCache,
      writeCache: writeCache
    };
  })(typeof window !== 'undefined' ? window : global);

  var MANTLE_URL = 'https://mantledb.sh/v2/roster-site-visits/announce-popups';
  var MANTLE_IMG_NS = 'https://mantledb.sh/v2/roster-site-visits/announce-img-';
  var MANTLE_KEY = '8bb6b7c45e0e18fef1b758bc6dc85d7b1bac11b42e2e53faab3b88595572189d';
  var STORE_CACHE_KEY = 'rosterAnnouncePopupsV1';
  var IMG_DISK_KEY = 'rosterAnnounceImgCacheV1';
  var SEEN_KEY = 'rosterAnnounceSeenV1';
  var STYLE_ID = 'rosterAnnouncePopupCss';
  var ROOT_ID = 'rosterAnnouncePopupRoot';
  var ID_RE = /^a[a-z0-9]{7,31}$/i;
  var DAY_MS = 86400000;

  var store = { items: [], at: 0 };
  var storeFetchOk = false;
  var loadPromise = null;
  var imgCache = Object.create(null);
  var displayStarted = false;

  function mantle() {
    return (typeof window !== 'undefined' && window.RosterMantle) || {
      fetchRes: function (url, opts) { return fetch(url, opts || {}); },
      readCache: function () { return null; },
      writeCache: function () {},
      backingOff: function () { return false; },
      markRateLimit: function () {}
    };
  }

  function mantleHeaders(json) {
    var h = { Accept: 'application/json', 'X-Mantle-Key': MANTLE_KEY };
    if (json) h['Content-Type'] = 'application/json';
    return h;
  }

  function siteRoot() {
    try {
      var p = String(location.pathname || '');
      var m = p.match(/^(.*?\/(?:docs|new\/docs|roster-site\/docs)\/)/);
      if (m) return m[1].replace(/\/$/, '');
      if (/\/desk-log(\/|$)/.test(p)) return '..';
      return '';
    } catch (e) {
      return '';
    }
  }

  function snapshotUrl() {
    var root = siteRoot();
    return (root ? root + '/' : '') + 'assets/announce/popups.json';
  }

  function safeImageData(d) {
    d = String(d || '');
    if (!/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(d)) return '';
    if (d.length > 180000) return '';
    return d;
  }

  function clampDays(v) {
    v = Math.round(Number(v) || 0);
    if (v < 1) return 1;
    if (v > 90) return 90;
    return v;
  }

  function clampDuration(v) {
    v = Math.round(Number(v) || 0);
    if (v < 3) return 3;
    if (v > 300) return 300;
    return v;
  }

  function normalizeMode(m) {
    m = String(m || '').trim();
    if (m === 'text' || m === 'image' || m === 'both') return m;
    return 'text';
  }

  function newId() {
    var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var out = 'a';
    for (var i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  function normalizeItem(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var id = String(raw.id || '').trim();
    if (!ID_RE.test(id)) return null;
    var mode = normalizeMode(raw.mode);
    var text = String(raw.text || '').trim().slice(0, 800);
    var title = String(raw.title || '').trim().slice(0, 120);
    var imageId = String(raw.imageId || '').trim();
    if (imageId && !ID_RE.test(imageId)) imageId = '';
    if (mode === 'text') imageId = '';
    if (mode === 'image' && !imageId && !safeImageData(raw._preview)) return null;
    if (mode === 'both' && !text && !title) return null;
    if (mode === 'text' && !text && !title) return null;
    var startAt = Number(raw.startAt || raw.at || Date.now()) || Date.now();
    return {
      id: id,
      title: title,
      text: text,
      mode: mode,
      imageId: imageId || (mode !== 'text' ? id : ''),
      days: clampDays(raw.days),
      durationSec: clampDuration(raw.durationSec),
      startAt: startAt,
      enabled: raw.enabled !== false,
      at: Number(raw.at || startAt) || startAt
    };
  }

  function normalizeStore(raw) {
    var items = [];
    var list = (raw && Array.isArray(raw.items)) ? raw.items : [];
    list.forEach(function (it) {
      var n = normalizeItem(it);
      if (n) items.push(n);
    });
    items.sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
    return { items: items, at: Number((raw && raw.at) || 0) || 0 };
  }

  function readImgDisk(id) {
    try {
      var all = mantle().readCache(IMG_DISK_KEY) || {};
      return safeImageData(all[id]);
    } catch (e) { return ''; }
  }

  function writeImgDisk(id, dataUrl) {
    try {
      var all = mantle().readCache(IMG_DISK_KEY) || {};
      if (typeof all !== 'object' || !all) all = {};
      all[id] = dataUrl;
      var keys = Object.keys(all);
      if (keys.length > 12) {
        keys.slice(0, keys.length - 12).forEach(function (k) { delete all[k]; });
      }
      mantle().writeCache(IMG_DISK_KEY, all);
    } catch (e) {}
  }

  function deleteImgDisk(id) {
    try {
      var all = mantle().readCache(IMG_DISK_KEY) || {};
      if (all && all[id]) {
        delete all[id];
        mantle().writeCache(IMG_DISK_KEY, all);
      }
    } catch (e) {}
  }

  async function loadStaticSnapshot() {
    try {
      var res = await fetch(snapshotUrl() + '?ts=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) return null;
      return normalizeStore(await res.json());
    } catch (e) {
      return null;
    }
  }

  async function loadStore(force) {
    if (loadPromise && !force) return loadPromise;
    loadPromise = (async function () {
      var cached = mantle().readCache(STORE_CACHE_KEY);
      var staticOv = await loadStaticSnapshot();
      if (cached && typeof cached === 'object') store = normalizeStore(cached);
      else if (staticOv && staticOv.items.length) store = staticOv;

      if (mantle().backingOff && mantle().backingOff()) {
        storeFetchOk = !!(cached || (staticOv && staticOv.items));
        return store;
      }

      try {
        var res = await mantle().fetchRes(MANTLE_URL + '?ts=' + Date.now(), {
          headers: mantleHeaders(false),
          force: !!force
        });
        if (res.status === 404) {
          store = (staticOv && staticOv.items.length) ? staticOv : { items: [], at: 0 };
          storeFetchOk = true;
          mantle().writeCache(STORE_CACHE_KEY, store);
          return store;
        }
        if (!res.ok) throw new Error('store');
        store = normalizeStore(await res.json());
        storeFetchOk = true;
        mantle().writeCache(STORE_CACHE_KEY, store);
        return store;
      } catch (e) {
        storeFetchOk = false;
        if (cached && typeof cached === 'object') {
          store = normalizeStore(cached);
          storeFetchOk = true;
        } else if (staticOv) {
          store = staticOv;
          storeFetchOk = true;
        }
        return store;
      }
    })();
    try {
      return await loadPromise;
    } finally {
      if (force) loadPromise = null;
    }
  }

  async function saveStore(next) {
    if (!storeFetchOk) throw new Error('store-offline');
    store = normalizeStore(next);
    store.at = Date.now();
    var payload = { items: store.items.slice(), at: store.at };
    var res = await mantle().fetchRes(MANTLE_URL, {
      method: 'POST',
      headers: mantleHeaders(true),
      body: JSON.stringify(payload),
      force: true
    });
    if (!res.ok) throw new Error('save');
    mantle().writeCache(STORE_CACHE_KEY, store);
    return store;
  }

  async function writeImage(id, dataUrl) {
    id = String(id || '').trim();
    if (!ID_RE.test(id)) throw new Error('id');
    var safe = safeImageData(dataUrl);
    if (!safe) throw new Error('img');
    var res = await mantle().fetchRes(MANTLE_IMG_NS + encodeURIComponent(id), {
      method: 'POST',
      headers: mantleHeaders(true),
      body: JSON.stringify({ d: safe, at: Date.now() }),
      force: true
    });
    if (!res.ok) throw new Error('imgwrite');
    imgCache[id] = safe;
    writeImgDisk(id, safe);
    return safe;
  }

  async function deleteImage(id) {
    id = String(id || '').trim();
    if (!ID_RE.test(id)) return;
    delete imgCache[id];
    deleteImgDisk(id);
    try {
      await mantle().fetchRes(MANTLE_IMG_NS + encodeURIComponent(id), {
        method: 'POST',
        headers: mantleHeaders(true),
        body: JSON.stringify({ d: '', deleted: true, at: Date.now() }),
        force: true
      });
    } catch (e) {}
  }

  async function loadImage(id) {
    id = String(id || '').trim();
    if (!ID_RE.test(id)) return '';
    if (imgCache[id]) return imgCache[id];
    var disk = readImgDisk(id);
    if (disk) {
      imgCache[id] = disk;
      return disk;
    }
    if (mantle().backingOff && mantle().backingOff()) return '';
    try {
      var res = await mantle().fetchRes(MANTLE_IMG_NS + encodeURIComponent(id) + '?ts=' + Date.now(), {
        headers: mantleHeaders(false)
      });
      if (!res.ok) return '';
      var json = await res.json();
      if (json && json.deleted) return '';
      var safe = safeImageData(json && json.d);
      if (safe) {
        imgCache[id] = safe;
        writeImgDisk(id, safe);
      }
      return safe;
    } catch (e) {
      return '';
    }
  }

  function compressImageFile(file, maxW, quality, maxBytes) {
    maxW = maxW || 900;
    quality = quality == null ? 0.78 : quality;
    maxBytes = maxBytes || 90000;
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          var tryEncode = function (widthCap, q) {
            var scale = Math.min(1, widthCap / (img.width || widthCap));
            var w = Math.max(1, Math.round((img.width || widthCap) * scale));
            var h = Math.max(1, Math.round((img.height || widthCap) * scale));
            var canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            var dataUrl = canvas.toDataURL('image/jpeg', q);
            while (dataUrl.length > maxBytes && q > 0.4) {
              q -= 0.07;
              dataUrl = canvas.toDataURL('image/jpeg', q);
            }
            return dataUrl;
          };
          var caps = [maxW, 720, 560, 420];
          var dataUrl = '';
          for (var i = 0; i < caps.length; i++) {
            dataUrl = tryEncode(caps[i], quality);
            if (dataUrl.length <= maxBytes) {
              resolve(dataUrl);
              return;
            }
          }
          reject(new Error('large'));
        };
        img.onerror = function () { reject(new Error('img')); };
        img.src = reader.result;
      };
      reader.onerror = function () { reject(new Error('read')); };
      reader.readAsDataURL(file);
    });
  }

  function isActiveItem(item, nowTs) {
    if (!item || !item.enabled) return false;
    nowTs = nowTs || Date.now();
    var end = Number(item.startAt || 0) + clampDays(item.days) * DAY_MS;
    return nowTs >= Number(item.startAt || 0) && nowTs < end;
  }

  function muscatDayIso() {
    var n = new Date();
    var t = n.getTime() + n.getTimezoneOffset() * 60000 + 4 * 3600000;
    var d = new Date(t);
    var y = d.getUTCFullYear();
    var mo = ('0' + (d.getUTCMonth() + 1)).slice(-2);
    var day = ('0' + d.getUTCDate()).slice(-2);
    return y + '-' + mo + '-' + day;
  }

  function readSeen() {
    try {
      var raw = localStorage.getItem(SEEN_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  function markSeen(id) {
    try {
      var all = readSeen();
      all[id] = muscatDayIso();
      localStorage.setItem(SEEN_KEY, JSON.stringify(all));
    } catch (e) {}
  }

  function wasSeenToday(id) {
    var all = readSeen();
    return all[id] === muscatDayIso();
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var css = document.createElement('style');
    css.id = STYLE_ID;
    css.textContent = [
      '#' + ROOT_ID + '{position:fixed;inset:0;z-index:12050;display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box;',
      'background:rgba(15,23,42,.55);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);opacity:0;transition:opacity .22s ease}',
      '#' + ROOT_ID + '.show{opacity:1}',
      '#' + ROOT_ID + ' .rap-card{width:min(420px,100%);max-height:min(86vh,720px);overflow:auto;border-radius:18px;background:#fff;',
      'box-shadow:0 24px 60px rgba(0,0,0,.35);transform:translateY(12px) scale(.98);transition:transform .22s ease;position:relative}',
      '#' + ROOT_ID + '.show .rap-card{transform:none}',
      '#' + ROOT_ID + ' .rap-close{position:absolute;top:10px;inset-inline-end:10px;width:34px;height:34px;border:0;border-radius:999px;',
      'background:rgba(15,23,42,.72);color:#fff;font-size:18px;line-height:1;cursor:pointer;z-index:2}',
      '#' + ROOT_ID + ' .rap-img{display:block;width:100%;max-height:280px;object-fit:cover;background:#e2e8f0}',
      '#' + ROOT_ID + ' .rap-body{padding:18px 18px 16px}',
      '#' + ROOT_ID + ' .rap-title{margin:0 0 8px;font-size:18px;font-weight:800;color:#0f172a;line-height:1.35}',
      '#' + ROOT_ID + ' .rap-text{margin:0;font-size:14px;font-weight:600;color:#334155;line-height:1.65;white-space:pre-wrap}',
      '#' + ROOT_ID + ' .rap-actions{display:flex;gap:8px;padding:0 18px 16px;justify-content:flex-end}',
      '#' + ROOT_ID + ' .rap-ok{border:0;border-radius:12px;min-height:40px;padding:0 16px;background:#1d4ed8;color:#fff;',
      'font:inherit;font-size:13px;font-weight:800;cursor:pointer}',
      '#' + ROOT_ID + ' .rap-timer{height:3px;background:#e2e8f0;overflow:hidden}',
      '#' + ROOT_ID + ' .rap-timer > i{display:block;height:100%;width:100%;background:#3b82f6;transform-origin:inline-start;',
      'animation:rapDrain linear forwards}',
      '@keyframes rapDrain{from{transform:scaleX(1)}to{transform:scaleX(0)}}',
      'body.ar #' + ROOT_ID + ' .rap-card{direction:rtl;text-align:right}',
      '@media (prefers-reduced-motion:reduce){#' + ROOT_ID + ',#' + ROOT_ID + ' .rap-card{transition:none}#' + ROOT_ID + ' .rap-timer>i{animation:none}}'
    ].join('');
    document.head.appendChild(css);
  }

  function removeRoot() {
    var el = document.getElementById(ROOT_ID);
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  async function showPopup(item) {
    if (!item || document.getElementById(ROOT_ID)) return;
    ensureStyles();
    var mode = normalizeMode(item.mode);
    var imgUrl = '';
    if (mode !== 'text' && item.imageId) {
      imgUrl = await loadImage(item.imageId);
      if (!imgUrl && mode === 'image') return;
      if (!imgUrl && mode === 'both' && !item.text && !item.title) return;
    }

    var root = document.createElement('div');
    root.id = ROOT_ID;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', item.title || 'إعلان');

    var imgHtml = imgUrl
      ? '<img class="rap-img" alt="" src="' + imgUrl.replace(/"/g, '') + '">'
      : '';
    var titleHtml = item.title
      ? '<h2 class="rap-title">' + escapeHtml(item.title) + '</h2>'
      : '';
    var textHtml = item.text
      ? '<p class="rap-text">' + escapeHtml(item.text) + '</p>'
      : '';
    var bodyHtml = (titleHtml || textHtml)
      ? '<div class="rap-body">' + titleHtml + textHtml + '</div>'
      : '';

    var dur = clampDuration(item.durationSec);
    root.innerHTML =
      '<div class="rap-card">' +
        '<button type="button" class="rap-close" aria-label="إغلاق">×</button>' +
        imgHtml +
        bodyHtml +
        '<div class="rap-actions"><button type="button" class="rap-ok">حسناً</button></div>' +
        '<div class="rap-timer" aria-hidden="true"><i style="animation-duration:' + dur + 's"></i></div>' +
      '</div>';

    var closed = false;
    function close() {
      if (closed) return;
      closed = true;
      markSeen(item.id);
      root.classList.remove('show');
      setTimeout(removeRoot, 220);
    }

    root.querySelector('.rap-close').addEventListener('click', close);
    root.querySelector('.rap-ok').addEventListener('click', close);
    root.addEventListener('click', function (e) {
      if (e.target === root) close();
    });

    document.body.appendChild(root);
    requestAnimationFrame(function () { root.classList.add('show'); });
    setTimeout(close, dur * 1000);
  }

  async function maybeDisplay() {
    if (displayStarted) return;
    displayStarted = true;
    try {
      if (/\/desk-log(\/|$)/.test(location.pathname || '')) return;
      if (/\/ticker-board(\/|$)/.test(location.pathname || '')) return;
      await loadStore(false);
      var active = store.items.filter(function (it) {
        return isActiveItem(it) && !wasSeenToday(it.id);
      });
      if (!active.length) return;
      // Show newest active popup first.
      await showPopup(active[0]);
    } catch (e) {}
  }

  async function addPopup(opts) {
    opts = opts || {};
    await loadStore(true);
    if (!storeFetchOk) throw new Error('store-offline');
    var mode = normalizeMode(opts.mode);
    var id = newId();
    while (store.items.some(function (it) { return it.id === id; })) id = newId();
    var imageId = '';
    if (mode !== 'text') {
      if (!opts.file && !opts.dataUrl) throw new Error('need-image');
      var dataUrl = opts.dataUrl || await compressImageFile(opts.file);
      imageId = id;
      await writeImage(imageId, dataUrl);
    }
    var item = normalizeItem({
      id: id,
      title: opts.title,
      text: opts.text,
      mode: mode,
      imageId: imageId,
      days: opts.days,
      durationSec: opts.durationSec,
      startAt: Date.now(),
      enabled: true,
      at: Date.now()
    });
    if (!item) throw new Error('invalid');
    store.items.unshift(item);
    await saveStore(store);
    return item;
  }

  async function removePopup(id) {
    id = String(id || '').trim();
    await loadStore(true);
    if (!storeFetchOk) throw new Error('store-offline');
    var found = store.items.find(function (it) { return it.id === id; });
    store.items = store.items.filter(function (it) { return it.id !== id; });
    await saveStore(store);
    if (found && found.imageId) await deleteImage(found.imageId);
    return store;
  }

  async function setEnabled(id, enabled) {
    id = String(id || '').trim();
    await loadStore(true);
    if (!storeFetchOk) throw new Error('store-offline');
    var item = store.items.find(function (it) { return it.id === id; });
    if (!item) throw new Error('missing');
    item.enabled = !!enabled;
    item.at = Date.now();
    await saveStore(store);
    return item;
  }

  function getItems() {
    return store.items.slice();
  }

  function remainingDays(item) {
    if (!item) return 0;
    var end = Number(item.startAt || 0) + clampDays(item.days) * DAY_MS;
    return Math.max(0, Math.ceil((end - Date.now()) / DAY_MS));
  }

  global.RosterAnnouncePopups = {
    loadStore: loadStore,
    getItems: getItems,
    isActiveItem: isActiveItem,
    remainingDays: remainingDays,
    addPopup: addPopup,
    removePopup: removePopup,
    setEnabled: setEnabled,
    loadImage: loadImage,
    compressImageFile: compressImageFile,
    storeLoadedSuccessfully: function () { return !!storeFetchOk; },
    invalidateCache: function () { loadPromise = null; imgCache = Object.create(null); },
    clampDays: clampDays,
    clampDuration: clampDuration,
    normalizeMode: normalizeMode
  };

  function bootDisplay() {
    var run = function () { maybeDisplay(); };
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(run, 900);
    } else {
      document.addEventListener('DOMContentLoaded', function () { setTimeout(run, 900); }, { once: true });
    }
  }

  // Desk-log only needs the API; skip auto display there.
  try {
    if (!/\/desk-log(\/|$)/.test(location.pathname || '')) bootDisplay();
  } catch (e) {
    bootDisplay();
  }
})(typeof window !== 'undefined' ? window : globalThis);
