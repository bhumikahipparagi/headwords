// Headwords service worker — offline app shell caching.
// CACHE_VERSION is bumped on each deploy so clients pick up new builds.
var CACHE_VERSION = "headwords-2026-07-24-b21";
var SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_VERSION).then(function (c) {
    return c.addAll(SHELL).catch(function () {});
  }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE_VERSION) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);

  // Cross-origin (dictionary / Wikipedia APIs): go to network, never cache.
  if (url.origin !== self.location.origin) return;

  // App shell / same-origin: network-first so new deploys win, cache fallback offline.
  e.respondWith(
    fetch(req).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE_VERSION).then(function (c) { c.put(req, copy); });
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) {
        return hit || caches.match("./index.html");
      });
    })
  );
});
