<script lang="ts">
  import { fetchMediaUrl } from "$lib/backend/services/media";
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

  $effect(() => {
    if (!imgEl) return;

    if (!isLazy || !shouldUseCustomAuthFetch) {
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

    const isStale = () => cancelled || currentVersion !== requestVersion;

    if (!imageSrc) {
      imgEl.src = PLACEHOLDER_SRC;
      revokeCurrentObjectUrl();
      return () => {
        cancelled = true;
        abortController.abort();
      };
    }

    if (!canLoadImage) {
      return () => {
        cancelled = true;
        abortController.abort();
      };
    }

    if (!shouldUseCustomAuthFetch) {
      revokeCurrentObjectUrl();
      if (!isStale()) {
        imgEl.src = imageSrc;
      }
      return () => {
        cancelled = true;
        abortController.abort();
      };
    }

    const hasVisibleImage =
      !!objectUrl || (!!imgEl.src && imgEl.src !== PLACEHOLDER_SRC);

    if (!hasVisibleImage) {
      imgEl.src = PLACEHOLDER_SRC;
    }

    (async () => {
      let releaseSlot: (() => void) | null = null;

      try {
        releaseSlot = await acquireFetchSlot(abortController.signal);

        const response = await fetchMediaUrl(
          imageSrc,
          abortController.signal,
        );

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
          return;
        }

        const chunks: ArrayBuffer[] = [];
        const reader = body.getReader();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!value) continue;

          const chunkBuffer = value.buffer.slice(
            value.byteOffset,
            value.byteOffset + value.byteLength,
          ) as ArrayBuffer;
          chunks.push(chunkBuffer);

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
