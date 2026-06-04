(function () {
  'use strict';

  var HOME_ICON_ID = 'chg-dot';
  var HOME_CARD_ID = 'chg-card';
  var PAGE_BANNER_ID = 'chg-page-banner';
  var STYLE_ID = 'chg-styles';

  function chgBellSvg(size) {
    return (
      '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none" aria-hidden="true">' +
      '<path d="M18 14V9a6 6 0 1 0-12 0v5l-2 2v1h16v-1l-2-2z" stroke="#dc2626" stroke-width="2" stroke-linejoin="round"/>' +
      '<path d="M10 18a2 2 0 0 0 4 0" stroke="#dc2626" stroke-width="2" stroke-linecap="round"/></svg>'
    );
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
        if (welcomeChip) {
          welcomeChip.classList.remove('visible');
          welcomeChip.hidden = true;
          welcomeChip.style.display = 'none';
        }
        if (myScheduleBtn) {
          myScheduleBtn.hidden = false;
          myScheduleBtn.style.display = '';
        }
        return;
      }

      if (welcomeChip) {
        welcomeChip.hidden = false;
        welcomeChip.style.display = '';
        welcomeChip.classList.add('visible');
      }
      if (myScheduleBtn) {
        myScheduleBtn.hidden = true;
        myScheduleBtn.style.display = 'none';
      }
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

  function t(key, lang, arg) {
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
        recordedAbsence: 'غياب مسجّل',
        tabShift: 'تغيّر المناوبة',
        tabAbsence: 'أيام الغياب',
        updateFor: 'تنبيه تحديث للموظف: ',
        minimizeOpt: 'تصغير (إخفاء النافذة فقط)',
        alertsPage: 'صفحة التنبيهات',
        apply: 'تطبيق',
        changedDaysCount: function (n) {
          return 'لديك ' + n + ' يوم/أيام بتغييرات في الروستر.';
        },
        orgUpdate: function (n) {
          return 'تم نشر تحديث على ملف الروستر (' + n + ' تغييراً). راجع جدولك أو صفحة التنبيهات.';
        },
        absenceSummary: 'لديك أيام غياب مسجلة.',
        guestAbsenceSummary:
          'توجد غيابات مسجّلة في النظام. عيّن رقمك من «جدولي» لعرض تفاصيلك إن وُجدت.'
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
        recordedAbsence: 'Recorded absence',
        tabShift: 'Shift changes',
        tabAbsence: 'Absences',
        updateFor: 'Update alert for: ',
        minimizeOpt: 'Minimize (hide card only)',
        alertsPage: 'Alerts page',
        apply: 'Apply',
        changedDaysCount: function (n) {
          return 'You have ' + n + ' changed day(s) in the roster.';
        },
        orgUpdate: function (n) {
          return 'A roster update was published (' + n + ' change(s)). Check your schedule or the alerts page.';
        },
        absenceSummary: 'You have recorded absence days.',
        guestAbsenceSummary:
          'Recorded absences exist in the system. Set your employee ID in My Schedule to see yours if any.'
      }
    };
    var bucket = dict[lang] || dict.en;
    var val = bucket[key];
    if (typeof val === 'function') return val(arg);
    return val || key;
  }

  function alertSummaryText(alert, lang) {
    var s = alert && alert.summary;
    if (!s) return t('noDetails', lang);
    if (typeof s === 'string') return s;
    var text = lang === 'ar' ? (s.ar || s.en || '') : (s.en || s.ar || '');
    return String(text).trim() || t('noDetails', lang);
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
    return (
      /\/roster-site\/?$/.test(path) ||
      /\/roster-site\/index\.html$/.test(path) ||
      /\/roster-site\/date\//.test(path) ||
      /\/docs\/?$/.test(path) ||
      /\/docs\/index\.html$/.test(path) ||
      /^\/$/.test(path) ||
      /\/index\.html$/.test(path) ||
      /\/date\//.test(path)
    );
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

    return {
      is_active: true,
      force_show: true,
      change_hash: 'diff_' + String((diffData && diffData.generated_at) || '') + '_' + empId,
      total_changed_days: days.length,
      summary: {
        ar: t('changedDaysCount', 'ar', days.length),
        en: t('changedDaysCount', 'en', days.length)
      },
      days: days
    };
  }

  /** When the diff workbook has changes but none match this employee, still surface an org-wide notice on home. */
  function buildOrgWideAlertFromDiff(diffData, lang) {
    var rows = (diffData && diffData.changes) || [];
    if (!rows.length) return null;
    var n = Number(diffData.total_changes);
    if (!n || n !== n) n = rows.length;
    return {
      is_active: true,
      force_show: true,
      change_hash: 'orgdiff_' + String((diffData && diffData.generated_at) || '') + '_' + n,
      total_changed_days: 0,
      summary: {
        ar: t('orgUpdate', 'ar', n),
        en: t('orgUpdate', 'en', n)
      },
      days: []
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

  function pageDismissKey(empId, alert) {
    return 'chgPageDismissed_' + empId + '_' + ((alert && alert.change_hash) || 'none');
  }

  function minimizeKey(empId, alert) {
    return 'chgMinimized_' + empId + '_' + ((alert && alert.change_hash) || 'none');
  }

  function isPageDismissed(empId, alert) {
    return localStorage.getItem(pageDismissKey(empId, alert)) === '1';
  }

  function isMinimized(empId, alert) {
    return localStorage.getItem(minimizeKey(empId, alert)) === '1';
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
        line-height: 0;
        display: block;
        filter: drop-shadow(0 2px 6px rgba(220,38,38,.35));
        animation: chgIconPulse 1.8s ease-in-out infinite;
      }
      #${HOME_ICON_ID} .chg-dot-icon svg {
        display: block;
        width: 34px;
        height: 34px;
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

      /* Keep top chips consistent across pages:
         if welcomeChip is visible => hide My Schedule (schedule container). */
      html:has(#welcomeChip.visible) #myScheduleBtn {
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
  function enforceChipVisibility() {
    // Apply once immediately, then re-apply after short delays.
    // Reason: some pages add the "visible" class asynchronously (fetch-based welcome chip).
    toggleWelcomeVsScheduleChip();
    setTimeout(toggleWelcomeVsScheduleChip, 800);
    setTimeout(toggleWelcomeVsScheduleChip, 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enforceChipVisibility);
  } else {
    enforceChipVisibility();
  }
  window.addEventListener('storage', function (e) {
    if (!e || !e.key) return;
    if (e.key === 'exportSavedEmpId' || e.key === 'savedEmpId' || e.key === 'importSavedEmpId') {
      toggleWelcomeVsScheduleChip();
      var id = getEmployeeId();
      if (id) renderForEmployee(id);
      else renderGlobalGuestAlerts();
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
      return '<li class="chg-day"><div class="chg-day-date">' + escapeHtml(d) + '</div><div class="chg-day-shifts">' + escapeHtml(t('recordedAbsence', lang)) + '</div></li>';
    }).join('') + '</ul>';
  }

  function clearHomeUI() {
    var icon = document.getElementById(HOME_ICON_ID);
    var card = document.getElementById(HOME_CARD_ID);
    if (icon) icon.hidden = true;
    if (card) card.hidden = true;
  }

  function clearAlertState() {
    lastAlertPayload = null;
    lastRenderedEmpId = '';
    lastRenderedHash = '';
    clearHomeUI();
  }

  function ensureHomeUI(empId, alert, lang, absences, empName) {
    var icon = document.getElementById(HOME_ICON_ID);
    if (!icon) {
      icon = document.createElement('button');
      icon.id = HOME_ICON_ID;
      icon.type = 'button';
      icon.innerHTML = '<span class="chg-dot-icon" aria-hidden="true">' + chgBellSvg(34) + '</span>';
      document.body.appendChild(icon);
    }

    var card = document.getElementById(HOME_CARD_ID);
    if (!card) {
      card = document.createElement('div');
      card.id = HOME_CARD_ID;
      document.body.appendChild(card);
    }

    var summaryText = alertSummaryText(alert, lang);
    var hasShiftTab = !!(alert && alert.days && alert.days.length);
    var hasAbsenceTab = !!(absences && absences.length);
    var defaultTab = hasShiftTab ? 'shift' : 'absence';
    var shiftContent = shortDaysHtml(alert);
    var absenceContent = absenceDaysHtml(absences || [], lang);
    var tabsHtml = (hasShiftTab && hasAbsenceTab)
      ? ('<div class="chg-tabs">' +
         '<button class="chg-tab active" data-act="tab:shift">' + escapeHtml(t('tabShift', lang)) + '</button>' +
         '<button class="chg-tab" data-act="tab:absence">' + escapeHtml(t('tabAbsence', lang)) + '</button>' +
         '</div>')
      : '';
    var bodyHtml = (defaultTab === 'shift' ? shiftContent : absenceContent);
    var fallbackText = t('updateFor', lang) + (empName || empId);

    card.innerHTML =
      '<div class="chg-card-head">' +
        '<button class="chg-card-close" type="button" aria-label="' + escapeHtml(t('close', lang)) + '" data-act="close">×</button>' +
        '<div class="chg-card-title">' + escapeHtml(t('changed', lang)) + '</div>' +
        '<p class="chg-card-text">' + escapeHtml(summaryText || fallbackText) + '</p>' +
      '</div>' +
      tabsHtml +
      '<div class="chg-card-body">' +
        '<div id="chg-tab-body">' + bodyHtml + '</div>' +
      '</div>' +
      '<div class="chg-options">' +
        '<label class="chg-opt"><input type="checkbox" id="chgOptMin"> ' + escapeHtml(t('minimizeOpt', lang)) + '</label>' +
      '</div>' +
      '<div class="chg-card-actions">' +
        '<button class="chg-btn chg-btn-muted" data-act="openDiff">' + escapeHtml(t('alertsPage', lang)) + '</button>' +
        '<button class="chg-btn chg-btn-primary" data-act="apply">' + escapeHtml(t('apply', lang)) + '</button>' +
      '</div>';

    icon.hidden = false;
    card.hidden = isMinimized(empId, alert);

    var optMin = card.querySelector('#chgOptMin');
    var tabBody = card.querySelector('#chg-tab-body');
    if (optMin) optMin.checked = isMinimized(empId, alert);

    icon.onclick = function () {
      clearMinimized(empId, alert);
      card.hidden = false;
    };

    setLastAlertPayload(empId, alert, absences, empName);

    card.onclick = function (e) {
      var act = e.target && e.target.getAttribute('data-act');
      if (!act) return;

      if (act === 'apply') {
        var doMin = !!(optMin && optMin.checked);
        if (doMin) {
          markMinimized(empId, alert);
          card.hidden = true;
        } else {
          clearMinimized(empId, alert);
          card.hidden = false;
        }
        icon.hidden = false;
        return;
      }
      if (act === 'close') {
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

    var summaryText = alertSummaryText(alert, lang);
    var box = document.createElement('div');
    box.id = PAGE_BANNER_ID;

    box.innerHTML =
      '<div class="chg-page-top">' +
        '<div class="chg-page-title">' + escapeHtml(t('changed', lang)) + '</div>' +
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
    setLastAlertPayload(getEmployeeId() || GUEST_EMP_ID, alert, [], '');
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
var lastAlertPayload = null;
var GUEST_EMP_ID = 'guest';

function setLastAlertPayload(empId, alert, absences, empName) {
  lastAlertPayload = {
    empId: empId,
    alert: alert,
    absences: absences || [],
    empName: empName || ''
  };
}

function onAppLangChange() {
  var lang = getLang();
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  if (document.body) document.body.classList.toggle('ar', lang === 'ar');
  if (!lastAlertPayload) return;
  var p = lastAlertPayload;
  var card = document.getElementById(HOME_CARD_ID);
  var wasCardHidden = card ? card.hidden : true;
  if (onHomePage()) {
    ensureHomeUI(p.empId, p.alert, lang, p.absences, p.empName);
    card = document.getElementById(HOME_CARD_ID);
    if (card) card.hidden = wasCardHidden;
  }
  if (onMySchedulePage() && document.getElementById(PAGE_BANNER_ID)) {
    ensurePageBanner(p.alert, lang);
  }
}

function hookRosterLangChange() {
  if (window.__chgLangHooked) return;
  window.__chgLangHooked = true;
  var orig = window.applyLang;
  if (typeof orig === 'function') {
    window.applyLang = function (lang) {
      orig(lang);
      onAppLangChange();
    };
  }
  document.addEventListener('click', function (e) {
    if (e.target && e.target.closest && e.target.closest('#langToggle')) {
      setTimeout(onAppLangChange, 0);
    }
  });
  window.addEventListener('storage', function (e) {
    if (e.key === 'rosterLang' || e.key === 'appLang') onAppLangChange();
  });
}

function mergeGuestSummary(a, b) {
  var sa = (a && a.summary) || {};
  var sb = (b && b.summary) || {};
  return {
    ar: String(sa.ar || '').trim() + '\n\n' + String(sb.ar || '').trim(),
    en: String(sa.en || '').trim() + '\n\n' + String(sb.en || '').trim()
  };
}

function renderGlobalGuestAlerts() {
  if (getEmployeeId()) return;
  if (!onHomePage()) return;

  var lang = getLang();
  if (document.body) document.body.classList.toggle('ar', lang === 'ar');
  var path = window.location.pathname || '';
  var isImport = path.indexOf('/import/') !== -1;
  var kind = isImport ? 'import' : 'export';
  var base = getBase();
  var diffUrl = base + 'roster-diff/data/' + kind + '-latest.json';

  Promise.all([
    fetchJson(diffUrl).catch(function () { return null; }),
    fetchJson(base + 'absence-data.json?ts=' + Date.now()).catch(function () { return null; })
  ]).then(function (arr) {
    if (getEmployeeId()) return;
    var diffData = arr[0];
    var absData = arr[1];
    var orgAlert = buildOrgWideAlertFromDiff(diffData, lang);
    var absCount = (absData && absData.records && absData.records.length) || 0;
    var guestAbsAlert = null;
    if (absCount) {
      guestAbsAlert = {
        is_active: true,
        force_show: true,
        change_hash: 'guestabs_' + String((absData && absData.generated_at) || absCount),
        total_changed_days: 0,
        summary: {
          ar: t('guestAbsenceSummary', 'ar'),
          en: t('guestAbsenceSummary', 'en')
        },
        days: []
      };
    }
    var alert = null;
    if (orgAlert && guestAbsAlert) {
      var merged = mergeGuestSummary(orgAlert, guestAbsAlert);
      alert = {
        is_active: true,
        force_show: true,
        change_hash: 'guestcombo_' + orgAlert.change_hash + '_' + guestAbsAlert.change_hash,
        total_changed_days: 0,
        summary: merged,
        days: []
      };
    } else {
      alert = orgAlert || guestAbsAlert;
    }

    if (!alert || !alert.is_active) {
      clearAlertState();
      return;
    }
    lastRenderedEmpId = GUEST_EMP_ID;
    lastRenderedHash = alert.change_hash || '';
    ensureHomeUI(GUEST_EMP_ID, alert, lang, [], '');
  }).catch(function (err) {
    console.warn('change-alert guest fetch failed:', err);
  });
}

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
        : fetchJson(diffUrl).then(function (diffData) {
          var personal = buildAlertFromDiff(empId, diffData, lang);
          if (personal) return personal;
          return buildOrgWideAlertFromDiff(diffData, lang);
        }).catch(function () { return null; });
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
          clearAlertState();
        }
        return;
      }

      if (!alert || !alert.is_active) {
        if (!absences.length) {
          if (currentEmpId === empId) clearAlertState();
          return;
        }
        alert = {
          is_active: true,
          force_show: true,
          change_hash: 'absence_' + absences.join('|'),
          total_changed_days: absences.length,
          summary: {
            ar: t('absenceSummary', 'ar'),
            en: t('absenceSummary', 'en')
          },
          days: []
        };
      }

      lastRenderedEmpId = empId;
      lastRenderedHash = alert.change_hash || '';

      if (onHomePage()) {
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
  hookRosterLangChange();
  injectStyles();
  var empId = getEmployeeId();
  if (empId) {
    renderForEmployee(empId);
  } else {
    renderGlobalGuestAlerts();
  }
}

  function start() {
    boot();
    setTimeout(boot, 1200);
    setTimeout(boot, 3500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    // Script may be injected after DOMContentLoaded already fired.
    start();
  }
})();
