// Amore Movies service worker — offline app shell.
// Registered only in production (see RegisterSW.tsx) to avoid dev caching pain.
const CACHE = "amore-v3";
const NAV_TIMEOUT = 3500; // fall back to cache if the network stalls this long
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
      icon: "/icon-512.png",
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

  // navigations: network-first with a timeout, fall back to cache then offline.
  // The timeout stops a stalled mobile network from hanging the whole load.
  if (req.mode === "navigate") {
    event.respondWith(
      Promise.race([
        fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        }),
        new Promise((resolve) =>
          setTimeout(
            () => resolve(caches.match(req).then((r) => r || caches.match("/offline") || caches.match("/"))),
            NAV_TIMEOUT
          )
        ),
      ]).catch(() => caches.match(req).then((r) => r || caches.match("/offline") || caches.match("/")))
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
