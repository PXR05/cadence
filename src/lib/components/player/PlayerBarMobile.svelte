<script lang="ts">
  import { page } from "$app/state";
  import type { CarouselAPI } from "$lib/components/ui/carousel/context";
  import { useDialogState } from "$lib/hooks/useDialogState.svelte";
  import { playerStore } from "$lib/stores/player.svelte";
  import { appearanceStore } from "$lib/stores/appearance.svelte";
  import { playerDetailMotionStore } from "$lib/stores/playerDetailMotion.svelte";
  import { PauseIcon, PlayIcon } from "@lucide/svelte";
  import { onDestroy, onMount } from "svelte";
  import { innerHeight, innerWidth } from "svelte/reactivity/window";
  import { createWebHaptics } from "web-haptics/svelte";
  import { vaulEase } from "$lib/utils";
  import { Button } from "../ui/button";
  import PlayerDetailsPanel from "./PlayerDetailsPanel.svelte";
  import TrackCarousel from "../tracks/TrackCarousel.svelte";

  const { trigger, destroy } = createWebHaptics();
  const OPEN_POSITION = 0;
  const PANEL_ANIMATION_DURATION_MS = 400;
  const PANEL_ANIMATION_MIN_DURATION_MS = 200;
  const SETTLE_FINISH_BUFFER_MS = 34;

  interface Props {
    onQueueOpen: () => void;
    setCarouselApi: (api: CarouselAPI | null) => void;
  }

  let { onQueueOpen, setCarouselApi }: Props = $props();

  const isMobile = $derived((innerWidth.current ?? 0) <= 768);
  const isTopRoute = $derived(
    page.url.pathname.split("/").length <= 2 &&
      !page.url.pathname.includes("/playlist"),
  );
  const panelState = useDialogState("player-detail");

  let isDragging = $state(false);
  let startY = 0;
  let currentY = 0;
  let lastMoveY = 0;
  let lastMoveTime = 0;

  let containerEl: HTMLDivElement | null = $state(null);
  let barElement: HTMLDivElement | null = $state(null);
  let detailsPanelElement: HTMLDivElement | null = $state(null);
  let isSettling = $state(false);
  let settleTimeoutId: number | null = null;
  let dragFrameId: number | null = null;
  let pendingTranslateY: number | null = null;
  let lastMotionY = Number.NaN;
  let lastMotionClosed = Number.NaN;
  let lastDetailsOpacity = Number.NaN;
  let dragSettleTargetY: number | null = null;
  let panelTranslateY = Number.NaN;
  let dragStartPanelY = 0;

  let gestureStartX = 0;
  let gestureStartY = 0;
  let gestureDirection: "none" | "horizontal" | "vertical" = "none";
  let isOnCarousel = false;
  let shouldLockGestureDirection = false;
  const DIRECTION_THRESHOLD = 8;
  const DIRECTION_BIAS_PX = 2;
  const VERTICAL_INTENT_RATIO = 0.65;
  const HORIZONTAL_INTENT_RATIO = 1.35;
  const HORIZONTAL_INTENT_MIN_DELTA = 12;
  const BACK_SWIPE_EDGE_PX = 48;

  const closedPosition = $derived.by(() => {
    const height = innerHeight.current || window.innerHeight;
    if (height === 0) return 0;
    if (isTopRoute && isMobile) return height - 64 - 80;
    return height - 80;
  });

  const isPanelAnimating = $derived(isDragging || isSettling);

  function clampPanelY(value: number) {
    return Math.max(OPEN_POSITION, Math.min(closedPosition, value));
  }

  function getKnownPanelY() {
    return Number.isFinite(panelTranslateY)
      ? panelTranslateY
      : panelState.isOpen
        ? OPEN_POSITION
        : closedPosition;
  }

  function parseTranslate(transform: string) {
    const matrix3d = transform.match(/^matrix3d\((.+)\)$/);
    if (matrix3d) {
      const values = matrix3d[1]
        .split(",")
        .map((value) => Number(value.trim()));

      if (values.length === 16 && Number.isFinite(values[13])) {
        return values[13];
      }
    }

    const matrix2d = transform.match(/^matrix\((.+)\)$/);
    if (matrix2d) {
      const values = matrix2d[1]
        .split(",")
        .map((value) => Number(value.trim()));

      if (values.length === 6 && Number.isFinite(values[5])) {
        return values[5];
      }
    }

    return null;
  }

  function beginDragAt(
    anchorPanelY: number,
    dragStartPointerY: number,
    currentPointerY: number,
    previousPointerY: number,
  ) {
    dragStartPanelY = clampPanelY(anchorPanelY);
    applyPanelPosition(dragStartPanelY, true);

    isDragging = true;
    playerDetailMotionStore.setDragging(true);
    startY = dragStartPointerY;
    currentY = currentPointerY;
    lastMoveY = previousPointerY;
    lastMoveTime = Date.now();
  }

  function updateOpacity(currentY: number, force = false) {
    const closedPos = closedPosition || 1;
    const normalizedPos = Math.max(0, Math.min(1, currentY / closedPos));
    const detailsOpacity = vaulEase(1 - normalizedPos);
    const motionThreshold = isSettling ? 0.05 : 0.5;
    const opacityThreshold = isSettling ? 0.001 : 0.005;

    if (
      force ||
      Math.abs(currentY - lastMotionY) >= motionThreshold ||
      Math.abs(closedPos - lastMotionClosed) >= 0.5
    ) {
      playerDetailMotionStore.setMotion(currentY, closedPos);
      lastMotionY = currentY;
      lastMotionClosed = closedPos;
    }

    if (
      detailsPanelElement &&
      (force ||
        Math.abs(detailsOpacity - lastDetailsOpacity) >= opacityThreshold)
    ) {
      detailsPanelElement.style.opacity = String(detailsOpacity);
      lastDetailsOpacity = detailsOpacity;
    }
  }

  function applyPanelPosition(translateY: number, force = false) {
    panelTranslateY = translateY;

    if (containerEl) {
      containerEl.style.transform = `translate3d(0, ${translateY}px, 0)`;
    }

    updateOpacity(translateY, force);
  }

  function setTransitionDuration(durationMs: number) {
    const safeDuration = Math.max(0, Math.round(durationMs));

    if (containerEl) {
      containerEl.style.transitionDuration = `${safeDuration}ms`;
    }

    if (detailsPanelElement) {
      detailsPanelElement.style.transitionDuration = `${safeDuration}ms`;
    }
  }

  function clearSettleTimeout() {
    if (settleTimeoutId !== null) {
      window.clearTimeout(settleTimeoutId);
      settleTimeoutId = null;
    }
  }

  function getRenderedTranslateY() {
    if (!containerEl) {
      return getKnownPanelY();
    }

    const transform = window.getComputedStyle(containerEl).transform;

    if (!transform || transform === "none") {
      return getKnownPanelY();
    }

    const translatedY = parseTranslate(transform);
    return translatedY ?? getKnownPanelY();
  }

  function stopSettlingSyncToCurrent(force = false) {
    if (!isSettling) {
      clearSettleTimeout();
      return;
    }

    const renderedY = clampPanelY(getRenderedTranslateY());

    clearSettleTimeout();
    isSettling = false;
    setTransitionDuration(0);
    applyPanelPosition(renderedY, force);
    playerDetailMotionStore.setAnimating(false);
  }

  function flushPendingDragPosition(force = false) {
    if (dragFrameId !== null) {
      window.cancelAnimationFrame(dragFrameId);
      dragFrameId = null;
    }

    if (pendingTranslateY === null) return;

    applyPanelPosition(pendingTranslateY, force);
    pendingTranslateY = null;
  }

  function queuePanelPosition(translateY: number) {
    pendingTranslateY = translateY;

    if (dragFrameId !== null) return;

    dragFrameId = window.requestAnimationFrame(() => {
      dragFrameId = null;

      if (pendingTranslateY === null) return;

      applyPanelPosition(pendingTranslateY);
      pendingTranslateY = null;
    });
  }

  function settleToPosition(targetY: number, durationMs?: number) {
    const startPosition = clampPanelY(getRenderedTranslateY());
    const distance = Math.abs(targetY - startPosition);

    clearSettleTimeout();

    if (appearanceStore.disableAnimations || distance < 0.5) {
      isSettling = false;
      setTransitionDuration(0);
      applyPanelPosition(targetY, true);
      playerDetailMotionStore.setAnimating(false);
      return;
    }

    const settleDuration =
      durationMs ??
      Math.min(
        PANEL_ANIMATION_DURATION_MS,
        Math.max(PANEL_ANIMATION_MIN_DURATION_MS, distance),
      );

    isSettling = true;
    setTransitionDuration(settleDuration);
    applyPanelPosition(targetY, true);
    playerDetailMotionStore.setAnimating(false);

    settleTimeoutId = window.setTimeout(() => {
      isSettling = false;
      setTransitionDuration(0);
      settleTimeoutId = null;
    }, settleDuration + SETTLE_FINISH_BUFFER_MS);
  }

  $effect(() => {
    if (!isDragging && containerEl) {
      const targetY = panelState.isOpen ? 0 : closedPosition;

      if (dragSettleTargetY !== null && dragSettleTargetY === targetY) {
        dragSettleTargetY = null;
        return;
      }

      dragSettleTargetY = null;
      settleToPosition(targetY);
    }
  });

  function isCarouselElement(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) return false;

    const carouselSelectors = [
      '[data-slot="carousel"]',
      '[data-slot="carousel-content"]',
      '[data-slot="carousel-item"]',
      "[data-embla-container]",
      "[data-embla-slide]",
      '[role="region"][aria-roledescription="carousel"]',
    ].join(",");

    return target.closest(carouselSelectors) !== null;
  }

  function shouldIgnoreDrag(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) return false;

    if (!panelState.isOpen) return false;
    if (target.closest("[data-allow-panel-drag]")) return false;

    const interactiveSelectors = [
      "input",
      "textarea",
      "select",
      '[role="slider"]',
      '[role="progressbar"]',
      'input[type="range"]',
      ".touch-none",
    ].join(",");

    return target.closest(interactiveSelectors) !== null;
  }

  function handleDragStart(clientY: number, event: TouchEvent | MouseEvent) {
    if (shouldIgnoreDrag(event.target)) {
      return;
    }

    isOnCarousel = isCarouselElement(event.target);
    const isTouchEvent = "touches" in event;
    const clientX = isTouchEvent ? event.touches[0].clientX : event.clientX;
    const isEdgeBackSwipeStart =
      isTouchEvent && panelState.isOpen && clientX <= BACK_SWIPE_EDGE_PX;
    const shouldDeferOpenPanelDrag = isTouchEvent && panelState.isOpen;

    gestureStartX = clientX;
    gestureStartY = clientY;
    gestureDirection = "none";
    shouldLockGestureDirection =
      shouldDeferOpenPanelDrag || isOnCarousel || isEdgeBackSwipeStart;

    if (!shouldLockGestureDirection) {
      stopSettlingSyncToCurrent(true);
      flushPendingDragPosition(true);
      setTransitionDuration(0);

      beginDragAt(getRenderedTranslateY(), clientY, clientY, clientY);
    }
  }

  function handleGestureMove(clientX: number, clientY: number) {
    if (shouldLockGestureDirection && gestureDirection === "none") {
      const deltaX = Math.abs(clientX - gestureStartX);
      const deltaY = Math.abs(clientY - gestureStartY);

      if (deltaX < DIRECTION_THRESHOLD && deltaY < DIRECTION_THRESHOLD) {
        return;
      }

      if (
        deltaY >= DIRECTION_THRESHOLD &&
        deltaY + DIRECTION_BIAS_PX >= deltaX * VERTICAL_INTENT_RATIO
      ) {
        gestureDirection = "vertical";

        stopSettlingSyncToCurrent(true);
        flushPendingDragPosition(true);
        setTransitionDuration(0);

        beginDragAt(
          getRenderedTranslateY(),
          gestureStartY,
          clientY,
          gestureStartY,
        );
        return;
      }

      if (
        deltaX >= HORIZONTAL_INTENT_MIN_DELTA &&
        deltaX > deltaY * HORIZONTAL_INTENT_RATIO + DIRECTION_BIAS_PX
      ) {
        gestureDirection = "horizontal";
      }
    }
  }

  function handleDragMove(
    clientX: number,
    clientY: number,
    event?: TouchEvent | MouseEvent,
  ) {
    handleGestureMove(clientX, clientY);

    if (event && "touches" in event && event.cancelable) {
      if (isDragging || (isOnCarousel && gestureDirection !== "horizontal")) {
        event.preventDefault();
      }
    }

    if (!isDragging) return;

    const deltaY = clientY - startY;
    const newTranslate = dragStartPanelY + deltaY;
    const clampedTranslate = clampPanelY(newTranslate);

    queuePanelPosition(clampedTranslate);

    lastMoveY = currentY;
    currentY = clientY;
    lastMoveTime = Date.now();
  }

  function handleDragEnd() {
    gestureDirection = "none";
    isOnCarousel = false;
    shouldLockGestureDirection = false;

    if (!isDragging) return;

    flushPendingDragPosition(true);

    const timeDelta = Date.now() - lastMoveTime;
    const moveDelta = currentY - lastMoveY;
    const velocityPxPerMs = timeDelta > 0 ? moveDelta / timeDelta : 0;

    let shouldOpen = false;

    if (Math.abs(velocityPxPerMs) > 0.3) {
      shouldOpen = moveDelta < 0;
    } else {
      const threshold = closedPosition * 0.1;
      const currentPos = getKnownPanelY();

      if (panelState.isOpen) {
        shouldOpen = currentPos < threshold;
      } else {
        shouldOpen = currentPos < closedPosition - threshold;
      }
    }

    const targetPosition = shouldOpen ? OPEN_POSITION : closedPosition;
    let durationMs = PANEL_ANIMATION_DURATION_MS;

    if (Math.abs(velocityPxPerMs) > 0.5) {
      durationMs = Math.max(
        PANEL_ANIMATION_MIN_DURATION_MS,
        PANEL_ANIMATION_DURATION_MS - Math.abs(velocityPxPerMs) * 50,
      );
    }

    dragSettleTargetY = targetPosition;
    settleToPosition(targetPosition, durationMs);

    if (shouldOpen) {
      panelState.open();
    } else {
      panelState.close();
    }

    isDragging = false;
    playerDetailMotionStore.setDragging(false);
  }

  function handleDragCancel() {
    gestureDirection = "none";
    isOnCarousel = false;
    shouldLockGestureDirection = false;

    if (!isDragging) return;

    flushPendingDragPosition(true);
    isDragging = false;
    playerDetailMotionStore.setDragging(false);
    dragSettleTargetY = null;
  }

  function handleTouchStart(e: TouchEvent) {
    if (!playerStore.currentTrack) {
      return;
    }
    handleDragStart(e.touches[0].clientY, e);
  }

  function handleTouchMove(e: TouchEvent) {
    handleDragMove(e.touches[0].clientX, e.touches[0].clientY, e);
  }

  function handleTouchEnd(e?: TouchEvent) {
    if (e?.type === "touchcancel") {
      handleDragCancel();
      return;
    }

    handleDragEnd();
  }

  function handleTouchCancel() {
    handleDragCancel();
  }

  function handleMouseDown(e: MouseEvent) {
    handleDragStart(e.clientY, e);
  }

  function handleMouseMove(e: MouseEvent) {
    handleDragMove(e.clientX, e.clientY, e);
  }

  function handleMouseUp() {
    handleDragEnd();
  }

  function handlePlayPause() {
    trigger([{ duration: 10 }]);
    playerStore.togglePlayPause();
  }

  onMount(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    if (!barElement) {
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }

    const touchStartHandler = (e: TouchEvent) => {
      handleTouchStart(e);
    };
    const touchMoveHandler = (e: TouchEvent) => {
      handleTouchMove(e);
    };

    barElement.addEventListener("touchstart", touchStartHandler, {
      passive: false,
    });
    barElement.addEventListener("touchmove", touchMoveHandler, {
      passive: false,
    });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      barElement?.removeEventListener("touchstart", touchStartHandler);
      barElement?.removeEventListener("touchmove", touchMoveHandler);
    };
  });

  onDestroy(() => {
    clearSettleTimeout();
    flushPendingDragPosition();
    playerDetailMotionStore.reset();
    destroy();
  });
