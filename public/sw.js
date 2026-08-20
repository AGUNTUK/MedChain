const CACHE_NAME = 'medichain-static-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/logo.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Best effort caching of static root assets
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('Failed to precache some static assets:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName.startsWith('medichain-static-')) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. DANGEROUS/DYNAMIC DATA: DO NOT CACHE
  // Supabase, APIs, etc.
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase.co') ||
    event.request.method !== 'GET'
  ) {
    return; // Pass through to network
  }

  // 2. NAVIGATION REQUESTS (e.g. /login, /pharmacy, etc.)
  // Network first, fallback to cached /index.html (app shell)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedHtml = await cache.match('/index.html');
        if (cachedHtml) {
          return cachedHtml;
        }
        // Basic fallback if everything fails
        return new Response(
          `<!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Offline - MediChain</title>
            <style>
              body { font-family: system-ui, sans-serif; background: #111; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; padding: 20px; }
              h1 { color: #A3E635; }
              p { max-width: 400px; color: #a1a1aa; }
            </style>
          </head>
          <body>
            <h1>You're offline</h1>
            <p>MediChain cannot connect to the server right now. Please check your internet connection and try again.</p>
          </body>
          </html>`,
          {
            headers: { 'Content-Type': 'text/html' }
          }
        );
      })
    );
    return;
  }

  // 3. VITE STATIC ASSETS (JS, CSS, fonts, images)
  // Cache first, fallback to network. 
  // We runtime-cache these since filenames have hashes.
  if (
    url.pathname.match(/\.(js|css|woff2?|ttf|png|jpe?g|svg|json|webmanifest)$/i)
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          // Cache successful valid responses
          if (networkResponse.ok && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(err => {
          console.warn('Network fetch failed for asset:', event.request.url);
          throw err;
        });
      })
    );
    return;
  }

});
