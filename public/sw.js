const CACHE_NAME = "streamrate-v2";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/logo.png",
  "/favicon.ico",
  "/pwa-192x192.png",
  "/pwa-512x512.png",
];

// Install event - cache static assets and force activate
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up ALL old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - handle network requests
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") return;
  if (!url.protocol.startsWith("http")) return;

  // Never cache OAuth redirects
  if (url.pathname.startsWith("/~oauth")) return;

  // Cache-first for fonts
  if (url.hostname.includes("fonts.googleapis.com") || url.hostname.includes("fonts.gstatic.com")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Network-first for API calls
  if (url.hostname.includes("supabase.co") || url.hostname.includes("ai.gateway.lovable.dev")) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Stale-while-revalidate for images
  if (url.hostname.includes("images.unsplash.com") || request.destination === "image") {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
  } else {
    event.respondWith(staleWhileRevalidate(request));
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    return new Response("Offline", { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === "navigate") {
      const offlineCache = await caches.match("/");
      if (offlineCache) return offlineCache;
    }
    return new Response("Offline", { status: 503 });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached || new Response("Offline", { status: 503 }));
  return cached || fetchPromise;
}

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-posts") {
    event.waitUntil(syncPosts());
  }
});

async function syncPosts() {
  console.log("Syncing offline posts...");
}
