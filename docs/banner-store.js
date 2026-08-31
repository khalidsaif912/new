/**
 * Banner catalog — static manifest + Mantle overlay for add/remove from desk-log.
 */
(function (global) {
  'use strict';

  var MANTLE_URL = 'https://mantledb.sh/v2/roster-site-visits/banners';
  var MANTLE_IMG_NS = 'https://mantledb.sh/v2/roster-site-visits/banner-img-';
  var MANTLE_KEY = '8bb6b7c45e0e18fef1b758bc6dc85d7b1bac11b42e2e53faab3b88595572189d';
  var STATIC_NAME_RE = /^banner\d+\.jpg$/i;
  var CUSTOM_NAME_RE = /^custom:([a-z0-9]{8,32})$/i;
  var CUSTOM_ID_RE = /^b[a-z0-9]{7,31}$/i;

  var baseManifest = { banners: [], layouts: {} };
  var overlay = { removed: [], custom: [] };
  var merged = { banners: [], layouts: {} };
  var customUrlCache = Object.create(null);
  var loadPromise = null;

  function siteRootPath() {
    var path = location.pathname || '/';
    if (path.indexOf('/roster-site/') !== -1) return '/roster-site';
    if (location.hostname && location.hostname.endsWith('github.io')) {
      var segs = path.split('/').filter(Boolean);
      if (segs.length >= 2 && segs[1] === 'docs') return '/' + segs[0] + '/docs';
      return segs.length ? '/' + segs[0] : '';
    }
    return '';
  }

  function bannersAssetPath() {
    return (location.origin || '') + siteRootPath() + '/assets/banners/';
  }

  function manifestUrl() {
    return bannersAssetPath() + 'manifest.json';
  }

  function mantleHeaders(write) {
    var h = { Accept: 'application/json', 'X-Mantle-Key': MANTLE_KEY };
    if (write) h['Content-Type'] = 'application/json';
    return h;
  }

  function isStaticName(name) {
    return STATIC_NAME_RE.test(String(name || ''));
  }

  function isCustomName(name) {
    return CUSTOM_NAME_RE.test(String(name || ''));
  }

  function isBannerName(name) {
    return isStaticName(name) || isCustomName(name);
  }

  function customKey(id) {
    return 'custom:' + id;
  }

  function customIdFromName(name) {
    var m = String(name || '').match(CUSTOM_NAME_RE);
    return m ? m[1] : '';
  }

  function safeImageData(s) {
    s = String(s || '').replace(/\s+/g, '');
    if (/^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/]+=*$/i.test(s)) return s;
    return '';
  }

  function normalizeOverlay(raw) {
    var out = { removed: [], custom: [] };
    if (!raw || typeof raw !== 'object') return out;
    var removed = Array.isArray(raw.removed) ? raw.removed : [];
    removed.forEach(function (name) {
      name = String(name || '').trim();
      if (isStaticName(name) && out.removed.indexOf(name) === -1) out.removed.push(name);
    });
    var custom = Array.isArray(raw.custom) ? raw.custom : [];
    custom.forEach(function (item) {
      if (!item || typeof item !== 'object') return;
      var id = String(item.id || '').trim();
      if (!CUSTOM_ID_RE.test(id)) return;
      var key = customKey(id);
      if (out.custom.some(function (c) { return c.id === id; })) return;
      out.custom.push({
        id: id,
        key: key,
        label: String(item.label || '').trim(),
        at: Number(item.at) || Date.now(),
        layout: item.layout && typeof item.layout === 'object' ? item.layout : null,
      });
    });
    out.custom.sort(function (a, b) {
      return (Number(a.at) || 0) - (Number(b.at) || 0);
    });
    return out;
  }

  function mergeCatalog() {
    var banners = [];
    var seen = Object.create(null);
    var layouts = Object.assign({}, baseManifest.layouts || {});

    (baseManifest.banners || []).forEach(function (name) {
      name = String(name || '').trim();
      if (!isStaticName(name)) return;
      if (overlay.removed.indexOf(name) >= 0) return;
      if (seen[name]) return;
      seen[name] = 1;
      banners.push(name);
    });

    overlay.custom.forEach(function (item) {
      var key = item.key || customKey(item.id);
      if (seen[key]) return;
      seen[key] = 1;
      banners.push(key);
      if (item.layout) layouts[key] = item.layout;
    });

    merged = { banners: banners, layouts: layouts };
    return merged;
  }

  async function loadManifestFile() {
    try {
      var res = await fetch(manifestUrl() + '?ts=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) throw new Error('manifest');
      var json = await res.json();
      baseManifest = {
        banners: Array.isArray(json.banners) ? json.banners.slice() : [],
        layouts: json.layouts && typeof json.layouts === 'object' ? json.layouts : {},
      };
    } catch (e) {
      baseManifest = baseManifest.banners && baseManifest.banners.length ? baseManifest : { banners: [], layouts: {} };
    }
  }

  async function loadOverlay() {
    try {
      var res = await fetch(MANTLE_URL + '?ts=' + Date.now(), {
        headers: mantleHeaders(false),
        cache: 'no-store',
      });
      if (res.status === 404) {
        overlay = { removed: [], custom: [] };
        return;
      }
      if (!res.ok) throw new Error('overlay');
      overlay = normalizeOverlay(await res.json());
    } catch (e) {
      overlay = overlay || { removed: [], custom: [] };
    }
  }

  async function saveOverlay(next) {
    overlay = normalizeOverlay(next);
    var payload = {
      removed: overlay.removed.slice(),
      custom: overlay.custom.map(function (item) {
        return {
          id: item.id,
          key: item.key || customKey(item.id),
          label: item.label || '',
          at: Number(item.at) || Date.now(),
          layout: item.layout || null,
        };
      }),
      at: Date.now(),
    };
    var res = await fetch(MANTLE_URL, {
      method: 'POST',
      headers: mantleHeaders(true),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('save');
    mergeCatalog();
    return merged;
  }

  async function loadCatalog(force) {
    if (!force && loadPromise) return loadPromise;
    loadPromise = (async function () {
      await loadManifestFile();
      await loadOverlay();
      return mergeCatalog();
    })();
    return loadPromise;
  }

  function getBanners() {
    return merged.banners.slice();
  }

  function getLayouts() {
    return Object.assign({}, merged.layouts);
  }

  function getOverlayState() {
    return {
      removed: overlay.removed.slice(),
      custom: overlay.custom.map(function (item) {
        return Object.assign({}, item);
      }),
    };
  }

  function getLayout(name) {
    return merged.layouts[name] || null;
  }

  function bannerLabel(name) {
    if (isStaticName(name)) {
      var m = String(name).match(/banner(\d+)\.jpg/i);
      return m ? m[1] : name;
    }
    var id = customIdFromName(name);
    var item = overlay.custom.find(function (c) { return c.id === id; });
    return (item && item.label) || ('+' + id.slice(0, 4));
  }

  function staticBannerUrl(name) {
    return bannersAssetPath() + name;
  }

  async function loadCustomImage(id) {
    id = String(id || '').trim();
    if (!CUSTOM_ID_RE.test(id)) return '';
    if (customUrlCache[id]) return customUrlCache[id];
    try {
      var res = await fetch(MANTLE_IMG_NS + encodeURIComponent(id) + '?ts=' + Date.now(), {
        headers: mantleHeaders(false),
        cache: 'no-store',
      });
      if (!res.ok) return '';
      var json = await res.json();
      var safe = safeImageData(json && json.d);
      if (safe) customUrlCache[id] = safe;
      return safe;
    } catch (e) {
      return '';
    }
  }

  async function resolveBannerUrl(name) {
    name = String(name || '').trim();
    if (isStaticName(name)) return staticBannerUrl(name);
    var id = customIdFromName(name);
    if (id) {
      var dataUrl = await loadCustomImage(id);
      if (dataUrl) return dataUrl;
    }
    return '';
  }

  async function writeCustomImage(id, dataUrl) {
    id = String(id || '').trim();
    if (!CUSTOM_ID_RE.test(id)) throw new Error('id');
    var safe = safeImageData(dataUrl);
    if (!safe) throw new Error('img');
    var res = await fetch(MANTLE_IMG_NS + encodeURIComponent(id), {
      method: 'POST',
      headers: mantleHeaders(true),
      body: JSON.stringify({ d: safe, at: Date.now() }),
    });
    if (!res.ok) throw new Error('imgwrite');
    customUrlCache[id] = safe;
  }

  function newCustomId() {
    var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var out = 'b';
    for (var i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  function compressImageFile(file, maxW, quality, maxBytes) {
    maxW = maxW || 1200;
    quality = quality == null ? 0.82 : quality;
    maxBytes = maxBytes || 48000;
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          var scale = Math.min(1, maxW / (img.width || maxW));
          var w = Math.max(1, Math.round((img.width || maxW) * scale));
          var h = Math.max(1, Math.round((img.height || maxW * 0.28) * scale));
          var canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          var q = quality;
          var dataUrl = canvas.toDataURL('image/jpeg', q);
          while (dataUrl.length > maxBytes && q > 0.45) {
            q -= 0.06;
            dataUrl = canvas.toDataURL('image/jpeg', q);
          }
          if (dataUrl.length > maxBytes) {
            reject(new Error('large'));
            return;
          }
          resolve(dataUrl);
        };
        img.onerror = function () { reject(new Error('img')); };
        img.src = reader.result;
      };
      reader.onerror = function () { reject(new Error('read')); };
      reader.readAsDataURL(file);
    });
  }

  async function addCustomBanner(file, label) {
    await loadCatalog(true);
    var dataUrl = await compressImageFile(file);
    var id = newCustomId();
    while (overlay.custom.some(function (c) { return c.id === id; })) id = newCustomId();
    await writeCustomImage(id, dataUrl);
    overlay.custom.push({
      id: id,
      key: customKey(id),
      label: String(label || '').trim(),
      at: Date.now(),
      layout: { position: '50% 50%', positionMobile: '50% 50%' },
    });
    await saveOverlay(overlay);
    return customKey(id);
  }

  async function removeBanner(name) {
    name = String(name || '').trim();
    if (!isBannerName(name)) throw new Error('name');
    await loadCatalog(true);
    if (isStaticName(name)) {
      if (overlay.removed.indexOf(name) === -1) overlay.removed.push(name);
    } else {
      var id = customIdFromName(name);
      overlay.custom = overlay.custom.filter(function (c) { return c.id !== id; });
      delete customUrlCache[id];
    }
    await saveOverlay(overlay);
    return merged;
  }

  async function restoreBanner(name) {
    name = String(name || '').trim();
    if (!isStaticName(name)) throw new Error('name');
    await loadCatalog(true);
    overlay.removed = overlay.removed.filter(function (n) { return n !== name; });
    await saveOverlay(overlay);
    return merged;
  }

  function invalidateCache() {
    loadPromise = null;
    customUrlCache = Object.create(null);
  }

  global.RosterBannerStore = {
    loadCatalog: loadCatalog,
    getBanners: getBanners,
    getLayouts: getLayouts,
    getLayout: getLayout,
    getOverlayState: getOverlayState,
    bannerLabel: bannerLabel,
    isBannerName: isBannerName,
    isStaticName: isStaticName,
    isCustomName: isCustomName,
    resolveBannerUrl: resolveBannerUrl,
    staticBannerUrl: staticBannerUrl,
    addCustomBanner: addCustomBanner,
    removeBanner: removeBanner,
    restoreBanner: restoreBanner,
    compressImageFile: compressImageFile,
    invalidateCache: invalidateCache,
    bannersAssetPath: bannersAssetPath,
  };
})(typeof window !== 'undefined' ? window : globalThis);
