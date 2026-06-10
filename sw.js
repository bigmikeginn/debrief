const CACHE = 'debrief-shell-v1';

// Pre-cache the bare minimum needed to show the app shell offline
const PRECACHE = [
  '/debrief-mark-gold.png',
  '/debrief-mark-icon-dark.png',
  '/optimized-images/debrief-mark-gold.webp',
  '/site.webmanifest',
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE).catch(() => {}))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Let cross-origin requests (Supabase, Google Fonts, etc.) pass through untouched
  if (url.origin !== self.location.origin) return;

  // Network-first: always try the network, cache successful responses, fall back to cache
  event.respondWith(
    fetch(event.request)
      .then(res => {
        if (res.ok) {
          caches.open(CACHE).then(c => c.put(event.request, res.clone()));
        }
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
