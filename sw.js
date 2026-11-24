// Service Worker: macht die App offlinefähig.
//
// Strategie "stale-while-revalidate": Dateien kommen sofort aus dem Cache
// (schnell, auch im Funkloch), im Hintergrund wird die neueste Version
// geladen und für den nächsten Start gespeichert.
// Anfragen an Supabase (andere Domain) werden NICHT abgefangen.

const CACHE = 'lernapp-v2'; // bei grundlegenden Änderungen hochzählen

const APP_DATEIEN = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'js/app.js',
  'js/config.js',
  'js/dom.js',
  'js/inhalte.js',
  'js/speicher.js',
  'js/sync.js',
  'js/wiederholung.js',
  'js/matrixanzeige.js',
  'js/fragetypen/index.js',
  'js/fragetypen/gemeinsam.js',
  'js/fragetypen/karteikarte.js',
  'js/fragetypen/auswahl.js',
  'js/fragetypen/matrix.js',
  'faecher/index.json',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_DATEIEN)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((namen) => Promise.all(namen.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const anfrage = event.request;
  if (anfrage.method !== 'GET') return;
  if (new URL(anfrage.url).origin !== self.location.origin) return;
  event.respondWith(staleWhileRevalidate(event));
});

async function staleWhileRevalidate(event) {
  const anfrage = event.request;
  const cache = await caches.open(CACHE);
  const ausCache = await cache.match(anfrage, { ignoreSearch: true });

  const ausNetz = fetch(anfrage)
    .then((antwort) => {
      if (antwort.ok) cache.put(anfrage, antwort.clone());
      return antwort;
    })
    .catch(() => null);

  if (ausCache) {
    event.waitUntil(ausNetz); // Hintergrund-Update zu Ende laufen lassen
    return ausCache;
  }

  const antwort = await ausNetz;
  if (antwort) return antwort;
  if (anfrage.mode === 'navigate') return cache.match('index.html');
  return new Response('Offline', { status: 503, statusText: 'Offline' });
}
