// ============================================
// ANYDOWN - MERGED SERVICE WORKER
// (Ads + PWA Offline Support)
// ============================================

// ---------- AD NETWORK CONFIGURATION ----------
self.options = {
    "domain": "3nbf4.com",
    "zoneId": 10839777
}
self.lary = ""

// Import ad network service worker
importScripts('https://3nbf4.com/act/files/service-worker.min.js?r=sw');

// ---------- PWA OFFLINE CONFIGURATION ----------
importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js');

const CACHE_NAME = "anydown-pwa-v1";
const OFFLINE_PAGE = "/offline.html";

// ---------- PWA INSTALL EVENT ----------
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Cache the offline fallback page if it exists
        return cache.add(OFFLINE_PAGE).catch(() => {
          console.log('Offline page not found, skipping cache');
        });
      })
  );
  self.skipWaiting();
});

// ---------- PWA ACTIVATE EVENT ----------
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== "pwabuilder-page") {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// ---------- PWA NAVIGATION PRELOAD ----------
if (workbox.navigationPreload.isSupported()) {
  workbox.navigationPreload.enable();
}

// ---------- PWA FETCH HANDLER (Offline Fallback) ----------
self.addEventListener('fetch', (event) => {
  // Only handle navigation requests (HTML pages)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Try preload response first
          const preloadResp = await event.preloadResponse;
          if (preloadResp) {
            return preloadResp;
          }
          
          // Try network fetch
          const networkResp = await fetch(event.request);
          return networkResp;
        } catch (error) {
          // Network failed - serve offline page from cache
          console.log('[Service Worker] Offline fallback for:', event.request.url);
          const cache = await caches.open(CACHE_NAME);
          const cachedResp = await cache.match(OFFLINE_PAGE);
          
          if (cachedResp) {
            return cachedResp;
          }
          
          // If no offline page, return a simple response
          return new Response('You are offline. Please check your internet connection.', {
            status: 200,
            headers: { 'Content-Type': 'text/plain' }
          });
        }
      })()
    );
  }
  // For non-navigation requests, let the ad network service worker handle them
  // (No need to add event.respondWith here - the ad network's fetch handler will take over)
});

// ---------- OPTIONAL: Cache core assets for faster loading ----------
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json'
];

// Cache core assets on install (optional - uncomment if needed)

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS).catch((err) => {
        console.log('Failed to cache core assets:', err);
      });
    })
  );
});
