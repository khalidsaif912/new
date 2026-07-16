/**
 * Site visitor counts (today + this month).
 * Mounted outside `.footer` so applyLang innerHTML rewrites cannot wipe the numbers.
 */
(function () {
  'use strict';

  var NS = 'roster-site-new';
  var API = 'https://api.counterapi.dev/v1/' + NS + '/';
  var COUNTED_KEY = 'rosterVisitCountedDay';
  var CACHE_KEY = 'rosterVisitCountsV1';
  var cached = { day: null, month: null, dayKey: '', monthKey: '' };
  var booted = false;

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
    try {
      return String(Math.floor(num));
    } catch (e) {
      return String(Math.floor(num));
    }
  }

  function readPersisted(keys) {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
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

  function fetchCount(name, doUp) {
    var url = API + name + (doUp ? '/up' : '');
    return fetch(url, { cache: 'no-store', mode: 'cors' })
      .then(function (res) {
        if (res.ok) return res.json();
        if (res.status === 400 || res.status === 404) return { count: doUp ? null : 0 };
        throw new Error('HTTP ' + res.status);
      })
      .then(function (data) {
        return data && typeof data.count === 'number' ? data.count : null;
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
    host.setAttribute('dir', 'auto');
    host.style.cssText =
      'margin:-4px 0 10px;padding:0 12px;text-align:center;font-size:12px;' +
      'line-height:1.9;color:#94a3b8;font-family:inherit;';
    host.innerHTML =
      '<strong style="color:#475569;font-size:13px;" id="siteVisitsDayLabel"></strong> ' +
      '<strong style="color:#1e40af;" id="siteVisitsDay">--</strong>' +
      '<span aria-hidden="true"> · </span>' +
      '<strong style="color:#475569;font-size:13px;" id="siteVisitsMonthLabel"></strong> ' +
      '<strong style="color:#1e40af;" id="siteVisitsMonth">--</strong>';

    if (footer.nextSibling) {
      footer.parentNode.insertBefore(host, footer.nextSibling);
    } else {
      footer.parentNode.appendChild(host);
    }
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
    if (dayEl && cached.day != null && !isNaN(cached.day)) {
      dayEl.textContent = formatCount(cached.day);
    }
    if (monthEl && cached.month != null && !isNaN(cached.month)) {
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
    var keys = muscatYmd();
    var dayName = 'day-' + keys.day;
    var monthName = 'month-' + keys.month;
    var shouldUp = !alreadyCounted(keys.day);

    var dayPromise = fetchCount(dayName, shouldUp).catch(function () { return null; });
    var monthPromise = fetchCount(monthName, shouldUp).catch(function () { return null; });

    return Promise.all([dayPromise, monthPromise]).then(function (vals) {
      var dayVal = vals[0];
      var monthVal = vals[1];
      if (dayVal != null) cached.day = dayVal;
      if (monthVal != null) cached.month = monthVal;
      cached.dayKey = keys.day;
      cached.monthKey = keys.month;
      if (shouldUp && (dayVal != null || monthVal != null)) markCounted(keys.day);
      if (cached.day != null || cached.month != null) persistCounts(keys);
      paint();
      return vals;
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
    loadCounts()
      .catch(function () { paint(); })
      .then(function () {
        // Retry once if numbers still missing (slow network / first counter create).
        if (cached.day == null || cached.month == null) {
          return new Promise(function (resolve) { setTimeout(resolve, 700); }).then(loadCounts);
        }
      })
      .catch(function () { paint(); });
    window.setTimeout(paint, 300);
    window.setTimeout(paint, 1000);
    window.setTimeout(function () {
      if (cached.day == null || cached.month == null) loadCounts().catch(function () {});
    }, 2000);
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
