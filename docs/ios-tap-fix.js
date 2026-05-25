/**
 * iOS Safari touch fixes (summary chips, CTA bar, lang/banner controls).
 * - href="#" + onclick often ignores the first tap on iOS
 * - Decorative header layers must not steal touches from chips below
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
  ].join(',');

  function siteRootUrl() {
    if (typeof getSiteRootUrl === 'function') return getSiteRootUrl();
    var path = location.pathname || '/';
    if (path.indexOf('/roster-site/') !== -1) {
      return location.origin + '/roster-site';
    }
    if (location.hostname && location.hostname.endsWith('github.io')) {
      var segs = path.split('/').filter(Boolean);
      if (segs.length >= 2 && segs[1] === 'docs') {
        return location.origin + '/' + segs[0] + '/docs';
      }
      return segs.length ? location.origin + '/' + segs[0] : location.origin;
    }
    return location.origin;
  }

  function fixPlaceholderHrefs() {
    var base = siteRootUrl();
    document.querySelectorAll('a[href]').forEach(function (a) {
      var h = a.getAttribute('href') || '';
      if (h.indexOf('{BASE}') === -1 && h.indexOf('{{BASE}}') === -1) return;
      a.href = h.split('{{BASE}}').join(base).split('{BASE}').join(base);
    });
  }

  function tapTarget(node) {
    if (!node || !node.closest) return null;
    if (node.closest('.datePickerWrapper')) return null;
    if (node.closest('.siteShareSheet.open, .siteAppsSheet.open, .captureSheet.open')) {
      return null;
    }
    return node.closest(TAP_SELECTOR);
  }

  function fireTap(el, sourceEvent) {
    if (!el || el.disabled) return;
    try {
      if (typeof el.onclick === 'function') {
        el.onclick(sourceEvent || null);
        return;
      }
    } catch (err) {
      /* ignore */
    }
    try {
      el.click();
    } catch (err2) {
      /* ignore */
    }
  }

  var lastTouchAt = 0;
  var lastTouchEl = null;

  document.addEventListener(
    'touchend',
    function (e) {
      var el = tapTarget(e.target);
      if (!el) return;
      lastTouchAt = Date.now();
      lastTouchEl = el;
      if (e.cancelable) e.preventDefault();
      fireTap(el, e);
    },
    { passive: false }
  );

  document.addEventListener(
    'click',
    function (e) {
      if (!lastTouchAt) return;
      if (Date.now() - lastTouchAt > 600) return;
      var el = tapTarget(e.target);
      if (!el || el !== lastTouchEl) return;
      if (e.cancelable) e.preventDefault();
      lastTouchEl = null;
    },
    true
  );

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixPlaceholderHrefs);
  } else {
    fixPlaceholderHrefs();
  }
})();
