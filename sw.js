// Offline support: lessons open even without internet (login & syncing still need internet).
const CACHE = "lpg-v6";
const SHELL = ["./", "./index.html", "./style.css", "./app.js", "./content.js", "./firebase-config.js", "./manifest.json",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png", "./icons/pallavi.jpg"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  // Never cache Firebase data calls
  if (/googleapis\.com$/.test(u.hostname) && !/fonts/.test(u.hostname)) return;
  // App files: network first (so updates appear), fall back to cache when offline
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok && (u.origin === location.origin || /gstatic|fonts/.test(u.hostname))) { const c = r.clone(); caches.open(CACHE).then(cc => cc.put(e.request, c)); }
    return r;
  }).catch(() => caches.match(e.request).then(m => m || caches.match("./index.html"))));
});
