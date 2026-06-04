// ============================================================
// ANYDOWN — SERVICE WORKER
// ============================================================
//
// DEPLOYMENT RULE — when you push a new version to GitHub:
//   1. Bump CACHE_NAME below  (e.g. anydown-v2 → anydown-v3)
//   2. Bump SITE_VER in the <head> cache-buster in index.html
//      to the same string.
// That's all. Everything else is automatic.
//
// Strategy overview:
//   • HTML documents  → Network-first  (users always get fresh HTML)
//   • Static assets   → Cache-first    (fonts, icons — rarely change)
//   • On activate     → Delete every cache except the current one
//   • skipWaiting     → New SW activates immediately (no tab-close needed)
//   • clients.claim() → New SW takes over all open tabs right away,
//                       which triggers the controllerchange reload in
//                       index.html so users see the new version instantly.
// ============================================================

const CACHE_NAME = 'anydown-v2'; // ← bump this on every deploy

// ── INSTALL ─────────────────────────────────────────────────
self.addEventListener('install', function (event) {
  console.log('[AnyDown SW] Installing', CACHE_NAME);

  // Activate immediately — do not wait for old tabs to close.
  self.skipWaiting();

  // Pre-cache only the manifest (tiny, non-HTML). We intentionally
  // skip index.html here because network-first in the fetch handler
  // already ensures users always get the newest HTML.
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(['/manifest.json']).catch(function (err) {
        // Non-fatal — site still works without a precached manifest.
        console.warn('[AnyDown SW] Precache skipped (non-fatal):', err);
      });
    })
  );
});

// ── ACTIVATE ────────────────────────────────────────────────
self.addEventListener('activate', function (event) {
  console.log('[AnyDown SW] Activating', CACHE_NAME, '— purging old caches');

  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        // Delete every cache that isn't the current version.
        // This is what removes the stale cached pages and ad scripts.
        return Promise.all(
          keys
            .filter(function (key) { return key !== CACHE_NAME; })
            .map(function (key) {
              console.log('[AnyDown SW] Deleting stale cache:', key);
              return caches.delete(key);
            })
        );
      })
      .then(function () {
        // Take control of all already-open tabs immediately.
        // This triggers the 'controllerchange' event in index.html,
        // which reloads those tabs so they get the newest HTML.
        return self.clients.claim();
      })
  );
});

// ── FETCH ───────────────────────────────────────────────────
self.addEventListener('fetch', function (event) {
  // Only handle same-origin GET requests.
  if (event.request.method !== 'GET') return;

  var url = new URL(event.request.url);

  // Ignore requests to ad networks, analytics, and API calls entirely —
  // let them go straight to the network with no SW involvement.
  var passthroughHosts = [
    'walkingdrunkard.com',
    '3nbf4.com',
    'googletagmanager.com',
    'google-analytics.com',
    'api.silverfoxdynamics.com',
    'api.qrserver.com'
  ];
  if (passthroughHosts.some(function (h) { return url.hostname.includes(h); })) {
    return; // No event.respondWith — browser handles it natively
  }

  var acceptHeader = event.request.headers.get('accept') || '';
  var isHTML = acceptHeader.includes('text/html');

  // ── HTML: Network-first ─────────────────────────────────
  // Always try the network so users get the newest index.html.
  // If offline, serve the cached copy as a fallback.
  if (isHTML) {
    event.respondWith(
      fetch(event.request.clone())
        .then(function (networkResponse) {
          if (networkResponse && networkResponse.ok) {
            var clone = networkResponse.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(event.request, clone);
            });
          }
          return networkResponse;
        })
        .catch(function () {
          // Offline fallback: serve whatever we have cached
          return caches.match(event.request).then(function (cached) {
            return cached || new Response(
              '<h1>You appear to be offline</h1><p>Please reconnect and refresh.</p>',
              { headers: { 'Content-Type': 'text/html' } }
            );
          });
        })
    );
    return;
  }

  // ── Static assets: Cache-first ──────────────────────────
  // CSS, JS, fonts, images — serve from cache when available,
  // populate the cache on first network fetch.
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;

      return fetch(event.request).then(function (networkResponse) {
        // Only cache successful same-origin responses
        if (
          networkResponse &&
          networkResponse.ok &&
          url.origin === self.location.origin
        ) {
          var clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, clone);
          });
        }
        return networkResponse;
      }).catch(function () {
        // Asset fetch failed and not in cache — nothing we can do
        return new Response('', { status: 503 });
      });
    })
  );
});

// ── MESSAGE HANDLER ─────────────────────────────────────────
// The page can post { type: 'SKIP_WAITING' } to force an
// already-waiting SW to activate (used by some update-toast UIs).
self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
