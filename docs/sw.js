const BANNER_CACHE = 'roster-banners-v1';
const BANNER_PATH_RE = /\/assets\/banners\/[^?#]+$/i;

self.addEventListener('install', function (e) {
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(function (keys) {
        return Promise.all(
          keys
            .filter(function (k) {
              return k.indexOf('roster-banners-') === 0 && k !== BANNER_CACHE;
            })
            .map(function (k) {
              return caches.delete(k);
            })
        );
      })
    ])
  );
});

function cacheBannerUrl(url) {
  return caches.open(BANNER_CACHE).then(function (cache) {
    return cache.match(url).then(function (hit) {
      if (hit) return hit;
      return fetch(url).then(function (res) {
        if (res.ok) return cache.put(url, res.clone()).then(function () {
          return res;
        });
        return res;
      });
    });
  });
}

self.addEventListener('message', function (e) {
  var data = e.data;
  if (!data || data.type !== 'cache-banner' || !data.url) return;
  e.waitUntil(cacheBannerUrl(data.url));
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (!BANNER_PATH_RE.test(url.pathname)) return;

  e.respondWith(
    caches.open(BANNER_CACHE).then(function (cache) {
      return cache.match(e.request).then(function (cached) {
        var network = fetch(e.request)
          .then(function (res) {
            if (res.ok) return cache.put(e.request, res.clone()).then(function () {
              return res;
            });
            return res;
          })
          .catch(function () {
            return cached;
          });
        return cached || network;
      });
    })
  );
});
