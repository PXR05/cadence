/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
/// <reference types="@sveltejs/kit" />
/// <reference types="../.svelte-kit/ambient.d.ts" />

import { build, files, prerendered, version } from "$service-worker";

const IMAGE_CACHE = "image-cache";
const IMAGE_URL_PATTERN = /\/audio\/[^/]+\/image$/;

const self = /** @type {ServiceWorkerGlobalScope} */ (
  /** @type {unknown} */ (globalThis.self)
);

const CACHE = `cache-${version}`;

const ASSETS = [...build, ...files, ...prerendered];

self.addEventListener("install", (event) => {
  async function addFilesToCache() {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
  }

  event.waitUntil(
    addFilesToCache().then(() => {
      notifyClientsOfUpdate();
    })
  );
});

async function notifyClientsOfUpdate() {
  const clients = await self.clients.matchAll({ type: "window" });
  for (const client of clients) {
    client.postMessage({ type: "SW_UPDATE_AVAILABLE", version });
  }
}

self.addEventListener("activate", (event) => {
  async function deleteOldCaches() {
    for (const key of await caches.keys()) {
      if (key !== CACHE && key !== IMAGE_CACHE) await caches.delete(key);
    }
  }

  event.waitUntil(
    deleteOldCaches().then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  async function respond() {
    const url = new URL(event.request.url);
    const cache = await caches.open(CACHE);

    if (IMAGE_URL_PATTERN.test(url.pathname)) {
      const imageCache = await caches.open(IMAGE_CACHE);
      const cachedImage = await imageCache.match(url.href);

      if (cachedImage) {
        return cachedImage;
      }

      try {
        const response = await fetch(event.request.url, {
          credentials: "include",
          mode: "cors",
        });
        if (response.status === 200 && response.type !== "opaque") {
          imageCache.put(url.href, response.clone());
        }
        return response;
      } catch (err) {
        throw err;
      }
    }

    if (ASSETS.includes(url.pathname)) {
      const response = await cache.match(url.pathname);

      if (response) {
        return response;
      }
    }

    try {
      const response = await fetch(event.request);
      if (!(response instanceof Response)) {
        throw new Error("invalid response from fetch");
      }

      if (response.status === 200) {
        cache.put(event.request, response.clone());
      }

      return response;
    } catch (err) {
      const response = await cache.match(event.request);

      if (response) {
        return response;
      }

      throw err;
    }
  }

  event.respondWith(respond());
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  if (event.data && event.data.type === "CHECK_FOR_UPDATE") {
    if (self.registration && self.registration.waiting) {
      notifyClientsOfUpdate();
    }
    return;
  }

  if (event.data && event.data.type === "CACHE_IMAGE") {
    const imageUrl = event.data.url;

    async function cacheImage() {
      try {
        const imageCache = await caches.open(IMAGE_CACHE);
        const existingResponse = await imageCache.match(imageUrl);

        if (!existingResponse) {
          const response = await fetch(imageUrl, {
            credentials: "include",
            mode: "cors",
          });
          if (response.status === 200 && response.type !== "opaque") {
            await imageCache.put(imageUrl, response);
          }
        }
      } catch (err) {
        console.error("Failed to cache image:", err);
      }
    }

    event.waitUntil(cacheImage());
    return;
  }

  if (event.data && event.data.type === "GET_CACHE_INFO") {
    async function getCacheInfo() {
      try {
        const cacheNames = await caches.keys();
        const cacheInfo = [];

        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          const keys = await cache.keys();
          let totalSize = 0;

          for (const request of keys) {
            try {
              const response = await cache.match(request);
              if (response) {
                const blob = await response.clone().blob();
                totalSize += blob.size;
              }
            } catch {
            }
          }

          cacheInfo.push({
            name: cacheName,
            count: keys.length,
            size: totalSize,
          });
        }

        event.source?.postMessage({
          type: "CACHE_INFO_RESULT",
          caches: cacheInfo,
        });
      } catch (err) {
        console.error("Failed to get cache info:", err);
        event.source?.postMessage({
          type: "CACHE_INFO_RESULT",
          error: err.message,
          caches: [],
        });
      }
    }

    event.waitUntil(getCacheInfo());
    return;
  }

  if (event.data && event.data.type === "CLEAR_CACHE") {
    const cacheName = event.data.cacheName;

    async function clearCache() {
      try {
        if (cacheName) {
          await caches.delete(cacheName);
          if (cacheName === CACHE) {
            const cache = await caches.open(CACHE);
            await cache.addAll(ASSETS);
          } else if (cacheName === IMAGE_CACHE) {
            await caches.open(IMAGE_CACHE);
          }
        } else {
          const cacheNames = await caches.keys();
          for (const name of cacheNames) {
            if (name !== CACHE) {
              await caches.delete(name);
            }
          }
          await caches.open(IMAGE_CACHE);
        }

        event.source?.postMessage({
          type: "CACHE_CLEARED",
          cacheName: cacheName || "all",
          success: true,
        });
      } catch (err) {
        console.error("Failed to clear cache:", err);
        event.source?.postMessage({
          type: "CACHE_CLEARED",
          cacheName: cacheName || "all",
          success: false,
          error: err.message,
        });
      }
    }

    event.waitUntil(clearCache());
    return;
  }
});
