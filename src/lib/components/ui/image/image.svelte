<script lang="ts">
  import { authFetch } from "$lib/api/fetch";
  import { getOfflineImageByUrl, saveImageOfflineByUrl } from "$lib/db/offline";
  import { authStore } from "$lib/stores/auth.svelte";
  import type { WithElementRef } from "$lib/utils";
  import { onDestroy } from "svelte";
  import type { HTMLImgAttributes } from "svelte/elements";

  let {
    src,
    loading = "lazy",
    ...rest
  }: WithElementRef<HTMLImgAttributes> = $props();

  let imgEl = $state<HTMLImageElement | null>(null);
  let objectUrl: string | null = null;
  let canLoadImage = $state(false);
  let requestVersion = 0;

  const STREAM_PREVIEW_MIN_BYTES = 24 * 1024;
  const STREAM_PREVIEW_MAX_ATTEMPTS = 6;
  const STREAM_PREVIEW_INTERVAL_MS = 120;
  const PLACEHOLDER_SRC =
    "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  const MAX_PARALLEL_IMAGE_FETCHES = 6;

  let activeImageFetches = 0;
  const fetchSlotWaiters: Array<() => void> = [];

  const isLazy = $derived(loading !== "eager");
  const shouldUseCustomAuthFetch = $derived(
    authStore.shouldUseCustomMediaAuthFetch,
  );

  function releaseFetchSlot() {
    activeImageFetches = Math.max(0, activeImageFetches - 1);
    const next = fetchSlotWaiters.shift();
    if (next) next();
  }

  async function acquireFetchSlot(signal: AbortSignal): Promise<() => void> {
    if (signal.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    if (activeImageFetches < MAX_PARALLEL_IMAGE_FETCHES) {
      activeImageFetches += 1;
      let released = false;
      return () => {
        if (released) return;
        released = true;
        releaseFetchSlot();
      };
    }

    await new Promise<void>((resolve, reject) => {
      const onAbort = () => {
        const index = fetchSlotWaiters.indexOf(onReady);
        if (index !== -1) {
          fetchSlotWaiters.splice(index, 1);
        }
        reject(new DOMException("Aborted", "AbortError"));
      };

      const onReady = () => {
        signal.removeEventListener("abort", onAbort);
        resolve();
      };

      signal.addEventListener("abort", onAbort, { once: true });
      fetchSlotWaiters.push(onReady);
    });

    if (signal.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    activeImageFetches += 1;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      releaseFetchSlot();
    };
  }

  function revokeCurrentObjectUrl() {
    if (!objectUrl) return;
    URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  }

  function setImageBlob(blob: Blob) {
    if (!imgEl) return;
    revokeCurrentObjectUrl();
    objectUrl = URL.createObjectURL(blob);
    imgEl.src = objectUrl;
  }

  async function trySetPreviewBlob(
    chunks: ArrayBuffer[],
    mimeType: string,
    isStale: () => boolean,
  ) {
    if (!imgEl || isStale()) return;

    const previewBlob = new Blob(chunks, { type: mimeType });
    const previewUrl = URL.createObjectURL(previewBlob);
    const probe = new Image();
    probe.src = previewUrl;

    try {
      await probe.decode();

      if (!imgEl || isStale()) {
        URL.revokeObjectURL(previewUrl);
        return;
      }

      revokeCurrentObjectUrl();
      objectUrl = previewUrl;
      imgEl.src = objectUrl;
    } catch {
      URL.revokeObjectURL(previewUrl);
    }
  }

  $effect(() => {
    if (!imgEl) return;

    if (!isLazy) {
      canLoadImage = true;
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      canLoadImage = true;
      return;
    }

    canLoadImage = false;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting || entry.intersectionRatio > 0) {
            canLoadImage = true;
            observer.disconnect();
            break;
          }
        }
      },
      {
        rootMargin: "300px 0px",
      },
    );

    observer.observe(imgEl);

    return () => {
      observer.disconnect();
    };
  });

  $effect(() => {
    if (!imgEl) return;

    const imageSrc = src;
    const currentVersion = ++requestVersion;
    const abortController = new AbortController();
    let cancelled = false;
    const hasVisibleImage =
      !!objectUrl || (!!imgEl.src && imgEl.src !== PLACEHOLDER_SRC);
    const allowStreamPreview = !hasVisibleImage;

    const isStale = () => cancelled || currentVersion !== requestVersion;

    if (!imageSrc) {
      imgEl.src = PLACEHOLDER_SRC;
      revokeCurrentObjectUrl();
    } else if (!hasVisibleImage) {
      imgEl.src = PLACEHOLDER_SRC;
    }

    if (!imageSrc || !canLoadImage) {
      return () => {
        cancelled = true;
        abortController.abort();
      };
    }

    (async () => {
      let releaseSlot: (() => void) | null = null;

      try {
        const offlineImage = await getOfflineImageByUrl(imageSrc);

        if (isStale()) return;

        if (offlineImage?.imageBlob) {
          setImageBlob(offlineImage.imageBlob);
          return;
        }

        if (!shouldUseCustomAuthFetch) {
          if (!imgEl || isStale()) return;
          revokeCurrentObjectUrl();
          imgEl.src = imageSrc;
          return;
        }

        releaseSlot = await acquireFetchSlot(abortController.signal);

        const response = await authFetch(imageSrc, {
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(
            `Failed to load image: ${response.status} ${response.statusText}`,
          );
        }

        const mimeType = response.headers.get("content-type") || "image/jpeg";
        const body = response.body;

        if (!body) {
          const blob = await response.blob();

          if (isStale()) return;

          setImageBlob(blob);
          void saveImageOfflineByUrl(imageSrc, blob);
          return;
        }

        const chunks: ArrayBuffer[] = [];
        const reader = body.getReader();
        let loadedBytes = 0;
        let previewAttempts = 0;
        let lastPreviewTime = 0;
        let previewInFlight = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!value) continue;

          const chunkBuffer = value.buffer.slice(
            value.byteOffset,
            value.byteOffset + value.byteLength,
          ) as ArrayBuffer;
          chunks.push(chunkBuffer);
          loadedBytes += chunkBuffer.byteLength;

          if (
            allowStreamPreview &&
            previewAttempts < STREAM_PREVIEW_MAX_ATTEMPTS &&
            loadedBytes >= STREAM_PREVIEW_MIN_BYTES
          ) {
            const now = Date.now();
            if (
              now - lastPreviewTime >= STREAM_PREVIEW_INTERVAL_MS &&
              !previewInFlight
            ) {
              lastPreviewTime = now;
              previewAttempts += 1;
              previewInFlight = true;
              void trySetPreviewBlob(chunks, mimeType, isStale).finally(() => {
                previewInFlight = false;
              });
            }
          }

          if (isStale()) {
            try {
              await reader.cancel();
            } catch {}
            return;
          }
        }

        const blob = new Blob(chunks, { type: mimeType });

        if (isStale()) return;

        setImageBlob(blob);
        void saveImageOfflineByUrl(imageSrc, blob);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        if (!isStale()) {
          if (!objectUrl && (!imgEl.src || imgEl.src === PLACEHOLDER_SRC)) {
            imgEl.src = PLACEHOLDER_SRC;
          }
          console.error("Failed to load image:", error);
        }
      } finally {
        releaseSlot?.();
      }
    })();

    return () => {
      cancelled = true;
      abortController.abort();
    };
  });

  onDestroy(() => {
    revokeCurrentObjectUrl();
  });
</script>

<img bind:this={imgEl} src={PLACEHOLDER_SRC} {loading} {...rest} />
