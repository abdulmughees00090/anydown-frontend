// ============================================
// ANYDOWN - SERVICE WORKER (Simple & Reliable)
// Based on working weather app pattern
// ============================================

// ---------- AD NETWORK CONFIGURATION ----------
//self.options = {
//    "domain": "3nbf4.com",
//    "zoneId": 10839777
//}
//self.lary = ""

// Import ad network service worker FIRST
//importScripts('https://3nbf4.com/act/files/service-worker.min.js?r=sw');

// ---------- PWA CACHE CONFIGURATION ----------
const CACHE_NAME = 'anydown-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html'  // Optional - create this file
];

// ---------- INSTALL EVENT ----------
self.addEventListener('install', function(event) {
  console.log('[AnyDown] Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('[AnyDown] Caching assets');
        return cache.addAll(urlsToCache);
      })
      .catch(function(error) {
        console.error('[AnyDown] Cache failed:', error);
      })
  );
  self.skipWaiting();
});

// ---------- FETCH EVENT ----------
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Cache hit - return response
        if (response) {
          return response;
        }
        // Clone request because it can only be used once
        var fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then(function(response) {
          // Check if valid response
          if (!response || response.status !== 200) {
            return response;
          }
          
          // Clone response because it can only be used once
          var responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then(function(cache) {
              cache.put(event.request, responseToCache);
            });
            
          return response;
        });
      })
  );
});

// ---------- ACTIVATE EVENT ----------
self.addEventListener('activate', function(event) {
  console.log('[AnyDown] Service Worker activating...');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('[AnyDown] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});
