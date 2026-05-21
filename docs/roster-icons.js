/**
 * Unified roster icons — same assets on every page (local + GitHub Pages).
 */
(function () {
  'use strict';

  var ICON_VER = '20260521b';
  var ICONS = {
    diff: '/assets/icons/diff-calendar.png',
    flight: '/assets/icons/flight.png',
  };

  function siteRoot() {
    if (location.protocol === 'file:') return '';
    var path = location.pathname || '/';
    if (path.indexOf('/roster-site/') !== -1) return '/roster-site';
    if (location.hostname && location.hostname.endsWith('github.io')) {
      var segs = path.split('/').filter(Boolean);
      if (segs.length >= 2 && segs[1] === 'docs') return '/' + segs[0] + '/docs';
      return segs.length ? '/' + segs[0] : '';
    }
    return '';
  }

  function applyRosterIcons() {
    var root = siteRoot();
    document.querySelectorAll('img.roster-icon').forEach(function (img) {
      var key = img.getAttribute('data-roster-icon');
      var rel = key && ICONS[key] ? ICONS[key] : null;
      if (!rel) {
        var src = img.getAttribute('src') || '';
        if (src.indexOf('/assets/icons/') !== -1) {
          rel = src.split('?')[0];
        }
      }
      if (!rel) return;
      if (rel.charAt(0) !== '/') rel = '/' + rel;
      img.src = root + rel + '?v=' + ICON_VER;
    });
  }

  window.applyRosterIcons = applyRosterIcons;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyRosterIcons);
  } else {
    applyRosterIcons();
  }
})();
