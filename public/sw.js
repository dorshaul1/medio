// MEDIO's Service Worker — see docs/pwa.md, "Service Worker strategy".
// Deliberately minimal and safe:
//
// - Never intercepts anything but GET requests (mutations always hit
//   the real network — see docs/pwa.md, "Offline mutations").
// - Never caches a navigation (HTML page) response — every MEDIO page is
//   per-request/session-dependent (see CLAUDE.md, "Privacy / caching"
//   across Home/Library/Diary/Stats/Settings); caching one would risk
//   showing a stale or, worse, another account's private content. The
//   *only* offline fallback is one static, account-agnostic HTML file
//   precached below.
// - Runtime-caches only two narrow, genuinely public/immutable
//   categories: Next's own content-hashed `_next/static/` build assets,
//   and this app's own static icon/manifest routes. Both are safe by
//   construction — neither can ever contain a user's private data.
// - Everything else (API routes, RSC/data fetches, TMDB images, auth
//   endpoints) is left completely untouched — not even inspected, just
//   passed straight through to the network.
//
// Bump `CACHE_VERSION` whenever `PRECACHE_URLS` changes; `activate`
// deletes every previously-versioned cache, so old assets never
// accumulate indefinitely across deploys.
const CACHE_VERSION = "medio-static-v1";
const OFFLINE_URL = "/offline.html";
const PRECACHE_URLS = [OFFLINE_URL];

const RUNTIME_CACHEABLE_PREFIXES = ["/_next/static/", "/icons/", "/icon", "/apple-icon"];

function isRuntimeCacheable(url) {
  return (
    url.origin === self.location.origin &&
    (RUNTIME_CACHEABLE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix)) ||
      url.pathname === "/manifest.webmanifest")
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE_URLS)));
  // No `self.skipWaiting()` here — a newly installed worker deliberately
  // stays in the "waiting" state until the page explicitly asks it to
  // take over (see `src/components/pwa-manager.tsx`'s "Refresh"
  // control), so an update never interrupts an in-progress edit.
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

// The page's own explicit "Refresh" action (never triggered
// automatically) — see docs/pwa.md, "Update lifecycle".
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  if (isRuntimeCacheable(url)) {
    event.respondWith(
      caches.open(CACHE_VERSION).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
  }

  // Anything else — API routes, RSC payloads, auth endpoints, TMDB
  // images, private-data responses — is never intercepted at all.
});
