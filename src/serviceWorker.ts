/// <reference lib="webworker" />

const CACHE_NAME = "streamrate-v1";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/logo.png",
  "/favicon.ico",
  "/pwa-192x192.png",
  "/pwa-512x512.png",
];

const CACHE_STRATEGIES = {
  cacheFirst: ["fonts.googleapis.com", "fonts.gstatic.com"],
  networkFirst: ["supabase.co", "ai.gateway.lovable.dev"],
  staleWhileRevalidate: ["images.unsplash.com"],
};

declare const self: ServiceWorkerGlobalScope;

// Install event - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
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
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith("http")) return;

  // Cache-first for fonts and static assets
  if (
    CACHE_STRATEGIES.cacheFirst.some((domain) => url.hostname.includes(domain))
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Network-first for API calls
  if (
    CACHE_STRATEGIES.networkFirst.some((domain) => url.hostname.includes(domain))
  ) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Stale-while-revalidate for images
  if (
    CACHE_STRATEGIES.staleWhileRevalidate.some((domain) =>
      url.hostname.includes(domain)
    ) ||
    request.destination === "image"
  ) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Default: network-first for navigation, stale-while-revalidate for others
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
  } else {
    event.respondWith(staleWhileRevalidate(request));
  }
});

async function cacheFirst(request: Request): Promise<Response> {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}

async function networkFirst(request: Request): Promise<Response> {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    
    // Return offline page for navigation requests
    if (request.mode === "navigate") {
      const offlineCache = await caches.match("/");
      if (offlineCache) return offlineCache;
    }
    
    return new Response("Offline", { status: 503 });
  }
}

async function staleWhileRevalidate(request: Request): Promise<Response> {
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

// Handle background sync for offline posts
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-posts") {
    event.waitUntil(syncPosts());
  }
});

async function syncPosts() {
  // Get pending posts from IndexedDB and sync them
  console.log("Syncing offline posts...");
}

export {};
