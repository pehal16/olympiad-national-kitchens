const CACHE_NAME = "national-kitchens-olympiad-v1-6-11";
const PRECACHE_URLS = [
  "/",
  "/admin.html",
  "/content-admin.html",
  "/styles.css?v=1.6.11",
  "/app.js?v=1.6.11",
  "/admin.js?v=1.6.11",
  "/content-admin.js?v=1.6.11",
  "/manifest.webmanifest?v=1.6.11",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/brand-prof-tourism.png",
  "/brand-gkts-shield.jpg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.pathname.startsWith("/api/")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/")));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request).then((response) => {
        if (!response || response.status !== 200) {
          return response;
        }
        const cloned = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
        return response;
      });
    })
  );
});
