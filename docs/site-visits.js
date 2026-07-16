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

  function ensureHost() {
    removeLegacyFooterRow();
    var host = document.getElementById('siteVisitsHost');
    if (host) return host;

    var footer = document.querySelector('.footer');
    if (!footer || !footer.parentNode) return null;

    host = document.createElement('div');
    host.id = 'siteVisitsHost';
    host.className = 'siteVisitsHost';
    host.style.cssText =
      'margin:-4px 0 10px;padding:0 12px;text-align:center;font-size:12px;' +
      'line-height:1.9;color:#94a3b8;font-family:inherit;';
    host.innerHTML =
      '<strong style="color:#475569;font-size:13px;" id="siteVisitsDayLabel"></strong> ' +
      '<strong style="color:#1e40af;" id="siteVisitsDay">--</strong>' +
      '<span aria-hidden="true"> · </span>' +
      '<strong style="color:#475569;font-size:13px;" id="siteVisitsMonthLabel"></strong> ' +
      '<strong style="color:#1e40af;" id="siteVisitsMonth">--</strong>';

    if (footer.nextSibling) footer.parentNode.insertBefore(host, footer.nextSibling);
    else footer.parentNode.appendChild(host);
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

  function boot() {
    if (booted) return;
    booted = true;
    var keys = muscatYmd();
    readPersisted(keys);
    hookLang();
    paint();
    loadCounts().then(function () {
      if (cached.day == null || cached.month == null) {
        return new Promise(function (r) { setTimeout(r, 800); }).then(loadCounts);
      }
    });
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