</script>

<div
  bind:this={containerEl}
  class="absolute bottom-0 left-0 right-0 will-change-transform overscroll-none"
  style="transform: translate3d(0, 100vh, 0); transition-property: transform; transition-duration: 0ms; transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);"
>
  <div class="relative select-none h-dvh">
    <div
      class="absolute top-1 left-4 right-4 flex items-center justify-between min-h-14"
      bind:this={barElement}
      role="button"
      tabindex="0"
      ontouchend={handleTouchEnd}
      ontouchcancel={handleTouchCancel}
      onmousedown={handleMouseDown}
    >
      <TrackCarousel
        onTrackClick={() => panelState.open()}
        setApi={(emblaApi) => setCarouselApi(emblaApi)}
        isDisabled={isPanelAnimating}
      />

      {#if playerStore.currentTrack}
        <Button
          variant="ghost"
          onclick={handlePlayPause}
          class="size-12 grid place-items-center shrink-0 mr-2 p-0"
          aria-label={playerStore.isPlaying ? "Pause" : "Play"}
        >
          {#if playerStore.isPlaying}
            <PauseIcon
              absoluteStrokeWidth
              strokeWidth={2}
              fill="currentColor"
              class="size-6"
            />
          {:else}
            <PlayIcon
              absoluteStrokeWidth
              strokeWidth={2}
              fill="currentColor"
              class="size-6"
            />
          {/if}
        </Button>
      {/if}
    </div>

    <div
      bind:this={detailsPanelElement}
      class="overscroll-none contain-layout contain-style contain-paint"
      style="opacity: 0; transition-property: opacity; transition-duration: 0ms; transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);"
      style:pointer-events={panelState.isOpen ? "auto" : "none"}
    >
      <PlayerDetailsPanel
        {onQueueOpen}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        {isPanelAnimating}
      />
    </div>
  </div>
</div>
