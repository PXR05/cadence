/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
/// <reference types="@sveltejs/kit" />
/// <reference types="../.svelte-kit/ambient.d.ts" />

import { build, files, prerendered, version } from "$service-worker";

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
    }),
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
      if (key !== CACHE) await caches.delete(key);
    }
  }

  event.waitUntil(
    deleteOldCaches().then(() => {
      return self.clients.claim();
    }),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  async function respond() {
    const cache = await caches.open(CACHE);

    if (ASSETS.includes(url.pathname)) {
      const response = await cache.match(url.pathname);

      if (response) {
        return response;
      }
    }

    return await fetch(event.request);
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
            } catch {}
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
          }
        } else {
          const cacheNames = await caches.keys();
          for (const name of cacheNames) {
            if (name !== CACHE) {
              await caches.delete(name);
            }
          }
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
