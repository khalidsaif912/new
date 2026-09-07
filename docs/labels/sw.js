const SW_VERSION = "sats-labels-2026-09-07-v1";

self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (key) {
              return key.indexOf("sats-labels-") === 0 && key !== SW_VERSION;
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

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;

  var url = new URL(event.request.url);
  var isAppDoc =
    event.request.mode === "navigate" ||
    url.pathname.endsWith(".html") ||
    /\/labels\/?$/.test(url.pathname) ||
    url.pathname === "/" ||
    url.pathname === "";

  if (isAppDoc) {
    event.respondWith(fetch(event.request, { cache: "no-store" }));
    return;
  }

  event.respondWith(fetch(event.request));
});
