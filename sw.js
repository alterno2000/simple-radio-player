const CACHE_NAME = 'radio-player-v2'; // ← sube la versión para forzar actualización
const ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
      .catch((err) => console.warn('Cache addAll falló:', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Solo GET
  if (req.method !== 'GET') return;

  // ⚠️ CRÍTICO: NO interceptar NADA que no sea del mismo origen
  if (url.origin !== self.location.origin) return;

  // No interceptar archivos de audio
  if (/\.(mp3|aac|ogg|m3u8|pls)(\?|$)/i.test(url.pathname)) return;

  // ⚠️ CRÍTICO: solo cachear navegación (HTML) y assets estáticos, NUNCA la API
  // Si la petición no es navegación ni un asset conocido, dejar pasar sin interceptar
  const isNavigation = req.mode === 'navigate';
  const isStaticAsset = /\.(html|css|js|png|jpg|jpeg|svg|webp|ico|json|woff2?|ttf)(\?|$)/i.test(url.pathname);

  if (!isNavigation && !isStaticAsset) {
    return; // dejar pasar sin tocar
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((cached) => {
          if (cached) return cached;
          if (isNavigation) return caches.match('./index.html');
          // ⚠️ NUNCA devolver index.html para peticiones que no son navegación
          return new Response('', { status: 504, statusText: 'Offline' });
        })
      )
  );
});
