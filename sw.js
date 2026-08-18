// Service Worker — Ronda QR · PJ Tecnologia e Sistemas
// Faz cache do "app shell" (HTML/ícones/manifest) para abrir instantâneo e
// funcionar mesmo com conexão fraca. NÃO intercepta chamadas ao Firebase/
// Firestore nem CDNs externas — essas sempre vão direto pra rede, pra não
// quebrar sincronização em tempo real.

const CACHE_NAME = 'ronda-qr-shell-v3';
const APP_SHELL = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // Só cuida de GET, mesma origem (app shell). Firebase, CDNs de fontes,
  // qrcodejs, html5-qrcode etc. seguem direto pra rede sem passar pelo SW.
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then(cached => {
      const fetchPromise = fetch(req)
        .then(networkRes => {
          if (networkRes && networkRes.ok) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          }
          return networkRes;
        })
        .catch(() => cached);
      // Cache-first pra abrir na hora; atualiza em segundo plano.
      return cached || fetchPromise;
    })
  );
});
