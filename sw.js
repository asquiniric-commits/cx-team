// CX Team Manager — Service Worker v2.0
const CACHE = 'cx-team-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

// Installazione: pre-cache assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Attivazione: pulisce cache vecchie
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch: network-first per HTML (così vede sempre aggiornamenti), cache-first per assets statici
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('googleapis.com') || e.request.url.includes('accounts.google.com')) return;

  const url = new URL(e.request.url);
  const isHTML = url.pathname.endsWith('.html') || url.pathname.endsWith('/') || url.pathname === '';

  if (isHTML) {
    // Network-first per HTML: prova sempre la rete, fallback alla cache
    e.respondWith(
      fetch(e.request)
        .then(response => {
          if (!response || response.status !== 200 || response.type === 'opaque') {
            return caches.match(e.request) || response;
          }
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return response;
        })
        .catch(() => caches.match(e.request) || caches.match('./index.html'))
    );
  } else {
    // Cache-first per assets statici (icone, manifest)
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(response => {
          if (!response || response.status !== 200 || response.type === 'opaque') return response;
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return response;
        });
      }).catch(() => caches.match('./index.html'))
    );
  }
});

// Messaggio per forzare aggiornamento
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
