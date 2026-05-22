(function () {
  'use strict';

  /**
   * Manual shift-swap markers. Add an entry per date; list employee job IDs in ids[].
   * To add later: copy a block and set date, ids, ar, en.
   */
  var ROSTER_SHIFT_SWAPS = [
    {
      date: '2026-05-21',
      ids: ['8715', '82577'],
      ar: {
        title: 'تبديل مناوبة بالتراضي',
        intro:
          'اتفق الموظفان أدناه على تبادل المناوبة لهذا اليوم، بموافقة المسؤول.',
        a: 'خالد الرقادي (8715): مناوبة الظهر AN13 (بدلاً عن الصباح).',
        b: 'علي المرجوبي (82577): مناوبة الصباح MN06 (بدلاً عن الظهر).',
        note:
          'التبديل باتفاق الطرفين ولا يغيّر رقم الوظيفة أو التعيين الأساسي.',
        close: 'إغلاق',
        langBtn: 'EN',
        aria: 'تبديل مناوبة — اضغط للتفاصيل'
      },
      en: {
        title: 'Mutual shift swap',
        intro:
          'The employees below mutually agreed to swap shifts for this day, with supervisor approval.',
        a: 'Khalid Al Raqadi (8715): Afternoon shift AN13 (instead of Morning).',
        b: 'Ali Al Marjubi (82577): Morning shift MN06 (instead of Afternoon).',
        note:
          'Swap is by mutual agreement; job IDs and base assignments are unchanged.',
        close: 'Close',
        langBtn: 'ع',
        aria: 'Shift swap — tap for details'
      }
    }
  ];

  var STYLE_ID = 'shift-swap-styles';
  var modalLang = null;

  function swapSvg() {
    return (
      '<svg class="shiftSwapSvg" viewBox="0 0 24 24" width="24" height="24" fill="none" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M5 10h9M14 10l-2.5-2.5M14 10l-2.5 2.5" stroke="#2563eb" stroke-width="2.5"/>' +
      '<path d="M19 14h-9M10 14l2.5-2.5M10 14l2.5 2.5" stroke="#ea580c" stroke-width="2.5"/>' +
      '</svg>'
    );
  }

  function haltRowNavigation(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();
  }

  function getPageDate() {
    var m = (location.pathname || '').match(/\/date\/(\d{4}-\d{2}-\d{2})\//);
    return m ? m[1] : null;
  }

  function getLang() {
    if (modalLang) return modalLang;
    return (
      localStorage.getItem('rosterLang') ||
      localStorage.getItem('importPrefLang') ||
      localStorage.getItem('appLang') ||
      'en'
    );
  }

  function empIdFromRow(row) {
    var raw = row.getAttribute('data-emp-name') || '';
    var m = raw.match(/- (\d+)/);
    return m ? m[1] : '';
  }

  function swapForDate(date) {
    for (var i = 0; i < ROSTER_SHIFT_SWAPS.length; i++) {
      if (ROSTER_SHIFT_SWAPS[i].date === date) return ROSTER_SHIFT_SWAPS[i];
    }
    return null;
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = [
      '.empRowTrail{display:flex;align-items:center;gap:8px;flex-shrink:0;pointer-events:auto}',
      '.shiftSwapBtn{',
      'display:inline-flex;align-items:center;justify-content:center;',
      'width:32px;height:32px;padding:0;margin:0;',
      'border:none;border-radius:0;background:transparent;',
      'cursor:pointer;flex-shrink:0;',
      '-webkit-tap-highlight-color:transparent;',
      'box-shadow:none;outline:none;',
      'transition:transform .15s ease,opacity .15s ease;',
      '}',
      '.shiftSwapBtn:hover{transform:scale(1.08)}',
      '.shiftSwapBtn:active{transform:scale(.94)}',
      '.shiftSwapBtn .shiftSwapSvg{display:block}',
      '.shiftSwapSheet{',
      'position:fixed;inset:0;display:none;align-items:center;justify-content:center;',
      'background:rgba(15,23,42,.45);z-index:10002;padding:16px;',
      'pointer-events:none;visibility:hidden',
      '}',
      '.shiftSwapSheet.open{display:flex;pointer-events:auto;visibility:visible}',
      '.shiftSwapPanel{',
      'width:min(100%,400px);max-height:min(88vh,520px);overflow:auto;',
      'background:#fff;border-radius:16px;padding:18px 16px 14px;',
      'box-shadow:0 18px 48px rgba(15,23,42,.22);',
      '}',
      '.shiftSwapPanel h3{margin:0 0 10px;font:800 17px/1.3 #0f172a}',
      '.shiftSwapPanel p{margin:0 0 8px;font:500 14px/1.55 #334155}',
      '.shiftSwapPanel .swapNote{margin-top:10px;font-size:12px;color:#64748b}',
      '.shiftSwapActions{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}',
      '.shiftSwapActions button{',
      'flex:1;min-width:120px;border:none;border-radius:10px;padding:10px 12px;',
      'font:700 13px/1.2 sans-serif;cursor:pointer;',
      '}',
      '.shiftSwapLangBtn{background:#eff6ff;color:#1d4ed8}',
      '.shiftSwapCloseBtn{background:#0f172a;color:#fff}',
      'body.ar .shiftSwapPanel{direction:rtl;text-align:right}',
      'body.ar .shiftSwapPanel h3,body.ar .shiftSwapPanel p{text-align:right}'
    ].join('');
    document.head.appendChild(st);
  }

  function ensureModal() {
    if (document.getElementById('shiftSwapSheet')) return;
    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<div id="shiftSwapSheet" class="shiftSwapSheet" aria-hidden="true">' +
      '<div class="shiftSwapPanel" role="dialog" aria-labelledby="shiftSwapTitle">' +
      '<h3 id="shiftSwapTitle"></h3>' +
      '<p id="shiftSwapIntro"></p>' +
      '<p id="shiftSwapA"></p>' +
      '<p id="shiftSwapB"></p>' +
      '<p id="shiftSwapNote" class="swapNote"></p>' +
      '<div class="shiftSwapActions">' +
      '<button type="button" class="shiftSwapLangBtn" id="shiftSwapLangBtn"></button>' +
      '<button type="button" class="shiftSwapCloseBtn" id="shiftSwapCloseBtn"></button>' +
      '</div></div></div>';
    document.body.appendChild(wrap.firstChild);
    var sheet = document.getElementById('shiftSwapSheet');
    sheet.addEventListener('click', function (e) {
      if (e.target === sheet) closeModal();
    });
    document.getElementById('shiftSwapCloseBtn').addEventListener('click', closeModal);
    document.getElementById('shiftSwapLangBtn').addEventListener('click', function () {
      modalLang = modalLang === 'ar' ? 'en' : 'ar';
      fillModal(currentSwapEntry());
    });
  }

  var activeEntry = null;

  function currentSwapEntry() {
    return activeEntry;
  }

  function fillModal(entry) {
    if (!entry) return;
    var lang = getLang() === 'ar' ? 'ar' : 'en';
    var t = entry[lang];
    document.getElementById('shiftSwapTitle').textContent = t.title;
    document.getElementById('shiftSwapIntro').textContent = t.intro;
    document.getElementById('shiftSwapA').textContent = t.a;
    document.getElementById('shiftSwapB').textContent = t.b;
    document.getElementById('shiftSwapNote').textContent = t.note;
    document.getElementById('shiftSwapLangBtn').textContent = t.langBtn;
    document.getElementById('shiftSwapCloseBtn').textContent = t.close;
    var sheet = document.getElementById('shiftSwapSheet');
    sheet.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  }

  function openModal(entry) {
    activeEntry = entry;
    modalLang = null;
    ensureModal();
    fillModal(entry);
    var sheet = document.getElementById('shiftSwapSheet');
    sheet.classList.add('open');
    sheet.setAttribute('aria-hidden', 'false');
  }

  function closeModal() {
    var sheet = document.getElementById('shiftSwapSheet');
    if (!sheet) return;
    sheet.classList.remove('open');
    sheet.setAttribute('aria-hidden', 'true');
    activeEntry = null;
  }

  function wrapStatusWithSwap(row, entry, langPack) {
    if (row.querySelector('.shiftSwapBtn')) return;
    var status = row.querySelector('.empStatus');
    if (!status) return;

    var trail = document.createElement('div');
    trail.className = 'empRowTrail';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'shiftSwapBtn';
    btn.setAttribute('aria-label', langPack.aria);
    btn.dataset.shiftSwap = '1';
    btn.innerHTML = swapSvg();

    function onSwapClick(e) {
      haltRowNavigation(e);
      openModal(entry);
    }

    ['pointerdown', 'pointerup', 'touchend'].forEach(function (type) {
      btn.addEventListener(type, haltRowNavigation, true);
    });
    btn.addEventListener('click', onSwapClick, true);
    trail.addEventListener('click', haltRowNavigation, true);
    trail.addEventListener('pointerdown', haltRowNavigation, true);

    status.parentNode.insertBefore(trail, status);
    trail.appendChild(btn);
    trail.appendChild(status);
  }

  function applyForPage() {
    var date = getPageDate();
    if (!date) return;
    var entry = swapForDate(date);
    if (!entry) return;

    var lang = getLang() === 'ar' ? 'ar' : 'en';
    var langPack = entry[lang];
    var idSet = {};
    entry.ids.forEach(function (id) {
      idSet[id] = true;
    });

    document.querySelectorAll('.empRow').forEach(function (row) {
      var id = empIdFromRow(row);
      if (id && idSet[id]) wrapStatusWithSwap(row, entry, langPack);
    });
  }

  function guardSwapClicksCapture() {
    if (document.documentElement.dataset.shiftSwapGuard === '1') return;
    document.documentElement.dataset.shiftSwapGuard = '1';
    document.addEventListener(
      'click',
      function (e) {
        var btn = e.target && e.target.closest ? e.target.closest('.shiftSwapBtn') : null;
        if (!btn) return;
        haltRowNavigation(e);
      },
      true
    );
  }

  function init() {
    injectStyles();
    guardSwapClicksCapture();
    applyForPage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.ROSTER_SHIFT_SWAPS = ROSTER_SHIFT_SWAPS;
  window.rosterShiftSwapRefresh = applyForPage;
})();
