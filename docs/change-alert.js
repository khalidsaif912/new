(function () {
  'use strict';

  var HOME_ICON_ID = 'chg-dot';
  var HOME_CARD_ID = 'chg-card';
  var PAGE_BANNER_ID = 'chg-page-banner';
  var STYLE_ID = 'chg-styles';
  /** Same key as absence-alert.js — "0" hides floating alert icons on roster home. */
  var FLOAT_DOTS_KEY = 'rosterFloatingAlertDots';

  function floatingAlertDotsEnabled() {
    return localStorage.getItem(FLOAT_DOTS_KEY) !== '0';
  }

  function toggleWelcomeVsScheduleChip() {
    try {
      var path = window.location.pathname || '';
      var isImport = path.indexOf('/import/') !== -1;
      var empId = '';
      if (isImport) {
        empId = (localStorage.getItem('importSavedEmpId') || '').trim();
      } else {
        empId = (localStorage.getItem('exportSavedEmpId') || localStorage.getItem('savedEmpId') || '').trim();
      }

      var welcomeChip = document.getElementById('welcomeChip');
      var myScheduleBtn = document.getElementById('myScheduleBtn');
      if (!welcomeChip && !myScheduleBtn) return;

      if (!empId) {
        if (welcomeChip) welcomeChip.classList.remove('visible');
        if (myScheduleBtn) myScheduleBtn.hidden = false;
        return;
      }

      if (welcomeChip) welcomeChip.classList.add('visible');
      if (myScheduleBtn) myScheduleBtn.hidden = true;
    } catch (_) {}
  }

  function getLang() {
    var path = window.location.pathname || '';
    if (path.indexOf('/import/') !== -1) {
      return localStorage.getItem('importPrefLang')
        || localStorage.getItem('rosterLang')
        || localStorage.getItem('appLang')
        || 'en';
    }
    return localStorage.getItem('rosterLang')
      || localStorage.getItem('importPrefLang')
      || localStorage.getItem('appLang')
      || 'en';
  }

  function t(key, lang) {
    var dict = {
      ar: {
        changed: 'تم تعديل جدولك',
        details: 'عرض التفاصيل',
        dismiss: 'عدم الإظهار',
        minimize: 'تصغير',
        close: 'إغلاق',
        changedDays: 'أيام متغيرة',
        viewSchedule: 'فتح جدولي',
        noDetails: 'يوجد تحديث في جدولك.',
        updated: 'تحديث',
        changedToday: 'تم تعديل هذا اليوم',
        changedDates: 'الأيام المتغيرة',
        floatDotsOpt: 'إظهار الأيقونة العائمة للتنبيهات (غياب / تغيّر الروستر)'
      },
      en: {
        changed: 'Your schedule changed',
        details: 'View details',
        dismiss: 'Hide',
        minimize: 'Minimize',
        close: 'Close',
        changedDays: 'changed days',
        viewSchedule: 'Open My Schedule',
        noDetails: 'Your roster has been updated.',
        updated: 'Update',
        changedToday: 'This day was changed',
        changedDates: 'Changed dates',
        floatDotsOpt: 'Show floating alert icons (absence / roster changes)'
      }
    };
    return (dict[lang] && dict[lang][key]) || key;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getEmployeeId() {
    var fromUrl = new URLSearchParams(window.location.search).get('emp');
    if (fromUrl && /^\d+$/.test(fromUrl.trim())) return fromUrl.trim();

    var isImport = (window.location.pathname || '').indexOf('/import/') !== -1;
    var saved = isImport
      ? localStorage.getItem('importSavedEmpId')
      : (localStorage.getItem('exportSavedEmpId') || localStorage.getItem('savedEmpId'));
    if (saved && /^\d+$/.test(saved.trim())) return saved.trim();

    return '';
  }

  /** Match generate_and_send.py getSiteRootPath() so /new/docs, /roster-site/, etc. resolve correctly. */
  function getDeployBasePath() {
    if (typeof location === 'undefined') return '';
    if (location.protocol === 'file:') return '';
    var path = location.pathname || '/';
    if (path.indexOf('/roster-site/') !== -1) return '/roster-site';
    if (location.hostname && location.hostname.indexOf('github.io') !== -1) {
      var segs = path.split('/').filter(Boolean);
      if (segs.length >= 2 && segs[1] === 'docs') return '/' + segs[0] + '/docs';
      return segs.length ? '/' + segs[0] : '';
    }
    return '';
  }

  function getBase() {
    var origin = window.location.origin || '';
    var p = getDeployBasePath();
    if (!p) return origin + '/';
    return origin + p + (p.charAt(p.length - 1) === '/' ? '' : '/');
  }

  function onHomePage() {
    var path = window.location.pathname || '';
    var isImport = path.indexOf('/import/') !== -1;
    if (isImport) {
      return /\/import\/?$/.test(path) || /\/import\/index\.html$/.test(path) || /\/import\/date\//.test(path);
    }
    return /\/roster-site\/?$/.test(path) || /\/roster-site\/index\.html$/.test(path) || /\/roster-site\/date\//.test(path) || /^\/$/.test(path) || /\/index\.html$/.test(path) || /\/date\//.test(path);
  }

  function onMySchedulePage() {
    var path = window.location.pathname || '';
    if (path.indexOf('/import/') !== -1) {
      return /\/import\/my-schedules\/index\.html$/.test(path) || /\/import\/my-schedules\/?$/.test(path);
    }
    return /\/roster-site\/my-schedules\/index\.html$/.test(path) || /\/roster-site\/my-schedules\/?$/.test(path) || /\/my-schedules\/index\.html$/.test(path) || /\/my-schedules\/?$/.test(path);
  }

  function fetchJson(url) {
    return fetch(url, { cache: 'no-store' }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    });
  }

  function activeAlert(data) {
    var alerts = (data && data.change_alerts) || {};
    var keys = Object.keys(alerts).sort().reverse();
    for (var i = 0; i < keys.length; i++) {
      var a = alerts[keys[i]];
      if (a && a.is_active) return a;
    }
    return null;
  }

  function formatDiffDate(monthKey, dayNum) {
    var m = String(monthKey || '').match(/^(\d{4})-(\d{2})$/);
    var d = Number(dayNum);
    if (!m || !d) return '';
    var year = Number(m[1]);
    var month = Number(m[2]);
    if (!year || !month) return '';
    return String(year) + '-' + String(month).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  }

  function buildAlertFromDiff(empId, diffData, lang) {
    var rows = (diffData && diffData.changes) || [];
    if (!rows.length) return null;

    function normalizeId(v) {
      var s = String(v == null ? '' : v).trim();
      if (!s) return '';
      if (!/^\d+$/.test(s)) return s;
      var n = String(Number(s));
      return n === 'NaN' ? s : n;
    }

    function extractNumericTokens(text) {
      var s = String(text == null ? '' : text);
      var m = s.match(/\d+/g);
      return m ? m.map(normalizeId) : [];
    }

    function rowMatchesEmployee(row, targetEmpId) {
      var rid = String((row && row.emp_id) || '');
      var rname = String((row && row.name) || '');
      if (!targetEmpId) return false;

      if (rid.indexOf(targetEmpId) !== -1 || rname.indexOf(targetEmpId) !== -1) return true;

      var normTarget = normalizeId(targetEmpId);
      var candidates = extractNumericTokens(rid).concat(extractNumericTokens(rname));
      for (var i = 0; i < candidates.length; i++) {
        if (candidates[i] === normTarget) return true;
      }
      return false;
    }

    var filtered = rows.filter(function (row) {
      return rowMatchesEmployee(row, empId);
    });
    if (!filtered.length) return null;

    var days = filtered.map(function (row) {
      return {
        date: formatDiffDate(diffData.month, row.day),
        old_shift_code: row.v1 || '-',
        new_shift_code: row.v2 || '-'
      };
    });

    var summaryText = lang === 'ar'
      ? ('لديك ' + days.length + ' يوم/أيام بتغييرات في الروستر.')
      : ('You have ' + days.length + ' changed day(s) in the roster.');

    return {
      is_active: true,
      force_show: true,
      change_hash: 'diff_' + String((diffData && diffData.generated_at) || '') + '_' + empId,
      total_changed_days: days.length,
      summary: { ar: summaryText, en: summaryText },
      days: days
    };
  }

  function normName(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function nameMatch(a, b) {
    var na = normName(a), nb = normName(b);
    if (!na || !nb) return false;
    if (na === nb) return true;
    var wa = na.split(' ').filter(function (w) { return w.length > 3; });
    var wb = nb.split(' ').filter(function (w) { return w.length > 3; });
    var common = wa.filter(function (w) { return wb.indexOf(w) !== -1; }).length;
    return common >= 2;
  }

  function findAbsenceDates(empId, empName, absData) {
    var records = (absData && absData.records) || [];
    if (!records.length) return [];
    var cleanName = String(empName || '').replace(/-\s*\d+\s*$/, '').trim();
    var out = [];
    records.forEach(function (rec) {
      var matched = false;
      var nums = (rec && rec.empNos) || [];
      if (empId && nums.indexOf(String(empId)) !== -1) {
        out.push(String(rec.date || ''));
        matched = true;
      }
      if (!matched && cleanName) {
        var names = (rec && rec.names) || [];
        for (var i = 0; i < names.length; i++) {
          if (nameMatch(cleanName, names[i])) {
            out.push(String(rec.date || ''));
            break;
          }
        }
      }
    });
    return Array.from(new Set(out.filter(Boolean))).sort();
  }

  function dismissKey(empId, alert) {
    return 'chgDismissed_' + empId + '_' + ((alert && alert.change_hash) || 'none');
  }
  function pageDismissKey(empId, alert) {
    return 'chgPageDismissed_' + empId + '_' + ((alert && alert.change_hash) || 'none');
  }

  function minimizeKey(empId, alert) {
    return 'chgMinimized_' + empId + '_' + ((alert && alert.change_hash) || 'none');
  }

  function isDismissed(empId, alert) {
    return localStorage.getItem(dismissKey(empId, alert)) === '1';
  }
  function isPageDismissed(empId, alert) {
    return localStorage.getItem(pageDismissKey(empId, alert)) === '1';
  }

  function isMinimized(empId, alert) {
    return localStorage.getItem(minimizeKey(empId, alert)) === '1';
  }

  function markDismissed(empId, alert) {
    localStorage.setItem(dismissKey(empId, alert), '1');
    localStorage.removeItem(minimizeKey(empId, alert));
  }
  function markPageDismissed(empId, alert) {
    localStorage.setItem(pageDismissKey(empId, alert), '1');
  }

  function markMinimized(empId, alert) {
    localStorage.setItem(minimizeKey(empId, alert), '1');
  }

  function clearMinimized(empId, alert) {
    localStorage.removeItem(minimizeKey(empId, alert));
  }

  function myScheduleUrl(empId) {
    var path = window.location.pathname || '';
    var base = path.indexOf('/import/') !== -1
      ? getBase() + 'import/my-schedules/index.html'
      : getBase() + 'my-schedules/index.html';
    return empId ? base + '?emp=' + encodeURIComponent(empId) : base;
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${HOME_ICON_ID} {
        position: fixed;
        left: 16px;
        bottom: 24px;
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255,255,255,.92);
        border: 1px solid rgba(15,23,42,.1);
        border-radius: 16px;
        box-shadow: 0 8px 24px rgba(15,23,42,.14);
        z-index: 100020;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        padding: 0;
      }

      #${HOME_ICON_ID}[hidden] {
        display: none !important;
      }

      #${HOME_ICON_ID} .chg-dot-icon {
        width: 34px;
        height: 34px;
        object-fit: contain;
        display: block;
        filter: drop-shadow(0 2px 6px rgba(0,0,0,.22));
        animation: chgIconPulse 1.8s ease-in-out infinite;
      }
      @keyframes chgIconPulse {
        0%,100% { transform: scale(1) translateY(0); }
        35% { transform: scale(1.06) translateY(-2px); }
        70% { transform: scale(0.98) translateY(0); }
      }

      #${HOME_CARD_ID} {
        position: fixed;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        width: min(300px, calc(100vw - 28px));
        background: #fff;
        border: 1px solid rgba(15,23,42,.08);
        border-radius: 16px;
        box-shadow: 0 18px 40px rgba(15,23,42,.18);
        z-index: 100040;
        overflow: hidden;
      }

      #${HOME_CARD_ID}[hidden] {
        display: none !important;
      }

      .chg-card-head {
        position: relative;
        padding: 14px 14px 10px;
        background: linear-gradient(135deg, #fff7ed, #fef2f2);
        border-bottom: 1px solid rgba(15,23,42,.06);
      }

      .chg-card-close {
        position: absolute;
        top: 10px;
        right: 10px;
        width: 30px;
        height: 30px;
        border-radius: 10px;
        border: 1px solid rgba(15,23,42,.12);
        background: rgba(255,255,255,.75);
        color: #7f1d1d;
        font-size: 16px;
        font-weight: 900;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
        transition: transform .12s ease, background-color .12s ease, border-color .12s ease;
      }
      .chg-card-close:hover {
        background: rgba(255,255,255,.95);
        border-color: rgba(15,23,42,.18);
        transform: translateY(-1px);
      }
      .chg-card-close:active {
        transform: translateY(0);
      }
      body.ar .chg-card-close {
        right: auto;
        left: 10px;
      }

      .chg-card-title {
        font-size: 15px;
        font-weight: 900;
        color: #9a3412;
        margin: 0 0 4px 0;
      }

      .chg-card-text {
        margin: 0;
        font-size: 13px;
        line-height: 1.7;
        color: #475569;
      }

      .chg-card-body {
        padding: 12px 14px;
      }
      .chg-tabs {
        margin: 0 14px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        align-items: stretch;
        background: linear-gradient(180deg, #4457bb 0%, #3f51b5 100%);
        border-radius: 12px 12px 0 0;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(63,81,181,.20);
        border: 1px solid #5e71cf;
        border-bottom: none;
      }
      .chg-tab {
        border: none;
        border-bottom: 3px solid transparent;
        border-right: 1px solid rgba(255,255,255,.12);
        background: transparent;
        color: rgba(255,255,255,.55);
        padding: 12px 8px 10px;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: .3px;
        text-transform: uppercase;
        cursor: pointer;
        transition: color .2s ease, border-color .2s ease, background-color .2s ease;
      }
      .chg-tab:last-child {
        border-right: none;
      }
      .chg-tab:hover {
        color: rgba(255,255,255,.85);
        background: rgba(255,255,255,.05);
      }
      .chg-tab.active {
        color: #ffffff;
        border-bottom-color: #29b6f6;
        background: rgba(255,255,255,.06);
      }

      .chg-days {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .chg-day {
        background: #f8fafc;
        border: 1px solid rgba(15,23,42,.06);
        border-radius: 12px;
        padding: 9px 10px;
      }

      .chg-day-date {
        font-size: 12px;
        font-weight: 800;
        color: #0f172a;
        margin-bottom: 4px;
      }

      .chg-day-shifts {
        font-size: 12px;
        color: #475569;
      }

      .chg-card-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        padding: 0 14px 14px;
      }

      .chg-btn {
        border: none;
        border-radius: 12px;
        padding: 12px 10px;
        font-size: 13px;
        font-weight: 800;
        cursor: pointer;
      }

      .chg-btn-primary {
        background: linear-gradient(135deg, #1e40af, #1976d2);
        color: #fff;
      }

      .chg-btn-muted {
        background: #eaf2ff;
        color: #1d4ed8;
        border: 1px solid #bfdbfe;
      }
      .chg-options {
        display: grid;
        gap: 8px;
        padding: 0 14px 12px;
      }
      .chg-opt {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        font-weight: 700;
        color: #334155;
        background: #f8fafc;
        border: 1px solid rgba(15,23,42,.08);
        border-radius: 10px;
        padding: 8px 10px;
        cursor: pointer;
      }
      .chg-opt input {
        width: 15px;
        height: 15px;
      }

      #${PAGE_BANNER_ID} {
        margin: 14px 0;
        background: linear-gradient(135deg, #fff7ed, #fef2f2);
        border: 1px solid #fdba74;
        border-radius: 18px;
        padding: 14px;
        box-shadow: 0 8px 24px rgba(15,23,42,.08);
      }

      .chg-page-title {
        font-size: 16px;
        font-weight: 900;
        color: #9a3412;
        margin: 0 0 6px 0;
      }
      .chg-page-top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 10px;
      }
      .chg-page-close {
        width: 28px;
        height: 28px;
        border-radius: 8px;
        border: 1px solid rgba(15,23,42,.12);
        background: rgba(255,255,255,.65);
        color: #7f1d1d;
        font-size: 14px;
        font-weight: 900;
        cursor: pointer;
        line-height: 1;
      }

      .chg-page-text {
        margin: 0 0 10px 0;
        color: #475569;
        font-size: 13px;
        line-height: 1.7;
      }

      .chg-page-list {
        margin: 0;
        padding-left: 18px;
        color: #334155;
        font-size: 13px;
      }

      .chg-changed-day {
        border: 2px solid #dc2626 !important;
        box-shadow: 0 0 0 3px rgba(220,38,38,.12);
        border-radius: 12px !important;
        position: relative;
      }

      .chg-changed-day::after {
        content: "!";
        position: absolute;
        top: 6px;
        right: 6px;
        width: 18px;
        height: 18px;
        border-radius: 999px;
        background: #dc2626;
        color: #fff;
        font-size: 11px;
        font-weight: 900;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 10px rgba(220,38,38,.25);
      }

      body.ar #${HOME_CARD_ID},
      body.ar #${PAGE_BANNER_ID} {
        direction: rtl;
      }

      body.ar .chg-card-actions {
        flex-direction: row-reverse;
      }

      body.ar .chg-page-list {
        padding-right: 18px;
        padding-left: 0;
      }

      body.ar .chg-changed-day::after {
        right: auto;
        left: 6px;
      }
    `;
    document.head.appendChild(style);
  }

  // Keep chips in sync across pages (export/import/home/date/now).
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      toggleWelcomeVsScheduleChip();
    });
  } else {
    toggleWelcomeVsScheduleChip();
  }
  window.addEventListener('storage', function (e) {
    if (!e || !e.key) return;
    if (e.key === 'exportSavedEmpId' || e.key === 'savedEmpId' || e.key === 'importSavedEmpId') {
      toggleWelcomeVsScheduleChip();
    }
  });

  function shortDaysHtml(alert) {
    var days = (alert.days || []).slice(0, 3);
    if (!days.length) return '';

    return '<ul class="chg-days">' + days.map(function (item) {
      var oldCode = item.old_shift_code || '-';
      var newCode = item.new_shift_code || '-';
      return (
        '<li class="chg-day">' +
          '<div class="chg-day-date">' + escapeHtml(item.date || '') + '</div>' +
          '<div class="chg-day-shifts">' + escapeHtml(oldCode + ' → ' + newCode) + '</div>' +
        '</li>'
      );
    }).join('') + '</ul>';
  }

  function absenceDaysHtml(dates, lang) {
    var list = (dates || []).slice(0, 6);
    if (!list.length) return '';
    return '<ul class="chg-days">' + list.map(function (d) {
      return '<li class="chg-day"><div class="chg-day-date">' + escapeHtml(d) + '</div><div class="chg-day-shifts">' + (lang === 'ar' ? 'غياب مسجّل' : 'Recorded absence') + '</div></li>';
    }).join('') + '</ul>';
  }

  function clearHomeUI() {
    var icon = document.getElementById(HOME_ICON_ID);
    var card = document.getElementById(HOME_CARD_ID);
    if (icon) icon.hidden = true;
    if (card) card.hidden = true;
  }

  function ensureHomeUI(empId, alert, lang, absences, empName) {
    var icon = document.getElementById(HOME_ICON_ID);
    if (!icon) {
      icon = document.createElement('button');
      icon.id = HOME_ICON_ID;
      icon.type = 'button';
      icon.innerHTML =
        '<img class="chg-dot-icon" src="' + getBase() + 'assets/icons/alert-message.png" alt="Alert">';
      document.body.appendChild(icon);
    }

    var card = document.getElementById(HOME_CARD_ID);
    if (!card) {
      card = document.createElement('div');
      card.id = HOME_CARD_ID;
      document.body.appendChild(card);
    }

    var summaryText = (alert.summary && (lang === 'ar' ? alert.summary.ar : alert.summary.en)) || t('noDetails', lang);
    var hasShiftTab = !!(alert && alert.days && alert.days.length);
    var hasAbsenceTab = !!(absences && absences.length);
    var defaultTab = hasShiftTab ? 'shift' : 'absence';
    var shiftContent = shortDaysHtml(alert);
    var absenceContent = absenceDaysHtml(absences || [], lang);
    var tabsHtml = (hasShiftTab && hasAbsenceTab)
      ? ('<div class="chg-tabs">' +
         '<button class="chg-tab active" data-act="tab:shift">' + (lang === 'ar' ? 'تغيّر المناوبة' : 'Shift Changes') + '</button>' +
         '<button class="chg-tab" data-act="tab:absence">' + (lang === 'ar' ? 'أيام الغياب' : 'Absences') + '</button>' +
         '</div>')
      : '';
    var bodyHtml = (defaultTab === 'shift' ? shiftContent : absenceContent);

    card.innerHTML =
      '<div class="chg-card-head">' +
        '<button class="chg-card-close" type="button" aria-label="Close" data-act="close">×</button>' +
        '<div class="chg-card-title">⚠️ ' + t('changed', lang) + '</div>' +
        '<p class="chg-card-text">' + escapeHtml(summaryText || ((lang === 'ar' ? 'تنبيه تحديث للموظف: ' : 'Update alert for: ') + (empName || empId))) + '</p>' +
      '</div>' +
      tabsHtml +
      '<div class="chg-card-body">' +
        '<div id="chg-tab-body">' + bodyHtml + '</div>' +
      '</div>' +
      '<div class="chg-options">' +
        '<label class="chg-opt"><input type="checkbox" id="chgOptDismiss"> ' + (lang === 'ar' ? 'إخفاء تام (النافذة + الأيقونة)' : 'Hide completely (card + icon)') + '</label>' +
        '<label class="chg-opt"><input type="checkbox" id="chgOptMin"> ' + (lang === 'ar' ? 'تصغير (إخفاء النافذة فقط)' : 'Minimize (hide card only)') + '</label>' +
        '<label class="chg-opt"><input type="checkbox" id="chgFloatingDots" ' + (floatingAlertDotsEnabled() ? 'checked' : '') + '> ' + t('floatDotsOpt', lang) + '</label>' +
      '</div>' +
      '<div class="chg-card-actions">' +
        '<button class="chg-btn chg-btn-muted" data-act="openDiff">' + (lang === 'ar' ? 'صفحة التنبيهات' : 'Alerts Page') + '</button>' +
        '<button class="chg-btn chg-btn-primary" data-act="apply">' + (lang === 'ar' ? 'تطبيق' : 'Apply') + '</button>' +
      '</div>';

    if (!floatingAlertDotsEnabled()) {
      icon.hidden = true;
      if (isMinimized(empId, alert)) {
        clearMinimized(empId, alert);
      }
      card.hidden = false;
    } else {
      icon.hidden = false;
      card.hidden = isMinimized(empId, alert);
    }

    var optDismiss = card.querySelector('#chgOptDismiss');
    var optMin = card.querySelector('#chgOptMin');
    var tabBody = card.querySelector('#chg-tab-body');
    if (optDismiss) optDismiss.checked = isDismissed(empId, alert);
    if (optMin) optMin.checked = isMinimized(empId, alert);

    icon.onclick = function () {
      clearMinimized(empId, alert);
      card.hidden = false;
    };

    card.onclick = function (e) {
      var act = e.target && e.target.getAttribute('data-act');
      if (!act) return;

      if (act === 'apply') {
        var floatCb = card.querySelector('#chgFloatingDots');
        if (floatCb) {
          localStorage.setItem(FLOAT_DOTS_KEY, floatCb.checked ? '1' : '0');
        }
        var doDismiss = !!(optDismiss && optDismiss.checked);
        var doMin = !!(optMin && optMin.checked);
        if (doDismiss) {
          markDismissed(empId, alert);
          card.hidden = true;
          icon.hidden = true;
          return;
        }
        if (doMin || (!doDismiss && !doMin)) {
          if (!floatingAlertDotsEnabled()) {
            clearMinimized(empId, alert);
            card.hidden = false;
            icon.hidden = true;
            return;
          }
          markMinimized(empId, alert);
          card.hidden = true;
          icon.hidden = false;
          return;
        }
        clearMinimized(empId, alert);
        card.hidden = false;
        icon.hidden = !floatingAlertDotsEnabled();
        return;
      }
      if (act === 'close') {
        // Close hides the card (minimize) but keeps the alert icon available.
        if (!floatingAlertDotsEnabled()) {
          card.hidden = true;
          return;
        }
        markMinimized(empId, alert);
        card.hidden = true;
        icon.hidden = false;
        return;
      }
      if (act === 'openDiff') {
        window.location.href = getBase() + 'roster-diff/index.html';
        return;
      }
      if (act === 'tab:shift' || act === 'tab:absence') {
        var tab = act.split(':')[1];
        var tabs = card.querySelectorAll('.chg-tab');
        tabs.forEach(function (el) {
          el.classList.toggle('active', el.getAttribute('data-act') === act);
        });
        if (tabBody) {
          tabBody.innerHTML = tab === 'shift' ? shiftContent : absenceContent;
        }
      }
    };
  }

  function ensurePageBanner(alert, lang) {
    var holder =
      document.querySelector('.wrap') ||
      document.querySelector('main') ||
      document.body;

    var old = document.getElementById(PAGE_BANNER_ID);
    if (old) old.remove();

    var summaryText = (alert.summary && (lang === 'ar' ? alert.summary.ar : alert.summary.en)) || t('noDetails', lang);
    var box = document.createElement('div');
    box.id = PAGE_BANNER_ID;

    box.innerHTML =
      '<div class="chg-page-top">' +
        '<div class="chg-page-title">⚠️ ' + t('changed', lang) + '</div>' +
        '<button class="chg-page-close" type="button" data-act="close" aria-label="' + t('close', lang) + '">✕</button>' +
      '</div>' +
      '<p class="chg-page-text">' + escapeHtml(summaryText) + '</p>' +
      (
        (alert.days || []).length
          ? '<ul class="chg-page-list">' + alert.days.map(function (item) {
              var oldCode = item.old_shift_code || '-';
              var newCode = item.new_shift_code || '-';
              return '<li>' + escapeHtml((item.date || '') + ' — ' + oldCode + ' → ' + newCode) + '</li>';
            }).join('') + '</ul>'
          : ''
      );

    holder.insertBefore(box, holder.firstChild);
    box.onclick = function (e) {
      if (e.target && e.target.getAttribute('data-act') === 'close') {
        markPageDismissed(getEmployeeId(), alert);
        box.remove();
      }
    };
  }

  function highlightChangedDays(alert) {
    if (!alert || !alert.days || !alert.days.length) return;

    var changedDates = {};
    alert.days.forEach(function (item) {
      if (item && item.date) changedDates[item.date] = true;
    });

    // 1) الأفضل: عناصر تحمل data-date
    var dataDateNodes = document.querySelectorAll('[data-date]');
    dataDateNodes.forEach(function (el) {
      var d = (el.getAttribute('data-date') || '').trim();
      if (changedDates[d]) {
        el.classList.add('chg-changed-day');
        el.setAttribute('title', t('changedToday', getLang()));
      }
    });

    // 2) fallback: ابحث في النصوص إذا الصفحة لا تستخدم data-date
    var possibleDayCards = document.querySelectorAll('.dayCard, .day-card, .schedule-day, .calendar-day, .monthDay, .month-day, .day');
    possibleDayCards.forEach(function (el) {
      if (el.classList.contains('chg-changed-day')) return;

      var txt = (el.textContent || '').trim();
      for (var dateKey in changedDates) {
        if (!Object.prototype.hasOwnProperty.call(changedDates, dateKey)) continue;
        var shortDate = dateKey.slice(8); // DD
        var fullDate = dateKey;
        if (txt.indexOf(fullDate) !== -1 || txt.indexOf(shortDate) !== -1) {
          el.classList.add('chg-changed-day');
          el.setAttribute('title', t('changedToday', getLang()));
          break;
        }
      }
    });
  }

var lastRenderedEmpId = '';
var lastRenderedHash = '';

function renderForEmployee(empId) {
  if (!empId) return;

  var lang = getLang();
  if (document.body) document.body.classList.toggle('ar', lang === 'ar');
  var path = window.location.pathname || '';
  var url = path.indexOf('/import/') !== -1
    ? (getBase() + 'import/schedules/' + encodeURIComponent(empId) + '.json')
    : (getBase() + 'schedules/' + encodeURIComponent(empId) + '.json');

  fetchJson(url)
    .catch(function () {
      // If schedule file is missing/unreachable, continue to diff fallback.
      return null;
    })
    .then(function (data) {
      var currentEmpId = getEmployeeId();
      if (!currentEmpId || currentEmpId !== empId) return;

      var alert = data ? activeAlert(data) : null;
      var empName = data && data.name ? data.name : '';

      // Fallback: use latest roster-diff output when per-employee alert is missing.
      var isImport = path.indexOf('/import/') !== -1;
      var kind = isImport ? 'import' : 'export';
      var base = getBase();
      var diffUrl = base + 'roster-diff/data/' + kind + '-latest.json';
      var diffPromise = alert && alert.is_active
        ? Promise.resolve(alert)
        : fetchJson(diffUrl).then(function (diffData) { return buildAlertFromDiff(empId, diffData, lang); }).catch(function () { return null; });
      var absPromise = fetchJson(base + 'absence-data.json?ts=' + Date.now())
        .then(function (absData) { return findAbsenceDates(empId, empName, absData); })
        .catch(function () { return []; });
      return Promise.all([diffPromise, absPromise]).then(function (arr) {
        return { alert: arr[0], absences: arr[1], empName: empName, lang: lang };
      });
    })
    .then(function (result) {
      if (!result) return;
      var currentEmpId = getEmployeeId();
      if (!currentEmpId || currentEmpId !== empId) return;
      var alert = result.alert;
      var absences = result.absences || [];
      var empName = result.empName || '';

      if ((!alert || !alert.is_active) && !absences.length) {
        if (currentEmpId === empId) {
          clearHomeUI();
        }
        return;
      }

      lastRenderedEmpId = empId;
      lastRenderedHash = alert.change_hash || '';

      if (alert && isDismissed(empId, alert)) {
        clearHomeUI();
        return;
      }

      if (onHomePage()) {
        if (!alert) {
          alert = {
            is_active: true,
            force_show: true,
            change_hash: 'absence_' + absences.join('|'),
            total_changed_days: absences.length,
            summary: {
              ar: 'لديك أيام غياب مسجلة.',
              en: 'You have recorded absence days.'
            },
            days: []
          };
        }
        ensureHomeUI(empId, alert, lang, absences, empName);
      }

      if (onMySchedulePage()) {
        clearHomeUI();
        if (!isPageDismissed(empId, alert)) {
          ensurePageBanner(alert, lang);
        }
        setTimeout(function () { highlightChangedDays(alert); }, 300);
        setTimeout(function () { highlightChangedDays(alert); }, 1200);
        setTimeout(function () { highlightChangedDays(alert); }, 2500);
      }
    })
    .catch(function (err) {
      console.warn('change-alert fetch failed:', err);
      // لا تمسح الواجهة هنا حتى لا يختفي التنبيه بعد ظهوره
    });
}

function boot() {
  injectStyles();
  var empId = getEmployeeId();
  if (!empId) return;
  renderForEmployee(empId);
}

  function start() {
    boot();
    setTimeout(boot, 1200);
    setTimeout(boot, 3500);
  }

  window.addEventListener('storage', function (e) {
    if (e.key !== FLOAT_DOTS_KEY) return;
    var empId = getEmployeeId();
    if (!empId || !onHomePage()) return;
    renderForEmployee(empId);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    // Script may be injected after DOMContentLoaded already fired.
    start();
  }
})();
