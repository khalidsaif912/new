/**
 * With-me page — who is on the same shift as the saved employee.
 * Swipe left/right (or use the date chip) to move between days.
 */
(function () {
  'use strict';

  var MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  var MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  var DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var DAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  var DEPT_ORDER = ['Officers', 'Supervisors', 'Load Control', 'Export Checker', 'Export Operators'];
  var DEPT_META = {
    Officers: { base: '#2563eb', light: '#2563eb15', border: '#2563eb18', grad: '#2563eb' },
    Supervisors: { base: '#0891b2', light: '#0891b215', border: '#0891b218', grad: '#0891b2' },
    'Load Control': { base: '#059669', light: '#05966915', border: '#05966918', grad: '#059669' },
    'Export Checker': { base: '#dc2626', light: '#dc262615', border: '#dc262618', grad: '#dc2626' },
    'Export Operators': { base: '#7c3aed', light: '#7c3aed15', border: '#7c3aed18', grad: '#7c3aed' }
  };
  var SHIFT_META = {
    Morning: { icon: '☀️', color: '#92400e', bg: '#fef3c7', border: '#f59e0b44' },
    Afternoon: { icon: '🌆', color: '#9a3412', bg: '#ffedd5', border: '#f9731644' },
    Night: { icon: '🌙', color: '#5b21b6', bg: '#ede9fe', border: '#8b5cf644' },
    Standby: { icon: '📞', color: '#0f766e', bg: '#ccfbf1', border: '#14b8a644' },
    Training: { icon: '📘', color: '#6d28d9', bg: '#f3e8ff', border: '#a78bfa44' },
    'Off Day': { icon: '🛋️', color: '#3730a3', bg: '#e0e7ff', border: '#6366f144' },
    'Annual Leave': { icon: '✈️', color: '#065f46', bg: '#d1fae5', border: '#10b98144' },
    'Sick Leave': { icon: '🤒', color: '#9f1239', bg: '#ffe4e6', border: '#fb718544' },
    Other: { icon: '•', color: '#334155', bg: '#f1f5f9', border: '#94a3b844' }
  };
  var REST_GROUPS = { 'Off Day': 1, 'Annual Leave': 1, 'Sick Leave': 1 };

  var I18N = {
    en: {
      titleMain: 'With me',
      titleEyebrow: 'My shift',
      back: 'Back',
      swipeHint: 'Swipe left or right to change the day',
      pickTitle: 'Choose your name',
      pickHint: 'So we can show who is on shift with you',
      pickSearch: 'Search name or ID',
      pickSave: 'Continue',
      loading: 'Loading the roster…',
      missingEmp: 'Select your name to see who is with you.',
      noRoster: 'No roster for this date.',
      restTitle: 'You are off',
      restBody: 'Nobody is rostered with you on this day.',
      you: 'You',
      total: 'Total',
      people: 'colleagues',
      changeEmp: 'Change person',
      close: 'Close',
      officers: 'Officers',
      supervisors: 'Supervisors',
      loadControl: 'Load Control',
      exportChecker: 'Export Checker',
      exportOps: 'Export Operators',
      unassigned: 'Unassigned',
      morning: 'Morning',
      afternoon: 'Afternoon',
      night: 'Night',
      offday: 'Off Day',
      annualLeave: 'Annual Leave',
      sickLeave: 'Sick Leave',
      training: 'Training',
      standby: 'Standby',
      other: 'Other'
    },
    ar: {
      titleMain: 'معي',
      titleEyebrow: 'مناوبتي',
      back: 'رجوع',
      swipeHint: 'مرّر يميناً أو يساراً لتغيير اليوم',
      pickTitle: 'اختر اسمك',
      pickHint: 'حتى نعرض من سيكون معك في المناوبة',
      pickSearch: 'ابحث بالاسم أو الرقم',
      pickSave: 'متابعة',
      loading: 'جاري تحميل الجدول…',
      missingEmp: 'اختر اسمك لمعرفة من معك.',
      noRoster: 'لا يوجد جدول لهذا التاريخ.',
      restTitle: 'أنت في إجازة',
      restBody: 'لا يوجد أحد معك في هذا اليوم.',
      you: 'أنت',
      total: 'المجموع',
      people: 'زملاء',
      changeEmp: 'تغيير الشخص',
      close: 'إغلاق',
      officers: 'الضباط',
      supervisors: 'المشرفون',
      loadControl: 'مراقبة الحمولة',
      exportChecker: 'مدقق الصادرات',
      exportOps: 'مشغلو الصادرات',
      unassigned: 'غير مُعيَّن',
      morning: 'صباح',
      afternoon: 'ظهر',
      night: 'ليل',
      offday: 'إجازة',
      annualLeave: 'إجازة سنوية',
      sickLeave: 'إجازة مرضية',
      training: 'تدريب',
      standby: 'احتياط',
      other: 'أخرى'
    }
  };

  var DEPT_I18N = {
    Officers: 'officers',
    Supervisors: 'supervisors',
    'Load Control': 'loadControl',
    'Export Checker': 'exportChecker',
    'Export Operators': 'exportOps',
    Unassigned: 'unassigned'
  };
  var SHIFT_I18N = {
    Morning: 'morning',
    Afternoon: 'afternoon',
    Night: 'night',
    'Off Day': 'offday',
    'Annual Leave': 'annualLeave',
    'Sick Leave': 'sickLeave',
    Training: 'training',
    Standby: 'standby',
    Other: 'other'
  };

  var state = {
    lang: 'en',
    empId: '',
    empName: '',
    empDept: '',
    schedule: null,
    date: '',
    minDate: '',
    maxDate: '',
    rosterCache: {},
    index: null,
    anim: ''
  };

  function t(key) {
    var pack = I18N[state.lang] || I18N.en;
    return pack[key] || I18N.en[key] || key;
  }

  function getSiteRootPath() {
    if (location.protocol === 'file:') return '';
    var path = location.pathname || '/';
    if (path.includes('/roster-site/')) return '/roster-site';
    if (location.hostname && location.hostname.endsWith('github.io')) {
      var segs = path.split('/').filter(Boolean);
      if (segs.length >= 2 && segs[1] === 'docs') return '/' + segs[0] + '/docs';
      return segs.length ? '/' + segs[0] : '';
    }
    return '';
  }

  function rootUrl() {
    return location.origin + getSiteRootPath();
  }

  function pad2(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function muscatToday() {
    var now = new Date();
    var muscat = new Date(now.getTime() + (4 * 3600 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
    return muscat.getFullYear() + '-' + pad2(muscat.getMonth() + 1) + '-' + pad2(muscat.getDate());
  }

  function addDays(iso, delta) {
    var p = (iso || '').split('-');
    if (p.length !== 3) return iso;
    var d = new Date(Date.UTC(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10)));
    d.setUTCDate(d.getUTCDate() + delta);
    return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate());
  }

  function formatDate(iso) {
    var p = (iso || '').split('-');
    if (p.length !== 3) return iso || '';
    var d = parseInt(p[2], 10);
    var mo = parseInt(p[1], 10);
    var y = p[0];
    var months = state.lang === 'ar' ? MONTHS_AR : MONTHS_EN;
    return d + ' ' + (months[mo - 1] || mo) + ' ' + y;
  }

  function weekday(iso) {
    var p = (iso || '').split('-');
    if (p.length !== 3) return '';
    var d = new Date(Date.UTC(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10)));
    var names = state.lang === 'ar' ? DAYS_AR : DAYS_EN;
    return names[d.getUTCDay()] || '';
  }

  function empIdFromLabel(label) {
    var m = String(label || '').match(/(\d{3,8})\s*$/);
    return m ? m[1] : '';
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function readSavedEmp() {
    try {
      var q = new URLSearchParams(location.search);
      var qid = (q.get('emp') || '').trim();
      if (qid) return qid;
      return (
        localStorage.getItem('exportSavedEmpId') ||
        localStorage.getItem('savedEmpId') ||
        ''
      ).trim();
    } catch (e) {
      return '';
    }
  }

  function saveEmp(id, name) {
    try {
      localStorage.setItem('exportSavedEmpId', id);
      localStorage.setItem('savedEmpId', id);
      if (name) {
        localStorage.setItem('exportSavedEmpName', name);
        localStorage.setItem('savedEmpName', name);
      }
    } catch (e) {}
  }

  function readLang() {
    try {
      var l = localStorage.getItem('rosterLang') || document.documentElement.getAttribute('lang') || 'en';
      return l === 'ar' ? 'ar' : 'en';
    } catch (e) {
      return 'en';
    }
  }

  function applyLang(lang) {
    state.lang = lang === 'ar' ? 'ar' : 'en';
    try { localStorage.setItem('rosterLang', state.lang); } catch (e) {}
    document.documentElement.setAttribute('lang', state.lang);
    document.documentElement.setAttribute('dir', state.lang === 'ar' ? 'rtl' : 'ltr');
    document.body.classList.toggle('ar', state.lang === 'ar');
    var lbl = document.getElementById('langToggleLabel');
    if (lbl) lbl.textContent = state.lang === 'ar' ? 'EN' : 'ع';
    var back = document.getElementById('backBtn');
    if (back) back.textContent = t('back');
    var hint = document.getElementById('swipeHint');
    if (hint) hint.textContent = t('swipeHint');
    var pickTitle = document.getElementById('pickTitle');
    if (pickTitle) pickTitle.textContent = t('pickTitle');
    var pickHint = document.getElementById('pickHint');
    if (pickHint) pickHint.textContent = t('pickHint');
    var pickSearch = document.getElementById('pickSearch');
    if (pickSearch) pickSearch.placeholder = t('pickSearch');
    var changeEmp = document.getElementById('changeEmpBtn');
    if (changeEmp) changeEmp.textContent = t('changeEmp');
    var pickClose = document.getElementById('pickCloseBtn');
    if (pickClose) pickClose.textContent = t('close');
    paintChrome();
    if (state.date) renderDay(state.date, '');
  }

  function dayFromSchedule(iso) {
    var sch = state.schedule;
    if (!sch || !sch.schedules) return null;
    var month = iso.slice(0, 7);
    var rows = sch.schedules[month] || [];
    for (var i = 0; i < rows.length; i++) {
      if (rows[i] && rows[i].date === iso) return rows[i];
    }
    return null;
  }

  function collectDates(sch) {
    var out = [];
    if (!sch || !sch.schedules) return out;
    Object.keys(sch.schedules).sort().forEach(function (month) {
      (sch.schedules[month] || []).forEach(function (row) {
        if (row && row.date) out.push(row.date);
      });
    });
    out.sort();
    return out;
  }

  function parseRosterHtml(html, shiftKey) {
    var doc;
    try {
      doc = new DOMParser().parseFromString(html, 'text/html');
    } catch (e) {
      return [];
    }
    var groups = [];
    var cards = doc.querySelectorAll('.deptCard');
    Array.prototype.forEach.call(cards, function (card) {
      var titleEl = card.querySelector('.deptTitle');
      var dept = titleEl ? (titleEl.getAttribute('data-key') || titleEl.textContent || '').trim() : '';
      if (!dept) return;
      var shift = card.querySelector('.shiftCard[data-shift="' + shiftKey.replace(/"/g, '') + '"]');
      if (!shift) return;
      var people = [];
      Array.prototype.forEach.call(shift.querySelectorAll('.empRow'), function (row) {
        var name = (row.getAttribute('data-emp-name') || '').trim();
        if (!name) {
          var nEl = row.querySelector('.empName');
          name = nEl ? nEl.textContent.trim() : '';
        }
        if (!name) return;
        var nEl2 = row.querySelector('.empName');
        var nameAr = nEl2 ? (nEl2.getAttribute('data-name-ar') || '') : '';
        var statusEl = row.querySelector('.empStatus');
        people.push({
          name: name,
          nameAr: nameAr,
          id: empIdFromLabel(name),
          status: statusEl ? statusEl.textContent.replace(/\s+/g, ' ').trim() : ''
        });
      });
      if (people.length) groups.push({ dept: dept, people: people });
    });
    groups.sort(function (a, b) {
      var ia = DEPT_ORDER.indexOf(a.dept);
      var ib = DEPT_ORDER.indexOf(b.dept);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
    return groups;
  }

  function loadRoster(iso) {
    if (state.rosterCache[iso]) return state.rosterCache[iso];
    var url = rootUrl() + '/date/' + encodeURIComponent(iso) + '/index.html';
    var p = fetch(url, { credentials: 'same-origin' }).then(function (res) {
      if (!res.ok) {
        return fetch(rootUrl() + '/date/' + encodeURIComponent(iso) + '/', { credentials: 'same-origin' }).then(function (res2) {
          if (!res2.ok) throw new Error('missing');
          return res2.text();
        });
      }
      return res.text();
    }).then(function (html) {
      return { html: html, ok: true };
    }).catch(function () {
      return { html: '', ok: false };
    });
    state.rosterCache[iso] = p;
    return p;
  }

  function prefetch(iso) {
    [addDays(iso, -1), addDays(iso, 1)].forEach(function (d) {
      if (d && d >= state.minDate && d <= state.maxDate) loadRoster(d);
    });
  }

  function deptLabel(name) {
    var key = DEPT_I18N[name];
    return key ? t(key) : name;
  }

  function shiftLabel(name) {
    var key = SHIFT_I18N[name];
    return key ? t(key) : name;
  }

  function paintChrome() {
    var eyebrow = document.getElementById('pageTitleEyebrow');
    var main = document.getElementById('pageTitleMain');
    if (main) main.textContent = t('titleMain');
    if (eyebrow) {
      eyebrow.textContent = state.empName
        ? state.empName.replace(/\s*-\s*\d+\s*$/, '').trim()
        : t('titleEyebrow');
    }
    var dateLbl = document.getElementById('dateTagLabel');
    if (dateLbl && state.date) dateLbl.textContent = formatDate(state.date);
    var picker = document.getElementById('datePicker');
    if (picker) {
      picker.value = state.date || '';
      if (state.minDate) picker.min = state.minDate;
      if (state.maxDate) picker.max = state.maxDate;
    }
    var weekdayEl = document.getElementById('weekdayLabel');
    if (weekdayEl) weekdayEl.textContent = weekday(state.date);
  }

  function setLoading(on) {
    var el = document.getElementById('crewStatus');
    if (!el) return;
    el.hidden = !on;
    if (on) el.textContent = t('loading');
  }

  function renderRest(row) {
    var group = (row && row.shift_group) || 'Off Day';
    var meta = SHIFT_META[group] || SHIFT_META.Other;
    return (
      '<div class="restCard" style="background:' + meta.bg + ';border-color:' + meta.border + '">' +
      '<div class="restIcon">' + meta.icon + '</div>' +
      '<h2>' + escapeHtml(t('restTitle')) + '</h2>' +
      '<p class="restShift" style="color:' + meta.color + '">' + escapeHtml(shiftLabel(group)) + '</p>' +
      '<p>' + escapeHtml(t('restBody')) + '</p>' +
      '</div>'
    );
  }

  function renderGroups(groups, shiftKey, selfId) {
    var meta = SHIFT_META[shiftKey] || SHIFT_META.Other;
    var total = 0;
    groups.forEach(function (g) { total += g.people.length; });
    var html = '';
    html += '<div class="shiftBanner" style="background:' + meta.bg + ';border-color:' + meta.border + ';color:' + meta.color + '">';
    html += '<span class="shiftBannerIcon">' + meta.icon + '</span>';
    html += '<span class="shiftBannerName">' + escapeHtml(shiftLabel(shiftKey)) + '</span>';
    html += '<span class="shiftBannerCount">' + total + ' ' + escapeHtml(t('people')) + '</span>';
    html += '</div>';
    groups.forEach(function (g) {
      var colors = DEPT_META[g.dept] || DEPT_META.Officers;
      html += '<div class="deptCard">';
      html += '<div class="deptBar" style="background:linear-gradient(to right,' + colors.grad + ',' + colors.grad + 'cc)"></div>';
      html += '<div class="deptHead" style="border-bottom:2px solid ' + colors.border + '">';
      html += '<div class="deptIcon" style="background:' + colors.light + ';color:' + colors.base + '">';
      html += '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M3 10h18M5 21V10l7-6 7 6v11"/><rect x="9" y="14" width="2" height="3"/><rect x="13" y="14" width="2" height="3"/></svg>';
      html += '</div>';
      html += '<div class="deptTitle">' + escapeHtml(deptLabel(g.dept)) + '</div>';
      html += '<div class="deptBadge" style="background:' + colors.light + ';color:' + colors.base + ';border:1px solid ' + colors.border + '">';
      html += '<span>' + escapeHtml(t('total')) + '</span><strong>' + g.people.length + '</strong>';
      html += '</div></div>';
      html += '<div class="empList" style="border:1px solid ' + meta.border + ';background:' + meta.bg + '">';
      g.people.forEach(function (p, i) {
        var isSelf = p.id && p.id === selfId;
        var display = state.lang === 'ar' && p.nameAr ? p.nameAr : p.name;
        html += '<div class="empRow' + (i % 2 ? ' empRowAlt' : '') + (isSelf ? ' is-self' : '') + '" data-emp-id="' + escapeHtml(p.id) + '">';
        html += '<span class="empName">' + escapeHtml(display) + '</span>';
        if (isSelf) {
          html += '<span class="empMeta"><span class="youPill">' + escapeHtml(t('you')) + '</span></span>';
        }
        html += '</div>';
      });
      html += '</div></div>';
    });
    return html;
  }

  function renderDay(iso, anim) {
    state.date = iso;
    paintChrome();
    var track = document.getElementById('crewTrack');
    if (!track) return;
    var row = dayFromSchedule(iso);
    var shiftKey = row && row.shift_group ? row.shift_group : '';
    setLoading(true);
    document.getElementById('crewEmpty').hidden = true;

    function finish(html) {
      setLoading(false);
      track.classList.remove('slide-left', 'slide-right');
      if (anim) {
        void track.offsetWidth;
        track.classList.add(anim);
      }
      track.innerHTML = html;
      prefetch(iso);
      try {
        var url = new URL(location.href);
        url.searchParams.set('date', iso);
        if (state.empId) url.searchParams.set('emp', state.empId);
        history.replaceState({ date: iso }, '', url);
      } catch (e) {}
    }

    if (!shiftKey) {
      finish('<div class="restCard"><p>' + escapeHtml(t('noRoster')) + '</p></div>');
      return;
    }
    if (REST_GROUPS[shiftKey]) {
      finish(renderRest(row));
      return;
    }

    loadRoster(iso).then(function (pack) {
      if (state.date !== iso) return;
      if (!pack.ok) {
        finish('<div class="restCard"><p>' + escapeHtml(t('noRoster')) + '</p></div>');
        return;
      }
      var groups = parseRosterHtml(pack.html, shiftKey);
      if (!groups.length) {
        finish('<div class="restCard"><p>' + escapeHtml(t('noRoster')) + '</p></div>');
        return;
      }
      finish(renderGroups(groups, shiftKey, state.empId));
    });
  }

  function canGo(delta) {
    var next = addDays(state.date, delta);
    if (!next) return false;
    if (state.minDate && next < state.minDate) return false;
    if (state.maxDate && next > state.maxDate) return false;
    return true;
  }

  function go(delta) {
    if (!canGo(delta)) return;
    var anim = delta > 0 ? 'slide-left' : 'slide-right';
    renderDay(addDays(state.date, delta), anim);
  }

  function bindSwipe(el) {
    var startX = 0;
    var startY = 0;
    var tracking = false;
    el.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.target.closest('a, button, input, select, .datePickerWrapper, .pickSheet')) return;
      startX = e.clientX;
      startY = e.clientY;
      tracking = true;
    });
    window.addEventListener('pointerup', function (e) {
      if (!tracking) return;
      tracking = false;
      if (document.getElementById('pickSheet') && document.getElementById('pickSheet').classList.contains('open')) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.15) return;
      go(dx < 0 ? 1 : -1);
    });
    window.addEventListener('pointercancel', function () { tracking = false; });
  }

  function loadIndex() {
    if (state.index) return Promise.resolve(state.index);
    return fetch(rootUrl() + '/schedules/index.json', { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (json) {
        state.index = json;
        return json;
      });
  }

  function loadSchedule(empId) {
    return fetch(rootUrl() + '/schedules/' + encodeURIComponent(empId) + '.json', { credentials: 'same-origin' })
      .then(function (r) {
        if (!r.ok) throw new Error('no schedule');
        return r.json();
      });
  }

  function openPicker() {
    var sheet = document.getElementById('pickSheet');
    if (!sheet) return;
    sheet.classList.add('open');
    sheet.setAttribute('aria-hidden', 'false');
    loadIndex().then(function (json) {
      paintPicker((json && json.employees) || []);
    }).catch(function () {
      paintPicker([]);
    });
  }

  function closePicker() {
    var sheet = document.getElementById('pickSheet');
    if (!sheet) return;
    sheet.classList.remove('open');
    sheet.setAttribute('aria-hidden', 'true');
  }

  function paintPicker(list) {
    var box = document.getElementById('pickList');
    var qEl = document.getElementById('pickSearch');
    if (!box) return;
    var q = ((qEl && qEl.value) || '').trim().toLowerCase();
    var html = '';
    list.forEach(function (emp) {
      var hay = ((emp.name || '') + ' ' + (emp.id || '') + ' ' + (emp.department || '')).toLowerCase();
      if (q && hay.indexOf(q) === -1) return;
      html += '<button type="button" class="pickRow" data-id="' + escapeHtml(emp.id) + '" data-name="' + escapeHtml(emp.name || '') + '">';
      html += '<span class="pickName">' + escapeHtml(emp.name || emp.id) + ' · ' + escapeHtml(emp.id) + '</span>';
      html += '<span class="pickDept">' + escapeHtml(deptLabel(emp.department || '')) + '</span>';
      html += '</button>';
    });
    box.innerHTML = html || '<p class="pickEmpty">' + escapeHtml(t('missingEmp')) + '</p>';
  }

  function startForEmployee(empId) {
    state.empId = empId;
    setLoading(true);
    loadSchedule(empId).then(function (json) {
      state.schedule = json;
      state.empName = json.name ? (json.name + ' - ' + empId) : empId;
      state.empDept = json.department || '';
      var dates = collectDates(json);
      state.minDate = dates[0] || '';
      state.maxDate = dates[dates.length - 1] || '';
      var q = new URLSearchParams(location.search);
      var wanted = (q.get('date') || '').trim() || muscatToday();
      if (state.minDate && wanted < state.minDate) wanted = state.minDate;
      if (state.maxDate && wanted > state.maxDate) wanted = state.maxDate;
      paintChrome();
      closePicker();
      renderDay(wanted, '');
    }).catch(function () {
      setLoading(false);
      openPicker();
    });
  }

  function init() {
    state.lang = readLang();
    applyLang(state.lang);
    var home = document.getElementById('backBtn');
    if (home) home.href = rootUrl() + '/';
    document.getElementById('langToggle')?.addEventListener('click', function () {
      applyLang(state.lang === 'en' ? 'ar' : 'en');
    });
    document.getElementById('prevDayBtn')?.addEventListener('click', function () { go(-1); });
    document.getElementById('nextDayBtn')?.addEventListener('click', function () { go(1); });
    document.getElementById('datePicker')?.addEventListener('change', function () {
      if (this.value) renderDay(this.value, '');
    });
    document.getElementById('changeEmpBtn')?.addEventListener('click', openPicker);
    document.getElementById('pickCloseBtn')?.addEventListener('click', closePicker);
    document.getElementById('pickSheet')?.addEventListener('click', function (e) {
      if (e.target === e.currentTarget) closePicker();
    });
    document.getElementById('pickSearch')?.addEventListener('input', function () {
      var emps = (state.index && state.index.employees) || [];
      paintPicker(emps);
    });
    document.getElementById('pickList')?.addEventListener('click', function (e) {
      var row = e.target.closest('.pickRow');
      if (!row) return;
      var id = row.getAttribute('data-id');
      var name = row.getAttribute('data-name') || '';
      if (!id) return;
      saveEmp(id, name);
      startForEmployee(id);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') go(state.lang === 'ar' ? 1 : -1);
      if (e.key === 'ArrowRight') go(state.lang === 'ar' ? -1 : 1);
      if (e.key === 'Escape') closePicker();
    });
    bindSwipe(document.getElementById('pageWrap') || document.body);

    var empId = readSavedEmp();
    if (!empId) {
      setLoading(false);
      var empty = document.getElementById('crewEmpty');
      if (empty) {
        empty.hidden = false;
        empty.textContent = t('missingEmp');
      }
      openPicker();
      return;
    }
    startForEmployee(empId);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.rosterWithMe = {
    parseRosterHtml: parseRosterHtml,
    empIdFromLabel: empIdFromLabel,
    addDays: addDays
  };
})();
