/**
 * Minimal service worker: it makes the app installable and keeps static assets
 * available, and does nothing else.
 *
 * Financial data is deliberately never cached. Supabase is the single source of
 * truth, and a stale cached balance on one device would be worse than no app at
 * all. Navigations and API calls always go to the network.
 */

const CACHE = "home-finance-assets-v1";

const PRECACHE = ["/icons/icon.svg", "/icons/icon-192.png", "/icons/icon-512.png"];

const CACHEABLE_ASSET = /\.(?:png|svg|ico|webmanifest|woff2?)$/;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

function isCacheableAsset(request) {
  if (request.method !== "GET") {
    return false;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return false;
  }

  // Never touch data, auth or server-rendered pages.
  if (request.mode === "navigate" || url.pathname.startsWith("/api")) {
    return false;
  }

  return url.pathname.startsWith("/_next/static") || CACHEABLE_ASSET.test(url.pathname);
}

self.addEventListener("fetch", (event) => {
  if (!isCacheableAsset(event.request)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    }),
  );
});
