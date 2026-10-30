// Service Worker para Radio Player PWA
const CACHE_NAME = 'radio-player-v1';
const ASSETS = [
  './Radios_en_línea.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Instalación: precachear archivos propios (NO los streams de radio)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
      .catch((err) => console.warn('Cache addAll falló:', err))
  );
  self.skipWaiting();
});

// Activación: limpiar caches viejos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: estrategia network-first con fallback a cache
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // NO interceptar streams de audio, la API de radios ni peticiones no-GET
  if (req.method !== 'GET') return;
  if (url.origin === self.location.origin && /\.(mp3|aac|ogg|m3u8|pls)(\?|$)/i.test(url.pathname)) return;
  if (url.hostname.includes('radio-browser.info')) return;

  // Solo cachear mismo origen (HTML, CSS, iconos)
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        // Guardar copia fresca en caché
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match('./Radios_en_línea.html')))
  );
});