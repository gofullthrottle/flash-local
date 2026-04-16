// FlashLocal Service Worker — offline support for field reps
const CACHE_NAME = "flashlocal-v1";

// Shell routes that should work offline (rep dashboard + prospect capture)
const SHELL_URLS = [
  "/rep",
  "/rep/prospects",
  "/rep/scout",
  "/offline",
];

// Cache app shell on install
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(SHELL_URLS).catch(() => {
        // Non-fatal: some routes may not be available at install time
      })
    )
  );
  self.skipWaiting();
});

// Clean up old caches on activate
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Network-first for API calls, cache-first for app shell
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET and cross-origin requests
  if (event.request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  // API routes: network-only (don't cache sensitive data)
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // App shell and static assets: stale-while-revalidate
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);

      const fetchPromise = fetch(event.request)
        .then((response) => {
          // Only cache successful responses
          if (response.ok) {
            cache.put(event.request, response.clone());
          }
          return response;
        })
        .catch(() => {
          // Network failed — return offline page for navigation requests
          if (event.request.mode === "navigate") {
            return cache.match("/offline");
          }
          return undefined;
        });

      // Return cached version immediately, update in background
      return cached || fetchPromise;
    })
  );
});

// Background sync: queue prospect captures when offline
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-prospects") {
    event.waitUntil(syncProspects());
  }
  if (event.tag === "sync-breadcrumbs") {
    event.waitUntil(syncBreadcrumbs());
  }
});

async function syncProspects() {
  try {
    const cache = await caches.open("flashlocal-offline-queue");
    const requests = await cache.keys();

    for (const request of requests) {
      if (request.url.includes("/api/rep/prospects")) {
        const cached = await cache.match(request);
        if (cached) {
          const body = await cached.json();
          await fetch("/api/rep/prospects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          await cache.delete(request);
        }
      }
    }
  } catch {
    // Will retry on next sync event
  }
}

async function syncBreadcrumbs() {
  try {
    const cache = await caches.open("flashlocal-offline-queue");
    const requests = await cache.keys();

    for (const request of requests) {
      if (request.url.includes("/api/rep/scout/breadcrumb")) {
        const cached = await cache.match(request);
        if (cached) {
          const body = await cached.json();
          await fetch("/api/rep/scout/breadcrumb", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          await cache.delete(request);
        }
      }
    }
  } catch {
    // Will retry on next sync event
  }
}
