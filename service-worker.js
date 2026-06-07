// =============================================================================
// T6.5S Workout — Service Worker
// =============================================================================
// Minimaler Service Worker für PWA-Eligibility und Offline-Start.
// Strategie: Cache-First für statische Assets, alle anderen Requests via Netz.
// =============================================================================

const CACHE_NAME = "t65s-v3.1";
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

// Install: vorab die statischen Assets in den Cache laden
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate: alte Caches löschen
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME)
            .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: erst Cache prüfen, dann Netz; bei Erfolg auch frisch cachen
self.addEventListener("fetch", (event) => {
  // Nur GET-Requests cachen, andere durchreichen
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Nur erfolgreiche, same-origin Responses cachen
        if (response && response.status === 200 && response.type === "basic") {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      }).catch(() => {
        // Bei Netz-Fehler: wenn HTML-Request, Fallback auf index.html
        if (event.request.mode === "navigate") {
          return caches.match("./index.html");
        }
      });
    })
  );
});
