const CACHE_NAME = "national-kitchens-olympiad-story-layout-3c";
const PRECACHE_URLS = [
  "/olympiad-story.js?v=story-layout3c",
  "/restaurant-layout.js?v=layout3c",
  "/restaurant-layout.css?v=layout3c",
  "/olympiad-story.css?v=story2",
  "/",
  "/admin.html",
  "/content-admin.html",
  "/certificate.html",
  "/styles.css?v=1.7.0-layout3c",
  "/t5-final-kitchen.css?v=1.7.0-story2",
  "/t5-photo-kitchen.css?v=1.7.0-story2",
  "/t5-dish-service.css?v=1.7.0-story2",
  "/t5-photo-model.js?v=1.7.0-story2",
  "/t5-dish-service.js?v=1.7.0-layout3c",
  "/t5-photo-kitchen.js?v=1.7.0-layout3c",
  "/certificate.css?v=1.7.0-cert3",
  "/certificate.js?v=1.7.0-finish1",
  "/app.js?v=1.7.0-layout3c",
  "/t5-final-kitchen.js?v=1.7.0-layout2",
  "/t4-guest-order.js?v=1.7.0-layout3c",
  "/t2-country-match.js?v=1.7.0-layout3c",
  "/t3-detective.js?v=1.7.0-layout3c",
  "/admin.js?v=1.7.0-anytime1",
  "/content-admin.js?v=1.7.0",
  "/manifest.webmanifest?v=1.7.0",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/brand-prof-tourism.png",
  "/brand-gkts-shield.jpg",
  "/restaurant-media.js?v=layout3c",
  "/restaurant-atlas.js?v=layout3c"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
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
  const pathname = url.pathname;
  const isCoreShellAsset =
    pathname === "/" ||
    pathname.endsWith(".html") ||
    pathname.endsWith(".js") ||
    pathname.endsWith(".css") ||
    pathname.endsWith(".webmanifest");

  if (request.method !== "GET" || pathname.startsWith("/api/")) {
    return;
  }

  if (request.mode === "navigate" || isCoreShellAsset) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
    );
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
