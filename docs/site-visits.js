/**
 * Site visitor counts (today + this month) for the roster footer.
 * Uses CounterAPI (no backend). Counts once per browser per Muscat calendar day.
 */
(function () {
  'use strict';

  var NS = 'roster-site-new';
  var API = 'https://api.counterapi.dev/v1/' + NS + '/';
  var STORAGE_KEY = 'rosterVisitCountedDay';
  var cached = { day: null, month: null };
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
    if (!isFinite(num) || num < 0) return '—';
    try {
      return num.toLocaleString(lang() === 'ar' ? 'ar-OM' : 'en-US');
    } catch (e) {
      return String(Math.floor(num));
    }
  }

  function fetchCount(name, doUp) {
    var url = API + encodeURIComponent(name) + (doUp ? '/up' : '');
    return fetch(url, { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        return data && typeof data.count === 'number' ? data.count : null;
      });
  }

  function ensureRow() {
    var footer = document.querySelector('.footer');
    if (!footer) return null;
    var row = document.getElementById('siteVisitsRow');
    if (row) return row;

    row = document.createElement('div');
    row.id = 'siteVisitsRow';
    row.className = 'siteVisitsRow';
    row.innerHTML =
      '<strong style="color:#475569;font-size:13px;" id="siteVisitsDayLabel"></strong> ' +
      '<strong style="color:#1e40af;" id="siteVisitsDay">—</strong>' +
      '<span aria-hidden="true"> · </span>' +
      '<strong style="color:#475569;font-size:13px;" id="siteVisitsMonthLabel"></strong> ' +
      '<strong style="color:#1e40af;" id="siteVisitsMonth">—</strong>';

    var texture = footer.querySelector('.bgTextureShuffleWrap');
    if (texture) {
      footer.insertBefore(row, texture);
    } else {
      footer.appendChild(row);
    }
    return row;
  }

  function paintLabels() {
    var pack = I18N[lang()] || I18N.en;
    var dayLbl = document.getElementById('siteVisitsDayLabel');
    var monthLbl = document.getElementById('siteVisitsMonthLabel');
    if (dayLbl) dayLbl.textContent = pack.day;
    if (monthLbl) monthLbl.textContent = pack.month;
  }

  function paintCounts() {
    var dayEl = document.getElementById('siteVisitsDay');
    var monthEl = document.getElementById('siteVisitsMonth');
    if (dayEl && cached.day != null) dayEl.textContent = formatCount(cached.day);
    if (monthEl && cached.month != null) monthEl.textContent = formatCount(cached.month);
  }

  function paint() {
    if (!ensureRow()) return;
    paintLabels();
    paintCounts();
  }

  function alreadyCounted(dayKey) {
    try {
      return localStorage.getItem(STORAGE_KEY) === dayKey;
    } catch (e) {
      return false;
    }
  }

  function markCounted(dayKey) {
    try {
      localStorage.setItem(STORAGE_KEY, dayKey);
    } catch (e) {}
  }

  function loadCounts() {
    var keys = muscatYmd();
    var dayName = 'day-' + keys.day;
    var monthName = 'month-' + keys.month;
    var shouldUp = !alreadyCounted(keys.day);

    return Promise.all([
      fetchCount(dayName, shouldUp),
      fetchCount(monthName, shouldUp)
    ]).then(function (vals) {
      if (vals[0] != null) cached.day = vals[0];
      if (vals[1] != null) cached.month = vals[1];
      if (shouldUp) markCounted(keys.day);
      paint();
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
    hookLang();
    paint();
    loadCounts().catch(function () {
      paint();
    });
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
