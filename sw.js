/* Doodle Heroes — service worker */
const CACHE = 'doodle-heroes-v3';
/* Extensionless paths only. Cloudflare Pages 307s /index.html -> / and
   /guide.html -> /guide, and cache.addAll rejects on a redirected response —
   which would silently take out the whole precache, offline support with it. */
const ASSETS = [
  './',
  './play',
  './guide',
  './drawing-tips',
  './parents',
  './about',
  './privacy',
  './assets/site.css',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-64.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  const sameOrigin = url.origin === self.location.origin;
  const isGFonts = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);

  /* Ad traffic must always go straight to the network, never through us. */
  if (!sameOrigin && !isGFonts) return;

  /* Pages: network first, so a published fix reaches people on their next
     visit instead of waiting for a cached copy to turn over. Falls back to
     the cache when offline. */
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((resp) => {
          if (resp && resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return resp;
        })
        .catch(() =>
          caches.match(e.request).then((c) => c || caches.match('./play'))
        )
    );
    return;
  }

  /* Everything else (css, icons, fonts): cache first, refreshed in the
     background for next time. */
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const network = fetch(e.request)
        .then((resp) => {
          if (resp && resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return resp;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
