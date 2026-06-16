const CACHE_NAME = 'markedup-v2';
const REMOTE_ASSET_CACHE = 'markedup-remote-assets-v1';
const REMOTE_ASSET_HOSTS = new Set([
  'api.iconify.design',
  'picsum.photos',
  'images.unsplash.com',
  'images.pexels.com'
]);

const PRECACHE_URLS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './css/styles.css',
  './js/core/settings.js',
  './js/core/db.js',
  './js/core/utils.js',
  './js/ui/ui-utils.js',
  './js/assets/icons.js',
  './js/assets/emojis.js',
  './js/assets/stock.js',
  './js/features/library.js',
  './js/features/pdf-viewer.js',
  './js/features/notes.js',
  './js/editor/editor.js',
  './js/editor/exporter.js',
  './js/ui/settings-ui.js',
  './js/app.js',
  './js/main.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);

  const shouldCacheRemoteAsset =
    requestUrl.origin !== self.location.origin &&
    REMOTE_ASSET_HOSTS.has(requestUrl.hostname);

  if (shouldCacheRemoteAsset) {
    event.respondWith(
      caches.open(REMOTE_ASSET_CACHE).then(async cache => {
        const cached = await cache.match(event.request);
        const networkFetch = fetch(event.request)
          .then(response => {
            if (response.ok || response.type === 'opaque') {
              cache.put(event.request, response.clone()).catch(() => {});
            }
            return response;
          })
          .catch(() => cached || new Response('', { status: 504, statusText: 'Gateway Timeout' }));

        return cached || networkFetch;
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          // Cache successful same-origin responses
          if (response.ok && requestUrl.origin === self.location.origin) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone)).catch(() => {});
          }
          return response;
        });
      })
      .catch(() => {
        // Offline fallback: return cached index for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      })
  );
});
