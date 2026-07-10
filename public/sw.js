// Amore Movies service worker — offline app shell.
// Registered only in production (see RegisterSW.tsx) to avoid dev caching pain.
const CACHE = "amore-v4";
const NAV_TIMEOUT = 3500; // no-cache fallback ceiling for a first-ever visit
const SHELL = ["/", "/discover", "/watchlist", "/us", "/profile", "/offline", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Web push: show a notification even when the app is closed.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Amore Movies";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "Something happened over at Amore Movies",
      icon: "/icon-192.png",
      badge: "/icon.svg",
      tag: data.tag || "amore-generic",
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const win of wins) {
        if ("focus" in win) {
          win.focus();
          if ("navigate" in win) win.navigate(url);
          return;
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // never cache the AI API — always go to network
  const url = new URL(req.url);
  if (url.pathname.startsWith("/api/")) return;

  // navigations: cached shell instantly, refresh the cache in the background
  // (stale-while-revalidate). The app is a shell + client data fetches, so a
  // cached page is always safe to serve; waiting on a flaky network for HTML
  // just made every open feel seconds slower. First-ever visits (no cache yet)
  // still go network-first with a timeout.
  if (req.mode === "navigate") {
    const refresh = fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      });
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) {
          refresh.catch(() => {}); // background revalidate; failure is fine
          return cached;
        }
        const shellFallback = () =>
          caches.match("/offline").then((off) => off || caches.match("/"));
        return Promise.race([
          refresh,
          new Promise((resolve) => setTimeout(() => resolve(shellFallback()), NAV_TIMEOUT)),
        ]).catch(shellFallback);
      })
    );
    return;
  }

  // same-origin static assets: cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
      )
    );
  }
});
