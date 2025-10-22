/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
/// <reference types="@sveltejs/kit" />
/// <reference types="../.svelte-kit/ambient.d.ts" />

import { build, files, version } from "$service-worker";

const self = /** @type {ServiceWorkerGlobalScope} */ (
  /** @type {unknown} */ (globalThis.self)
);

const CACHE = `cache-${version}`;

const ASSETS = [...build, ...files];

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

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  async function respond() {
    const url = new URL(event.request.url);
    const cache = await caches.open(CACHE);

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

self.addEventListener("backgroundfetchsuccess", (event) => {
  const bgFetch = event.registration;

  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open("offline-tracks");
        const records = await bgFetch.matchAll();
        const promises = [];

        for (const record of records) {
          const response = await record.responseReady;
          promises.push(cache.put(record.request, response));
        }

        await Promise.all(promises);

        await bgFetch.updateUI({ title: "Download complete!" });
      } catch (error) {
        console.error("Background fetch success handler error:", error);
      }
    })()
  );
});

self.addEventListener("backgroundfetchfail", (event) => {
  const bgFetch = event.registration;

  event.waitUntil(
    (async () => {
      try {
        await bgFetch.updateUI({ title: "Download failed" });
      } catch (error) {
        console.error("Background fetch fail handler error:", error);
      }
    })()
  );
});

self.addEventListener("backgroundfetchabort", (event) => {
  console.log("Background fetch aborted:", event.registration.id);
});

self.addEventListener("backgroundfetchclick", (event) => {
  const bgFetch = event.registration;

  event.waitUntil(
    (async () => {
      if (bgFetch.result === "success") {
        await self.clients.openWindow("/");
      }
    })()
  );
});
