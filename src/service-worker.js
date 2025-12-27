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
  }
});
