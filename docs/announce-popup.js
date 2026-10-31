/**
 * Announcement popups — Mantle-backed ads from desk-log.
 * Modes: text | image | both | slides (multi-image notes with Next → home).
 * Campaign days + on-screen duration (seconds; slides advance manually).
 */
(function (global) {
  'use strict';

  // Avoid double-boot if HTML + banner-store both load this file.
  if (global.__rosterAnnouncePopupBooted) return;
  global.__rosterAnnouncePopupBooted = true;

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
  var SEEN_KEY = 'rosterAnnounceSeenSessionV1';
  var STYLE_ID = 'rosterAnnouncePopupCss';
  var ROOT_ID = 'rosterAnnouncePopupRoot';
  var ID_RE = /^a[a-z0-9]{7,31}$/i;
  var DAY_MS = 86400000;
  // MantleDB entries are capped at 64 KB (JSON body included) on this namespace.
  var MANTLE_CHUNK_LEN = 56000;
  var MAX_IMG_DATA_LEN = 56000;
  // Animated GIFs are stored untouched (canvas would flatten them) and split across entries.
  var MAX_GIF_PARTS = 4;
  var MAX_GIF_DATA_LEN = MANTLE_CHUNK_LEN * MAX_GIF_PARTS;
  var DISK_CACHE_MAX_CHARS = 1500000;

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
    if (!/^data:image\/(jpeg|jpg|png|webp|gif);base64,/i.test(d)) return '';
    var cap = /^data:image\/gif;/i.test(d) ? MAX_GIF_DATA_LEN : MAX_IMG_DATA_LEN;
    if (d.length > cap) return '';
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
    if (m === 'text' || m === 'image' || m === 'both' || m === 'slides') return m;
    return 'text';
  }

  function normalizeImageIds(raw, fallbackId) {
    var out = [];
    var seen = Object.create(null);
    function pushId(id) {
      id = String(id || '').trim();
      if (!ID_RE.test(id) || seen[id]) return;
      seen[id] = 1;
      out.push(id);
    }
    if (Array.isArray(raw)) {
      raw.forEach(pushId);
    } else if (raw) {
      pushId(raw);
    }
    if (!out.length && fallbackId) pushId(fallbackId);
    return out.slice(0, 12);
  }

  function normalizeLinkUrl(u) {
    u = String(u || '').trim();
    if (!u) return '';
    if (!/^https?:\/\//i.test(u)) {
      if (/^[\w.-]+\.[\w.-]+/.test(u)) u = 'https://' + u;
      else return '';
    }
    try {
      var parsed = new URL(u);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
      return parsed.href;
    } catch (e) {
      return '';
    }
  }

  function normalizeLinkLabel(label, hasUrl) {
    label = String(label || '').trim().slice(0, 40);
    if (label) return label;
    return hasUrl ? 'افتح الرابط' : '';
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
    var imageIds = normalizeImageIds(raw.imageIds, imageId || (mode === 'slides' || mode === 'image' || mode === 'both' ? id : ''));
    if (mode === 'text') {
      imageId = '';
      imageIds = [];
    }
    if (mode === 'slides') {
      if (!imageIds.length && !safeImageData(raw._preview)) return null;
      imageId = imageIds[0] || imageId || id;
    } else if (mode === 'image') {
      if (!imageIds.length && !imageId && !safeImageData(raw._preview)) return null;
      imageId = imageIds[0] || imageId || id;
      imageIds = imageId ? [imageId] : [];
    } else if (mode === 'both') {
      if (!text && !title) return null;
      imageId = imageIds[0] || imageId || (imageIds.length ? imageIds[0] : id);
      if (imageId && !imageIds.length) imageIds = [imageId];
    } else if (mode === 'text' && !text && !title) {
      return null;
    }
    var linkUrl = normalizeLinkUrl(raw.linkUrl || raw.url || '');
    var linkLabel = normalizeLinkLabel(raw.linkLabel || raw.buttonText || '', !!linkUrl);
    var startAt = Number(raw.startAt || raw.at || Date.now()) || Date.now();
    return {
      id: id,
      title: title,
      text: text,
      mode: mode,
      imageId: imageId || '',
      imageIds: imageIds,
      linkUrl: linkUrl,
      linkLabel: linkLabel,
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
      if (dataUrl.length > DISK_CACHE_MAX_CHARS) return;
      var all = mantle().readCache(IMG_DISK_KEY) || {};
      if (typeof all !== 'object' || !all) all = {};
      delete all[id];
      all[id] = dataUrl;
      var keys = Object.keys(all);
      var total = 0;
      keys.forEach(function (k) { total += String(all[k] || '').length; });
      while (keys.length > 1 && (keys.length > 24 || total > DISK_CACHE_MAX_CHARS)) {
        var oldest = keys.shift();
        total -= String(all[oldest] || '').length;
        delete all[oldest];
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

      // Prefer a live Mantle read for display even during shared backoff.
      var mustNetwork = !!force || !(store.items && store.items.length);

      if (mantle().backingOff && mantle().backingOff() && !mustNetwork) {
        storeFetchOk = !!(cached || (staticOv && staticOv.items && staticOv.items.length));
        return store;
      }

      try {
        var res = await mantle().fetchRes(MANTLE_URL + '?ts=' + Date.now(), {
          headers: mantleHeaders(false),
          force: true
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

  function partUrl(id, i) {
    return MANTLE_IMG_NS + encodeURIComponent(id) + (i > 0 ? '-p' + i : '');
  }

  async function postImagePart(id, i, body) {
    var res = await mantle().fetchRes(partUrl(id, i), {
      method: 'POST',
      headers: mantleHeaders(true),
      body: JSON.stringify(body),
      force: true
    });
    if (!res.ok) throw new Error('imgwrite');
  }

  async function writeImage(id, dataUrl) {
    id = String(id || '').trim();
    if (!ID_RE.test(id)) throw new Error('id');
    var safe = safeImageData(dataUrl);
    if (!safe) throw new Error('img');
    var parts = [];
    for (var pos = 0; pos < safe.length; pos += MANTLE_CHUNK_LEN) {
      parts.push(safe.slice(pos, pos + MANTLE_CHUNK_LEN));
    }
    var at = Date.now();
    // Extra parts first so the main entry never points at missing data.
    for (var i = 1; i < parts.length; i++) {
      await postImagePart(id, i, { d: parts[i], at: at });
    }
    var main = { d: parts[0], at: at };
    if (parts.length > 1) main.n = parts.length;
    await postImagePart(id, 0, main);
    imgCache[id] = safe;
    writeImgDisk(id, safe);
    return safe;
  }

  async function readImagePart(id, i) {
    var res = await mantle().fetchRes(partUrl(id, i) + '?ts=' + Date.now(), {
      headers: mantleHeaders(false)
    });
    if (!res.ok) return null;
    return res.json();
  }

  async function deleteImage(id) {
    id = String(id || '').trim();
    if (!ID_RE.test(id)) return;
    delete imgCache[id];
    deleteImgDisk(id);
    var parts = MAX_GIF_PARTS;
    try {
      var head = await readImagePart(id, 0);
      if (head) parts = Math.min(Math.max(Number(head.n) || 1, 1), MAX_GIF_PARTS);
    } catch (e) {}
    for (var i = 0; i < parts; i++) {
      try {
        await mantle().fetchRes(partUrl(id, i), {
          method: 'DELETE',
          headers: mantleHeaders(false),
          force: true
        });
      } catch (e) {}
    }
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
      var head = await readImagePart(id, 0);
      if (!head || head.deleted) return '';
      var data = String(head.d || '');
      var n = Math.min(Math.max(Number(head.n) || 1, 1), MAX_GIF_PARTS);
      if (n > 1) {
        var rest = [];
        for (var i = 1; i < n; i++) rest.push(readImagePart(id, i));
        var others = await Promise.all(rest);
        for (var j = 0; j < others.length; j++) {
          if (!others[j] || others[j].deleted) return '';
          data += String(others[j].d || '');
        }
      }
      var safe = safeImageData(data);
      if (safe) {
        imgCache[id] = safe;
        writeImgDisk(id, safe);
      }
      return safe;
    } catch (e) {
      return '';
    }
  }

  function isGifFile(file) {
    return !!file && (/^image\/gif$/i.test(file.type || '') || /\.gif$/i.test(file.name || ''));
  }

  function readGifFile(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var d = String(reader.result || '').replace(/^data:[^;,]*/i, 'data:image/gif');
        if (d.length > MAX_GIF_DATA_LEN) {
          reject(new Error('gif-large'));
          return;
        }
        if (!safeImageData(d)) {
          reject(new Error('img'));
          return;
        }
        resolve(d);
      };
      reader.onerror = function () { reject(new Error('read')); };
      reader.readAsDataURL(file);
    });
  }

  function compressImageFile(file, maxW, quality, maxBytes) {
    if (isGifFile(file)) return readGifFile(file);
    maxW = maxW || 900;
    quality = quality == null ? 0.78 : quality;
    maxBytes = maxBytes || MAX_IMG_DATA_LEN - 200;
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

  function readSeen() {
    try {
      var raw = sessionStorage.getItem(SEEN_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  function markSeen(id) {
    try {
      var all = readSeen();
      all[id] = 1;
      sessionStorage.setItem(SEEN_KEY, JSON.stringify(all));
    } catch (e) {}
  }

  function wasSeenThisVisit(id) {
    var all = readSeen();
    return !!all[id];
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
      '#' + ROOT_ID + ' .rap-actions{display:flex;flex-wrap:wrap;gap:8px;padding:0 18px 16px;justify-content:flex-end}',
      '#' + ROOT_ID + ' .rap-ok{border:0;border-radius:12px;min-height:40px;padding:0 16px;background:#1d4ed8;color:#fff;',
      'font:inherit;font-size:13px;font-weight:800;cursor:pointer}',
      '#' + ROOT_ID + ' .rap-link{display:inline-flex;align-items:center;justify-content:center;border-radius:12px;min-height:40px;padding:0 16px;',
      'background:#0f766e;color:#fff;font:inherit;font-size:13px;font-weight:800;text-decoration:none}',
      '#' + ROOT_ID + ' .rap-card{touch-action:manipulation;-webkit-user-select:none;user-select:none}',
      '#' + ROOT_ID + ' .rap-card.rap-paused{outline:2px solid #93c5fd}',
      '#' + ROOT_ID + ' .rap-timer{height:3px;background:#e2e8f0;overflow:hidden}',
      '#' + ROOT_ID + ' .rap-timer > i{display:block;height:100%;width:100%;background:#3b82f6;transform-origin:inline-start;',
      'animation:rapDrain linear forwards}',
      '#' + ROOT_ID + ' .rap-timer > i.paused{animation-play-state:paused}',
      '@keyframes rapDrain{from{transform:scaleX(1)}to{transform:scaleX(0)}}',
      '#' + ROOT_ID + ' .rap-card.rap-slides{width:min(460px,100%);max-height:min(92vh,820px);overflow:hidden;display:flex;flex-direction:column}',
      '#' + ROOT_ID + ' .rap-slides-frame{position:relative;background:#0f172a;min-height:220px;flex:1 1 auto}',
      '#' + ROOT_ID + ' .rap-slides-frame .rap-img{max-height:min(62vh,560px);object-fit:contain;background:#0f172a}',
      '#' + ROOT_ID + ' .rap-slides-meta{display:flex;align-items:center;justify-content:space-between;gap:10px;',
      'padding:10px 16px 0;font-size:12px;font-weight:700;color:#64748b}',
      '#' + ROOT_ID + ' .rap-dots{display:flex;flex-wrap:wrap;gap:5px;justify-content:center;padding:8px 16px 0}',
      '#' + ROOT_ID + ' .rap-dots i{width:7px;height:7px;border-radius:999px;background:#cbd5e1}',
      '#' + ROOT_ID + ' .rap-dots i.on{background:#2563eb;transform:scale(1.15)}',
      '#' + ROOT_ID + ' .rap-next{min-width:120px}',
      'body.ar #' + ROOT_ID + ' .rap-card{direction:rtl;text-align:right}',
      '@media (prefers-reduced-motion:reduce){#' + ROOT_ID + ',#' + ROOT_ID + ' .rap-card{transition:none}#' + ROOT_ID + ' .rap-timer>i{animation:none}}'
    ].join('');
    document.head.appendChild(css);
  }

  function removeRoot() {
    var el = document.getElementById(ROOT_ID);
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  async function showSlidesPopup(item) {
    if (!item || document.getElementById(ROOT_ID)) return;
    ensureStyles();
    var ids = normalizeImageIds(item.imageIds, item.imageId);
    if (!ids.length) return;

    var urls = [];
    var i;
    for (i = 0; i < ids.length; i++) {
      var url = await loadImage(ids[i]);
      if (url) urls.push(url);
    }
    if (!urls.length) return;

    var root = document.createElement('div');
    root.id = ROOT_ID;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', item.title || 'ملاحظات مصورة');

    var titleHtml = item.title
      ? '<h2 class="rap-title">' + escapeHtml(item.title) + '</h2>'
      : '';
    var textHtml = item.text
      ? '<p class="rap-text">' + escapeHtml(item.text) + '</p>'
      : '';
    var bodyHtml = (titleHtml || textHtml)
      ? '<div class="rap-body">' + titleHtml + textHtml + '</div>'
      : '';

    var dots = '';
    for (i = 0; i < urls.length; i++) {
      dots += '<i' + (i === 0 ? ' class="on"' : '') + '></i>';
    }

    root.innerHTML =
      '<div class="rap-card rap-slides">' +
        '<button type="button" class="rap-close" aria-label="إغلاق">×</button>' +
        '<div class="rap-slides-meta">' +
          '<span class="rap-slide-count">1 / ' + urls.length + '</span>' +
          '<span>ملاحظات مصورة</span>' +
        '</div>' +
        '<div class="rap-slides-frame">' +
          '<img class="rap-img" alt="" src="' + urls[0].replace(/"/g, '') + '">' +
        '</div>' +
        '<div class="rap-dots" aria-hidden="true">' + dots + '</div>' +
        bodyHtml +
        '<div class="rap-actions">' +
          '<button type="button" class="rap-ok rap-next">' +
            (urls.length > 1 ? 'التالي' : 'الصفحة الرئيسية') +
          '</button>' +
        '</div>' +
      '</div>';

    var closed = false;
    var index = 0;
    var imgEl = root.querySelector('.rap-slides-frame .rap-img');
    var countEl = root.querySelector('.rap-slide-count');
    var nextBtn = root.querySelector('.rap-next');
    var dotNodes = root.querySelectorAll('.rap-dots i');

    function close(fromUser) {
      if (closed) return;
      closed = true;
      if (fromUser) markSeen(item.id);
      root.classList.remove('show');
      setTimeout(removeRoot, 220);
    }

    function paint() {
      if (!imgEl) return;
      imgEl.src = urls[index].replace(/"/g, '');
      if (countEl) countEl.textContent = (index + 1) + ' / ' + urls.length;
      for (var d = 0; d < dotNodes.length; d++) {
        if (d === index) dotNodes[d].classList.add('on');
        else dotNodes[d].classList.remove('on');
      }
      if (nextBtn) {
        nextBtn.textContent = index >= urls.length - 1 ? 'الصفحة الرئيسية' : 'التالي';
      }
    }

    function advance() {
      if (closed) return;
      if (index >= urls.length - 1) {
        close(true);
        return;
      }
      index += 1;
      paint();
    }

    root.querySelector('.rap-close').addEventListener('click', function () { close(true); });
    if (nextBtn) nextBtn.addEventListener('click', advance);
    root.addEventListener('click', function (e) {
      if (e.target === root) close(true);
    });

    document.body.appendChild(root);
    requestAnimationFrame(function () { root.classList.add('show'); });
  }

  async function showPopup(item) {
    if (!item || document.getElementById(ROOT_ID)) return;
    ensureStyles();
    var mode = normalizeMode(item.mode);
    if (mode === 'slides') {
      await showSlidesPopup(item);
      return;
    }
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
    var linkUrl = normalizeLinkUrl(item.linkUrl);
    var linkLabel = normalizeLinkLabel(item.linkLabel, !!linkUrl);
    var linkHtml = linkUrl
      ? '<a class="rap-link" href="' + escapeHtml(linkUrl) + '" target="_blank" rel="noopener noreferrer">' +
          escapeHtml(linkLabel) +
        '</a>'
      : '';
    root.innerHTML =
      '<div class="rap-card">' +
        '<button type="button" class="rap-close" aria-label="إغلاق">×</button>' +
        imgHtml +
        bodyHtml +
        '<div class="rap-actions">' + linkHtml + '<button type="button" class="rap-ok">حسناً</button></div>' +
        '<div class="rap-timer" aria-hidden="true"><i style="animation-duration:' + dur + 's"></i></div>' +
      '</div>';

    var closed = false;
    var paused = false;
    var remainingMs = dur * 1000;
    var endsAt = Date.now() + remainingMs;
    var timerId = 0;
    var card = root.querySelector('.rap-card');
    var timerBar = root.querySelector('.rap-timer > i');

    function clearAutoClose() {
      if (timerId) {
        clearTimeout(timerId);
        timerId = 0;
      }
    }

    function armAutoClose() {
      clearAutoClose();
      if (closed || paused) return;
      endsAt = Date.now() + remainingMs;
      timerId = setTimeout(function () { close(false); }, remainingMs);
    }

    function pauseTimer() {
      if (closed || paused) return;
      paused = true;
      remainingMs = Math.max(0, endsAt - Date.now());
      clearAutoClose();
      if (card) card.classList.add('rap-paused');
      if (timerBar) timerBar.classList.add('paused');
    }

    function resumeTimer() {
      if (closed || !paused) return;
      paused = false;
      if (card) card.classList.remove('rap-paused');
      if (timerBar) timerBar.classList.remove('paused');
      armAutoClose();
    }

    function close(fromUser) {
      if (closed) return;
      closed = true;
      clearAutoClose();
      // Only suppress for this browser session after an explicit dismiss.
      // Auto-timeout must not hide the ad on the next page entry.
      if (fromUser) markSeen(item.id);
      root.classList.remove('show');
      setTimeout(removeRoot, 220);
    }

    root.querySelector('.rap-close').addEventListener('click', function () { close(true); });
    root.querySelector('.rap-ok').addEventListener('click', function () { close(true); });
    var linkEl = root.querySelector('.rap-link');
    if (linkEl) {
      linkEl.addEventListener('click', function () {
        // Visiting the link counts as interacting with the ad.
        markSeen(item.id);
      });
    }
    root.addEventListener('click', function (e) {
      if (e.target === root) close(true);
    });

    // Hold on the popup to pause the countdown; release to continue.
    if (card) {
      card.addEventListener('pointerdown', function (e) {
        if (e.target && (e.target.closest('.rap-close') || e.target.closest('.rap-ok') || e.target.closest('.rap-link'))) {
          return;
        }
        pauseTimer();
      });
      ['pointerup', 'pointercancel', 'pointerleave', 'lostpointercapture'].forEach(function (evt) {
        card.addEventListener(evt, resumeTimer);
      });
      window.addEventListener('pointerup', resumeTimer);
      window.addEventListener('blur', resumeTimer);
    }

    document.body.appendChild(root);
    requestAnimationFrame(function () {
      root.classList.add('show');
      armAutoClose();
    });
  }

  async function maybeDisplay() {
    if (displayStarted) return;
    displayStarted = true;
    try {
      if (/\/desk-log(\/|$)/.test(location.pathname || '')) return;
      if (/\/ticker-board(\/|$)/.test(location.pathname || '')) return;
      // Force network so a fresh publish appears even if local cache is empty.
      await loadStore(true);
      var active = store.items.filter(function (it) {
        return isActiveItem(it) && !wasSeenThisVisit(it.id);
      });
      if (!active.length) return;
      // Show newest active popup immediately on entry.
      await showPopup(active[0]);
    } catch (e) {}
  }

  function collectUploadFiles(opts) {
    var files = [];
    if (Array.isArray(opts.files) && opts.files.length) {
      opts.files.forEach(function (f) { if (f) files.push(f); });
    } else if (opts.file) {
      files.push(opts.file);
    }
    if (Array.isArray(opts.dataUrls) && opts.dataUrls.length) {
      opts.dataUrls.forEach(function (d) {
        if (safeImageData(d)) files.push({ __dataUrl: d });
      });
    } else if (!files.length && opts.dataUrl && safeImageData(opts.dataUrl)) {
      files.push({ __dataUrl: opts.dataUrl });
    }
    return files.slice(0, 12);
  }

  async function addPopup(opts) {
    opts = opts || {};
    await loadStore(true);
    if (!storeFetchOk) throw new Error('store-offline');
    var mode = normalizeMode(opts.mode);
    var id = newId();
    while (store.items.some(function (it) { return it.id === id; })) id = newId();
    var imageId = '';
    var imageIds = [];
    if (mode !== 'text') {
      var uploads = collectUploadFiles(opts);
      if (!uploads.length) throw new Error('need-image');
      if (mode !== 'slides') uploads = uploads.slice(0, 1);
      var used = Object.create(null);
      used[id] = 1;
      for (var i = 0; i < uploads.length; i++) {
        var dataUrl = uploads[i].__dataUrl
          ? uploads[i].__dataUrl
          : await compressImageFile(uploads[i]);
        var imgId = i === 0 ? id : newId();
        while (used[imgId] || store.items.some(function (it) {
          return it.id === imgId || (it.imageIds && it.imageIds.indexOf(imgId) >= 0);
        })) {
          imgId = newId();
        }
        used[imgId] = 1;
        await writeImage(imgId, dataUrl);
        imageIds.push(imgId);
      }
      imageId = imageIds[0] || '';
    }
    var item = normalizeItem({
      id: id,
      title: opts.title,
      text: opts.text,
      mode: mode,
      imageId: imageId,
      imageIds: imageIds,
      linkUrl: opts.linkUrl,
      linkLabel: opts.linkLabel,
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
    if (found) {
      var ids = normalizeImageIds(found.imageIds, found.imageId);
      for (var i = 0; i < ids.length; i++) {
        await deleteImage(ids[i]);
      }
    }
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
    if (document.body) {
      run();
      return;
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run, { once: true });
    } else {
      run();
    }
  }

  // Desk-log only needs the API; skip auto display there.
  try {
    if (!/\/desk-log(\/|$)/.test(location.pathname || '')) bootDisplay();
  } catch (e) {
    bootDisplay();
  }
})(typeof window !== 'undefined' ? window : globalThis);
