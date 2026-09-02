/**
 * Banner date language — single source of truth.
 * Watches html[lang] / body.ar so weekday + month follow the UI language
 * even when generated pages forget to call rosterSyncHeaderDate.
 */
(function () {
  'use strict';
  if (window.__rosterDateI18n) return;
  window.__rosterDateI18n = true;

  var MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  var MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  var DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var DAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  var lastIso = '';
  var lastLang = '';
  var painting = false;

  function injectCss() {
    if (document.getElementById('date-banner-i18n-css')) return;
    var style = document.createElement('style');
    style.id = 'date-banner-i18n-css';
    style.textContent =
      'body.ar .header.homeDateSplit .dateTagSide,' +
      'html[lang="ar"] .header.homeDateSplit .dateTagSide{' +
      'direction:rtl;unicode-bidi:isolate;}';
    (document.head || document.documentElement).appendChild(style);
  }

  function langIsAr(override) {
    var raw = override;
    if (raw == null || raw === '') {
      if (document.body && document.body.classList.contains('ar')) return true;
      raw =
        document.documentElement.getAttribute('lang') ||
        (typeof LANG !== 'undefined' ? LANG : '') ||
        '';
      if (!raw) {
        try { raw = localStorage.getItem('rosterLang') || ''; } catch (e) { raw = ''; }
      }
    }
    raw = String(raw).toLowerCase();
    return raw === 'ar' || raw.indexOf('ar-') === 0;
  }

  function muscatTodayIso() {
    var now = new Date();
    var muscat = new Date(now.getTime() + (4 * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
    return muscat.getFullYear() + '-' +
      String(muscat.getMonth() + 1).padStart(2, '0') + '-' +
      String(muscat.getDate()).padStart(2, '0');
  }

  function currentIso(explicit) {
    if (explicit && /^\d{4}-\d{2}-\d{2}$/.test(explicit)) return explicit;
    var picker = document.getElementById('datePicker');
    if (picker && picker.value && /^\d{4}-\d{2}-\d{2}$/.test(picker.value)) return picker.value;
    var tag = document.getElementById('dateTag');
    var stored = tag && tag.getAttribute('data-iso');
    if (stored && /^\d{4}-\d{2}-\d{2}$/.test(stored)) return stored;
    if (lastIso && /^\d{4}-\d{2}-\d{2}$/.test(lastIso)) return lastIso;
    var path = window.location.pathname || '';
    var m = path.match(/(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
    return muscatTodayIso();
  }

  function parseIso(iso) {
    var p = String(iso || '').split('-');
    if (p.length !== 3) return null;
    var y = parseInt(p[0], 10);
    var mo = parseInt(p[1], 10);
    var d = parseInt(p[2], 10);
    if (!y || !mo || !d) return null;
    return { y: y, mo: mo, d: d, utc: new Date(Date.UTC(y, mo - 1, d)) };
  }

  function weekdayLabel(iso, ar) {
    var parts = parseIso(iso);
    if (!parts || isNaN(parts.utc.getTime())) return '';
    return (ar ? DAYS_AR : DAYS_EN)[parts.utc.getUTCDay()] || '';
  }

  function monthLabel(iso, ar) {
    var parts = parseIso(iso);
    if (!parts) return '';
    return (ar ? MONTHS_AR : MONTHS_EN)[parts.mo - 1] || '';
  }

  function dayLabel(iso) {
    var parts = parseIso(iso);
    return parts ? String(parts.d) : '';
  }

  function longLabel(iso, ar) {
    var parts = parseIso(iso);
    if (!parts) return iso || '';
    return dayLabel(iso) + ' ' + monthLabel(iso, ar) + ' ' + parts.y;
  }

  function paint(iso, langOverride) {
    iso = currentIso(iso);
    if (!iso) return;
    var ar = langIsAr(langOverride);
    var lang = ar ? 'ar' : 'en';
    if (painting) return;
    if (iso === lastIso && lang === lastLang) {
      var weekEl = document.getElementById('dateTagWeek');
      if (weekEl && weekEl.textContent === weekdayLabel(iso, ar)) return;
    }
    painting = true;
    lastIso = iso;
    lastLang = lang;

    var tag = document.getElementById('dateTag');
    if (tag) tag.setAttribute('data-iso', iso);

    var dateWeek = document.getElementById('dateTagWeek');
    var dateDay = document.getElementById('dateTagDay');
    var dateMonth = document.getElementById('dateTagMonth');
    if (dateDay || dateWeek || dateMonth) {
      if (dateWeek) dateWeek.textContent = weekdayLabel(iso, ar);
      if (dateDay) dateDay.textContent = dayLabel(iso);
      if (dateMonth) dateMonth.textContent = monthLabel(iso, ar);
    } else if (tag) {
      var dateLbl = document.getElementById('dateTagLabel');
      var text = longLabel(iso, ar);
      if (dateLbl) dateLbl.textContent = text;
      else if (!tag.querySelector('.dateTagMain')) tag.textContent = text;
    }
    painting = false;
  }

  window.rosterSyncHeaderDate = function (iso, langOverride) {
    paint(iso, langOverride);
  };
  window.rosterPaintHeaderDate = paint;

  function hookApplyLang() {
    if (typeof window.applyLang !== 'function' || window.applyLang._dateI18nHooked) return;
    var orig = window.applyLang;
    function wrapped(lang) {
      orig.apply(this, arguments);
      paint(null, lang);
    }
    wrapped._dateI18nHooked = true;
    if (orig._kashidaHooked) wrapped._kashidaHooked = true;
    window.applyLang = wrapped;
  }

  function observe() {
    if (!window.MutationObserver) return;
    var obs = new MutationObserver(function () {
      paint();
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['lang', 'dir', 'class'] });
    if (document.body) {
      obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }
  }

  function bindPicker() {
    var picker = document.getElementById('datePicker');
    if (!picker || picker._dateI18nBound) return;
    picker._dateI18nBound = true;
    picker.addEventListener('change', function () {
      if (picker.value) paint(picker.value);
    });
  }

  function boot() {
    injectCss();
    hookApplyLang();
    bindPicker();
    paint();
    observe();
    document.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest && e.target.closest('#langToggle, .langToggle');
      if (!btn) return;
      setTimeout(paint, 0);
      setTimeout(paint, 60);
    }, true);
    document.addEventListener('rosterLangChanged', function (ev) {
      var lang = ev && ev.detail && ev.detail.lang;
      paint(null, lang);
    });
    var tries = 0;
    var timer = setInterval(function () {
      tries += 1;
      hookApplyLang();
      bindPicker();
      var week = document.getElementById('dateTagWeek');
      var month = document.getElementById('dateTagMonth');
      var ar = langIsAr();
      var iso = currentIso();
      var weekWrong = week && weekdayLabel(iso, ar) && week.textContent !== weekdayLabel(iso, ar);
      var monthWrong = month && monthLabel(iso, ar) && month.textContent !== monthLabel(iso, ar);
      if (weekWrong || monthWrong) paint();
      if (tries >= 24) clearInterval(timer);
    }, 200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
