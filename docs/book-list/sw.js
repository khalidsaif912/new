/* Book List PWA — network-first HTML so deploys show up; versioned assets cache well */
const CACHE = "book-list-v66";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=66",
  "./app.js?v=66",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./favicon-32.png",
  "./apple-touch-icon.png",
  "./plane-takeoff.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isHtmlRequest(req, url) {
  if (req.mode === "navigate") return true;
  const path = url.pathname || "";
  return path.endsWith("/") || path.endsWith("/index.html") || path.endsWith(".html");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.indexOf("/api/") !== -1) {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  // HTML / navigations: always try network so Install button & UI updates appear
  if (isHtmlRequest(req, url)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            caches.open(CACHE).then((cache) => {
              cache.put(req, res.clone());
              cache.put(new Request("./index.html"), res.clone());
            });
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match("./index.html"))
        )
    );
    return;
  }

  // Versioned static assets: cache first, refresh in background
  event.respondWith(
    caches.match(req).then((cached) => {
      const fresh = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fresh;
    })
  );
});
