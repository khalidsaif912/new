(function () {
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

  function applySiteLastUpdated(text) {
    if (!text) return;
    document.querySelectorAll('[data-site-last-updated]').forEach(function (el) {
      el.textContent = text;
    });
  }

  var root = siteRoot();
  var base = location.origin + (root ? root + (root.charAt(root.length - 1) === '/' ? '' : '/') : '/');
  fetch(base + 'site-last-updated.json', { cache: 'no-store' })
    .then(function (r) {
      return r.ok ? r.json() : null;
    })
    .then(function (data) {
      if (!data) return;
      var isAr =
        (document.documentElement.lang || '') === 'ar' ||
        document.body.classList.contains('ar');
      applySiteLastUpdated(isAr && data.display_ar ? data.display_ar : data.display_en);
    })
    .catch(function () {});
})();
