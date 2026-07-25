const SW_VERSION = 'calc-qty-2026-07-25-v1';

self.addEventListener('install', function (event) {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (key) {
              return key.indexOf('calc-qty-') === 0 && key !== SW_VERSION;
            })
            .map(function (key) {
              return caches.delete(key);
            })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;

  var url = new URL(event.request.url);
  var isAppDoc =
    event.request.mode === 'navigate' ||
    url.pathname.endsWith('.html') ||
    /\/calculator\/?$/.test(url.pathname);

  if (isAppDoc) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  event.respondWith(fetch(event.request));
});
