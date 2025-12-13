<script lang="ts">
  import { page } from "$app/state";
  import type { CarouselAPI } from "$lib/components/ui/carousel/context";
  import { useDialogState } from "$lib/hooks/useDialogState.svelte";
  import { playerStore } from "$lib/stores/player.svelte";
  import { ListMusicIcon, PauseIcon, PlayIcon } from "@lucide/svelte";
  import { onDestroy, onMount } from "svelte";
  import { innerHeight, innerWidth } from "svelte/reactivity/window";
  import { Spring } from "svelte/motion";
  import { Button } from "../ui/button";
  import PlaybackControls from "./PlaybackControls.svelte";
  import PlayerDetailsPanel from "./PlayerDetailsPanel.svelte";
  import ProgressBar from "./ProgressBar.svelte";
  import QueueDialog from "./QueueDialog.svelte";
  import TrackCarousel from "./TrackCarousel.svelte";
  import VolumeControl from "./VolumeControl.svelte";

  const isMobile = $derived((innerWidth.current ?? 0) <= 768);
  const isTopRoute = $derived(page.url.pathname.split("/").length <= 2);

  const {
    panelState,
  }: {
    panelState: ReturnType<typeof useDialogState>;
  } = $props();

  let isDragging = $state(false);
  let startY = $state(0);
  let currentY = $state(0);
  let lastMoveY = $state(0);
  let lastMoveTime = $state(0);

  const translateSpring = new Spring(
    innerHeight.current ?? (window ? window.innerHeight : 0),
    {
      stiffness: 0.3,
      damping: 1,
    },
  );

  const closedPosition = $derived.by(() => {
    if (isTopRoute && isMobile) {
      return (innerHeight.current ?? window.innerHeight) - 62; // 3.875rem = 62px
    }
    return (innerHeight.current ?? window.innerHeight) - 6; // 0.375rem = 6px
  });

  const isPanelAnimating = $derived(
    isDragging ||
      (translateSpring.current !== 0 &&
        translateSpring.current !== translateSpring.target),
  );

  $effect(() => {
    if (!isDragging) {
      if (panelState.isOpen) {
        translateSpring.target = 0;
      } else {
        translateSpring.target = closedPosition;
      }
    }
  });

  const playerTranslate = $derived(`${translateSpring.current}px`);

  const playerBarOpacity = $derived.by(() => {
    const currentPos = translateSpring.current;
    return Math.min(1, currentPos / closedPosition);
  });

  const detailsPanelOpacity = $derived.by(() => {
    const currentPos = translateSpring.current;
    return Math.max(0, 1 - currentPos / closedPosition);
  });

  let audioEl: HTMLAudioElement | null = $state(null);
  const queueDialog = useDialogState("queue");

  $effect(() => {
    if (audioEl && !playerStore.isLoaded) {
      playerStore.initialize(audioEl);
    }
  });

  function shouldIgnoreDrag(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) return false;

    if (!panelState.isOpen) return false;

    const interactiveSelectors = [
      "button",
      "input",
      "textarea",
      "select",
      "a",
      '[role="button"]',
      '[role="slider"]',
      // Carousel
      '[data-slot="carousel"]',
      '[data-slot="carousel-content"]',
      '[data-slot="carousel-item"]',
      "[data-embla-container]",
      "[data-embla-slide]",
      '[role="region"][aria-roledescription="carousel"]',
      // Progress bar
      '[role="progressbar"]',
      'input[type="range"]',
      ".touch-none",
    ].join(",");

    return target.closest(interactiveSelectors) !== null;
  }

  function handleDragStart(clientY: number, event: TouchEvent | MouseEvent) {
    if (!isMobile) {
      return;
    }

    if (shouldIgnoreDrag(event.target)) {
      return;
    }

    isDragging = true;
    startY = clientY;
    currentY = clientY;
    lastMoveY = clientY;
    lastMoveTime = Date.now();

    translateSpring.set(translateSpring.current, { instant: true });
  }

  function handleDragMove(clientY: number, event?: TouchEvent | MouseEvent) {
    if (!isDragging) return;

    const deltaY = clientY - startY;
    const startPosition = panelState.isOpen ? 0 : closedPosition;
    const newTranslate = startPosition + deltaY;

    if (event && "touches" in event && event.cancelable) {
      event.preventDefault();
    }

    const clampedTranslate = Math.max(
      0,
      Math.min(closedPosition, newTranslate),
    );

    translateSpring.set(clampedTranslate, { instant: true });

    lastMoveY = currentY;
    currentY = clientY;
    lastMoveTime = Date.now();
  }

  function handleDragEnd() {
    if (!isDragging) return;

    const timeDelta = Date.now() - lastMoveTime;
    const moveDelta = currentY - lastMoveY;
    const velocityPxPerMs = timeDelta > 0 ? moveDelta / timeDelta : 0;

    let shouldOpen = false;

    if (Math.abs(velocityPxPerMs) > 0.3) {
      shouldOpen = moveDelta < 0;
    } else {
      const threshold = closedPosition * 0.1;
      const currentPos = translateSpring.current;

      if (panelState.isOpen) {
        shouldOpen = currentPos < threshold;
      } else {
        shouldOpen = currentPos < closedPosition - threshold;
      }
    }

    const targetPosition = shouldOpen ? 0 : closedPosition;

    let momentumDuration = 0;
    if (Math.abs(velocityPxPerMs) > 0.1) {
      momentumDuration = Math.min(200, Math.abs(velocityPxPerMs) * 400);
    }

    translateSpring.set(targetPosition, {
      preserveMomentum: momentumDuration,
    });

    if (shouldOpen) {
      panelState.open();
    } else {
      panelState.close();
    }

    isDragging = false;
  }

  function handleTouchStart(e: TouchEvent) {
    handleDragStart(e.touches[0].clientY, e);
  }

  function handleTouchMove(e: TouchEvent) {
    if (isDragging) {
      handleDragMove(e.touches[0].clientY, e);
    }
  }

  let playerBarElement: HTMLDivElement | null = $state(null);

  function handleTouchEnd() {
    handleDragEnd();
  }

  function handleMouseDown(e: MouseEvent) {
    handleDragStart(e.clientY, e);
  }

  function handleMouseMove(e: MouseEvent) {
    handleDragMove(e.clientY, e);
  }

  function handleMouseUp() {
    handleDragEnd();
  }

  onMount(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    if (playerBarElement) {
      const touchStartHandler = (e: TouchEvent) => {
        handleTouchStart(e);
      };

      const touchMoveHandler = (e: TouchEvent) => {
        handleTouchMove(e);
      };

      playerBarElement.addEventListener("touchstart", touchStartHandler, {
        passive: false,
      });
      playerBarElement.addEventListener("touchmove", touchMoveHandler, {
        passive: false,
      });

      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        playerBarElement?.removeEventListener("touchstart", touchStartHandler);
        playerBarElement?.removeEventListener("touchmove", touchMoveHandler);
      };
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  });

  onDestroy(() => {
    playerStore.cleanup();
  });

  function setCarouselApi(api: CarouselAPI | null) {
    if (api) {
      playerStore.initializeCarousel("main", api);
    }
  }
