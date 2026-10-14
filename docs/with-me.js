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

  var DEPT_ORDER = [
    'Supervisors', 'Load Control', 'Export Checker', 'Export Operators',
    'Documentation', 'Import Checkers', 'Release Control', 'Import Operators',
    'Flight Dispatch', 'Flight Dispatch (Export)', 'Flight Dispatch (Import)', 'FLTA',
    'Officers'
  ];
  var IMPORT_WITH_ME_DEPTS = { FLTA: 1 };
  var IMPORT_ROSTER_DEPTS = {
    FLTA: 1,
    Supervisors: 1,
    'Flight Dispatch': 1,
    'Flight Dispatch (Export)': 1,
    'Flight Dispatch (Import)': 1,
    Documentation: 1,
    'Import Checkers': 1,
    'Import Operators': 1,
    'Release Control': 1
  };
  var EXPORT_ONLY_DEPTS = {
    'Load Control': 1,
    'Export Checker': 1,
    'Export Operators': 1,
    Officers: 1
  };
  var SHIFT_META = {
    Morning: { icon: '☀️' },
    Afternoon: { icon: '🌆' },
    Night: { icon: '🌙' },
    Standby: { icon: '📞' },
    Training: { icon: '📘' },
    'Off Day': { icon: '🛋️' },
    'Annual Leave': { icon: '✈️' },
    'Sick Leave': { icon: '🤒' },
    Other: { icon: '•' }
  };
  var REST_GROUPS = { 'Off Day': 1, 'Annual Leave': 1, 'Sick Leave': 1 };

  var I18N = {
    en: {
      titleMain: 'With me',
      titleEyebrow: 'My shift',
      back: 'Back',
      pickTitle: 'Choose your name',
      pickHint: 'So we can show who is on shift with you',
      pickSearch: 'Search name or ID',
      pickSave: 'Continue',
      loading: 'Loading the roster…',
      missingEmp: 'Select your name to see who is with you.',
      noRoster: 'No roster for this date.',
      restTitle: 'You are on leave 🌿',
      restSubtitle: 'Your day',
      you: 'You',
      total: 'Total',
      people: 'colleagues',
      changeEmp: 'Choose another employee',
      close: 'Close',
      officers: 'Officers',
      supervisors: 'Supervisors',
      loadControl: 'Load Control',
      exportChecker: 'Export Checker',
      exportOps: 'Export Operators',
      flightDispatch: 'Flight Dispatch',
      flightDispatchExport: 'Flight Dispatch (Export)',
      flightDispatchImport: 'Flight Dispatch (Import)',
      flta: 'FLTA',
      documentation: 'Documentation',
      importCheckers: 'Import Checkers',
      importOperators: 'Import Operators',
      releaseControl: 'Release Control',
      unassigned: 'Unassigned',
      morning: 'Morning',
      afternoon: 'Afternoon',
      night: 'Night',
      offday: 'Off Day',
      annualLeave: 'Annual Leave',
      sickLeave: 'Sick Leave',
      training: 'Training',
      standby: 'Standby',
      other: 'Other',
      secretPrompt: 'This account is protected. Enter the secret PIN to continue:',
      secretBad: 'Incorrect secret PIN.',
      togetherYou: 'You — every day this month',
      togetherOne: '1 day with you this month',
      togetherMany: ' days with you this month',
      statsBtn: 'Department stats',
      statsBtnTitle: 'Show department counts for upcoming days',
      listBtnTitle: 'Back to colleagues list',
      statsHint: 'Swipe for more days',
      statsLoading: 'Loading department counts…',
      statsEmpty: 'No department data for these days.',
      statsDept: 'Department'
    },
    ar: {
      titleMain: 'معي',
      titleEyebrow: 'مناوبتي',
      back: 'رجوع',
      pickTitle: 'اختر اسمك',
      pickHint: 'حتى نعرض من سيكون معك في المناوبة',
      pickSearch: 'ابحث بالاسم أو الرقم',
      pickSave: 'متابعة',
      loading: 'جاري تحميل الجدول…',
      missingEmp: 'اختر اسمك لمعرفة من معك.',
      noRoster: 'لا يوجد جدول لهذا التاريخ.',
      restTitle: 'أنت في إجازة 🌿',
      restSubtitle: 'يومك لك',
      you: 'أنت',
      total: 'المجموع',
      people: 'زملاء',
      changeEmp: 'اختيار موظف آخر',
      close: 'إغلاق',
      officers: 'الضباط',
      supervisors: 'المشرفون',
      loadControl: 'مراقبة الحمولة',
      exportChecker: 'مدقق الصادرات',
      exportOps: 'مشغلو الصادرات',
      flightDispatch: 'تجهيز الرحلات',
      flightDispatchExport: 'تجهيز الرحلات (الصادر)',
      flightDispatchImport: 'تجهيز الرحلات (الوارد)',
      flta: 'FLTA',
      documentation: 'المستندات',
      importCheckers: 'مدققو الواردات',
      importOperators: 'مشغلو الواردات',
      releaseControl: 'مراقبة الإفراج',
      unassigned: 'غير مُعيَّن',
      morning: 'صباح',
      afternoon: 'ظهر',
      night: 'ليل',
      offday: 'إجازة',
      annualLeave: 'إجازة سنوية',
      sickLeave: 'إجازة مرضية',
      training: 'تدريب',
      standby: 'احتياط',
      other: 'أخرى',
      secretPrompt: 'هذا الحساب محمي. أدخل الرقم السري للمتابعة:',
      secretBad: 'الرقم السري غير صحيح.',
      togetherYou: 'أنت — طوال أيام الشهر',
      togetherOne: 'يوم واحد معك هذا الشهر',
      togetherMany: ' أيام معك هذا الشهر',
      statsBtn: 'إحصائيات الأقسام',
      statsBtnTitle: 'عرض عدد الموظفين في الأقسام للأيام القادمة',
      listBtnTitle: 'العودة لقائمة الزملاء',
      statsHint: 'اسحب لعرض المزيد من الأيام',
      statsLoading: 'جاري تحميل أعداد الأقسام…',
      statsEmpty: 'لا توجد بيانات أقسام لهذه الأيام.',
      statsDept: 'القسم'
    }
  };

  var REST_QUOTES = {
    en: [
      { lead: 'Today is yours ❤️', body: 'Step away from work and enjoy time with the people you love.' },
      { lead: 'A break you deserve 🌿', body: 'Take a deep breath — today is not for work.' },
      { lead: 'Leave is best with loved ones ❤️', body: 'Enjoy your day and make a beautiful memory.' },
      { lead: 'Today is for life, not work ☀️', body: 'Enjoy your time and give your family your best moments.' },
      { lead: 'Close the work door, open happiness 😊', body: 'A happy day to you and your family.' },
      { lead: 'Take your time 🌿', body: 'Life is not all work — rest well and recharge for brighter days.' },
      { lead: 'Today your appointment is rest ❤️', body: 'Enjoy your leave and step back from work pressure.' },
      { lead: 'The best part of leave is time for those we love.', body: 'Enjoy your day with your family.' },
      { lead: 'Today is yours — no alarm, no pressure, no shift 😌', body: 'Just rest and good time.' },
      { lead: 'Make today a memory worth keeping ❤️', body: 'Happy leave to you and those you love.' },
      { lead: 'Your day… enjoy it your way ❤️', body: 'Work can wait — beautiful moments do not.' },
      { lead: 'Give yourself and your family a day of rest and joy 🌸', body: 'A calm heart and precious time together.' },
      { lead: 'A beautiful break… calm hearts… time with loved ones ❤️', body: 'Enjoy your leave and breathe easy.' },
      { lead: 'A lovely day away from work 🌿', body: 'Enjoy your leave and make happy memories with your family ❤️' }
    ],
    ar: [
      { lead: 'اليوم لك ولعائلتك ❤️', body: 'اترك العمل جانبًا واستمتع بمن تحب.' },
      { lead: 'استراحة تستحقها 🌿', body: 'خذ نفسًا عميقًا… اليوم لا مكان للعمل.' },
      { lead: 'الإجازة أجمل حين تُقضى مع من نحب ❤️', body: 'استمتع بيومك واصنع ذكرى جميلة.' },
      { lead: 'اليوم ليس للعمل… اليوم للحياة ☀️', body: 'استمتع بوقتك، وامنح عائلتك أجمل لحظاتك.' },
      { lead: 'أغلق باب العمل وافتح باب السعادة 😊', body: 'يوم سعيد لك ولعائلتك.' },
      { lead: 'خذ وقتك… فالحياة ليست كلها عملًا 🌿', body: 'استمتع براحتك واستعد لأيام أجمل.' },
      { lead: 'موعدك اليوم مع الراحة ❤️', body: 'استمتع بإجازتك وابتعد قليلًا عن ضغط العمل.' },
      { lead: 'أجمل ما في الإجازة أن نملك وقتًا لمن نحب.', body: 'استمتع بيومك مع عائلتك.' },
      { lead: 'اليوم لك… بلا منبه، بلا ضغط، بلا دوام 😌', body: 'فقط راحة ووقت جميل.' },
      { lead: 'اصنع اليوم ذكرى تستحق أن تتذكرها ❤️', body: 'إجازة سعيدة لك ولمن تحب.' },
      { lead: 'اليوم لك… استمتع به كما تحب ❤️', body: 'خذ قسطًا من الراحة، واستمتع بوقتك مع من تحب.' },
      { lead: 'العمل ينتظر، أما اللحظات الجميلة فلا تنتظر.', body: 'استمتع بإجازتك.' },
      { lead: 'امنح نفسك وعائلتك يومًا من الراحة والفرح 🌸', body: 'استراحة جميلة ووقت ثمين مع من تحب.' },
      { lead: 'استراحة جميلة… وقلوب مطمئنة… ووقت ثمين مع من تحب ❤️', body: 'استمتع بإجازتك واصنع ذكريات جميلة.' },
      { lead: 'يوم جميل بعيدًا عن العمل 🌿', body: 'لا يوجد دوام اليوم، فخذ قسطًا من الراحة واستمتع بوقتك مع من تحب.' }
    ]
  };

  var DEPT_I18N = {
    Officers: 'officers',
    Supervisors: 'supervisors',
    'Load Control': 'loadControl',
    'Export Checker': 'exportChecker',
    'Export Operators': 'exportOps',
    'Flight Dispatch': 'flightDispatch',
    'Flight Dispatch (Export)': 'flightDispatchExport',
    'Flight Dispatch (Import)': 'flightDispatchImport',
    FLTA: 'flta',
    Documentation: 'documentation',
    'Import Checkers': 'importCheckers',
    'Import Operators': 'importOperators',
    'Release Control': 'releaseControl',
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

  var SHIFT_CLASS = {
    Morning: 'sg-morning',
    Afternoon: 'sg-afternoon',
    Night: 'sg-night',
    'Off Day': 'sg-off',
    'Annual Leave': 'sg-leave',
    'Sick Leave': 'sg-sick',
    Training: 'sg-training',
    Standby: 'sg-standby',
    Other: 'sg-other'
  };

  var DAYS_SHORT_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var DAYS_SHORT_AR = ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'];

  var state = {
    lang: 'en',
    empId: '',
    empName: '',
    empNameAr: '',
    empDept: '',
    schedule: null,
    date: '',
    minDate: '',
    maxDate: '',
    rosterCache: {},
    index: null,
    anim: '',
    rosterKind: 'export',
    stripBuiltFor: '',
    namesArData: null,
    coShift: {
      token: '',
      workDays: 0,
      counts: Object.create(null),
      ready: false,
      promise: null
    },
    statsMode: false,
    statsShiftKey: '',
    statsWindowIndex: 0,
    statsToken: 0,
    statsSelectedDept: ''
  };

  var namesArPromise = null;

  function loadNamesAr() {
    if (namesArPromise) return namesArPromise;
    namesArPromise = fetch(rootUrl() + '/roster-diff/names-ar.json', { credentials: 'same-origin' })
      .then(function (r) {
        if (!r.ok) return { export: { byId: {}, byEn: {} }, import: { byId: {}, byEn: {} } };
        return r.json();
      })
      .catch(function () {
        return { export: { byId: {}, byEn: {} }, import: { byId: {}, byEn: {} } };
      })
      .then(function (data) {
        state.namesArData = data;
        return data;
      });
    return namesArPromise;
  }

  function lookupNameArFromIndex(data, empId, enName) {
    if (!data) return '';
    var id = String(empId || '').trim();
    if (id) {
      var fromExport = data.export && data.export.byId && data.export.byId[id];
      if (fromExport) return String(fromExport).trim();
      var fromImport = data.import && data.import.byId && data.import.byId[id];
      if (fromImport) return String(fromImport).trim();
    }
    var en = displayName(enName || '').toLowerCase();
    if (en) {
      var byEnExport = data.export && data.export.byEn && data.export.byEn[en];
      if (byEnExport) return String(byEnExport).trim();
      var byEnImport = data.import && data.import.byEn && data.import.byEn[en];
      if (byEnImport) return String(byEnImport).trim();
    }
    return '';
  }

  function syncEmpNameAr() {
    if (!state.empId) {
      state.empNameAr = '';
      return '';
    }
    var hit = lookupNameArFromIndex(state.namesArData, state.empId, state.empName);
    if (hit) state.empNameAr = hit;
    return state.empNameAr;
  }

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

  function usesImportRoster(dept) {
    return !!IMPORT_ROSTER_DEPTS[String(dept || '').trim()];
  }

  function rosterPrefix() {
    return state.rosterKind === 'import' ? '/import' : '';
  }

  function setRosterKind(kind) {
    var next = kind === 'import' ? 'import' : 'export';
    if (state.rosterKind !== next) {
      state.rosterKind = next;
      state.rosterCache = {};
    }
  }

  function fetchScheduleJson(path) {
    return fetch(rootUrl() + path, { credentials: 'same-origin' }).then(function (r) {
      if (!r.ok) throw new Error('missing');
      return r.json();
    });
  }

  function resolveSchedule(empId) {
    return Promise.all([
      fetchScheduleJson('/schedules/' + encodeURIComponent(empId) + '.json').catch(function () { return null; }),
      fetchScheduleJson('/import/schedules/' + encodeURIComponent(empId) + '.json').catch(function () { return null; })
    ]).then(function (results) {
      var exportSch = results[0];
      var importSch = results[1];
      if (pageIsImport()) {
        if (importSch) {
          setRosterKind('import');
          return importSch;
        }
        if (exportSch) {
          setRosterKind('import');
          return exportSch;
        }
        throw new Error('no schedule');
      }
      var wantsImport = (importSch && usesImportRoster(importSch.department)) ||
        (exportSch && usesImportRoster(exportSch.department));
      if (importSch && (wantsImport || !exportSch)) {
        setRosterKind('import');
        return importSch;
      }
      if (exportSch) {
        setRosterKind('export');
        return exportSch;
      }
      if (importSch) {
        setRosterKind('import');
        return importSch;
      }
      throw new Error('no schedule');
    });
  }

  function rootUrl() {
    return location.origin + getSiteRootPath();
  }

  var PAGE_TX_KEY = 'rosterBgTextureV1';
  var BANNER_TX_KEY = 'rosterWithMeBannerTextureV1';
  var PATTERN_BASE = 'https://www.transparenttextures.com/patterns/';

  function patternUrl(slug) {
    return PATTERN_BASE + String(slug || '').replace(/[^a-z0-9_-]/gi, '') + '.png';
  }

  function readPageTexture() {
    try {
      var raw = localStorage.getItem(PAGE_TX_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      return data && data.color ? data : null;
    } catch (e) {
      return null;
    }
  }

  function saveBannerTexture(color, pattern) {
    try {
      localStorage.setItem(
        BANNER_TX_KEY,
        JSON.stringify({ color: color, pattern: pattern || '' })
      );
    } catch (e) {}
  }

  /** Same hue as the page color, but darker so white date text stays readable. */
  function darkenPageColor(color) {
    var hsl = String(color || '').match(
      /hsl\(\s*([\d.]+)\s*,\s*([\d.]+)\s*%\s*,\s*([\d.]+)\s*%\s*\)/i
    );
    if (hsl) {
      var h = parseFloat(hsl[1]);
      var s = Math.min(72, Math.max(38, parseFloat(hsl[2]) + 8));
      var pageL = parseFloat(hsl[3]);
      var l = Math.max(22, Math.min(38, pageL * 0.38));
      if (pageL < 50) l = Math.max(18, pageL - 18);
      return 'hsl(' + h + ', ' + s + '%, ' + l + '%)';
    }
    return 'hsl(220, 55%, 30%)';
  }

  function applyBannerTexture(color, slug) {
    var header = document.querySelector('.header');
    if (!header) return;
    var style = document.getElementById('with-me-banner-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'with-me-banner-style';
      document.head.appendChild(style);
    }
    var img = slug ? 'url("' + patternUrl(slug) + '")' : 'none';
    style.textContent =
      '.header{background-color:' + color + '!important;' +
      'background-image:' + img + '!important;' +
      'background-size:auto!important;background-repeat:repeat!important;background-position:0 0!important}' +
      '.header::before,.header::after{content:none!important;opacity:0!important;display:none!important}';
    header.classList.add('has-texture-banner');
    header.removeAttribute('data-banner');
    document.documentElement.classList.remove('roster-banner-early');
  }

  function syncBannerTexture(pageData) {
    var page = pageData || readPageTexture();
    if (!page || !page.color) {
      applyBannerTexture('hsl(220, 55%, 30%)', '');
      return;
    }
    var color = darkenPageColor(page.color);
    var pattern = page.pattern || '';
    saveBannerTexture(color, pattern);
    applyBannerTexture(color, pattern);
    // Drop early boot CSS so it cannot keep the previous page background locked.
    var early = document.getElementById('with-me-bg-early');
    if (early) early.remove();
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

  function pageIsImport() {
    return (location.pathname || '').indexOf('/import/') !== -1;
  }

  function readSavedEmp() {
    try {
      var q = new URLSearchParams(location.search);
      var qid = (q.get('emp') || '').trim();
      if (qid) return qid;
      if (pageIsImport()) {
        return (
          localStorage.getItem('importSavedEmpId') ||
          localStorage.getItem('savedEmpId') ||
          localStorage.getItem('exportSavedEmpId') ||
          ''
        ).trim();
      }
      return (
        localStorage.getItem('exportSavedEmpId') ||
        localStorage.getItem('importSavedEmpId') ||
        localStorage.getItem('savedEmpId') ||
        ''
      ).trim();
    } catch (e) {
      return '';
    }
  }

  function isProtectedEmpId(id) {
    return !!(window.rosterEmpIdGate && window.rosterEmpIdGate.isProtectedEmpId
      && window.rosterEmpIdGate.isProtectedEmpId(id));
  }

  function confirmProtectedSave(id) {
    if (!isProtectedEmpId(id)) return true;
    var secret = window.prompt(t('secretPrompt'));
    if (secret == null) return false;
    var ok = window.rosterEmpIdGate && window.rosterEmpIdGate.checkEmpSecret
      ? window.rosterEmpIdGate.checkEmpSecret(secret)
      : false;
    if (!ok) {
      window.alert(t('secretBad'));
      return false;
    }
    return true;
  }

  function saveEmp(id, name, dept) {
    if (!confirmProtectedSave(id)) return false;
    try {
      localStorage.setItem('savedEmpId', id);
      if (pageIsImport() || usesImportRoster(dept)) {
        localStorage.setItem('importSavedEmpId', id);
        if (name) localStorage.setItem('importSavedEmpName', name);
      } else {
        localStorage.setItem('exportSavedEmpId', id);
        if (name) {
          localStorage.setItem('exportSavedEmpName', name);
          localStorage.setItem('savedEmpName', name);
        }
      }
    } catch (e) {}
    return true;
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
    var langBtn = document.getElementById('langToggle');
    if (langBtn) langBtn.title = state.lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية';
    var backLbl = document.getElementById('backBtnLabel');
    if (backLbl) backLbl.textContent = t('back');
    var backBtn = document.getElementById('backBtn');
    if (backBtn) backBtn.setAttribute('aria-label', t('back'));
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
    var subtitle = document.getElementById('pageTitleMain');
    if (subtitle) subtitle.textContent = t('titleMain');
    if (state.lang === 'ar' && state.empId && !state.empNameAr) {
      syncEmpNameAr();
    }
    paintChrome();
    if (state.lang === 'ar' && state.empId && !state.empNameAr) {
      resolveEmpNameAr(state.empId, state.date).then(function (nameAr) {
        if (nameAr && nameAr !== state.empNameAr) {
          state.empNameAr = nameAr;
          paintChrome();
        }
      });
    }
    if (state.date) renderDay(state.date, '');
  }

  function rowIsoDate(month, row) {
    if (!row) return '';
    if (row.date) return String(row.date);
    var day = parseInt(row.day, 10);
    if (!month || !day || day < 1 || day > 31) return '';
    return month + '-' + pad2(day);
  }

  function dayFromSchedule(iso) {
    var sch = state.schedule;
    if (!sch || !sch.schedules) return null;
    var month = iso.slice(0, 7);
    var dayNum = parseInt(iso.slice(8, 10), 10);
    var rows = sch.schedules[month] || [];
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      if (!row) continue;
      if (row.date === iso) return row;
      if (!row.date && parseInt(row.day, 10) === dayNum) return row;
    }
    return null;
  }

  function collectDates(sch) {
    var out = [];
    if (!sch || !sch.schedules) return out;
    Object.keys(sch.schedules).sort().forEach(function (month) {
      (sch.schedules[month] || []).forEach(function (row) {
        var iso = rowIsoDate(month, row);
        if (iso) out.push(iso);
      });
    });
    out.sort();
    return out;
  }

  function sortGroups(groups) {
    return (groups || []).slice().sort(function (a, b) {
      var ia = DEPT_ORDER.indexOf(a.dept);
      var ib = DEPT_ORDER.indexOf(b.dept);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  }

  function looksLikeRosterHtml(html) {
    return !!(html && html.indexOf('deptCard') !== -1 && html.indexOf('shiftCard') !== -1);
  }

  function parseRosterHtmlDom(html, shiftKey) {
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
    return sortGroups(groups);
  }

  function parseRosterHtmlRegex(html, shiftKey) {
    var groups = [];
    var safeShift = shiftKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var cardRe = /<div class="deptCard">([\s\S]*?)(?=<div class="deptCard">|\Z)/g;
    var cardMatch;
    while ((cardMatch = cardRe.exec(html))) {
      var block = cardMatch[1];
      var titleMatch = block.match(/<div class="deptTitle"[^>]*>([^<]+)<\/div>/);
      if (!titleMatch) continue;
      var dept = titleMatch[1].trim();
      var shiftRe = new RegExp('<details class="shiftCard" data-shift="' + safeShift + '"[\\s\\S]*?</details>');
      var shiftMatch = block.match(shiftRe);
      if (!shiftMatch) continue;
      var people = [];
      var rowRe = /data-emp-name="([^"]+)"/g;
      var nameMatch;
      while ((nameMatch = rowRe.exec(shiftMatch[0]))) {
        var label = nameMatch[1].trim();
        if (!label) continue;
        var arMatch = shiftMatch[0].slice(nameMatch.index).match(new RegExp(
          'data-emp-name="' + label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"[\\s\\S]*?data-name-ar="([^"]*)"'
        ));
        people.push({
          name: label,
          nameAr: arMatch ? arMatch[1] : '',
          id: empIdFromLabel(label),
          status: ''
        });
      }
      if (people.length) groups.push({ dept: dept, people: people });
    }
    return sortGroups(groups);
  }

  function parseRosterHtml(html, shiftKey) {
    if (!looksLikeRosterHtml(html)) return [];
    var groups = parseRosterHtmlDom(html, shiftKey);
    if (!groups.length) groups = parseRosterHtmlRegex(html, shiftKey);
    return groups;
  }

  function fetchText(urls) {
    var i = 0;
    function tryNext() {
      if (i >= urls.length) return Promise.resolve('');
      var url = urls[i++];
      return fetch(url, { credentials: 'same-origin', cache: 'no-store' }).then(function (res) {
        if (!res.ok) return tryNext();
        return res.text();
      }).catch(function () {
        return tryNext();
      });
    }
    return tryNext();
  }

  function rosterUrls(prefix, iso) {
    var base = rootUrl() + (prefix || '');
    return [
      base + '/date/' + encodeURIComponent(iso) + '/index.html',
      base + '/date/' + encodeURIComponent(iso) + '/',
      base + '/' + encodeURIComponent(iso) + '/index.html',
      base + '/' + encodeURIComponent(iso) + '/'
    ];
  }

  function fetchRosterHtml(prefix, iso) {
    return fetchText(rosterUrls(prefix, iso));
  }

  function filterImportGroupsForWithMe(groups) {
    return (groups || []).filter(function (g) {
      return g && g.dept && IMPORT_WITH_ME_DEPTS[g.dept];
    });
  }

  function mergeGroups() {
    var map = {};
    for (var i = 0; i < arguments.length; i++) {
      (arguments[i] || []).forEach(function (g) {
        if (!g || !g.dept) return;
        if (!map[g.dept]) map[g.dept] = { dept: g.dept, people: [] };
        var seen = {};
        map[g.dept].people.forEach(function (p) {
          if (p.id) seen[p.id] = 1;
        });
        (g.people || []).forEach(function (p) {
          if (!p || !p.name) return;
          if (p.id && seen[p.id]) return;
          map[g.dept].people.push(p);
          if (p.id) seen[p.id] = 1;
        });
      });
    }
    return sortGroups(Object.keys(map).map(function (k) { return map[k]; }).filter(function (g) {
      return g.people.length;
    }));
  }

  function filterExportOnlyDepts(groups) {
    return (groups || []).filter(function (g) {
      return g && g.dept && !EXPORT_ONLY_DEPTS[g.dept];
    });
  }

  function groupsFromPack(pack, shiftKey) {
    var exportGroups = pack.htmls[0] ? parseRosterHtml(pack.htmls[0], shiftKey) : [];
    var importRaw = pack.htmls[1] ? parseRosterHtml(pack.htmls[1], shiftKey) : [];
    if (pageIsImport() || state.rosterKind === 'import') {
      // Import With-me must never mix Export roster people.
      return sortGroups(filterExportOnlyDepts(importRaw));
    }
    return mergeGroups(exportGroups, filterImportGroupsForWithMe(importRaw));
  }

  function loadRoster(iso) {
    var kind = pageIsImport() || state.rosterKind === 'import' ? 'import' : 'both';
    var cacheKey = kind + ':' + iso;
    if (state.rosterCache[cacheKey]) return state.rosterCache[cacheKey];
    var p = (kind === 'import'
      ? Promise.all([
          Promise.resolve(''),
          fetchRosterHtml('/import', iso).catch(function () { return ''; })
        ])
      : Promise.all([
          fetchRosterHtml('', iso).catch(function () { return ''; }),
          fetchRosterHtml('/import', iso).catch(function () { return ''; })
        ])
    ).then(function (results) {
      return { htmls: results, ok: !!(results[0] || results[1]) };
    }).catch(function () {
      return { htmls: ['', ''], ok: false };
    });
    state.rosterCache[cacheKey] = p;
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

  function displayName(raw) {
    return String(raw || '')
      .replace(/\s*-\s*[\d*][\d\s()A-Za-z\u0600-\u06FF]*$/, '')
      .trim();
  }

  function headerEmpLabel() {
    if (!state.empName && !state.empId) return t('titleEyebrow');
    if (state.lang === 'ar' && state.empNameAr) return displayName(state.empNameAr);
    return displayName(state.empName || state.empId);
  }

  function findNameArInHtml(html, empId) {
    if (!html || !empId) return '';
    var safeId = String(empId).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var re = new RegExp('data-name-ar="([^"]*?' + safeId + '[^"]*)"', 'i');
    var m = html.match(re);
    return m ? String(m[1]).trim() : '';
  }

  function resolveEmpNameAr(empId, iso) {
    return loadNamesAr().then(function (data) {
      var hit = lookupNameArFromIndex(data, empId, state.empName);
      if (hit) return hit;
      if (!iso) return '';
      return loadRoster(iso).then(function (pack) {
        if (!pack.ok) return '';
        for (var i = 0; i < pack.htmls.length; i++) {
          var htmlHit = findNameArInHtml(pack.htmls[i], empId);
          if (htmlHit) return htmlHit;
        }
        return '';
      });
    }).catch(function () {
      return '';
    });
  }

  function shiftLabel(name) {
    var key = SHIFT_I18N[name];
    return key ? t(key) : name;
  }

  function weekdayShort(iso) {
    var p = (iso || '').split('-');
    if (p.length !== 3) return '';
    var d = new Date(Date.UTC(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10)));
    var names = state.lang === 'ar' ? DAYS_SHORT_AR : DAYS_SHORT_EN;
    return names[d.getUTCDay()] || '';
  }

  function dayNum(iso) {
    var p = (iso || '').split('-');
    return p.length === 3 ? String(parseInt(p[2], 10)) : '';
  }

  function shiftCssClass(group) {
    return SHIFT_CLASS[group] || SHIFT_CLASS.Other;
  }

  function shiftCodeLabel(row) {
    if (!row) return '—';
    var code = String(row.shift_code || '').trim();
    if (code) return code;
    var group = row.shift_group || 'Other';
    if (group === 'Off Day') return state.lang === 'ar' ? 'إجازة' : 'OFF';
    if (group === 'Annual Leave') return state.lang === 'ar' ? 'سنوية' : 'LV';
    if (group === 'Sick Leave') return state.lang === 'ar' ? 'مرضية' : 'SL';
    return shiftLabel(group);
  }

  function scheduleRowsFlat() {
    var sch = state.schedule;
    var out = [];
    if (!sch || !sch.schedules) return out;
    Object.keys(sch.schedules).sort().forEach(function (month) {
      (sch.schedules[month] || []).forEach(function (row) {
        var iso = rowIsoDate(month, row);
        if (!iso) return;
        out.push({
          iso: iso,
          group: (row && row.shift_group) || 'Other',
          code: row.shift_code || '',
          row: row
        });
      });
    });
    out.sort(function (a, b) { return a.iso < b.iso ? -1 : a.iso > b.iso ? 1 : 0; });
    return out;
  }

  function buildShiftStrip() {
    var wrap = document.getElementById('shiftStripWrap');
    var strip = document.getElementById('shiftStrip');
    if (!wrap || !strip) return;
    var rows = scheduleRowsFlat();
    if (!rows.length) {
      wrap.hidden = true;
      strip.innerHTML = '';
      state.stripBuiltFor = '';
      return;
    }
    var today = muscatToday();
    var html = '';
    rows.forEach(function (item) {
      var cls = 'shiftDay ' + shiftCssClass(item.group);
      if (item.iso === today) cls += ' is-today';
      html += '<button type="button" class="' + cls + '" role="listitem"';
      html += ' data-date="' + escapeHtml(item.iso) + '"';
      html += ' aria-label="' + escapeHtml(formatDate(item.iso) + ' · ' + shiftLabel(item.group)) + '">';
      html += '<span class="shiftDayNum">' + escapeHtml(dayNum(item.iso)) + '</span>';
      html += '<span class="shiftDayWeek">' + escapeHtml(weekdayShort(item.iso)) + '</span>';
      html += '<span class="shiftDayCode">' + escapeHtml(shiftCodeLabel(item.row)) + '</span>';
      html += '</button>';
    });
    strip.innerHTML = html;
    wrap.hidden = false;
    state.stripBuiltFor = (state.empId || '') + '|' + (state.lang || '') + '|' + rows.length;
    syncShiftStrip(state.date, false);
  }

  function bindShiftStripDrag(strip) {
    if (!strip || strip._dragBound) return;
    strip._dragBound = true;

    var active = false;
    var dragging = false;
    var startX = 0;
    var startScroll = 0;
    var pointerId = null;
    var DRAG_THRESHOLD = 8;

    function reset() {
      active = false;
      dragging = false;
      pointerId = null;
      strip.classList.remove('is-dragging');
      lockPageScroll(false);
    }

    function lockPageScroll(on) {
      document.documentElement.classList.toggle('shift-strip-dragging', !!on);
    }

    strip.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      active = true;
      dragging = false;
      startX = e.clientX;
      startScroll = strip.scrollLeft;
      pointerId = e.pointerId;
      lockPageScroll(true);
      if (e.pointerType === 'touch' && e.cancelable) e.preventDefault();
      var btn = e.target && e.target.closest ? e.target.closest('.shiftDay') : null;
      if (btn && typeof btn.focus === 'function') {
        try { btn.focus({ preventScroll: true }); } catch (err) {}
      }
    });

    strip.addEventListener('pointermove', function (e) {
      if (!active || e.pointerId !== pointerId) return;
      var dx = e.clientX - startX;
      if (!dragging) {
        if (Math.abs(dx) < DRAG_THRESHOLD) return;
        dragging = true;
        strip.classList.add('is-dragging');
        try { strip.setPointerCapture(pointerId); } catch (err) {}
      }
      strip.scrollLeft = startScroll - dx;
      if (e.cancelable) e.preventDefault();
    });

    strip.addEventListener('pointerup', function (e) {
      if (!active || e.pointerId !== pointerId) return;
      if (dragging) {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        var near = nearestShiftDay(strip);
        var iso = near && near.getAttribute('data-date');
        if (iso && iso !== state.date) renderDay(iso, '');
        else syncShiftStrip(state.date, false);
      } else {
        var btn = e.target.closest('.shiftDay');
        if (btn) {
          var iso = btn.getAttribute('data-date');
          if (iso && iso !== state.date) {
            renderDay(iso, '');
          }
        }
      }
      try {
        if (strip.hasPointerCapture(pointerId)) strip.releasePointerCapture(pointerId);
      } catch (err) {}
      reset();
    });

    strip.addEventListener('pointercancel', function () {
      try {
        if (pointerId != null && strip.hasPointerCapture(pointerId)) {
          strip.releasePointerCapture(pointerId);
        }
      } catch (err) {}
      reset();
    });

    strip.addEventListener('touchmove', function (e) {
      if (e.cancelable) e.preventDefault();
    }, { passive: false });

    strip.addEventListener('wheel', function (e) {
      if (e.cancelable) e.preventDefault();
      strip.scrollLeft += e.deltaX || e.deltaY;
    }, { passive: false });
  }

  function nearestShiftDay(strip) {
    if (!strip) return null;
    var sRect = strip.getBoundingClientRect();
    var mid = sRect.left + sRect.width / 2;
    var best = null;
    var bestDist = Infinity;
    Array.prototype.forEach.call(strip.querySelectorAll('.shiftDay'), function (btn) {
      var r = btn.getBoundingClientRect();
      var d = Math.abs(r.left + r.width / 2 - mid);
      if (d < bestDist) {
        bestDist = d;
        best = btn;
      }
    });
    return best;
  }

  function centerShiftDay(strip, btn, smooth) {
    if (!strip || !btn) return;
    var sRect = strip.getBoundingClientRect();
    var bRect = btn.getBoundingClientRect();
    var delta = (bRect.left + bRect.width / 2) - (sRect.left + sRect.width / 2);
    if (Math.abs(delta) < 1) return;
    var next = strip.scrollLeft + delta;
    if (smooth === false) {
      strip.scrollLeft = next;
      return;
    }
    try {
      strip.scrollTo({ left: next, behavior: 'smooth' });
    } catch (err) {
      strip.scrollLeft = next;
    }
  }

  function syncShiftStrip(iso, smooth) {
    var strip = document.getElementById('shiftStrip');
    if (!strip) return;
    var active = null;
    Array.prototype.forEach.call(strip.querySelectorAll('.shiftDay'), function (btn) {
      var on = btn.getAttribute('data-date') === iso;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-current', on ? 'date' : 'false');
      if (on) active = btn;
    });
    if (!active) return;
    centerShiftDay(strip, active, smooth);
  }

  function monthName(iso) {
    var p = (iso || '').split('-');
    if (p.length !== 3) return '';
    var mo = parseInt(p[1], 10);
    var months = state.lang === 'ar' ? MONTHS_AR : MONTHS_EN;
    return months[mo - 1] || '';
  }

  function paintChrome() {
    var empHeader = document.getElementById('empNameHeader');
    var subtitle = document.getElementById('pageTitleMain');
    if (subtitle) subtitle.textContent = t('titleMain');
    if (empHeader) {
      empHeader.textContent = headerEmpLabel();
    }
    var dateWeek = document.getElementById('dateTagWeek');
    var dateDay = document.getElementById('dateTagDay');
    var dateMonth = document.getElementById('dateTagMonth');
    if (state.date) {
      if (dateWeek) dateWeek.textContent = weekday(state.date);
      if (dateDay) dateDay.textContent = dayNum(state.date);
      if (dateMonth) dateMonth.textContent = monthName(state.date);
    }
    var picker = document.getElementById('datePicker');
    if (picker) {
      picker.value = state.date || '';
      if (state.minDate) picker.min = state.minDate;
      if (state.maxDate) picker.max = state.maxDate;
    }
    var stripKey = (state.empId || '') + '|' + (state.lang || '');
    if (state.schedule && state.stripBuiltFor.indexOf(stripKey) !== 0) {
      buildShiftStrip();
    }
  }

  function setLoading(on) {
    var el = document.getElementById('crewStatus');
    var track = document.getElementById('crewTrack');
    if (!el) return;
    // Keep the names card in place while a day is already on screen.
    if (on && track && track.innerHTML) {
      el.hidden = true;
      return;
    }
    el.hidden = !on;
    if (on) el.textContent = t('loading');
  }

  function restQuoteIndex(iso, count) {
    var seed = 0;
    var s = String(iso || '') + '|' + String(state.empId || '');
    for (var i = 0; i < s.length; i++) {
      seed = ((seed << 5) - seed + s.charCodeAt(i)) | 0;
    }
    return Math.abs(seed) % count;
  }

  function pickRestQuote(iso) {
    var quotes = REST_QUOTES[state.lang] || REST_QUOTES.en;
    if (!quotes.length) return { lead: '', body: '' };
    return quotes[restQuoteIndex(iso, quotes.length)];
  }

  function renderRest(row, iso) {
    var group = (row && row.shift_group) || 'Off Day';
    var meta = SHIFT_META[group] || SHIFT_META.Other;
    var quote = pickRestQuote(iso || state.date);
    return (
      '<div class="restCard">' +
      '<div class="restIcon">' + meta.icon + '</div>' +
      '<h2>' + escapeHtml(t('restTitle')) + '</h2>' +
      '<p class="restSubtitle">' + escapeHtml(t('restSubtitle')) + '</p>' +
      '<p class="restShift">' + escapeHtml(shiftLabel(group)) + '</p>' +
      '<p class="restLead">' + escapeHtml(quote.lead) + '</p>' +
      '<p class="restBody">' + escapeHtml(quote.body) + '</p>' +
      '</div>'
    );
  }

  function flattenPeople(groups) {
    var out = [];
    (groups || []).forEach(function (g) {
      (g.people || []).forEach(function (p) {
        out.push({
          name: p.name,
          nameAr: p.nameAr,
          id: p.id,
          dept: g.dept
        });
      });
    });
    return out;
  }

  function personLabel(p) {
    if (state.lang === 'ar' && p.nameAr) return String(p.nameAr).trim();
    return String(p.name || p.id || '').trim();
  }

  function personDisplayName(p) {
    return displayName(personLabel(p));
  }

  function personDisplayId(p) {
    var id = String(p.id || empIdFromLabel(p.name) || empIdFromLabel(p.nameAr) || '').trim();
    return id;
  }

  function peopleIdsForShift(pack, shiftKey) {
    var ids = Object.create(null);
    if (!pack || !pack.ok || !shiftKey) return ids;
    flattenPeople(groupsFromPack(pack, shiftKey)).forEach(function (p) {
      var id = String(p.id || empIdFromLabel(p.name) || '').trim();
      if (id) ids[id] = 1;
    });
    return ids;
  }

  function workDaysInMonth(monthYm) {
    var out = [];
    var sch = state.schedule;
    if (!sch || !sch.schedules || !monthYm) return out;
    (sch.schedules[monthYm] || []).forEach(function (row) {
      var iso = rowIsoDate(monthYm, row);
      var shift = row && row.shift_group ? String(row.shift_group) : '';
      if (!iso || !shift || REST_GROUPS[shift]) return;
      out.push({ iso: iso, shift: shift });
    });
    return out;
  }

  function togetherRatio(empId) {
    var id = String(empId || '').trim();
    if (!id) return 0;
    if (id === String(state.empId || '').trim()) return 1;
    var workDays = Number(state.coShift && state.coShift.workDays) || 0;
    if (!workDays) return 0;
    var n = Number(state.coShift.counts[id]) || 0;
    return Math.max(0, Math.min(1, n / workDays));
  }

  function togetherTitle(empId) {
    var id = String(empId || '').trim();
    if (id && id === String(state.empId || '').trim()) return t('togetherYou');
    var n = Number(state.coShift && state.coShift.counts && state.coShift.counts[id]) || 0;
    if (n === 1) return t('togetherOne');
    return n + t('togetherMany');
  }

  function paintTogetherBars() {
    var root = document.getElementById('crewTrack');
    if (!root) return;
    Array.prototype.forEach.call(root.querySelectorAll('.empRow[data-emp-id]'), function (row) {
      var id = row.getAttribute('data-emp-id') || '';
      row.style.setProperty('--together', String(togetherRatio(id)));
      row.setAttribute('title', togetherTitle(id));
    });
  }

  function ensureCoShiftStats(monthYm) {
    var empId = String(state.empId || '').trim();
    var token = empId + '|' + String(monthYm || '');
    if (!empId || !monthYm) {
      return Promise.resolve(state.coShift);
    }
    if (state.coShift.token === token && state.coShift.ready) {
      paintTogetherBars();
      return Promise.resolve(state.coShift);
    }
    if (state.coShift.token === token && state.coShift.promise) {
      return state.coShift.promise;
    }

    var days = workDaysInMonth(monthYm);
    var counts = Object.create(null);
    state.coShift = {
      token: token,
      workDays: days.length,
      counts: counts,
      ready: false,
      promise: null
    };

    if (!days.length) {
      state.coShift.ready = true;
      paintTogetherBars();
      return Promise.resolve(state.coShift);
    }

    var idx = 0;
    function worker() {
      if (state.coShift.token !== token) return Promise.resolve();
      if (idx >= days.length) return Promise.resolve();
      var item = days[idx++];
      return loadRoster(item.iso)
        .then(function (pack) {
          if (state.coShift.token !== token) return;
          var ids = peopleIdsForShift(pack, item.shift);
          Object.keys(ids).forEach(function (id) {
            counts[id] = (counts[id] || 0) + 1;
          });
        })
        .catch(function () {})
        .then(worker);
    }

    var workers = [];
    var conc = Math.min(4, days.length);
    for (var w = 0; w < conc; w++) workers.push(worker());
    state.coShift.promise = Promise.all(workers).then(function () {
      if (state.coShift.token !== token) return state.coShift;
      state.coShift.counts = counts;
      state.coShift.ready = true;
      state.coShift.promise = null;
      paintTogetherBars();
      return state.coShift;
    });
    return state.coShift.promise;
  }

  var TATWEEL = '\u0640';
  var JOINING = /[\u0626\u0628\u062A\u062B\u062C\u062D\u062E\u0633\u0634\u0635\u0636\u0637\u0638\u0639\u063A\u0641\u0642\u0643\u0644\u0645\u0646\u0647\u064A]/;
  var kashidaCanvas = null;

  function splitNameSuffix(raw) {
    var m = String(raw || '').match(/^(.*?)(\s+-\s+\d+\s*)$/);
    if (m) return { name: m[1].trim(), suffix: m[2] };
    return { name: String(raw || '').trim(), suffix: '' };
  }

  function arabicNameSource(el) {
    var ar = el.getAttribute('data-name-ar');
    if (ar) return ar.trim();
    return String(el.textContent || '').replace(new RegExp(TATWEEL, 'g'), '').trim();
  }

  function joinSlots(name) {
    var slots = [];
    for (var i = 0; i < name.length - 1; i++) {
      var ch = name.charAt(i);
      var nx = name.charAt(i + 1);
      if (ch === TATWEEL || nx === TATWEEL || ch === ' ' || nx === ' ') continue;
      if (JOINING.test(ch)) slots.push(i);
    }
    return slots;
  }

  function insertTatweel(name, extras) {
    if (extras <= 0) return name;
    var slots = joinSlots(name);
    if (!slots.length) return name;
    var counts = [];
    for (var s = 0; s < slots.length; s++) counts[s] = 0;
    var start = Math.floor(slots.length / 2);
    for (var n = 0; n < extras; n++) counts[(start + n) % slots.length] += 1;
    var out = '';
    var slotAt = Object.create(null);
    for (var i = 0; i < slots.length; i++) slotAt[slots[i]] = i;
    for (var c = 0; c < name.length; c++) {
      out += name.charAt(c);
      if (slotAt[c] != null && counts[slotAt[c]]) {
        out += TATWEEL.repeat(counts[slotAt[c]]);
      }
    }
    return out;
  }

  function measureName(text, sampleEl) {
    var cs = window.getComputedStyle(sampleEl);
    var font = cs.font;
    if (!font || font === 'inherit') {
      font =
        (cs.fontStyle || 'normal') +
        ' ' +
        (cs.fontWeight || '650') +
        ' ' +
        (cs.fontSize || '13px') +
        ' ' +
        (cs.fontFamily || 'sans-serif');
    }
    if (!kashidaCanvas) {
      kashidaCanvas = document.createElement('canvas').getContext('2d');
    }
    kashidaCanvas.font = font;
    return kashidaCanvas.measureText(text || '').width;
  }

  function stretchNameGroup(nodes) {
    if (!nodes.length) return;
    if (state.lang !== 'ar') {
      nodes.forEach(function (el) {
        var en = el.dataset.nameEn;
        el.textContent = en !== undefined ? en : arabicNameSource(el);
      });
      return;
    }
    var originals = nodes.map(arabicNameSource);
    var parts = originals.map(splitNameSuffix);
    var maxW = 0;
    nodes.forEach(function (el, i) {
      var w = measureName(parts[i].name, el);
      if (w > maxW) maxW = w;
    });
    nodes.forEach(function (el, i) {
      var orig = parts[i].name;
      var suffix = parts[i].suffix;
      if (!/[\u0600-\u06FF]/.test(orig) || maxW <= 0) {
        el.textContent = originals[i];
        return;
      }
      var extra = 0;
      var stretched = orig;
      var guard = 0;
      while (measureName(stretched, el) + 0.4 < maxW && guard < 28) {
        extra += 1;
        guard += 1;
        var next = insertTatweel(orig, extra);
        if (next === stretched) break;
        stretched = next;
      }
      el.textContent = stretched + suffix;
    });
  }

  function stretchArabicNames() {
    document.querySelectorAll('#crewTrack .empList').forEach(function (list) {
      var group = [];
      function flush() {
        if (group.length) stretchNameGroup(group);
        group = [];
      }
      Array.prototype.forEach.call(list.children, function (child) {
        if (child.classList.contains('deptHead')) flush();
        else if (child.classList.contains('empRow')) {
          var el = child.querySelector('.empName');
          if (el) group.push(el);
        }
      });
      flush();
    });
  }

  function statsIconSvg() {
    return (
      '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M4 19V5"/><path d="M4 19h16"/>' +
      '<path d="M8 16V10"/><path d="M12 16V7"/><path d="M16 16v-5"/>' +
      '</svg>'
    );
  }

  function listIconSvg() {
    return (
      '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M8 7h12M8 12h12M8 17h12"/>' +
      '<path d="M4 7h.01M4 12h.01M4 17h.01"/>' +
      '</svg>'
    );
  }

  function renderShiftSummary(shiftKey, peopleCount, statsOn) {
    var shiftClass = shiftCssClass(shiftKey);
    var html = '';
    html += '<div class="crewSummary ' + shiftClass + '" data-shift="' + escapeHtml(shiftKey) + '">';
    html += '<div class="shiftChip">';
    html += '<button type="button" class="shiftStatsBtn' + (statsOn ? ' is-active' : '') + '"' +
      ' data-shift="' + escapeHtml(shiftKey) + '"' +
      ' aria-pressed="' + (statsOn ? 'true' : 'false') + '"' +
      ' title="' + escapeHtml(statsOn ? t('listBtnTitle') : t('statsBtnTitle')) + '"' +
      ' aria-label="' + escapeHtml(statsOn ? t('listBtnTitle') : t('statsBtn')) + '">';
    html += statsOn ? listIconSvg() : statsIconSvg();
    html += '</button>';
    html += '<span class="shiftChipLabel">' + escapeHtml(shiftLabel(shiftKey)) + '</span>';
    html += '</div>';
    if (statsOn) {
      html += '<span class="crewCount">' + escapeHtml(t('statsBtn')) + '</span>';
    } else {
      html += '<span class="crewCount">' + peopleCount + ' ' + escapeHtml(t('people')) + '</span>';
    }
    html += '</div>';
    return html;
  }

  function monthDayList(iso) {
    var p = (iso || '').split('-');
    if (p.length !== 3) return [];
    var y = parseInt(p[0], 10);
    var m = parseInt(p[1], 10);
    if (!y || !m) return [];
    var pad = function (n) { return n < 10 ? '0' + n : String(n); };
    var start = y + '-' + pad(m) + '-01';
    var last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    var end = y + '-' + pad(m) + '-' + pad(last);
    if (state.minDate && start < state.minDate) start = state.minDate;
    if (state.maxDate && end > state.maxDate) end = state.maxDate;
    if (!start || !end || start > end) return [];
    var days = [];
    for (var d = start; d <= end; d = addDays(d, 1)) {
      if (!d) break;
      days.push(d);
    }
    return days;
  }

  /** Selected day + upcoming days only (no past dates in the stats matrix). */
  function statsForwardDayList(iso) {
    var anchor = iso || state.date || muscatToday();
    var monthDays = monthDayList(anchor);
    if (!monthDays.length) return [];
    var start = anchor;
    // Never start before "today" when the selected day is in the past.
    var today = muscatToday();
    if (start < today) start = today;
    if (state.minDate && start < state.minDate) start = state.minDate;
    if (state.maxDate && start > state.maxDate) return [];
    return monthDays.filter(function (d) { return d >= start; });
  }

  function chunkDays(days, size) {
    var out = [];
    var n = size || 5;
    for (var i = 0; i < days.length; i += n) out.push(days.slice(i, i + n));
    return out;
  }

  function statsWindowSize() {
    try {
      if (window.matchMedia && window.matchMedia('(min-width: 640px)').matches) return 7;
    } catch (e) {}
    return 5;
  }

  function statsWindowsForDate(iso) {
    return chunkDays(statsForwardDayList(iso || state.date), statsWindowSize());
  }

  function statsWindowIndexForDate(iso) {
    var windows = statsWindowsForDate(iso);
    var needle = iso || state.date;
    var today = muscatToday();
    if (needle && needle < today) needle = today;
    for (var i = 0; i < windows.length; i++) {
      if (windows[i].indexOf(needle) !== -1) return i;
    }
    return 0;
  }

  function renderStatsTable(shiftKey, days, columns) {
    var deptSet = {};
    (columns || []).forEach(function (col) {
      Object.keys(col.counts || {}).forEach(function (dept) {
        if ((col.counts[dept] || 0) > 0) deptSet[dept] = 1;
      });
    });
    var depts = DEPT_ORDER.filter(function (d) { return deptSet[d]; });
    Object.keys(deptSet).forEach(function (d) {
      if (depts.indexOf(d) === -1) depts.push(d);
    });
    if (!depts.length) {
      return '<div class="deptStatsEmpty">' + escapeHtml(t('statsEmpty')) + '</div>';
    }
    var html = '<div class="deptStatsScroll" data-stats-panel="1">';
    html += '<table class="deptStatsTable" role="table">';
    html += '<thead><tr>';
    html += '<th scope="col" class="deptStatsDeptCol">' + escapeHtml(t('statsDept')) + '</th>';
    days.forEach(function (iso) {
      html += '<th scope="col">';
      html += '<span class="deptStatsDayName">' + escapeHtml(weekdayShort(iso)) + '</span>';
      html += '<span class="deptStatsDayNum">' + escapeHtml(dayNum(iso)) + '</span>';
      html += '</th>';
    });
    html += '</tr></thead><tbody>';
    depts.forEach(function (dept, idx) {
      var tone = idx % 2 === 0 ? 'tone-a' : 'tone-b';
      var selected = state.statsSelectedDept && state.statsSelectedDept === dept ? ' is-selected' : '';
      html += '<tr class="' + tone + selected + '" data-dept="' + escapeHtml(dept) + '">';
      html += '<th scope="row" class="deptStatsDeptCol">';
      html += '<span class="roleDot" aria-hidden="true"></span>';
      html += '<span class="deptStatsDeptLabel">' + escapeHtml(deptLabel(dept)) + '</span>';
      html += '</th>';
      days.forEach(function (iso, di) {
        var n = (columns[di] && columns[di].counts && columns[di].counts[dept]) || 0;
        var toneCls = deptCountTone(dept, n);
        var zero = n ? '' : ' is-zero';
        html += '<td class="deptStatsCell' + zero + '"><span class="deptStatsNum' +
          (toneCls ? ' ' + toneCls : '') + '">' + n + '</span></td>';
      });
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    return html;
  }

  function renderStatsDots(windowCount, activeIndex) {
    if (windowCount <= 1) return '';
    var html = '<div class="deptStatsDots" aria-hidden="true">';
    for (var i = 0; i < windowCount; i++) {
      html += '<span class="deptStatsDot' + (i === activeIndex ? ' is-active' : '') + '"></span>';
    }
    html += '</div>';
    return html;
  }

  function renderStatsShell(shiftKey, bodyHtml, meta) {
    var shiftClass = shiftCssClass(shiftKey);
    var html = '<div class="crewCard ' + shiftClass + ' is-stats">';
    html += renderShiftSummary(shiftKey, 0, true);
    html += '<div class="deptStatsPanel">';
    html += '<p class="deptStatsHint">' + escapeHtml(t('statsHint')) + '</p>';
    if (meta && meta.rangeLabel) {
      html += '<p class="deptStatsRange">' + escapeHtml(meta.rangeLabel) + '</p>';
    }
    html += bodyHtml;
    html += renderStatsDots(meta && meta.windowCount, meta && meta.windowIndex);
    html += '</div></div>';
    return html;
  }

  function statsRangeLabel(days) {
    if (!days || !days.length) return '';
    var a = days[0];
    var b = days[days.length - 1];
    if (a === b) return dayNum(a) + ' ' + monthName(a);
    if (a.slice(0, 7) === b.slice(0, 7)) {
      return dayNum(a) + '–' + dayNum(b) + ' ' + monthName(a);
    }
    return dayNum(a) + ' ' + monthName(a) + ' – ' + dayNum(b) + ' ' + monthName(b);
  }

  function loadStatsColumns(shiftKey, days) {
    return Promise.all((days || []).map(function (iso) {
      return loadRoster(iso).then(function (pack) {
        var counts = Object.create(null);
        if (pack && pack.ok) {
          groupsFromPack(pack, shiftKey).forEach(function (g) {
            counts[g.dept] = (g.people || []).length;
          });
        }
        return { iso: iso, counts: counts };
      });
    }));
  }

  function paintStatsView() {
    var shiftKey = state.statsShiftKey;
    var track = document.getElementById('crewTrack');
    if (!track || !shiftKey || !state.statsMode) return;
    var windows = statsWindowsForDate(state.date);
    if (!windows.length) {
      track.innerHTML = renderStatsShell(shiftKey, '<div class="deptStatsEmpty">' + escapeHtml(t('statsEmpty')) + '</div>', {
        windowCount: 0,
        windowIndex: 0,
        rangeLabel: ''
      });
      return;
    }
    if (state.statsWindowIndex < 0) state.statsWindowIndex = 0;
    if (state.statsWindowIndex >= windows.length) state.statsWindowIndex = windows.length - 1;
    var days = windows[state.statsWindowIndex];
    var token = ++state.statsToken;
    var meta = {
      windowCount: windows.length,
      windowIndex: state.statsWindowIndex,
      rangeLabel: statsRangeLabel(days)
    };
    track.innerHTML = renderStatsShell(
      shiftKey,
      '<div class="deptStatsLoading">' + escapeHtml(t('statsLoading')) + '</div>',
      meta
    );
    loadStatsColumns(shiftKey, days).then(function (columns) {
      if (!state.statsMode || state.statsToken !== token) return;
      var body = renderStatsTable(shiftKey, days, columns);
      track.innerHTML = renderStatsShell(shiftKey, body, meta);
      // Prefetch neighboring windows.
      [state.statsWindowIndex - 1, state.statsWindowIndex + 1].forEach(function (wi) {
        if (wi >= 0 && wi < windows.length) loadStatsColumns(shiftKey, windows[wi]);
      });
    });
  }

  function shiftStatsWindow(delta) {
    if (!state.statsMode) return;
    var windows = statsWindowsForDate(state.date);
    if (!windows.length) return;
    var next = state.statsWindowIndex + delta;
    if (next < 0 || next >= windows.length) return;
    state.statsWindowIndex = next;
    paintStatsView();
  }

  function toggleStatsMode(shiftKey) {
    if (state.statsMode) {
      state.statsMode = false;
      state.statsShiftKey = '';
      state.statsSelectedDept = '';
      renderDay(state.date, '');
      return;
    }
    if (!shiftKey || REST_GROUPS[shiftKey]) return;
    state.statsMode = true;
    state.statsShiftKey = shiftKey;
    state.statsSelectedDept = '';
    state.statsWindowIndex = statsWindowIndexForDate(state.date);
    paintStatsView();
  }

  function deptCountTone(dept, n) {
    var count = parseInt(n, 10);
    if (!isFinite(count) || count < 0) count = 0;
    var d = String(dept || '');
    if (d === 'Supervisors' || d === 'Inventory') {
      if (count <= 0) return 'count-red';
      if (count === 1) return 'count-green';
      return 'count-green-dark';
    }
    if (d === 'Load Control') {
      if (count <= 1) return 'count-red';
      if (count === 2) return 'count-green';
      return 'count-green-dark';
    }
    if (d === 'Export Checker') {
      if (count <= 4) return 'count-red';
      if (count === 5) return 'count-orange';
      if (count === 6) return 'count-green';
      return 'count-green-dark';
    }
    if (d === 'Export Operators') {
      if (count <= 2) return 'count-red';
      if (count === 3) return 'count-green';
      return 'count-green-dark';
    }
    if (d === 'Officers') {
      if (count <= 1) return 'count-red';
      if (count === 2) return 'count-green';
      return 'count-green-dark';
    }
    return '';
  }

  function paintStatsDeptSelection() {
    var selected = state.statsSelectedDept || '';
    var table = document.querySelector('#crewTrack .deptStatsTable tbody');
    if (!table) return;
    Array.prototype.forEach.call(table.querySelectorAll('tr[data-dept]'), function (tr) {
      tr.classList.toggle('is-selected', !!selected && tr.getAttribute('data-dept') === selected);
    });
  }

  function selectStatsDept(dept) {
    var next = String(dept || '').trim();
    if (!next) return;
    state.statsSelectedDept = next;
    paintStatsDeptSelection();
  }

  function clearStatsDeptSelection() {
    if (!state.statsSelectedDept) return;
    state.statsSelectedDept = '';
    paintStatsDeptSelection();
  }

  function syncUrlDate(iso) {
    try {
      var url = new URL(location.href);
      url.searchParams.set('date', iso);
      if (state.empId) url.searchParams.set('emp', state.empId);
      history.replaceState({ date: iso }, '', url);
    } catch (e) {}
  }

  function renderGroups(groups, shiftKey, selfId) {
    var people = flattenPeople(groups);
    var html = '';
    var shiftClass = shiftCssClass(shiftKey);
    html += '<div class="crewCard ' + shiftClass + '">';
    html += renderShiftSummary(shiftKey, people.length, false);
    html += '<div class="empList">';
    var deptIndex = 0;
    (groups || []).forEach(function (g) {
      var list = (g.people || []).slice();
      if (!list.length) return;
      list.sort(function (a, b) {
        return personDisplayName(a).localeCompare(personDisplayName(b), undefined, { sensitivity: 'base' });
      });
      var tone = (deptIndex % 2 === 0) ? 'tone-a' : 'tone-b';
      deptIndex += 1;
      html += '<div class="deptHead ' + tone + '" data-dept="' + escapeHtml(g.dept) + '">';
      var countTone = deptCountTone(g.dept, list.length);
      html += '<span class="deptCount' + (countTone ? ' ' + countTone : '') + '" aria-label="' +
        escapeHtml(String(list.length)) + '">' + list.length + '</span>';
      html += '<span class="deptHeadLabel">' + escapeHtml(deptLabel(g.dept)) + '</span>';
      html += '</div>';
      list.forEach(function (p) {
        var id = personDisplayId(p);
        var isSelf = id && id === selfId;
        var selfCls = isSelf ? ' is-self' : '';
        var ratio = togetherRatio(id);
        html += '<div class="empRow ' + tone + selfCls + '" data-emp-id="' + escapeHtml(id) + '" style="--together:' + ratio + '" title="' + escapeHtml(togetherTitle(id)) + '">';
        html += '<div class="empRowTop">';
        var shown = personDisplayName(p);
        var arSrc = displayName(p.nameAr || '');
        var enSrc = displayName(p.name || p.id || '');
        html += '<span class="empName"';
        if (arSrc) html += ' data-name-ar="' + escapeHtml(arSrc) + '"';
        html += ' data-name-en="' + escapeHtml(enSrc) + '">' + escapeHtml(shown) + '</span>';
        if (isSelf) html += '<span class="youPill">' + escapeHtml(t('you')) + '</span>';
        html += '<span class="empId">' + escapeHtml(id || '') + '</span>';
        html += '</div>';
        html += '</div>';
      });
    });
    html += '</div></div>';
    return html;
  }

  function renderDay(iso, anim) {
    var keepStats = state.statsMode;
    var keepShift = state.statsShiftKey;
    state.date = iso;
    paintChrome();
    syncShiftStrip(iso, anim !== '');
    var track = document.getElementById('crewTrack');
    if (!track) return;
    var row = dayFromSchedule(iso);
    var shiftKey = row && row.shift_group ? row.shift_group : '';

    // Stay in stats only on work days. Off / leave must leave the stats table.
    if (keepStats && shiftKey && !REST_GROUPS[shiftKey]) {
      state.statsShiftKey = shiftKey || keepShift;
      state.statsMode = !!state.statsShiftKey;
      if (state.statsMode) {
        state.statsWindowIndex = statsWindowIndexForDate(iso);
        setLoading(false);
        var emptyKeep = document.getElementById('crewEmpty');
        if (emptyKeep) emptyKeep.hidden = true;
        paintStatsView();
        prefetch(iso);
        syncUrlDate(iso);
        return;
      }
    }

    state.statsMode = false;
    state.statsShiftKey = '';
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
      paintTogetherBars();
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(function () { stretchArabicNames(); });
      } else {
        stretchArabicNames();
      }
      prefetch(iso);
      syncUrlDate(iso);
    }

    if (!shiftKey) {
      finish('<div class="restCard"><p>' + escapeHtml(t('noRoster')) + '</p></div>');
      return;
    }
    if (REST_GROUPS[shiftKey]) {
      finish(renderRest(row, iso));
      return;
    }

    loadRoster(iso).then(function (pack) {
      if (state.date !== iso) return;
      if (!pack.ok) {
        finish('<div class="restCard"><p>' + escapeHtml(t('noRoster')) + '</p></div>');
        return;
      }
      var groups = groupsFromPack(pack, shiftKey);
      if (!groups.length) {
        finish('<div class="restCard"><p>' + escapeHtml(t('noRoster')) + '</p></div>');
        return;
      }
      var nameAr = pageIsImport()
        ? (findNameArInHtml(pack.htmls[1], state.empId) || findNameArInHtml(pack.htmls[0], state.empId))
        : (findNameArInHtml(pack.htmls[0], state.empId) || findNameArInHtml(pack.htmls[1], state.empId));
      if (nameAr) {
        state.empNameAr = nameAr;
        paintChrome();
      }
      finish(renderGroups(groups, shiftKey, state.empId));
      ensureCoShiftStats(iso.slice(0, 7));
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
    renderDay(addDays(state.date, delta), '');
  }

  function bindSwipe(el) {
    if (!el) return;

    var startX = 0;
    var startY = 0;
    var tracking = false;
    var axis = ''; // '' | 'h' | 'v'
    var pointerId = null;

    function sheetOpen() {
      var sheet = document.getElementById('pickSheet');
      return !!(sheet && sheet.classList.contains('open'));
    }

    function ignoreTarget(target) {
      return !!(target && target.closest && target.closest(
        'a, button, input, select, textarea, .datePickerWrapper, .pickSheet, .shiftStripWrap, .shiftStatsBtn'
      ));
    }

    function reset() {
      tracking = false;
      axis = '';
      pointerId = null;
    }

    function finish(dx, dy) {
      if (!tracking) return;
      reset();
      if (sheetOpen()) return;
      if (axis === 'v') return;
      if (Math.abs(dx) < 36) return;
      if (Math.abs(dx) < Math.abs(dy) * 1.05) return;
      // Stats mode: swipe moves 5-day windows. Otherwise move by day.
      if (state.statsMode) {
        shiftStatsWindow(dx < 0 ? 1 : -1);
        return;
      }
      // Swipe left → next day, swipe right → previous day (same in AR/EN)
      go(dx < 0 ? 1 : -1);
    }

    el.addEventListener('touchstart', function (e) {
      if (sheetOpen() || e.touches.length !== 1 || ignoreTarget(e.target)) {
        reset();
        return;
      }
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      tracking = true;
      axis = '';
      pointerId = null;
    }, { passive: true });

    el.addEventListener('touchmove', function (e) {
      if (!tracking || e.touches.length !== 1) return;
      var dx = e.touches[0].clientX - startX;
      var dy = e.touches[0].clientY - startY;
      if (!axis) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        axis = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
      }
      // Claim horizontal swipes so the browser does not steal them for scroll.
      if (axis === 'h' && e.cancelable) e.preventDefault();
    }, { passive: false });

    el.addEventListener('touchend', function (e) {
      if (!tracking || !e.changedTouches.length) return;
      var t = e.changedTouches[0];
      finish(t.clientX - startX, t.clientY - startY);
    }, { passive: true });

    el.addEventListener('touchcancel', function () { reset(); }, { passive: true });

    // Mouse / pen only — avoid double-handling with touch pointers on phones.
    el.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch') return;
      if (e.button !== 0 || sheetOpen() || ignoreTarget(e.target)) return;
      startX = e.clientX;
      startY = e.clientY;
      tracking = true;
      axis = '';
      pointerId = e.pointerId;
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
    });

    el.addEventListener('pointermove', function (e) {
      if (!tracking || e.pointerType === 'touch') return;
      if (pointerId != null && e.pointerId !== pointerId) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      if (!axis) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        axis = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
      }
    });

    el.addEventListener('pointerup', function (e) {
      if (!tracking || e.pointerType === 'touch') return;
      if (pointerId != null && e.pointerId !== pointerId) return;
      finish(e.clientX - startX, e.clientY - startY);
    });

    el.addEventListener('pointercancel', function (e) {
      if (e.pointerType === 'touch') return;
      reset();
    });
  }

  function loadIndex() {
    if (state.index) return Promise.resolve(state.index);
    function readIndex(path) {
      return fetch(rootUrl() + path, { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.json() : { employees: [] }; })
        .catch(function () { return { employees: [] }; });
    }
    return Promise.all([
      readIndex('/schedules/index.json'),
      readIndex('/import/schedules/index.json')
    ]).then(function (results) {
      var byId = {};
      var exportEmps = (results[0] && results[0].employees) || [];
      var importEmps = (results[1] && results[1].employees) || [];
      if (pageIsImport()) {
        importEmps.forEach(function (emp) {
          if (!emp || !emp.id) return;
          byId[emp.id] = emp;
        });
      } else {
        exportEmps.forEach(function (emp) {
          if (!emp || !emp.id) return;
          byId[emp.id] = emp;
        });
        importEmps.forEach(function (emp) {
          if (!emp || !emp.id) return;
          var prev = byId[emp.id];
          if (!prev || usesImportRoster(emp.department) || !prev.department) {
            byId[emp.id] = emp;
          }
        });
      }
      var employees = Object.keys(byId).map(function (id) { return byId[id]; });
      employees.sort(function (a, b) {
        return String(a.name || a.id).localeCompare(String(b.name || b.id), undefined, { sensitivity: 'base' });
      });
      state.index = { employees: employees };
      return state.index;
    });
  }

  function loadSchedule(empId) {
    return resolveSchedule(empId);
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
      html += '<button type="button" class="pickRow" data-id="' + escapeHtml(emp.id) + '" data-name="' + escapeHtml(emp.name || '') + '" data-dept="' + escapeHtml(emp.department || '') + '">';
      html += '<span class="pickName">' + escapeHtml(emp.name || emp.id) + ' · ' + escapeHtml(emp.id) + '</span>';
      html += '<span class="pickDept">' + escapeHtml(deptLabel(emp.department || '')) + '</span>';
      html += '</button>';
    });
    box.innerHTML = html || '<p class="pickEmpty">' + escapeHtml(t('missingEmp')) + '</p>';
  }

  function startForEmployee(empId) {
    state.empId = empId;
    state.index = null;
    state.statsMode = false;
    state.statsShiftKey = '';
    state.statsWindowIndex = 0;
    state.statsSelectedDept = '';
    state.coShift = {
      token: '',
      workDays: 0,
      counts: Object.create(null),
      ready: false,
      promise: null
    };
    setLoading(true);
    loadSchedule(empId).then(function (json) {
      state.schedule = json;
      state.empName = json.name ? (json.name + ' - ' + empId) : empId;
      state.empNameAr = '';
      state.empDept = json.department || '';
      var dates = collectDates(json);
      state.minDate = dates[0] || '';
      state.maxDate = dates[dates.length - 1] || '';
      var q = new URLSearchParams(location.search);
      var wanted = (q.get('date') || '').trim() || muscatToday();
      if (state.minDate && wanted < state.minDate) wanted = state.minDate;
      if (state.maxDate && wanted > state.maxDate) wanted = state.maxDate;
      syncEmpNameAr();
      paintChrome();
      if (!state.empNameAr) {
        resolveEmpNameAr(empId, wanted).then(function (nameAr) {
          if (nameAr) {
            state.empNameAr = nameAr;
            paintChrome();
          }
        });
      }
      closePicker();
      buildShiftStrip();
      renderDay(wanted, '');
    }).catch(function () {
      setLoading(false);
      openPicker();
    });
  }

  function injectExtrasCss() {
    if (document.getElementById('withMeExtrasCss')) return;
    var style = document.createElement('style');
    style.id = 'withMeExtrasCss';
    style.textContent = [
      '.shiftChip{gap:7px;}',
      '.shiftChip .shiftDot{display:none!important;}',
      '.shiftStatsBtn{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;margin:0;padding:0;border:none;border-radius:999px;background:color-mix(in srgb,var(--shift-accent,#64748b) 18%,transparent);color:var(--shift-accent,#64748b);cursor:pointer;flex-shrink:0;box-shadow:none;transition:transform .15s ease,background .15s ease,color .15s ease;-webkit-tap-highlight-color:transparent;touch-action:manipulation;}',
      '.shiftStatsBtn svg{width:13px;height:13px;display:block;}',
      '.shiftStatsBtn:hover{background:color-mix(in srgb,var(--shift-accent,#64748b) 28%,transparent);color:var(--text);}',
      '.shiftStatsBtn:active{transform:scale(.96);}',
      '.shiftStatsBtn.is-active{background:var(--brand-soft);color:var(--brand);}',
      '.deptHead{gap:8px;}',
      '.deptCount{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 6px;margin:0;border-radius:999px;background:color-mix(in srgb,var(--text-muted) 14%,transparent);color:var(--text-secondary);font-size:10px;font-weight:800;line-height:1;font-variant-numeric:tabular-nums;flex-shrink:0;}',
      '.deptHead .roleDot{display:none!important;}',
      '.deptCount.count-red,.deptStatsNum.count-red{background:#fecaca!important;color:#b91c1c!important;}',
      '.deptCount.count-orange,.deptStatsNum.count-orange{background:#ffedd5!important;color:#c2410c!important;}',
      '.deptCount.count-green,.deptStatsNum.count-green{background:#bbf7d0!important;color:#15803d!important;}',
      '.deptCount.count-green-dark,.deptStatsNum.count-green-dark{background:#15803d!important;color:#fff!important;}',
      '.deptStatsPanel{padding:10px 10px 12px;background:linear-gradient(180deg,#fff 0%,#f8fafc 100%);}',
      '.deptStatsHint{margin:0 0 4px;font-size:11px;font-weight:600;color:var(--text-muted);text-align:center;}',
      '.deptStatsRange{margin:0 0 10px;font-size:12px;font-weight:800;color:var(--text);text-align:center;letter-spacing:-.01em;}',
      '.deptStatsLoading,.deptStatsEmpty{margin:8px 4px 4px;padding:18px 10px;text-align:center;font-size:13px;font-weight:600;color:var(--text-muted);}',
      '.deptStatsScroll{width:100%;overflow:hidden;border:1px solid var(--border);border-radius:14px;background:#fff;}',
      '.deptStatsTable{width:100%;border-collapse:collapse;table-layout:fixed;}',
      '.deptStatsTable th,.deptStatsTable td{padding:8px 4px;text-align:center;border-block-end:1px solid #eef2f7;vertical-align:middle;}',
      '.deptStatsTable thead th{background:#f8fafc;padding-block:8px 7px;}',
      '.deptStatsDeptCol{width:34%;text-align:start!important;padding-inline:10px 6px!important;}',
      '.deptStatsTable tbody tr{cursor:pointer;transition:background .15s ease,box-shadow .15s ease;}',
      '.deptStatsTable tbody tr.tone-b{background:#fafbfc;}',
      '.deptStatsTable tbody tr:hover:not(.is-selected){background:color-mix(in srgb,var(--shift-accent,#64748b) 8%,#fff);}',
      '.deptStatsTable tbody tr.is-selected,.deptStatsTable tbody tr.tone-a.is-selected,.deptStatsTable tbody tr.tone-b.is-selected{background:#dbeafe!important;box-shadow:inset 3px 0 0 #2563eb;}',
      '.deptStatsTable tbody tr.is-selected .deptStatsDeptLabel{color:#1e3a8a;font-weight:800;}',
      '.deptStatsDayName{display:block;font-size:10px;font-weight:700;color:var(--text-muted);line-height:1.1;}',
      '.deptStatsDayNum{display:block;margin-top:2px;font-size:13px;font-weight:800;color:var(--text);font-variant-numeric:tabular-nums;line-height:1;}',
      '.deptStatsDeptCol .roleDot{display:inline-block;width:6px;height:6px;border-radius:999px;margin-inline-end:6px;vertical-align:middle;background:var(--dept-default);}',
      'tr[data-dept="Supervisors"] .roleDot{background:var(--dept-supervisors);}',
      'tr[data-dept="Load Control"] .roleDot{background:var(--dept-load);}',
      'tr[data-dept="Export Checker"] .roleDot{background:var(--dept-checker);}',
      'tr[data-dept="Export Operators"] .roleDot{background:var(--dept-ops);}',
      'tr[data-dept="Officers"] .roleDot{background:var(--dept-officers);}',
      'tr[data-dept="Flight Dispatch"] .roleDot,tr[data-dept="Flight Dispatch (Export)"] .roleDot,tr[data-dept="Flight Dispatch (Import)"] .roleDot{background:var(--dept-flight);}',
      'tr[data-dept="FLTA"] .roleDot{background:var(--dept-flta);}',
      'tr[data-dept="Documentation"] .roleDot{background:#64748b;}',
      'tr[data-dept="Import Checkers"] .roleDot{background:#6366f1;}',
      'tr[data-dept="Import Operators"] .roleDot{background:#7c3aed;}',
      'tr[data-dept="Release Control"] .roleDot{background:#0891b2;}',
      '.deptStatsDeptLabel{display:inline;font-size:11px;font-weight:700;color:var(--text-secondary);line-height:1.25;vertical-align:middle;}',
      '.deptStatsNum{display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:22px;padding:0 6px;border-radius:999px;background:color-mix(in srgb,var(--shift-accent,#64748b) 14%,transparent);color:var(--text);font-size:11px;font-weight:800;font-variant-numeric:tabular-nums;}',
      '.deptStatsCell.is-zero .deptStatsNum:not([class*="count-"]){background:#f1f5f9;color:#94a3b8;}',
      '.deptStatsDots{display:flex;justify-content:center;gap:6px;margin-top:10px;}',
      '.deptStatsDot{width:6px;height:6px;border-radius:999px;background:#cbd5e1;}',
      '.deptStatsDot.is-active{background:var(--brand);width:16px;}',
      '@media (max-width:420px){.deptStatsDeptLabel{font-size:10px;}.deptStatsNum{min-width:20px;height:20px;font-size:10px;}.deptStatsDeptCol{width:36%;}}'
    ].join('');
    document.head.appendChild(style);
  }

  function init() {
    if (pageIsImport()) setRosterKind('import');
    injectExtrasCss();
    syncBannerTexture();
    loadNamesAr();
    state.lang = readLang();
    applyLang(state.lang);
    var home = document.getElementById('backBtn');
    if (home) home.href = rootUrl() + (pageIsImport() ? '/import/' : '/');
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
    bindShiftStripDrag(document.getElementById('shiftStrip'));
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
      var dept = row.getAttribute('data-dept') || '';
      if (!id) return;
      if (!saveEmp(id, name, dept)) return;
      startForEmployee(id);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        var dir = e.key === 'ArrowLeft' ? -1 : 1;
        // Keep physical left/right the same in AR/EN for stats windows & days.
        if (state.statsMode) {
          shiftStatsWindow(dir > 0 ? 1 : -1);
          return;
        }
        go(state.lang === 'ar' ? -dir : dir);
      }
      if (e.key === 'Escape') closePicker();
    });
    document.getElementById('crewTrack')?.addEventListener('click', function (e) {
      var btn = e.target.closest('.shiftStatsBtn');
      if (btn) {
        e.preventDefault();
        e.stopPropagation();
        toggleStatsMode(btn.getAttribute('data-shift') || state.statsShiftKey || '');
        return;
      }
      var deptRow = e.target.closest('.deptStatsTable tbody tr[data-dept]');
      if (deptRow) {
        e.preventDefault();
        e.stopPropagation();
        selectStatsDept(deptRow.getAttribute('data-dept') || '');
      }
    });
    document.addEventListener('pointerdown', function (e) {
      if (!state.statsMode || !state.statsSelectedDept) return;
      var t = e.target;
      if (!t || !t.closest) return;
      // Keep highlight while interacting inside the stats card; clear only outside.
      if (t.closest('.crewCard.is-stats')) return;
      clearStatsDeptSelection();
    }, true);
    var statsResizeTimer = null;
    window.addEventListener('resize', function () {
      if (!state.statsMode) return;
      if (statsResizeTimer) window.clearTimeout(statsResizeTimer);
      statsResizeTimer = window.setTimeout(function () {
        state.statsWindowIndex = statsWindowIndexForDate(state.date);
        paintStatsView();
      }, 160);
    });
    document.addEventListener('rosterBgTextureChange', function (e) {
      syncBannerTexture(e && e.detail ? e.detail : null);
    });
    window.addEventListener('storage', function (e) {
      if (e.key === PAGE_TX_KEY) syncBannerTexture();
    });
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) syncBannerTexture();
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
    mergeGroups: mergeGroups,
    empIdFromLabel: empIdFromLabel,
    addDays: addDays,
    rowIsoDate: rowIsoDate
  };
})();
