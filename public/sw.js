const CACHE_NAME = 'n-nepef-v6';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/logo.png',
  '/logo.jpg',
  '/manifest.json'
];

// Helper: Identify API requests or development assets (MUST NEVER BE CACHED)
function isApiRequest(url, request) {
  const urlStr = url.toString().toLowerCase();

  // Non-GET requests are never cached
  if (request.method !== 'GET') return true;

  // Application API routes
  if (url.pathname.startsWith('/api/')) {
    return true;
  }

  // Vite development paths and scripts
  if (
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.includes('hot-update') ||
    url.hostname === 'localhost' ||
    url.hostname.includes('ais-dev')
  ) {
    return true;
  }

  return false;
}

// Helper: Identify navigation / HTML requests
function isNavigationRequest(request) {
  return (
    request.mode === 'navigate' ||
    (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'))
  );
}

// 1. INSTALL PHASE - Precache static assets & skip waiting immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// 2. ACTIVATE PHASE - Delete old caches & claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. FETCH PHASE - Caching strategies
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Strategy A: STRICT NETWORK ONLY for Backend API Requests (NEVER CACHE)
  if (isApiRequest(url, event.request)) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Strategy B: NETWORK FIRST for Navigation / HTML Requests (Ensures latest JS bundle hashes are loaded)
  if (isNavigationRequest(event.request)) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match('/index.html') || caches.match('/');
        })
    );
    return;
  }

  // Strategy C: STALE-WHILE-REVALIDATE for Static Assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

