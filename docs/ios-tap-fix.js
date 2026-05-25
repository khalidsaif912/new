/**
 * iOS / iPadOS touch fixes — summary chips, CTA bar, training dock, lang/banner.
 * Loaded synchronously from <head> when possible.
 */
(function () {
  'use strict';

  var ua = navigator.userAgent || '';
  var isIOS =
    /iP(hone|ad|od)/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!isIOS) return;

  var TAP_SELECTOR = [
    'a.summaryChip',
    'button.summaryChip',
    'a.roster-cta-btn',
    'button.roster-cta-btn',
    'button.langToggle',
    '#banner-changer-btn',
    'a.btn',
    'button.btn',
    '.topDock .dockCard.dockAction',
    '.topDock .dockCard.savedChip',
    '.topDock button.dockCard',
    '#rosterHomeBtn',
    '#searchToggle',
    '#otherPageBtn',
    '#savedChip',
    '.welcomeChip',
    'button.shiftFilterBtn',
    '.siteShareCloseBtn',
    '.siteAppsCloseBtn',
  ].join(',');

  var SKIP_SELECTOR =
    '.datePickerWrapper, .siteShareSheet.open, .siteAppsSheet.open, .captureSheet.open';

  function siteRootUrl() {
    if (typeof getSiteRootUrl === 'function') return getSiteRootUrl();
    var path = location.pathname || '/';
    if (path.indexOf('/roster-site/') !== -1) return location.origin + '/roster-site';
    if (location.hostname && location.hostname.endsWith('github.io')) {
      var segs = path.split('/').filter(Boolean);
      if (segs.length >= 2 && segs[1] === 'docs') return location.origin + '/' + segs[0] + '/docs';
      return segs.length ? location.origin + '/' + segs[0] : location.origin;
    }
    return location.origin;
  }

  function fixPlaceholderHrefs() {
    var base = siteRootUrl();
    document.querySelectorAll('a[href]').forEach(function (a) {
      var h = a.getAttribute('href') || '';
      if (h.indexOf('{BASE}') === -1 && h.indexOf('{{BASE}}') === -1) return;
      a.setAttribute('href', h.split('{{BASE}}').join(base).split('{BASE}').join(base));
    });
    document.querySelectorAll('a[href="#"], a[href=""]').forEach(function (a) {
      if (!a.closest('.summaryBar, .quickActions, .topDock')) return;
      var id = a.id || '';
      var base = siteRootUrl();
      if (id === 'myScheduleBtn') a.setAttribute('href', base + '/my-schedules/index.html');
      else if (id === 'importBtn') a.setAttribute('href', base + '/import/');
      else if (id === 'trainingBtn') a.setAttribute('href', base + '/training/');
      else if (id === 'diffChipBtn') a.setAttribute('href', base + '/roster-diff/index.html');
    });
  }

  function closestTap(node) {
    if (!node || !node.closest) return null;
    if (node.closest(SKIP_SELECTOR)) return null;
    return node.closest(TAP_SELECTOR);
  }

  function validNavigateHref(el) {
    if (!el || el.tagName !== 'A') return '';
    var h = (el.getAttribute('href') || '').trim();
    if (!h || h === '#' || h.indexOf('javascript:') === 0) return '';
    return h;
  }

  function runHandler(el, evt) {
    if (!el || el.disabled) return false;
    var href = validNavigateHref(el);
    if (href) {
      try {
        if (evt && evt.preventDefault) evt.preventDefault();
      } catch (e1) {}
      window.location.assign(href);
      return true;
    }
    try {
      if (typeof el.onclick === 'function') {
        el.onclick(evt || null);
        return true;
      }
    } catch (e2) {}
    var attr = el.getAttribute && el.getAttribute('onclick');
    if (attr) {
      try {
        /* eslint-disable no-new-func */
        new Function('event', attr).call(el, evt || window.event);
        return true;
      } catch (e3) {}
    }
    try {
      el.click();
      return true;
    } catch (e4) {}
    return false;
  }

  function targetFromEvent(e) {
    var t = e.target;
    if (e.changedTouches && e.changedTouches[0]) {
      var touch = e.changedTouches[0];
      var hit = document.elementFromPoint(touch.clientX, touch.clientY);
      if (hit) t = hit;
    }
    return closestTap(t);
  }

  var lastTouchAt = 0;
  var lastTouchEl = null;

  function onPointerEnd(e) {
    var el = targetFromEvent(e);
    if (!el) return;
    lastTouchAt = Date.now();
    lastTouchEl = el;
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();
    runHandler(el, e);
  }

  document.addEventListener('touchend', onPointerEnd, { passive: false, capture: true });
  document.addEventListener('pointerup', onPointerEnd, { passive: false, capture: true });

  document.addEventListener(
    'click',
    function (e) {
      if (!lastTouchAt || Date.now() - lastTouchAt > 700) return;
      var el = closestTap(e.target);
      if (!el || el !== lastTouchEl) return;
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
      lastTouchEl = null;
    },
    true
  );

  function boot() {
    fixPlaceholderHrefs();
    document.querySelectorAll(TAP_SELECTOR).forEach(function (el) {
      el.style.cursor = 'pointer';
      if (el.tagName === 'BUTTON' && !el.getAttribute('type')) {
        el.setAttribute('type', 'button');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
