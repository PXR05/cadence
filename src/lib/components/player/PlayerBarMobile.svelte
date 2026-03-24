<script lang="ts">
  import { page } from "$app/state";
  import type { CarouselAPI } from "$lib/components/ui/carousel/context";
  import { useDialogState } from "$lib/hooks/useDialogState.svelte";
  import { playerStore } from "$lib/stores/player.svelte";
  import { appearanceStore } from "$lib/stores/appearance.svelte";
  import { playerDetailMotionStore } from "$lib/stores/playerDetailMotion.svelte";
  import { PauseIcon, PlayIcon } from "@lucide/svelte";
  import gsap from "gsap";
  import { onDestroy, onMount } from "svelte";
  import { cubicOut } from "svelte/easing";
  import { innerHeight, innerWidth } from "svelte/reactivity/window";
  import { createWebHaptics } from "web-haptics/svelte";
  import { vaulEase } from "$lib/utils";
  import { Button } from "../ui/button";
  import PlayerDetailsPanel from "./PlayerDetailsPanel.svelte";
  import TrackCarousel from "../tracks/TrackCarousel.svelte";

  const { trigger, destroy } = createWebHaptics();

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
  let startY = $state(0);
  let currentY = $state(0);
  let lastMoveY = $state(0);
  let lastMoveTime = $state(0);

  let containerEl: HTMLDivElement | null = $state(null);
  let barElement: HTMLDivElement | null = $state(null);
  let detailsPanelElement: HTMLDivElement | null = $state(null);
  let gsapTween: gsap.core.Tween | null = null;
  let dragFrameId: number | null = null;
  let pendingDragY: number | null = null;

  let lastMotionY = Number.NaN;
  let lastMotionClosed = Number.NaN;
  let lastOpacity = Number.NaN;
  let hasWindowMouseListeners = false;

  let gestureStartX = $state(0);
  let gestureStartY = $state(0);
  let gestureDirection: "none" | "horizontal" | "vertical" = $state("none");
  let isOnCarousel = $state(false);
  const DIRECTION_THRESHOLD = 6;

  const closedPosition = $derived.by(() => {
    const height = innerHeight.current || window.innerHeight;
    if (height === 0) return 0;
    if (isTopRoute && isMobile) return height - 64 - 80;
    return height - 80;
  });

  const isPanelAnimating = $derived(
    isDragging ||
      (gsapTween !== null ? (gsapTween as gsap.core.Tween).isActive() : false),
  );

  function updateOpacity(currentY: number, force = false) {
    const closedPos = closedPosition || 1;
    const normalizedPos = Math.max(0, Math.min(1, currentY / closedPos));
    const detailsOpacity = cubicOut(1 - normalizedPos);

    if (
      force ||
      Math.abs(currentY - lastMotionY) >= 0.5 ||
      Math.abs(closedPos - lastMotionClosed) >= 0.5
    ) {
      playerDetailMotionStore.setMotion(currentY, closedPos);
      lastMotionY = currentY;
      lastMotionClosed = closedPos;
    }

    if (
      detailsPanelElement &&
      (force || Math.abs(detailsOpacity - lastOpacity) >= 0.005)
    ) {
      detailsPanelElement.style.opacity = String(detailsOpacity);
      lastOpacity = detailsOpacity;
    }
  }

  function applyPanelPosition(translateY: number, forceMotionSync = false) {
    if (!containerEl) return;
    gsap.set(containerEl, { y: translateY, force3D: true });
    updateOpacity(translateY, forceMotionSync);
  }

  function flushDragFrame() {
    dragFrameId = null;
    if (pendingDragY === null) return;
    applyPanelPosition(pendingDragY);
    pendingDragY = null;
  }

  function queueDragFrame(nextY: number) {
    pendingDragY = nextY;
    if (dragFrameId !== null) return;
    dragFrameId = window.requestAnimationFrame(flushDragFrame);
  }

  function flushPendingDragPosition(forceMotionSync = false) {
    if (dragFrameId !== null) {
      window.cancelAnimationFrame(dragFrameId);
      dragFrameId = null;
    }

    if (pendingDragY !== null) {
      applyPanelPosition(pendingDragY, forceMotionSync);
      pendingDragY = null;
    }
  }

  function attachWindowMouseListeners() {
    if (hasWindowMouseListeners) return;
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    hasWindowMouseListeners = true;
  }

  function detachWindowMouseListeners() {
    if (!hasWindowMouseListeners) return;
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
    hasWindowMouseListeners = false;
  }

  function animateToPosition(targetY: number, duration?: number) {
    if (!containerEl) return;

    if (gsapTween) {
      gsapTween.kill();
      gsapTween = null;
      playerDetailMotionStore.setAnimating(false);
    }

    if (appearanceStore.disableAnimations) {
      gsap.killTweensOf(containerEl);
      gsap.set(containerEl, { y: targetY, force3D: true, overwrite: "auto" });
      updateOpacity(targetY, true);
      playerDetailMotionStore.setAnimating(false);
      return;
    }

    const startPosition = gsap.getProperty(containerEl, "y") as number;
    const distance = Math.abs(targetY - startPosition);
    const animDuration =
      duration ?? Math.min(0.3, Math.max(0.2, distance / 1000));
    const proxy = { y: startPosition };

    playerDetailMotionStore.setAnimating(true);

    gsapTween = gsap.to(proxy, {
      y: targetY,
      duration: animDuration,
      ease: vaulEase,
      onUpdate: () => {
        if (gsapTween === null) return;
        if (containerEl) {
          gsap.set(containerEl, { y: proxy.y, force3D: true });
        }
        updateOpacity(proxy.y);
      },
      onComplete: () => {
        if (containerEl) {
          gsap.set(containerEl, { y: targetY, force3D: true });
        }
        updateOpacity(targetY, true);
        gsapTween = null;
        playerDetailMotionStore.setAnimating(false);
      },
    });
  }

  $effect(() => {
    if (!isDragging && containerEl) {
      const targetY = panelState.isOpen ? 0 : closedPosition;
      animateToPosition(targetY);
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
    const clientX =
      "touches" in event ? event.touches[0].clientX : event.clientX;

    gestureStartX = clientX;
    gestureStartY = clientY;
    gestureDirection = "none";

    if (!isOnCarousel) {
      if (gsapTween) {
        gsapTween.kill();
        gsapTween = null;
      }

      flushPendingDragPosition(true);

      isDragging = true;
      playerDetailMotionStore.setDragging(true);
      startY = clientY;
      currentY = clientY;
      lastMoveY = clientY;
      lastMoveTime = Date.now();
    }
  }

  function handleGestureMove(clientX: number, clientY: number) {
    if (isOnCarousel && gestureDirection === "none") {
      const deltaX = Math.abs(clientX - gestureStartX);
      const deltaY = Math.abs(clientY - gestureStartY);

      if (deltaX > DIRECTION_THRESHOLD || deltaY > DIRECTION_THRESHOLD) {
        if (deltaY > deltaX) {
          gestureDirection = "vertical";

          if (gsapTween) {
            gsapTween.kill();
            gsapTween = null;
          }

          flushPendingDragPosition(true);

          isDragging = true;
          playerDetailMotionStore.setDragging(true);
          startY = gestureStartY;
          currentY = clientY;
          lastMoveY = gestureStartY;
          lastMoveTime = Date.now();
        } else {
          gestureDirection = "horizontal";
        }
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
    const startPosition = panelState.isOpen ? 0 : closedPosition;
    const newTranslate = startPosition + deltaY;
    const clampedTranslate = Math.max(
      0,
      Math.min(closedPosition, newTranslate),
    );

    queueDragFrame(clampedTranslate);

    lastMoveY = currentY;
    currentY = clientY;
    lastMoveTime = Date.now();
  }

  function handleDragEnd() {
    gestureDirection = "none";
    isOnCarousel = false;

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
      const currentPos = containerEl
        ? (gsap.getProperty(containerEl, "y") as number)
        : 0;

      if (panelState.isOpen) {
        shouldOpen = currentPos < threshold;
      } else {
        shouldOpen = currentPos < closedPosition - threshold;
      }
    }

    const targetPosition = shouldOpen ? 0 : closedPosition;
    let duration = 0.3;

    if (Math.abs(velocityPxPerMs) > 0.5) {
      duration = Math.max(0.2, 0.3 - Math.abs(velocityPxPerMs) * 0.15);
    }

    animateToPosition(targetPosition, duration);

    if (shouldOpen) {
      panelState.open();
    } else {
      panelState.close();
    }

    isDragging = false;
    playerDetailMotionStore.setDragging(false);
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

  function handleTouchEnd() {
    handleDragEnd();
  }

  function handleMouseDown(e: MouseEvent) {
    attachWindowMouseListeners();
    handleDragStart(e.clientY, e);
  }

  function handleMouseMove(e: MouseEvent) {
    handleDragMove(e.clientX, e.clientY, e);
  }

  function handleMouseUp() {
    handleDragEnd();
    detachWindowMouseListeners();
  }

  function handlePlayPause() {
    trigger([{ duration: 10 }]);
    playerStore.togglePlayPause();
  }

  onMount(() => {
    if (!barElement) {
      return () => {
        detachWindowMouseListeners();
      };
    }

    const touchStartHandler = (e: TouchEvent) => {
      handleTouchStart(e);
    };
    const touchMoveHandler = (e: TouchEvent) => {
      handleTouchMove(e);
    };

    barElement.addEventListener("touchstart", touchStartHandler, {
      passive: true,
    });
    barElement.addEventListener("touchmove", touchMoveHandler, {
      passive: false,
    });

    return () => {
      detachWindowMouseListeners();
      barElement?.removeEventListener("touchstart", touchStartHandler);
      barElement?.removeEventListener("touchmove", touchMoveHandler);
    };
  });

  onDestroy(() => {
    if (gsapTween) {
      gsapTween.kill();
    }
    flushPendingDragPosition();
    detachWindowMouseListeners();
    playerDetailMotionStore.reset();
    destroy();
  });
</script>

<div
  bind:this={containerEl}
  class="absolute bottom-0 left-0 right-0 will-change-transform overscroll-none"
  style="transform: translateY(100vh)"
>
  <div class="relative select-none h-dvh">
    <div
      class="absolute top-1 left-4 right-4 flex items-center justify-between min-h-14"
      bind:this={barElement}
      role="button"
      tabindex="0"
      ontouchend={handleTouchEnd}
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
      style:pointer-events={panelState.isOpen ? "auto" : "none"}
    >
      <PlayerDetailsPanel
        onOpenChange={(v) => (v ? panelState.open() : panelState.close())}
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