</script>

<div
  class="absolute bottom-0 left-0 right-0"
  style="
    transform: translate3d(0, {playerTranslate}, 0);
    will-change: transform;
    overscroll-behavior: none;"
>
  <div class="select-none h-[calc(100dvh+5rem)]">
    <div
      bind:this={playerBarElement}
      class="mx-1.5 rounded-xl overflow-clip border border-input/15 bg-muted-foreground/10 dark:bg-muted/50 backdrop-blur-md"
      style="opacity: {playerBarOpacity};"
      role="button"
      tabindex="0"
      ontouchend={handleTouchEnd}
      onmousedown={handleMouseDown}
    >
      <div
        class=" relative flex md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center max-md:justify-between py-2 min-h-16"
      >
        <TrackCarousel
          onTrackClick={() => (isMobile ? panelState.open() : {})}
          setApi={(emblaApi) => setCarouselApi(emblaApi)}
        />

        {#if playerStore.currentTrack}
          <div class="hidden md:flex place-self-center">
            <PlaybackControls />
          </div>

          <div
            class="hidden md:flex items-center gap-2 flex-shrink-0 self-center justify-self-end pr-3"
          >
            <Button
              variant="ghost"
              onclick={() => queueDialog.open()}
              class="size-8 grid place-items-center"
              aria-label="Open queue"
            >
              <ListMusicIcon size={18} />
            </Button>
            <VolumeControl />
          </div>

          <Button
            variant="ghost"
            onclick={() => playerStore.togglePlayPause()}
            class="md:hidden size-12 grid place-items-center flex-shrink-0 mr-2 p-0"
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
      <div class="px-2 pb-2">
        <ProgressBar {isPanelAnimating} />
      </div>
    </div>

    <audio bind:this={audioEl}></audio>

    <QueueDialog
      open={queueDialog.isOpen}
      onOpenChange={(open) => !open && queueDialog.close()}
    />

    <div
      style="opacity: {detailsPanelOpacity}; touch-action: none; overscroll-behavior: none;"
    >
      <PlayerDetailsPanel
        onOpenChange={(v) => (v ? panelState.open() : panelState.close())}
        onQueueOpen={() => queueDialog.open()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        {isPanelAnimating}
      />
    </div>
  </div>
</div>
