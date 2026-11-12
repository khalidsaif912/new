/* Quick Actions card (Export pages)
 * - collapse / expand the card (collapsed by default, remembered)
 * - "Add Action" slots: the employee picks any app from the Apps launcher
 *   (#siteAppsGrid), max 3, stored per browser.
 * Markup + styles live in scripts/roster_cta_snippets.py (QA_CARD_CSS).
 * This file must not change any existing button ids/handlers.
 */
(function () {
  'use strict';

  var MAX_ACTIONS = 3;
  var STORE_KEY = 'rosterQuickActions:v1';
  var COLLAPSE_KEY = 'rosterQuickActions:collapsed';

  var I18N = {
    en: {
      addTitle: 'Add Action',
      addHint: 'Pick any app to pin here. Up to 3 actions.',
      addHintFull: 'All 3 slots are used. Remove one first.',
      close: 'Close',
      remove: 'Remove ',
      add: 'Add Action',
      empty: 'No apps available right now.'
    },
    ar: {
      addTitle: 'إضافة إجراء',
      addHint: 'اختر أي تطبيق لتثبيته هنا. حتى 3 إجراءات.',
      addHintFull: 'الخانات الثلاث ممتلئة. أزل إجراءً أولاً.',
      close: 'إغلاق',
      remove: 'إزالة ',
      add: 'إضافة إجراء',
      empty: 'لا توجد تطبيقات متاحة الآن.'
    }
  };

  function $(id) {
    return document.getElementById(id);
  }

  function isAr() {
    if (document.body && document.body.classList.contains('ar')) return true;
    return document.documentElement.getAttribute('dir') === 'rtl';
  }

  function t(key) {
    return (isAr() ? I18N.ar : I18N.en)[key] || I18N.en[key] || key;
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function storeGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function storeSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {}
  }

  /* ── saved actions ───────────────────────────────────────────── */

  function readActions() {
    var raw = storeGet(STORE_KEY);
    if (!raw) return [];
    var list;
    try {
      list = JSON.parse(raw);
    } catch (e) {
      return [];
    }
    if (!Array.isArray(list)) return [];
    var seen = {};
    return list
      .filter(function (item) {
        if (!item || !item.id || seen[item.id]) return false;
        seen[item.id] = 1;
        return true;
      })
      .slice(0, MAX_ACTIONS);
  }

  function writeActions(list) {
    storeSet(STORE_KEY, JSON.stringify(list.slice(0, MAX_ACTIONS)));
  }

  /* ── apps catalogue (same source as the Apps modal) ──────────── */

  function appCatalog() {
    var grid = $('siteAppsGrid');
    if (!grid) return [];
    var out = [];
    var seen = {};
    grid.querySelectorAll('a.siteAppsLink[data-app-id]').forEach(function (link) {
      var id = link.getAttribute('data-app-id');
      if (!id || seen[id]) return;
      var href = link.getAttribute('href') || '';
      if (!href || href.charAt(0) === '#') return;
      seen[id] = 1;
      var titleEl = link.querySelector('.siteAppsLink-title');
      var iconEl = link.querySelector('.siteAppsLink-icon');
      out.push({
        id: id,
        href: href,
        title: (titleEl && titleEl.textContent ? titleEl.textContent : id).trim(),
        icon: iconEl ? iconEl.innerHTML : ''
      });
    });
    return out;
  }

  function catalogById() {
    var map = {};
    appCatalog().forEach(function (app) {
      map[app.id] = app;
    });
    return map;
  }

  function resolvedActions() {
    var map = catalogById();
    return readActions()
      .map(function (saved) {
        return map[saved.id] || saved;
      })
      .filter(function (item) {
        return item && item.href && item.title;
      });
  }

  function isExternal(href) {
    try {
      return new URL(href, window.location.href).host !== window.location.host;
    } catch (e) {
      return /^https?:/i.test(href);
    }
  }

  /* ── rendering ───────────────────────────────────────────────── */

  function addSlotHtml() {
    return (
      '<button type="button" class="qaAddSlot" data-qa-add="1">' +
      '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" ' +
      'stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M12 5v14M5 12h14"/></svg>' +
      '<span class="qaEn">Add Action</span><span class="qaAr" lang="ar">إضافة إجراء</span>' +
      '</button>'
    );
  }

  function actionSlotHtml(app) {
    var external = isExternal(app.href);
    return (
      '<div class="qaSlot" data-qa-slot="' + esc(app.id) + '">' +
      '<a class="qaSlotLink" href="' + esc(app.href) + '"' +
      (external ? ' target="_blank" rel="noopener noreferrer"' : '') +
      ' title="' + esc(app.title) + '">' +
      '<span class="qaSlotIcon" aria-hidden="true">' + app.icon + '</span>' +
      '<span class="qaSlotLabel">' + esc(app.title) + '</span>' +
      '</a>' +
      '<button type="button" class="qaSlotRemove" data-qa-remove="' + esc(app.id) + '" ' +
      'aria-label="' + esc(t('remove') + app.title) + '" title="' + esc(t('remove') + app.title) + '">' +
      '&times;</button>' +
      '</div>'
    );
  }

  function updateTotal(extra) {
    var badge = $('qaCardTotalNum');
    if (!badge) return;
    var body = $('qaCardBody');
    // The stats tile is a counter and the Training tile is a duplicate of the
    // top chip — leave both out of the badge.
    var base = body
      ? body.querySelectorAll('.roster-cta-btn:not(#qaStatsBtn):not(#trainingBtnBottom)').length
      : 4;
    badge.textContent = String(base + extra);
  }

  function render() {
    var row = $('qaAddRow');
    var flow = $('qaFlow');
    if (!row) return;
    var actions = resolvedActions();
    if (flow) {
      flow.querySelectorAll('[data-qa-slot]').forEach(function (node) {
        node.remove();
      });
      var holder = document.createElement('div');
      holder.style.display = 'contents';
      holder.innerHTML = actions.map(actionSlotHtml).join('');
      while (holder.firstChild) flow.appendChild(holder.firstChild);
    }
    var html = '';
    for (var i = actions.length; i < MAX_ACTIONS; i += 1) html += addSlotHtml();
    row.innerHTML = html;
    updateTotal(actions.length);
    syncFlowSpan();
  }

  /* Full-width last tile only when the *visible* tile count is odd.
     Hidden tiles (e.g. the phone-only Training tile on desktop) must not
     leave an empty grid cell behind. */
  function syncFlowSpan() {
    var flow = $('qaFlow');
    if (!flow) return;
    var visible = 0;
    Array.prototype.forEach.call(flow.children, function (node) {
      if (node.getClientRects().length) visible += 1;
    });
    flow.classList.toggle('qaFlowOdd', visible % 2 === 1);
  }

  function watchFlowSpan() {
    var pending = false;
    window.addEventListener(
      'resize',
      function () {
        if (pending) return;
        pending = true;
        window.requestAnimationFrame(function () {
          pending = false;
          syncFlowSpan();
        });
      },
      { passive: true }
    );
  }

  /* ── collapse / expand ───────────────────────────────────────── */

  function setCollapsed(collapsed) {
    var card = document.querySelector('.qaCard');
    var toggle = $('qaCardToggle');
    if (!card) return;
    card.classList.toggle('collapsed', collapsed);
    if (toggle) toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    storeSet(COLLAPSE_KEY, collapsed ? '1' : '0');
  }

  function initCollapse() {
    var card = document.querySelector('.qaCard');
    var toggle = $('qaCardToggle');
    if (!card || !toggle) return;
    var saved = storeGet(COLLAPSE_KEY);
    setCollapsed(saved === null ? true : saved === '1');
  }

  /* ── picker sheet ────────────────────────────────────────────── */

  function sheetEl() {
    return $('qaPickSheet');
  }

  function ensureSheet() {
    var sheet = sheetEl();
    if (sheet) return sheet;
    sheet = document.createElement('div');
    sheet.id = 'qaPickSheet';
    sheet.className = 'qaPickSheet';
    sheet.setAttribute('aria-hidden', 'true');
    sheet.innerHTML =
      '<div class="qaPickCard" role="dialog" aria-modal="true" aria-labelledby="qaPickTitle">' +
      '<h2 class="qaPickTitle" id="qaPickTitle"></h2>' +
      '<p class="qaPickHint" id="qaPickHint"></p>' +
      '<div class="qaPickGrid" id="qaPickGrid"></div>' +
      '<div class="qaPickActions">' +
      '<button type="button" class="qaPickClose" id="qaPickClose"></button>' +
      '</div>' +
      '</div>';
    document.body.appendChild(sheet);
    return sheet;
  }

  function paintSheet() {
    var sheet = ensureSheet();
    var title = $('qaPickTitle');
    var hint = $('qaPickHint');
    var grid = $('qaPickGrid');
    var close = $('qaPickClose');
    if (title) title.textContent = t('addTitle');
    if (hint) hint.textContent = readActions().length >= MAX_ACTIONS ? t('addHintFull') : t('addHint');
    if (close) close.textContent = t('close');
    if (!grid) return;

    var saved = readActions().map(function (item) {
      return item.id;
    });
    var catalog = appCatalog();
    if (!catalog.length) {
      grid.innerHTML = '<p class="qaPickHint">' + esc(t('empty')) + '</p>';
      return;
    }
    grid.innerHTML = catalog
      .map(function (app) {
        var on = saved.indexOf(app.id) !== -1;
        return (
          '<button type="button" class="qaPickItem" data-qa-pick="' + esc(app.id) + '" ' +
          'aria-pressed="' + (on ? 'true' : 'false') + '">' +
          '<span class="qaPickItemIcon" aria-hidden="true">' + app.icon + '</span>' +
          '<span class="qaPickItemLabel">' + esc(app.title) + '</span>' +
          '<span class="qaPickItemState" aria-hidden="true">' + (on ? '✓' : '+') + '</span>' +
          '</button>'
        );
      })
      .join('');
    sheet.setAttribute('aria-hidden', 'false');
  }

  function openPicker() {
    var sheet = ensureSheet();
    paintSheet();
    sheet.classList.add('open');
    var close = $('qaPickClose');
    if (close) close.focus({ preventScroll: true });
  }

  function closePicker() {
    var sheet = sheetEl();
    if (!sheet) return;
    sheet.classList.remove('open');
    sheet.setAttribute('aria-hidden', 'true');
  }

  function toggleAction(id) {
    if (!id) return;
    var list = readActions();
    var at = -1;
    list.forEach(function (item, index) {
      if (item.id === id) at = index;
    });
    if (at !== -1) {
      list.splice(at, 1);
    } else {
      if (list.length >= MAX_ACTIONS) {
        var hint = $('qaPickHint');
        if (hint) hint.textContent = t('addHintFull');
        return;
      }
      var app = catalogById()[id];
      if (!app) return;
      list.push({ id: app.id, href: app.href, title: app.title });
    }
    writeActions(list);
    render();
    paintSheet();
  }

  function removeAction(id) {
    var list = readActions().filter(function (item) {
      return item.id !== id;
    });
    writeActions(list);
    render();
    if (sheetEl() && sheetEl().classList.contains('open')) paintSheet();
  }

  /* ── events ──────────────────────────────────────────────────── */

  function onClick(event) {
    var target = event.target;
    if (!target || !target.closest) return;

    if (target.closest('#qaCardToggle')) {
      var card = document.querySelector('.qaCard');
      if (card) setCollapsed(!card.classList.contains('collapsed'));
      return;
    }
    if (target.closest('[data-qa-add]')) {
      event.preventDefault();
      openPicker();
      return;
    }
    var removeBtn = target.closest('[data-qa-remove]');
    if (removeBtn) {
      event.preventDefault();
      removeAction(removeBtn.getAttribute('data-qa-remove'));
      return;
    }
    var pick = target.closest('[data-qa-pick]');
    if (pick) {
      event.preventDefault();
      toggleAction(pick.getAttribute('data-qa-pick'));
      return;
    }
    if (target.closest('#qaPickClose')) {
      closePicker();
      return;
    }
    if (target === sheetEl()) {
      closePicker();
      return;
    }
    // Language switch rebuilds the app labels; re-render our slots after it.
    if (target.closest('.langToggle')) {
      window.setTimeout(render, 80);
      window.setTimeout(render, 500);
    }
  }

  function onKeydown(event) {
    if (event.key !== 'Escape') return;
    if (sheetEl() && sheetEl().classList.contains('open')) closePicker();
  }

  function init() {
    if (!document.querySelector('.qaCard')) return;
    initCollapse();
    render();
    watchFlowSpan();
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKeydown);
    document.addEventListener('rosterLangChanged', function () {
      window.setTimeout(render, 80);
    });
    // The Apps modal fills its dynamic tiles on load / first open.
    window.setTimeout(render, 600);
    window.setTimeout(render, 1800);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
