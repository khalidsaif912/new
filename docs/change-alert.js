(function () {
  'use strict';

  var HOME_ICON_ID = 'chg-dot';
  var HOME_CARD_ID = 'chg-card';
  var PAGE_BANNER_ID = 'chg-page-banner';
  var STYLE_ID = 'chg-styles';

  function chgClockIco() {
    return (
      '<span class="chg-day-ico chg-day-ico-shift" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24" width="14" height="14" fill="none">' +
      '<circle cx="12" cy="12" r="7.5" stroke="#fff" stroke-width="2"/>' +
      '<path d="M12 8v4.5l3 1.5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg></span>'
    );
  }
  function chgAbsIco() {
    return (
      '<span class="chg-day-ico chg-day-ico-abs" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24" width="14" height="14" fill="none">' +
      '<circle cx="12" cy="8" r="3" stroke="#fff" stroke-width="2"/>' +
      '<path d="M6.5 19c1.1-2.8 2.9-4.2 5.5-4.2s4.4 1.4 5.5 4.2" stroke="#fff" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M6 6l12 12" stroke="#fff" stroke-width="2" stroke-linecap="round"/>' +
      '</svg></span>'
    );
  }
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

  function syncSiteLang(lang) {
    if (lang !== 'ar' && lang !== 'en') return;
    try {
      localStorage.setItem('rosterLang', lang);
      localStorage.setItem('prefLang', lang);
      localStorage.setItem('importPrefLang', lang);
      localStorage.setItem('appLang', lang);
    } catch (e) {}
  }

  function getLang() {
    // rosterLang is the site-wide source of truth (home page toggle).
    var primary = localStorage.getItem('rosterLang');
    if (primary === 'ar' || primary === 'en') return primary;
    var path = window.location.pathname || '';
    if (path.indexOf('/my-schedules') !== -1) {
      var msLang = path.indexOf('/import/') !== -1
        ? localStorage.getItem('importPrefLang')
        : localStorage.getItem('prefLang');
      return msLang || 'ar';
    }
    if (path.indexOf('/import/') !== -1) {
      return localStorage.getItem('importPrefLang')
        || localStorage.getItem('appLang')
        || 'en';
    }
    return localStorage.getItem('importPrefLang')
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
        shiftChange: 'تغيّر المناوبة',
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
        absenceSummary: function (n) {
          return 'لديك ' + n + ' ' + (n === 1 ? 'يوم غياب' : 'أيام غياب') + ' مسجّلة في النظام.';
        },
        absencesWord: function (n) {
          return n === 1 ? 'غياب' : 'غيابات';
        },
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
        shiftChange: 'Shift change',
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
        absenceSummary: function (n) {
          return 'You have ' + n + ' recorded ' + (n === 1 ? 'absence day' : 'absence days') + '.';
        },
        absencesWord: function (n) {
          return n === 1 ? 'absence' : 'absences';
        },
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
      /\/docs\/home\.html$/.test(path) ||
      /^\/$/.test(path) ||
      /\/index\.html$/.test(path) ||
      /\/home\.html$/.test(path) ||
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

  function cacheBustHourly(url) {
    var sep = url.indexOf('?') >= 0 ? '&' : '?';
    return url + sep + 'v=' + Math.floor(Date.now() / 3600000);
  }

  function fetchJson(url, opts) {
    var fresh = !!(opts && opts.fresh);
    var bust = fresh
      ? (url + (url.indexOf('?') >= 0 ? '&' : '?') + 'v=' + Date.now())
      : cacheBustHourly(url);
    return fetch(bust, { cache: fresh ? 'no-store' : 'default' }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    });
  }

  function normalizeEmpId(v) {
    var s = String(v == null ? '' : v).trim();
    if (!s) return '';
    if (!/^\d+$/.test(s)) return s;
    var n = String(Number(s));
    return n === 'NaN' ? s : n;
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
    var wantId = normalizeEmpId(empId);
    var cleanName = String(empName || '').replace(/-\s*\d+\s*$/, '').trim();
    var out = [];
    records.forEach(function (rec) {
      var matched = false;
      var nums = (rec && rec.empNos) || [];
      if (wantId) {
        for (var n = 0; n < nums.length; n++) {
          if (normalizeEmpId(nums[n]) === wantId) {
            out.push(String(rec.date || ''));
            matched = true;
            break;
          }
        }
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
        bottom: 12px;
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255,255,255,.92);
        border: 1px solid rgba(15,23,42,.1);
        border-radius: 16px;
        box-shadow: 0 8px 24px rgba(15,23,42,.14);
        z-index: 100030;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        padding: 0;
        overflow: hidden;
      }

      #${HOME_ICON_ID}.has-absences {
        width: 56px;
        height: 56px;
        border-radius: 18px;
        overflow: visible;
        border-color: rgba(220,38,38,.22);
        background: linear-gradient(180deg, #fff 0%, #fff7f7 100%);
        box-shadow: 0 8px 24px rgba(220,38,38,.18);
      }

      #${HOME_ICON_ID}[hidden] {
        display: none !important;
      }

      #${HOME_ICON_ID} .chg-dot-icon {
        line-height: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        filter: drop-shadow(0 2px 6px rgba(220,38,38,.35));
        animation: chgIconPulse 1.8s ease-in-out infinite;
      }
      #${HOME_ICON_ID} .chg-dot-icon svg {
        display: block;
        width: 34px;
        height: 34px;
      }
      #${HOME_ICON_ID} .chg-dot-abs {
        display: none;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        line-height: 1;
        pointer-events: none;
      }
      #${HOME_ICON_ID}.has-absences .chg-dot-icon,
      #${HOME_ICON_ID}.has-absences .chg-dot-abs {
        position: absolute;
        inset: 0;
      }
      #${HOME_ICON_ID}.has-absences .chg-dot-abs {
        display: flex;
        animation: chgFaceAbs 5.2s ease-in-out infinite;
      }
      #${HOME_ICON_ID}.has-absences .chg-dot-icon {
        animation: chgFaceBell 5.2s ease-in-out infinite;
      }
      #${HOME_ICON_ID} .chg-dot-abs-n {
        font-size: 22px;
        font-weight: 800;
        color: #dc2626;
        letter-spacing: -.05em;
        font-variant-numeric: tabular-nums;
        line-height: .88;
        font-family: 'IBM Plex Sans', system-ui, -apple-system, sans-serif;
      }
      #${HOME_ICON_ID} .chg-dot-abs-l {
        margin-top: 3px;
        font-size: 8px;
        font-weight: 800;
        letter-spacing: .02em;
        text-transform: lowercase;
        color: #b91c1c;
        line-height: 1;
        max-width: 52px;
        text-align: center;
        white-space: nowrap;
      }
      html[lang="ar"] #${HOME_ICON_ID} .chg-dot-abs-l,
      body.ar #${HOME_ICON_ID} .chg-dot-abs-l {
        font-size: 9px;
        letter-spacing: 0;
        text-transform: none;
        font-family: 'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, sans-serif;
      }
      @keyframes chgIconPulse {
        0%,100% { transform: scale(1) translateY(0); }
        35% { transform: scale(1.06) translateY(-2px); }
        70% { transform: scale(0.98) translateY(0); }
      }
      @keyframes chgFaceBell {
        0% { opacity: 1; visibility: visible; transform: translateX(-5px) rotate(-10deg) scale(1.08); }
        4% { transform: translateX(5px) rotate(10deg) scale(1.06); }
        8% { transform: translateX(-4px) rotate(-8deg) scale(1.04); }
        12% { transform: translateX(4px) rotate(7deg) scale(1.03); }
        16% { transform: translateX(-2px) rotate(-4deg) scale(1.01); }
        20%, 38% { opacity: 1; visibility: visible; transform: translateX(0) rotate(0) scale(1); }
        46%, 88% { opacity: 0; visibility: hidden; transform: scale(.82); }
        96% { opacity: 1; visibility: visible; transform: translateX(-4px) rotate(-8deg) scale(1.06); }
        100% { opacity: 1; visibility: visible; transform: translateX(0) rotate(0) scale(1); }
      }
      @keyframes chgFaceAbs {
        0%, 38% { opacity: 0; visibility: hidden; transform: none; }
        46%, 88% { opacity: 1; visibility: visible; transform: none; }
        96%, 100% { opacity: 0; visibility: hidden; transform: none; }
      }
      @media (prefers-reduced-motion: reduce) {
        #${HOME_ICON_ID} .chg-dot-icon,
        #${HOME_ICON_ID}.has-absences .chg-dot-icon,
        #${HOME_ICON_ID}.has-absences .chg-dot-abs,
        #${HOME_CARD_ID} {
          animation: none !important;
        }
        #${HOME_ICON_ID}.has-absences .chg-dot-icon {
          opacity: 0;
          visibility: hidden;
        }
        #${HOME_ICON_ID}.has-absences .chg-dot-abs {
          opacity: 1;
          visibility: visible;
          transform: none;
        }
      }

      html.has-float-dock .wrap {
        padding-bottom: calc(130px + env(safe-area-inset-bottom, 0px)) !important;
      }

      #${HOME_CARD_ID} {
        position: fixed;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        width: min(340px, calc(100vw - 28px));
        border: 10px solid transparent;
        border-radius: 24px;
        background:
          linear-gradient(#fffdf8, #fffdf8) padding-box,
          repeating-linear-gradient(
            45deg,
            #c62828 0 8px,
            #ffffff 8px 16px
          ) border-box;
        box-shadow:
          0 8px 16px rgba(28, 25, 23, .16),
          0 22px 48px rgba(28, 25, 23, .32);
        z-index: 100040;
        animation: chgCardPop .42s ease-out, chgCardGlow 2.4s ease-in-out .42s infinite;
      }

      #${HOME_CARD_ID}[hidden] {
        display: none !important;
        animation: none;
      }

      @keyframes chgCardPop {
        0% { transform: translate(-50%, -50%) scale(.9); }
        70% { transform: translate(-50%, -50%) scale(1.03); }
        100% { transform: translate(-50%, -50%) scale(1); }
      }
      @keyframes chgCardGlow {
        0%, 100% {
          box-shadow:
            0 8px 16px rgba(28, 25, 23, .16),
            0 22px 48px rgba(28, 25, 23, .32);
        }
        50% {
          box-shadow:
            0 10px 20px rgba(28, 25, 23, .2),
            0 28px 56px rgba(28, 25, 23, .4);
        }
      }

      /* Keep top chips consistent across pages:
         if welcomeChip is visible => hide My Schedule (schedule container). */
      html:has(#welcomeChip.visible) #myScheduleBtn {
        display: none !important;
      }

      .chg-card-head {
        position: relative;
        padding: 14px 16px 12px;
        background: #fffdf8;
        border-bottom: 1px solid #e5e7eb;
      }

      .chg-card-close {
        position: absolute;
        top: 10px;
        right: 10px;
        width: 30px;
        height: 30px;
        border-radius: 10px;
        border: none;
        background: transparent;
        color: #9ca3af;
        font-size: 22px;
        font-weight: 700;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
        transition: color .12s ease, background-color .12s ease;
      }
      .chg-card-close:hover {
        background: #f3f4f6;
        color: #4b5563;
        transform: none;
      }
      .chg-card-close:active {
        transform: translateY(0);
      }
      body.ar .chg-card-close {
        right: auto;
        left: 10px;
      }

      .chg-card-title {
        font-size: 16px;
        font-weight: 800;
        color: #111827;
        margin: 0 28px 4px 0;
      }

      .chg-card-text {
        margin: 0;
        font-size: 13px;
        line-height: 1.6;
        color: #6b7280;
      }

      body.ar .chg-card-title {
        margin: 0 0 4px 28px;
      }

      .chg-card-body {
        padding: 0 14px 12px;
      }
      .chg-tabs {
        margin: 12px 14px 0;
        display: grid;
        grid-template-columns: 1fr 1fr;
        align-items: stretch;
        background: #fff8e7;
        border-radius: 12px 12px 0 0;
        overflow: hidden;
        border: 1px solid #1b5e20;
        border-bottom: none;
      }
      .chg-tab {
        border: none;
        border-bottom: 3px solid #fbc02d;
        background: #fff8e7;
        color: #1b5e20;
        padding: 12px 8px 10px;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: .4px;
        text-transform: uppercase;
        cursor: pointer;
        transition: color .2s ease, border-color .2s ease, background-color .2s ease;
      }
      .chg-tab:last-child {
        border-right: none;
      }
      .chg-tab:hover {
        color: #145218;
        background: #fff3d6;
      }
      .chg-tab.active {
        color: #ffffff;
        border-bottom-color: #1b5e20;
        background: #1b5e20;
      }

      .chg-days {
        list-style: none;
        margin: 0;
        padding: 0;
        background: #f3f4f6;
        border-radius: 12px;
        overflow: hidden;
      }
      .chg-tabs + .chg-card-body {
        padding-top: 0;
      }
      .chg-tabs + .chg-card-body .chg-days {
        border-radius: 0 0 12px 12px;
        border: 1px solid #1b5e20;
        border-top: none;
      }

      .chg-day {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        background: transparent;
        border: none;
        border-bottom: 1px solid #e5e7eb;
        border-radius: 0;
        padding: 10px 12px;
      }
      .chg-day:last-child {
        border-bottom: none;
      }

      .chg-day-main {
        min-width: 0;
      }

      .chg-day-date {
        font-size: 13px;
        font-weight: 800;
        color: #111827;
        margin-bottom: 2px;
      }

      .chg-day-shifts {
        font-size: 12px;
        color: #4b5563;
      }

      .chg-day-ico {
        flex: 0 0 28px;
        width: 28px;
        height: 28px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .chg-day-ico-shift { background: #1b5e20; }
      .chg-day-ico-abs { background: #c62828; }

      .chg-card-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        padding: 0 14px 16px;
      }

      .chg-btn {
        border: none;
        border-radius: 999px;
        padding: 12px 10px;
        font-size: 13px;
        font-weight: 800;
        cursor: pointer;
      }

      .chg-btn-primary {
        background: #c62828;
        color: #fff;
        box-shadow: none;
      }

      .chg-btn-muted {
        background: #fff;
        color: #1b5e20;
        border: 2px solid #1b5e20;
      }
      .chg-options {
        display: grid;
        gap: 8px;
        padding: 0 16px 10px;
      }
      .chg-opt {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        font-weight: 500;
        color: #111827;
        background: transparent;
        border: none;
        border-radius: 0;
        padding: 0;
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

  function shortDaysHtml(alert, lang) {
    var days = (alert.days || []).slice(0, 3);
    if (!days.length) return '';

    return '<ul class="chg-days">' + days.map(function (item) {
      var newCode = item.new_shift_code || item.old_shift_code || '';
      var detail = t('shiftChange', lang) + (newCode ? ' (' + newCode + ')' : '');
      return (
        '<li class="chg-day">' +
          '<div class="chg-day-main">' +
            '<div class="chg-day-date">' + escapeHtml(item.date || '') + '</div>' +
            '<div class="chg-day-shifts">' + escapeHtml(detail) + '</div>' +
          '</div>' +
          chgClockIco() +
        '</li>'
      );
    }).join('') + '</ul>';
  }

  function absenceDaysHtml(dates, lang) {
    var list = dates || [];
    if (!list.length) return '';
    return '<ul class="chg-days">' + list.map(function (d) {
      return (
        '<li class="chg-day">' +
          '<div class="chg-day-main">' +
            '<div class="chg-day-date">' + escapeHtml(d) + '</div>' +
            '<div class="chg-day-shifts">' + escapeHtml(t('recordedAbsence', lang)) + '</div>' +
          '</div>' +
          chgAbsIco() +
        '</li>'
      );
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

  function maybePlayAlertSound(empId, alert) {
    if (!empId || empId === GUEST_EMP_ID) return;
    if (!alert || !alert.change_hash) return;
    var hash = empId + '_' + alert.change_hash;
    var n = 0;
    function tryPlay() {
      try {
        if (window.rosterAlertSound && typeof window.rosterAlertSound.playOnce === 'function') {
          window.rosterAlertSound.playOnce('alert', hash);
          return;
        }
      } catch (e) {}
      n += 1;
      if (n < 15) setTimeout(tryPlay, 200);
    }
    tryPlay();
  }

  function paintHomeAlertIcon(icon, absences, lang) {
    var n = (absences && absences.length) ? absences.length : 0;
    if (!n) {
      icon.classList.remove('has-absences');
      icon.innerHTML = '<span class="chg-dot-icon" aria-hidden="true">' + chgBellSvg(34) + '</span>';
      icon.setAttribute('aria-label', t('changed', lang));
      return;
    }
    icon.classList.add('has-absences');
    icon.innerHTML =
      '<span class="chg-dot-icon" aria-hidden="true">' + chgBellSvg(34) + '</span>' +
      '<span class="chg-dot-abs" aria-hidden="true">' +
        '<span class="chg-dot-abs-n">' + n + '</span>' +
        '<span class="chg-dot-abs-l">' + escapeHtml(t('absencesWord', lang, n)) + '</span>' +
      '</span>';
    icon.setAttribute('aria-label', t('absenceSummary', lang, n));
  }

  function ensureHomeUI(empId, alert, lang, absences, empName) {
    var icon = document.getElementById(HOME_ICON_ID);
    if (!icon) {
      icon = document.createElement('button');
      icon.id = HOME_ICON_ID;
      icon.type = 'button';
      document.body.appendChild(icon);
    }
    paintHomeAlertIcon(icon, absences, lang);

    var card = document.getElementById(HOME_CARD_ID);
    if (!card) {
      card = document.createElement('div');
      card.id = HOME_CARD_ID;
      document.body.appendChild(card);
    }

    var summaryText = alertSummaryText(alert, lang);
    var hasShiftTab = !!(alert && alert.days && alert.days.length);
    var hasAbsenceTab = !!(absences && absences.length);
    var defaultTab = hasAbsenceTab ? 'absence' : 'shift';
    var titleText = hasAbsenceTab && !hasShiftTab
      ? t('recordedAbsence', lang)
      : t('changed', lang);
    var shiftContent = shortDaysHtml(alert, lang);
    var absenceContent = absenceDaysHtml(absences || [], lang);
    var tabsHtml = (hasShiftTab && hasAbsenceTab)
      ? ('<div class="chg-tabs">' +
         '<button class="chg-tab' + (defaultTab === 'shift' ? ' active' : '') + '" data-act="tab:shift">' + escapeHtml(t('tabShift', lang)) + '</button>' +
         '<button class="chg-tab' + (defaultTab === 'absence' ? ' active' : '') + '" data-act="tab:absence">' + escapeHtml(t('tabAbsence', lang)) + '</button>' +
         '</div>')
      : '';
    var bodyHtml = (defaultTab === 'shift' ? shiftContent : absenceContent);
    var fallbackText = t('updateFor', lang) + (empName || empId);

    card.innerHTML =
      '<div class="chg-card-head">' +
        '<button class="chg-card-close" type="button" aria-label="' + escapeHtml(t('close', lang)) + '" data-act="close">×</button>' +
        '<div class="chg-card-title">' + escapeHtml(titleText) + '</div>' +
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
  // Keep legacy page keys aligned with the home-page language.
  try {
    var bootLang = localStorage.getItem('rosterLang');
    if (bootLang === 'ar' || bootLang === 'en') syncSiteLang(bootLang);
  } catch (e) {}
  var orig = window.applyLang;
  if (typeof orig === 'function') {
    window.applyLang = function (lang) {
      orig(lang);
      syncSiteLang(lang === 'ar' ? 'ar' : 'en');
      onAppLangChange();
    };
  }
  document.addEventListener('click', function (e) {
    if (e.target && e.target.closest && e.target.closest('#langToggle, #langBtn')) {
      setTimeout(function () {
        try {
          var l = localStorage.getItem('rosterLang')
            || localStorage.getItem('prefLang')
            || localStorage.getItem('importPrefLang');
          if (l === 'ar' || l === 'en') syncSiteLang(l);
        } catch (err) {}
        onAppLangChange();
      }, 0);
    }
  });
  window.addEventListener('storage', function (e) {
    if (e.key === 'rosterLang' || e.key === 'appLang' || e.key === 'prefLang' || e.key === 'importPrefLang') {
      if (e.newValue === 'ar' || e.newValue === 'en') syncSiteLang(e.newValue);
      onAppLangChange();
    }
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
    fetchJson(base + 'absence-data.json', { fresh: true }).catch(function () { return null; })
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
      var absPromise = fetchJson(base + 'absence-data.json', { fresh: true })
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

      if (absences.length) {
        var baseHash = (alert && alert.is_active && alert.change_hash) ? alert.change_hash : 'absence';
        var hasShiftDays = !!(alert && alert.days && alert.days.length);
        alert = {
          is_active: true,
          force_show: true,
          change_hash: baseHash + '|abs|' + absences.join('|'),
          total_changed_days: hasShiftDays ? alert.total_changed_days : absences.length,
          summary: hasShiftDays
            ? alert.summary
            : {
                ar: t('absenceSummary', 'ar', absences.length),
                en: t('absenceSummary', 'en', absences.length)
              },
          days: hasShiftDays ? alert.days : []
        };
      } else if (!alert || !alert.is_active) {
        if (currentEmpId === empId) clearAlertState();
        return;
      }

      lastRenderedEmpId = empId;
      lastRenderedHash = alert.change_hash || '';
      maybePlayAlertSound(empId, alert);

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

  function loadFeatureUpdateBadge() {
    try {
      if (!onHomePage()) return;
      document.documentElement.classList.add('has-float-dock');
      if (document.querySelector('script[data-feature-update-badge="1"]')) return;
      var s = document.createElement('script');
      s.src = getBase() + 'feature-update-badge.js?v=20260726d';
      s.defer = true;
      s.setAttribute('data-feature-update-badge', '1');
      s.setAttribute('data-local-src', s.src);
      document.body.appendChild(s);
    } catch (err) {}
  }

  function loadAlertSound() {
    try {
      if (window.rosterAlertSound) return;
      if (document.querySelector('script[data-alert-sound="1"]')) return;
      var s = document.createElement('script');
      s.src = getBase() + 'alert-sound.js?v=20260814t';
      s.async = true;
      s.setAttribute('data-alert-sound', '1');
      document.body.appendChild(s);
    } catch (err) {}
  }

  function start() {
    loadAlertSound();
    // Force homepage feedback UI even if index shell is an older cache.
    try {
      if (typeof window.rosterForceHomeUI === 'function') window.rosterForceHomeUI();
      else {
        var s = document.createElement('script');
        s.src = getBase() + 'home-ui-force.js?v=20260811b';
        s.async = true;
        document.head.appendChild(s);
      }
    } catch (forceErr) {}
    boot();
    loadFeatureUpdateBadge();
    // One delayed retry in case another script sets the saved employee id shortly after load.
    setTimeout(boot, 1800);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    // Script may be injected after DOMContentLoaded already fired.
    start();
  }
})();
