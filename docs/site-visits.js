/**
 * Site visitor counts (today + this month).
 * Uses Abacus as primary counter (CounterAPI fallback). Mounted outside `.footer`.
 */
(function () {
  'use strict';

  var NS = 'khalidsaif912.github.io';
  var COUNTED_KEY = 'rosterVisitCountedDay';
  var CACHE_KEY = 'rosterVisitCountsV2';
  var cached = { day: null, month: null, dayKey: '', monthKey: '' };
  var booted = false;
  var loading = false;

  var I18N = {
    en: { day: 'Visitors today:', month: 'This month:' },
    ar: { day: 'زوار اليوم:', month: 'هذا الشهر:' }
  };

  function lang() {
    var l = localStorage.getItem('rosterLang') || document.documentElement.getAttribute('lang') || 'en';
    return l === 'ar' ? 'ar' : 'en';
  }

  function muscatYmd() {
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
      return {
        day: map.year + '-' + map.month + '-' + map.day,
        month: map.year + '-' + map.month
      };
    } catch (e) {
      var d = new Date();
      var y = d.getFullYear();
      var m = String(d.getMonth() + 1).padStart(2, '0');
      var day = String(d.getDate()).padStart(2, '0');
      return { day: y + '-' + m + '-' + day, month: y + '-' + m };
    }
  }

  function formatCount(n) {
    var num = Number(n);
    if (!isFinite(num) || num < 0) return '--';
    return String(Math.floor(num));
  }

  function readPersisted(keys) {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) raw = localStorage.getItem('rosterVisitCountsV1');
      if (!raw) return;
      var data = JSON.parse(raw);
      if (!data) return;
      if (data.dayKey === keys.day && data.day != null) cached.day = Number(data.day);
      if (data.monthKey === keys.month && data.month != null) cached.month = Number(data.month);
      cached.dayKey = keys.day;
      cached.monthKey = keys.month;
    } catch (e) {}
  }

  function persistCounts(keys) {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          dayKey: keys.day,
          monthKey: keys.month,
          day: cached.day,
          month: cached.month
        })
      );
    } catch (e) {}
  }

  function xhrJson(url) {
    return new Promise(function (resolve, reject) {
      try {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.timeout = 8000;
        xhr.onload = function () {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch (e) {
              reject(e);
            }
          } else {
            reject(new Error('HTTP ' + xhr.status));
          }
        };
        xhr.onerror = function () { reject(new Error('xhr error')); };
        xhr.ontimeout = function () { reject(new Error('xhr timeout')); };
        xhr.send();
      } catch (e) {
        reject(e);
      }
    });
  }

  function fetchJson(url) {
    if (typeof fetch === 'function') {
      return fetch(url, { cache: 'no-store', mode: 'cors' })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        })
        .catch(function () {
          return xhrJson(url);
        });
    }
    return xhrJson(url);
  }

  function parseCount(data) {
    if (data == null) return null;
    if (typeof data.value === 'number') return data.value;
    if (typeof data.count === 'number') return data.count;
    return null;
  }

  function requestCount(key, doUp) {
    var abacusHit = 'https://abacus.jasoncameron.dev/hit/' + NS + '/' + key;
    var abacusGet = 'https://abacus.jasoncameron.dev/get/' + NS + '/' + key;
    var counterUp = 'https://api.counterapi.dev/v1/roster-site-new/' + key + '/up';
    var counterGet = 'https://api.counterapi.dev/v1/roster-site-new/' + key;

    var primary = doUp ? abacusHit : abacusGet;
    var secondary = doUp ? counterUp : counterGet;

    return fetchJson(primary)
      .then(parseCount)
      .catch(function () {
        return fetchJson(secondary).then(parseCount);
      })
      .catch(function () {
        return null;
      });
  }

  function removeLegacyFooterRow() {
    var legacy = document.querySelector('.footer #siteVisitsRow');
    if (legacy && legacy.parentNode) legacy.parentNode.removeChild(legacy);
  }

  function placeHostInFooter(host, footer) {
    var buttons = footer.querySelector('.bgTextureShuffleWrap');
    if (buttons) {
      footer.insertBefore(host, buttons);
    } else {
      footer.appendChild(host);
    }
  }

  function ensureHost() {
    removeLegacyFooterRow();
    var footer = document.querySelector('.footer');
    if (!footer) return null;

    var host = document.getElementById('siteVisitsHost');
    if (host) {
      // Keep the counter inside the footer frame, above the action buttons.
      if (host.parentNode !== footer) placeHostInFooter(host, footer);
      else {
        var buttons = footer.querySelector('.bgTextureShuffleWrap');
        if (buttons && host.nextSibling !== buttons) footer.insertBefore(host, buttons);
      }
      return host;
    }

    host = document.createElement('div');
    host.id = 'siteVisitsHost';
    host.className = 'siteVisitsHost';
    host.style.cssText =
      'margin:2px 0 8px;padding:0;text-align:center;font-size:12px;' +
      'line-height:1.7;color:#94a3b8;font-family:inherit;';
    host.innerHTML =
      '<strong style="color:#475569;font-size:13px;" id="siteVisitsDayLabel"></strong> ' +
      '<strong style="color:#1e40af;" id="siteVisitsDay">--</strong>' +
      '<span aria-hidden="true"> · </span>' +
      '<strong style="color:#475569;font-size:13px;" id="siteVisitsMonthLabel"></strong> ' +
      '<strong style="color:#1e40af;" id="siteVisitsMonth">--</strong>';

    placeHostInFooter(host, footer);
    return host;
  }

  function paintLabels() {
    var pack = I18N[lang()] || I18N.en;
    var dayLbl = document.getElementById('siteVisitsDayLabel');
    var monthLbl = document.getElementById('siteVisitsMonthLabel');
    if (dayLbl) dayLbl.textContent = pack.day;
    if (monthLbl) monthLbl.textContent = pack.month;
    var host = document.getElementById('siteVisitsHost');
    if (host) host.setAttribute('dir', lang() === 'ar' ? 'rtl' : 'ltr');
  }

  function paintCounts() {
    var dayEl = document.getElementById('siteVisitsDay');
    var monthEl = document.getElementById('siteVisitsMonth');
    if (dayEl && cached.day != null && !isNaN(Number(cached.day))) {
      dayEl.textContent = formatCount(cached.day);
    }
    if (monthEl && cached.month != null && !isNaN(Number(cached.month))) {
      monthEl.textContent = formatCount(cached.month);
    }
  }

  function paint() {
    if (!ensureHost()) return;
    paintLabels();
    paintCounts();
  }

  function alreadyCounted(dayKey) {
    try {
      return localStorage.getItem(COUNTED_KEY) === dayKey;
    } catch (e) {
      return false;
    }
  }

  function markCounted(dayKey) {
    try {
      localStorage.setItem(COUNTED_KEY, dayKey);
    } catch (e) {}
  }

  function loadCounts() {
    if (loading) return Promise.resolve();
    loading = true;
    var keys = muscatYmd();
    var dayKey = 'day-' + keys.day;
    var monthKey = 'month-' + keys.month;
    var counted = alreadyCounted(keys.day);
    var hasCache = cached.day != null && cached.month != null;

    // Stuck state: flagged as counted but no numbers saved (common after failed API).
    if (counted && !hasCache) {
      try { localStorage.removeItem(COUNTED_KEY); } catch (e) {}
      counted = false;
    }

    var shouldUp = !counted;

    // Optimistic local bump so the UI is never stuck on -- for a first visit.
    if (shouldUp) {
      cached.day = Number(cached.day || 0) + 1;
      cached.month = Number(cached.month || 0) + 1;
      cached.dayKey = keys.day;
      cached.monthKey = keys.month;
      paint();
      persistCounts(keys);
    }

    return Promise.all([
      requestCount(dayKey, shouldUp),
      requestCount(monthKey, shouldUp)
    ])
      .then(function (vals) {
        if (vals[0] != null) cached.day = vals[0];
        if (vals[1] != null) cached.month = vals[1];
        cached.dayKey = keys.day;
        cached.monthKey = keys.month;
        if (shouldUp) markCounted(keys.day);
        persistCounts(keys);
        paint();

        // If still empty, force one hit attempt even for returning visitors.
        if (cached.day == null || cached.month == null) {
          return Promise.all([
            requestCount(dayKey, true),
            requestCount(monthKey, true)
          ]).then(function (vals2) {
            if (vals2[0] != null) cached.day = vals2[0];
            if (vals2[1] != null) cached.month = vals2[1];
            markCounted(keys.day);
            persistCounts(keys);
            paint();
          });
        }
      })
      .catch(function () {
        paint();
      })
      .then(function () {
        loading = false;
      });
  }

  function hookLang() {
    if (window.__siteVisitsLangHooked) return;
    window.__siteVisitsLangHooked = true;
    var orig = window.applyLang;
    if (typeof orig === 'function') {
      window.applyLang = function (l) {
        orig(l);
        window.setTimeout(paint, 0);
      };
    }
    document.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest('#langToggle')) {
        window.setTimeout(paint, 0);
      }
    });
  }

  function hookFooter() {
    var footer = document.querySelector('.footer');
    if (!footer || footer.__siteVisitsObs) return;
    footer.__siteVisitsObs = true;
    var timer = null;
    var obs = new MutationObserver(function () {
      if (timer) clearTimeout(timer);
      timer = setTimeout(paint, 0);
    });
    obs.observe(footer, { childList: true, subtree: false });
  }

  function getRosterIdentity() {
    try {
      var id = (
        localStorage.getItem('exportSavedEmpId') ||
        localStorage.getItem('savedEmpId') ||
        localStorage.getItem('importSavedEmpId') ||
        ''
      ).trim();
      var name = (
        localStorage.getItem('exportSavedEmpName') ||
        localStorage.getItem('savedEmpName') ||
        localStorage.getItem('importSavedEmpName') ||
        ''
      ).trim();
      if (!id || !/^\d+$/.test(id)) return null;
      return { id: id, name: name };
    } catch (e) {
      return null;
    }
  }

  function pagePathLabel() {
    try {
      var p = location.pathname || '/';
      if (/\/alumni(\/|$)/.test(p)) return 'alumni';
      if (/\/training(\/|$)/.test(p)) return 'training';
      if (/\/my-schedules(\/|$)/.test(p)) return 'my-schedules';
      if (/\/import(\/|$)/.test(p)) return 'import';
      if (/\/date\//.test(p)) return 'roster';
      return 'home';
    } catch (e) {
      return 'site';
    }
  }

  function screenKey() {
    var w = Math.min(Number(screen.width) || 0, Number(screen.height) || 0);
    var h = Math.max(Number(screen.width) || 0, Number(screen.height) || 0);
    var dpr = Math.round((Number(window.devicePixelRatio) || 1) * 10) / 10;
    return { w: w, h: h, dpr: dpr, key: w + 'x' + h + '@' + dpr };
  }

  function guessIphoneModel() {
    // Approximate marketing names — Safari hides the exact model in UA.
    var s = screenKey();
    var map = {
      '320x568@2': 'iPhone SE (1st)',
      '375x667@2': 'iPhone SE / 8',
      '414x736@3': 'iPhone 8 Plus',
      '375x812@3': 'iPhone X / XS / 11 Pro',
      '414x896@2': 'iPhone 11 / XR',
      '414x896@3': 'iPhone 11 Pro Max / XS Max',
      '360x780@3': 'iPhone 12/13 mini',
      '390x844@3': 'iPhone 12 / 13 / 14',
      '393x852@3': 'iPhone 14 Pro / 15 / 16',
      '428x926@3': 'iPhone 12–14 Pro Max / 15 Plus',
      '430x932@3': 'iPhone 16 Plus',
      '402x874@3': 'iPhone 16 Pro',
      '440x956@3': 'iPhone 16 Pro Max',
      '420x912@3': 'iPhone 17',
      '446x970@3': 'iPhone 17 Pro Max'
    };
    if (map[s.key]) return map[s.key];
    var loose = {
      '320x568': 'iPhone SE (1st)',
      '375x667': 'iPhone SE / 8',
      '414x736': 'iPhone 8 Plus',
      '375x812': 'iPhone X–11 Pro',
      '414x896': 'iPhone 11 / XR family',
      '360x780': 'iPhone mini',
      '390x844': 'iPhone 12–14',
      '393x852': 'iPhone 14 Pro / 15 / 16',
      '428x926': 'iPhone Pro Max / Plus',
      '430x932': 'iPhone 16 Plus',
      '402x874': 'iPhone 16 Pro',
      '440x956': 'iPhone 16 Pro Max'
    };
    return loose[s.w + 'x' + s.h] || '';
  }

  function guessIpadModel() {
    var s = screenKey();
    var map = {
      '768x1024@2': 'iPad',
      '810x1080@2': 'iPad 10th',
      '820x1180@2': 'iPad Air',
      '834x1112@2': 'iPad Air / Pro 10.5',
      '834x1194@2': 'iPad Pro 11',
      '1024x1366@2': 'iPad Pro 12.9'
    };
    return map[s.key] || 'iPad';
  }

  function parseAndroidModel(ua) {
    var m = ua.match(/Android[^;]*;\s*([^;)]+?)(?:\s+Build|\s*\)|;)/i);
    if (!m) return '';
    var model = String(m[1] || '').trim().replace(/\s+Build.*$/i, '').trim();
    if (!model || /^(wv|Mobile|Linux)$/i.test(model)) return '';
    return model.slice(0, 48);
  }

  function parseWindowsModel(ua) {
    if (/Windows NT 10\.0/i.test(ua)) return 'Windows 10/11';
    if (/Windows NT 6\.3/i.test(ua)) return 'Windows 8.1';
    if (/Windows NT 6\.1/i.test(ua)) return 'Windows 7';
    return 'Windows';
  }

  function detectDeviceInfoSync() {
    var info = { device: 'Other', model: '' };
    try {
      var ua = String(navigator.userAgent || '');
      var touch = Number(navigator.maxTouchPoints || 0);
      var coarse = false;
      try {
        coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
      } catch (e1) {}

      if (/iPhone/i.test(ua)) {
        info.device = 'iPhone';
        info.model = guessIphoneModel() || 'iPhone';
        return info;
      }
      if (/iPad/i.test(ua) || (navigator.platform === 'MacIntel' && touch > 1)) {
        info.device = 'iPad';
        info.model = guessIpadModel() || 'iPad';
        return info;
      }
      if (/Android/i.test(ua)) {
        var androidModel = parseAndroidModel(ua);
        if (/Mobile/i.test(ua) || (coarse && touch > 0)) {
          info.device = 'Android';
          info.model = androidModel || 'Android';
        } else {
          info.device = 'Android Tablet';
          info.model = androidModel || 'Android Tablet';
        }
        return info;
      }
      if (/Windows Phone|IEMobile/i.test(ua)) {
        info.device = 'Windows Phone';
        info.model = 'Windows Phone';
        return info;
      }
      if (/Windows NT/i.test(ua)) {
        info.device = 'Windows';
        info.model = parseWindowsModel(ua);
        return info;
      }
      if (/Mac OS X|Macintosh/i.test(ua)) {
        info.device = 'Mac';
        info.model = 'Mac';
        return info;
      }
      if (/CrOS/i.test(ua)) {
        info.device = 'Chromebook';
        info.model = 'Chromebook';
        return info;
      }
      if (/Linux/i.test(ua)) {
        info.device = touch > 0 || coarse ? 'Linux Tablet' : 'Linux';
        info.model = info.device;
        return info;
      }
      if (coarse || touch > 1) {
        info.device = 'Mobile';
        info.model = 'Mobile';
      }
    } catch (e) {}
    return info;
  }

  function detectDeviceInfo() {
    var info = detectDeviceInfoSync();
    try {
      if (navigator.userAgentData && typeof navigator.userAgentData.getHighEntropyValues === 'function') {
        return navigator.userAgentData
          .getHighEntropyValues(['model', 'platform', 'platformVersion'])
          .then(function (hints) {
            var hintModel = String((hints && hints.model) || '').trim();
            if (hintModel && hintModel !== 'Unknown' && hintModel !== 'K') {
              info.model = hintModel;
            }
            var plat = String((hints && hints.platform) || '').toLowerCase();
            if (plat.indexOf('android') >= 0 && info.device.indexOf('Android') < 0) {
              info.device = 'Android';
            } else if (plat.indexOf('windows') >= 0) {
              info.device = 'Windows';
              if (!info.model || info.model === 'Windows') {
                var ver = String((hints && hints.platformVersion) || '').split('.')[0];
                info.model = ver ? 'Windows ' + ver : info.model;
              }
            } else if (plat === 'macos') {
              info.device = 'Mac';
            }
            return info;
          })
          .catch(function () {
            return info;
          });
      }
    } catch (e) {}
    return Promise.resolve(info);
  }

  var VISIT_LOG_NS = 'roster-site-visits';
  var VISIT_LOG_KEY = '8bb6b7c45e0e18fef1b758bc6dc85d7b1bac11b42e2e53faab3b88595572189d';
  var VISIT_LOG_URL = 'https://mantledb.sh/v2/' + VISIT_LOG_NS + '/index';
  var PHONE_LOG_URL = 'https://mantledb.sh/v2/' + VISIT_LOG_NS + '/phones';
  // v4: also log guests without saved employee id (once/day per device).
  var VISIT_LOGGED_KEY = 'rosterVisitLoggedDayV4';
  var GUEST_ID_KEY = 'rosterVisitGuestId';
  var PHONE_PROMPT_KEY = 'rosterPhonePromptDone';

  function docsBasePath() {
    try {
      var m = String(location.pathname || '').match(/^(.*?\/docs\/)/);
      return m ? m[1] : '/docs/';
    } catch (e) {
      return '/docs/';
    }
  }

  function cleanEmployeeName(name) {
    return String(name || '')
      .replace(/\s*[-–—]\s*\d+\s*$/, '')
      .trim();
  }

  function resolveEmployeeName(id, fallbackName) {
    var known = cleanEmployeeName(fallbackName);
    if (known) return Promise.resolve(known);
    var empId = String(id || '').trim();
    if (!empId || !/^\d+$/.test(empId)) return Promise.resolve('');
    var base = docsBasePath();
    var urls = [
      base + 'schedules/' + encodeURIComponent(empId) + '.json',
      base + 'import/schedules/' + encodeURIComponent(empId) + '.json'
    ];
    function tryNext(i) {
      if (i >= urls.length) return Promise.resolve('');
      return fetch(urls[i] + '?ts=' + Date.now(), { cache: 'no-store' })
        .then(function (r) {
          if (!r.ok) throw new Error('miss');
          return r.json();
        })
        .then(function (json) {
          var n = cleanEmployeeName(json && json.name);
          if (n) return n;
          return tryNext(i + 1);
        })
        .catch(function () {
          return tryNext(i + 1);
        });
    }
    return tryNext(0);
  }

  function getOrCreateGuestId() {
    try {
      var existing = String(localStorage.getItem(GUEST_ID_KEY) || '').trim();
      if (/^g-[a-z0-9]+$/i.test(existing)) return existing;
    } catch (e) {}
    var id = 'g-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
    try { localStorage.setItem(GUEST_ID_KEY, id); } catch (e2) {}
    return id;
  }

  function visitHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-Mantle-Key': VISIT_LOG_KEY
    };
  }

  function postVisitRow(row, stamp) {
    var headers = visitHeaders();
    return fetch(VISIT_LOG_URL + '?ts=' + Date.now(), { headers: headers, cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('read');
        return r.json();
      })
      .then(function (cur) {
        var list = Array.isArray(cur && cur.log) ? cur.log.slice() : [];
        var kept = list.filter(function (item) {
          return !(item && String(item.id) === String(row.id) && String(item.day) === String(row.day));
        });
        kept.unshift(row);
        if (kept.length > 500) kept.length = 500;
        return fetch(VISIT_LOG_URL, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({ log: kept })
        }).then(function (r) {
          if (!r.ok) throw new Error('write');
          try { localStorage.setItem(VISIT_LOGGED_KEY, stamp); } catch (e2) {}
        });
      });
  }

  function logSiteVisit() {
    var ident = getRosterIdentity();
    var keys = muscatYmd();
    var isGuest = !ident;
    var visitId = isGuest ? getOrCreateGuestId() : ident.id;
    var stamp = keys.day + ':' + visitId;
    try {
      if (localStorage.getItem(VISIT_LOGGED_KEY) === stamp) return;
    } catch (e) {}

    var namePromise = isGuest
      ? Promise.resolve('')
      : resolveEmployeeName(ident.id, ident.name);

    Promise.all([detectDeviceInfo(), namePromise])
      .then(function (pair) {
        var dev = pair[0];
        var resolvedName = pair[1] || '';
        if (!isGuest && resolvedName) {
          try {
            if (!localStorage.getItem('exportSavedEmpName') && !localStorage.getItem('savedEmpName') && !localStorage.getItem('importSavedEmpName')) {
              localStorage.setItem('exportSavedEmpName', resolvedName);
              localStorage.setItem('savedEmpName', resolvedName);
            }
          } catch (e3) {}
        }
        return postVisitRow({
          id: visitId,
          name: resolvedName || '',
          guest: !!isGuest,
          day: keys.day,
          at: Date.now(),
          page: pagePathLabel(),
          device: (dev && dev.device) || 'Other',
          model: (dev && dev.model) || ''
        }, stamp);
      })
      .catch(function () {});
  }

  function phonePromptDoneFor(empId) {
    try {
      var raw = String(localStorage.getItem(PHONE_PROMPT_KEY) || '');
      var list = raw ? raw.split(',').map(function (x) { return x.trim(); }) : [];
      return list.indexOf(String(empId)) >= 0;
    } catch (e) {
      return false;
    }
  }

  function markPhonePromptDone(empId) {
    try {
      var id = String(empId || '').trim();
      if (!id) return;
      var raw = String(localStorage.getItem(PHONE_PROMPT_KEY) || '');
      var list = raw ? raw.split(',').map(function (x) { return x.trim(); }).filter(Boolean) : [];
      if (list.indexOf(id) < 0) list.push(id);
      localStorage.setItem(PHONE_PROMPT_KEY, list.join(','));
    } catch (e) {}
  }

  function normalizeOmanPhone(raw) {
    var p = String(raw || '').replace(/\D/g, '');
    if (p.startsWith('00')) p = p.slice(2);
    if (p.length === 8) p = '968' + p;
    return p;
  }

  function isValidOmanMobile(raw) {
    return /^968[79]\d{7}$/.test(normalizeOmanPhone(raw));
  }

  function ensurePhonePromptCss() {
    if (document.getElementById('rosterPhonePromptCss')) return;
    var style = document.createElement('style');
    style.id = 'rosterPhonePromptCss';
    style.textContent = [
      '.rosterPhoneSheet{position:fixed;inset:0;z-index:10050;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(15,23,42,.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);}',
      '.rosterPhoneSheet.open{display:flex;}',
      '.rosterPhoneCard{width:min(100%,400px);background:linear-gradient(180deg,#fff,#f8fbff);border:1px solid rgba(148,163,184,.28);border-radius:20px;padding:18px 16px 14px;box-shadow:0 24px 60px rgba(15,23,42,.28);text-align:center;}',
      '.rosterPhoneCard h2{margin:0 0 8px;font-size:17px;font-weight:900;color:#0f172a;}',
      '.rosterPhoneCard p{margin:0 0 14px;font-size:13px;line-height:1.55;color:#475569;font-weight:600;}',
      '.rosterPhoneActions{display:grid;grid-template-columns:1fr 1fr;gap:10px;}',
      '.rosterPhoneActions button,.rosterPhoneForm button{min-height:44px;border:0;border-radius:14px;font:inherit;font-weight:800;cursor:pointer;}',
      '.rosterPhoneYes{background:#2563eb;color:#fff;}',
      '.rosterPhoneNo{background:#e2e8f0;color:#334155;}',
      '.rosterPhoneForm{display:none;text-align:right;margin-top:4px;}',
      '.rosterPhoneForm.open{display:block;}',
      '.rosterPhoneForm label{display:block;font-size:12px;font-weight:800;color:#334155;margin-bottom:6px;}',
      '.rosterPhoneForm input{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:12px;padding:12px;font:inherit;font-size:16px;direction:ltr;text-align:left;margin-bottom:10px;}',
      '.rosterPhoneForm .hint{font-size:11px;color:#64748b;margin:-4px 0 12px;font-weight:600;}',
      '.rosterPhoneSave{width:100%;background:#0f766e;color:#fff;margin-bottom:8px;}',
      '.rosterPhoneCancel{width:100%;background:#e2e8f0;color:#334155;}',
      '.rosterPhoneMsg{min-height:18px;margin-top:8px;font-size:12px;font-weight:800;color:#0f766e;}',
      '.rosterPhoneMsg.err{color:#dc2626;}'
    ].join('');
    document.head.appendChild(style);
  }

  function savePhoneToMantle(row) {
    var headers = visitHeaders();
    return fetch(PHONE_LOG_URL + '?ts=' + Date.now(), { headers: headers, cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('read');
        return r.json().catch(function () { return {}; });
      })
      .then(function (cur) {
        var list = Array.isArray(cur && cur.phones) ? cur.phones.slice() : [];
        var kept = list.filter(function (item) {
          return !(item && String(item.id) === String(row.id));
        });
        kept.unshift(row);
        if (kept.length > 800) kept.length = 800;
        return fetch(PHONE_LOG_URL, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({ phones: kept })
        }).then(function (r) {
          if (!r.ok) throw new Error('write');
        });
      });
  }

  function openPhonePrompt() {
    var ident = getRosterIdentity();
    if (!ident) return;
    if (phonePromptDoneFor(ident.id)) return;
    try {
      if (/\/desk-log(\/|$)/.test(location.pathname || '')) return;
    } catch (e0) {}

    ensurePhonePromptCss();
    var sheet = document.getElementById('rosterPhoneSheet');
    if (!sheet) {
      sheet = document.createElement('div');
      sheet.id = 'rosterPhoneSheet';
      sheet.className = 'rosterPhoneSheet';
      sheet.setAttribute('aria-hidden', 'true');
      sheet.innerHTML =
        '<div class="rosterPhoneCard" role="dialog" aria-labelledby="rosterPhoneTitle">' +
        '<div id="rosterPhoneAsk">' +
        '<h2 id="rosterPhoneTitle">إضافة رقم الهاتف</h2>' +
        '<p>رقم هاتفك موجود في هاتف المشرف، هل ترغب في إضافته في الموقع؟</p>' +
        '<div class="rosterPhoneActions">' +
        '<button type="button" class="rosterPhoneYes" id="rosterPhoneYes">نعم</button>' +
        '<button type="button" class="rosterPhoneNo" id="rosterPhoneNo">لا</button>' +
        '</div></div>' +
        '<div class="rosterPhoneForm" id="rosterPhoneForm">' +
        '<h2>أدخل رقم هاتفك النقال</h2>' +
        '<label for="rosterPhoneInput">رقم الجوال</label>' +
        '<input id="rosterPhoneInput" type="tel" inputmode="tel" autocomplete="tel" maxlength="15" placeholder="9XXXXXXX أو 9689XXXXXXX" dir="ltr">' +
        '<div class="hint">يُحفظ للاطلاع من سجل الزوار فقط (للمشرف).</div>' +
        '<button type="button" class="rosterPhoneSave" id="rosterPhoneSave">حفظ الرقم</button>' +
        '<button type="button" class="rosterPhoneCancel" id="rosterPhoneCancel">إلغاء</button>' +
        '<div class="rosterPhoneMsg" id="rosterPhoneMsg"></div>' +
        '</div></div>';
      document.body.appendChild(sheet);

      document.getElementById('rosterPhoneNo').addEventListener('click', function () {
        var cur = getRosterIdentity();
        if (cur) markPhonePromptDone(cur.id);
        closePhonePrompt();
      });
      document.getElementById('rosterPhoneYes').addEventListener('click', function () {
        document.getElementById('rosterPhoneAsk').style.display = 'none';
        document.getElementById('rosterPhoneForm').classList.add('open');
        setTimeout(function () {
          var inp = document.getElementById('rosterPhoneInput');
          if (inp) inp.focus();
        }, 40);
      });
      document.getElementById('rosterPhoneCancel').addEventListener('click', function () {
        closePhonePrompt();
      });
      document.getElementById('rosterPhoneSave').addEventListener('click', function () {
        var cur = getRosterIdentity();
        if (!cur) return;
        var msg = document.getElementById('rosterPhoneMsg');
        var input = document.getElementById('rosterPhoneInput');
        var phone = normalizeOmanPhone(input && input.value);
        if (!isValidOmanMobile(phone)) {
          if (msg) {
            msg.className = 'rosterPhoneMsg err';
            msg.textContent = 'أدخل رقم جوال عماني صحيح (يبدأ بـ 7 أو 9).';
          }
          return;
        }
        if (msg) {
          msg.className = 'rosterPhoneMsg';
          msg.textContent = 'جاري الحفظ…';
        }
        var saveBtn = document.getElementById('rosterPhoneSave');
        if (saveBtn) saveBtn.disabled = true;
        resolveEmployeeName(cur.id, cur.name).then(function (name) {
          return savePhoneToMantle({
            id: cur.id,
            name: name || cur.name || '',
            phone: phone,
            at: Date.now()
          });
        }).then(function () {
          markPhonePromptDone(cur.id);
          try { localStorage.setItem('exportSavedPhone', phone); } catch (e) {}
          if (msg) {
            msg.className = 'rosterPhoneMsg';
            msg.textContent = 'تم حفظ رقمك بنجاح ✅';
          }
          setTimeout(closePhonePrompt, 900);
        }).catch(function () {
          if (saveBtn) saveBtn.disabled = false;
          if (msg) {
            msg.className = 'rosterPhoneMsg err';
            msg.textContent = 'تعذر الحفظ، حاول مرة أخرى.';
          }
        });
      });
      sheet.addEventListener('click', function (e) {
        if (e.target === sheet) closePhonePrompt();
      });
    }

    sheet.classList.add('open');
    sheet.setAttribute('aria-hidden', 'false');
    var ask = document.getElementById('rosterPhoneAsk');
    var form = document.getElementById('rosterPhoneForm');
    var msg = document.getElementById('rosterPhoneMsg');
    var input = document.getElementById('rosterPhoneInput');
    var saveBtn = document.getElementById('rosterPhoneSave');
    if (ask) ask.style.display = '';
    if (form) form.classList.remove('open');
    if (msg) { msg.textContent = ''; msg.className = 'rosterPhoneMsg'; }
    if (input) input.value = '';
    if (saveBtn) saveBtn.disabled = false;
  }

  function closePhonePrompt() {
    var sheet = document.getElementById('rosterPhoneSheet');
    if (!sheet) return;
    sheet.classList.remove('open');
    sheet.setAttribute('aria-hidden', 'true');
  }

  function maybeAskPhone() {
    var ident = getRosterIdentity();
    if (!ident) return;
    if (phonePromptDoneFor(ident.id)) return;
    openPhonePrompt();
  }

  function boot() {
    if (booted) return;
    booted = true;
    var keys = muscatYmd();
    readPersisted(keys);
    hookLang();
    hookFooter();
    paint();
    loadCounts().then(function () {
      if (cached.day == null || cached.month == null) {
        return new Promise(function (r) { setTimeout(r, 800); }).then(loadCounts);
      }
    });
    // Visit log (staff or guest, once/day) — delayed so it never blocks the counter UI.
    window.setTimeout(logSiteVisit, 1200);
    window.setTimeout(maybeAskPhone, 2200);
    window.setTimeout(paint, 250);
    window.setTimeout(paint, 900);
    window.setTimeout(function () {
      if (cached.day == null || cached.month == null) loadCounts();
    }, 1800);
  }

  window.rosterSiteVisits = {
    refresh: function () {
      paint();
      return loadCounts();
    },
    setLang: paint
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
