const CACHE_NAME = "pupitre-v1";

// #region agent log
function logDebugSW(hypothesisId, message, data) {
  fetch("http://127.0.0.1:7591/ingest/f7af43cc-7c25-4b2a-8f50-6109c1f1a694", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9a66a7" },
    body: JSON.stringify({
      sessionId: "9a66a7",
      runId: "run-404-2",
      hypothesisId,
      location: "public/sw.js:fetch",
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
}
// #endregion

// Install: pre-cache the main route
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add("/"))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
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

// Fetch: network-first for navigation, stale-while-revalidate for assets
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests
  if (request.method !== "GET") return;

  // Ignore Supabase requests
  if (url.hostname.includes("supabase")) return;

  // Ignore API routes
  if (url.pathname.startsWith("/api/")) return;

  // Ignore WebSocket
  if (url.protocol === "wss:") return;

  // Navigation requests: network-first with cache fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // #region agent log
          logDebugSW("H6", "navigation network response", {
            url: request.url,
            status: response.status,
            ok: response.ok,
          });
          // #endregion
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => {
            // #region agent log
            logDebugSW("H6", "navigation cache fallback", {
              url: request.url,
              hasCached: !!cached,
              cachedStatus: cached ? cached.status : null,
            });
            // #endregion
            return cached;
          })
        )
    );
    return;
  }

  // Static assets (JS, CSS, fonts, images): stale-while-revalidate
  if (
    url.pathname.match(/\.(js|css|woff2?|ttf|otf|png|jpg|jpeg|svg|webp|ico|gif)$/)
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(request).then((cached) => {
          const fetchPromise = fetch(request).then((response) => {
            // #region agent log
            if (response.status >= 400) {
              logDebugSW("H7", "asset network non-ok response", {
                url: request.url,
                status: response.status,
              });
            }
            // #endregion
            cache.put(request, response.clone());
            return response;
          });
          return cached || fetchPromise;
        })
      )
    );
    return;
  }
});
