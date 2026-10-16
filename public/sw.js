const CACHE_NAME = "national-kitchens-olympiad-admin-review-certificate1";
const PRECACHE_URLS = [
  "/olympiad-ready.css?v=manual-admission1",
  "/olympiad-device.js?v=oct16-ready1",
  "/story-dialogue.js?v=layout5-oct12",
  "/restaurant-comic.css?v=layout5-oct12",
  "/olympiad-story.js?v=participant-flow2",
  "/story-banquet.js?v=assembly45",
  "/story-banquet.css?v=live-table5",
  "/restaurant-layout.js?v=oct16-ready1",
  "/restaurant-layout.css?v=layout5-oct12",
  "/olympiad-story.css?v=story2",
  "/",
  "/certificate.html",
  "/styles.css?v=completion-feedback1",
  "/t5-final-kitchen.css?v=1.7.0-story2",
  "/t5-photo-kitchen.css?v=mobile-kitchen3",
  "/t5-dish-service.css?v=1.7.0-story2",
  "/t5-photo-model.js?v=1.7.0-story2",
  "/t5-dish-service.js?v=1.7.0-layout5-oct12",
  "/t5-photo-kitchen.js?v=mobile-kitchen3",
  "/certificate.css?v=completion-feedback1",
  "/certificate.js?v=admin-certificate1",
  "/assets/olympiad/certificate/college-seal-user-v1.jpg",
  "/attempt-reserve.js?v=shared1",
  "/app.js?v=organizer-link1",
  "/t5-final-kitchen.js?v=1.7.0-layout2",
  "/t4-guest-order.js?v=1.7.0-layout5-oct12",
  "/t2-country-match.js?v=1.7.0-oct16-ready1",
  "/t3-detective.js?v=1.7.0-layout5-oct12",
  "/manifest.webmanifest?v=1.7.0",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/brand-prof-tourism.png",
  "/brand-gkts-shield.jpg",
  "/restaurant-media.js?v=layout5-oct12",
  "/restaurant-atlas.js?v=layout5-oct12"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        let index=0;
        await Promise.all(Array.from({length:3},async()=>{
          while(index<PRECACHE_URLS.length){
            const url=PRECACHE_URLS[index++],request=new Request(url,{cache:'reload'}),response=await fetch(request);
            if(!response.ok)throw new Error('Required offline file unavailable');
            await cache.put(request,response);
          }
        }));
      })
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
          if(response.status>=500)throw new Error('Shell temporarily unavailable');
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
