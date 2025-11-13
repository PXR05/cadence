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

  event.waitUntil(addFilesToCache());
});

self.addEventListener("activate", (event) => {
  async function deleteOldCaches() {
    for (const key of await caches.keys()) {
      if (key !== CACHE) await caches.delete(key);
    }
  }

  event.waitUntil(deleteOldCaches());
});

self.addEventListener("fetch", async (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const cache = await caches.open(CACHE);

  if (ASSETS.includes(url.pathname)) {
    const cachedResponse = await cache.match(url.pathname);
    if (cachedResponse) {
      event.respondWith(cachedResponse);
    }
  }
});
