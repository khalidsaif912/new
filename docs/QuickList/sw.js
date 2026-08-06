const SW_VERSION = 'ql-2026-06-10-v3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isAppDoc =
    event.request.mode === 'navigate' ||
    url.pathname.endsWith('.html') ||
    /\/QuickList\/?$/.test(url.pathname);

  if (isAppDoc) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  event.respondWith(fetch(event.request));
});
