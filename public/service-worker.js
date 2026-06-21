// service-worker.js - enables offline access and the "Install App" capability

const CACHE_NAME = 'trade-journal-cache-v1';
const ASSETS = [
  'login.html',
  'register.html',
  'index.html',
  'journal.html',
  'css/style.css',
  'js/auth.js',
  'js/plan.js',
  'js/journal.js',
  'manifest.json',
  'icon-192.png',
  'icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', (event) => {
  // Never cache API calls — always go to network so journal data stays live
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
