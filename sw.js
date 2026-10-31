const SW_VERSION = "v1.1.0";
const STATIC_CACHE = `homepage-static-${SW_VERSION}`;
// Иконки шорткатов с внешних доменов: отдаются из кеша без повторной загрузки.
// Имя совпадает с SHORTCUT_ICONS_CACHE в src/js/config/constants.js.
const ICONS_CACHE = "homepage-icons-v1";
const ICONS_CACHE_LIMIT = 100;

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./src/styles/main.css",
  "./src/styles/deferred.css",
  "./src/js/main.js",
  "./assets/icons/chrome-icon.ico",
  "./assets/icons/gmail-icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("homepage-static-") && key !== STATIC_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    if (request.destination === "image") event.respondWith(respondWithCachedIcon(request));
    return;
  }

  const isStaticRequest =
    request.destination === "document" ||
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "image" ||
    request.destination === "font";

  if (!isStaticRequest) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});

async function respondWithCachedIcon(request) {
  const cache = await caches.open(ICONS_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  // Ответы без CORS непрозрачны (status 0): сохраняем и их, а битую иконку страница удаляет из кеша сама.
  if (response.ok || response.type === "opaque") {
    await cache.put(request, response.clone());
    trimIconsCache(cache);
  }
  return response;
}

async function trimIconsCache(cache) {
  const keys = await cache.keys();
  const excess = keys.length - ICONS_CACHE_LIMIT;
  if (excess > 0) await Promise.all(keys.slice(0, excess).map((key) => cache.delete(key)));
}
