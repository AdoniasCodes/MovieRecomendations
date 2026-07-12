// Amore Movies service worker — offline app shell.
// Registered only in production (see RegisterSW.tsx) to avoid dev caching pain.
//
// Caching contract (learned the hard way — v4 cached RSC payloads/shell
// cache-first, which after a deploy served a stale build, made Next.js
// hard-reload on every client navigation, and re-showed the splash on every
// tab change):
//   - navigations: network-first with a short timeout, cache fallback (offline)
//   - /_next/static + images/fonts/icons: cache-first (content-hashed/immutable)
//   - EVERYTHING else (RSC payloads, JSON, dynamic GETs): network only, never cached
const CACHE = "amore-v5";
const NAV_TIMEOUT = 2500; // fall back to the cached shell if the network stalls
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

// True static assets only: content-hashed chunks + media that never change
// under the same URL. Safe to serve cache-first forever.
function isImmutable(url) {
  if (url.pathname.startsWith("/_next/static/")) return true;
  return /\.(png|jpg|jpeg|webp|avif|gif|svg|ico|woff2?)$/.test(url.pathname);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // dynamic surface: API + RSC payloads + anything non-immutable → network only
  if (url.pathname.startsWith("/api/")) return;

  // navigations: network-first (fresh build always wins), cached shell as the
  // offline / stalled-network fallback.
  if (req.mode === "navigate") {
    const fromNetwork = fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
      return res;
    });
    const shellFallback = () =>
      caches.match(req).then((r) => r || caches.match("/offline").then((off) => off || caches.match("/")));
    event.respondWith(
      Promise.race([
        fromNetwork,
        new Promise((resolve) => setTimeout(() => resolve(shellFallback()), NAV_TIMEOUT)),
      ]).catch(shellFallback)
    );
    return;
  }

  // immutable assets: cache-first
  if (isImmutable(url)) {
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
  // everything else (RSC `_rsc` payloads, JSON, misc): fall through to network,
  // no SW involvement, nothing cached.
});
