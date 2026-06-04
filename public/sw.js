// OrderTrack Service Worker — v2 auto-update
const CACHE = "ordertrack-v2";

self.addEventListener("install", e => {
  // Skip waiting immediately so new SW takes over right away
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  // Clear ALL old caches
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  // Network first — always get fresh content
  // Fall back to cache only if offline
  if(e.request.method !== "GET") return;
  if(e.request.url.includes("supabase.co")) return;
  
  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Cache fresh copy
        if(res.ok){
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
