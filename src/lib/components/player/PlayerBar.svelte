<script lang="ts">
  import { playerStore } from "$lib/stores/player.svelte";
  import { useDialogState } from "$lib/hooks/useDialogState.svelte";
  import type { CarouselAPI } from "$lib/components/ui/carousel/context";
  import ProgressBar from "./ProgressBar.svelte";
  import QueueDialog from "./QueueDialog.svelte";
  import PlayerDetailsPanel from "./PlayerDetailsPanel.svelte";
  import TrackCarousel from "./TrackCarousel.svelte";
  import PlaybackControls from "./PlaybackControls.svelte";
  import VolumeControl from "./VolumeControl.svelte";
  import { ListMusicIcon, PauseIcon, PlayIcon } from "@lucide/svelte";
  import { onDestroy, onMount } from "svelte";
  import { Button } from "../ui/button";
  import { page } from "$app/state";
  import { innerWidth } from "svelte/reactivity/window";

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
  let dragTranslate = $state<number | null>(null);

  const closedPosition = $derived.by(() => {
    if (isTopRoute && isMobile) {
      return window.innerHeight - 62; // 3.875rem = 62px
    }
    return window.innerHeight - 6; // 0.375rem = 6px
  });

  const playerTranslate = $derived.by(() => {
    if (isDragging && dragTranslate !== null) {
      return `${Math.max(0, dragTranslate)}px`;
    }

    if (panelState.isOpen) {
      return `0`;
    }
    if (isTopRoute && isMobile) {
      return `calc(100dvh - 3.875rem)`;
    }
    return `calc(100dvh - 0.375rem)`;
  });

  const playerBarOpacity = $derived.by(() => {
    if (isDragging && dragTranslate !== null) {
      return Math.min(1, dragTranslate / closedPosition);
    }
    return panelState.isOpen ? 0 : 1;
  });

  const detailsPanelOpacity = $derived.by(() => {
    if (isDragging && dragTranslate !== null) {
      return Math.max(0, 1 - dragTranslate / closedPosition);
    }
    return panelState.isOpen ? 1 : 0;
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

    if (panelState.isOpen) {
      dragTranslate = 0;
    } else {
      dragTranslate = closedPosition;
    }
  }

  function handleDragMove(clientY: number, event?: TouchEvent | MouseEvent) {
    if (!isDragging || dragTranslate === null) return;

    const deltaY = clientY - startY;
    const newTranslate = (panelState.isOpen ? 0 : closedPosition) + deltaY;

    if (event && "touches" in event && panelState.isOpen) {
      event.preventDefault();
    }

    dragTranslate = Math.max(0, Math.min(closedPosition, newTranslate));
    currentY = clientY;
  }

  function handleDragEnd() {
    if (!isDragging || dragTranslate === null) return;

    const deltaY = currentY - startY;
    const threshold = closedPosition * 0.5;
    const velocity = Math.abs(deltaY);

    let shouldOpen = false;

    if (velocity > 50) {
      shouldOpen = deltaY < 0;
    } else {
      shouldOpen = dragTranslate < threshold;
    }

    if (shouldOpen) {
      panelState.open();
    } else {
      panelState.close();
    }

    isDragging = false;
    dragTranslate = null;
  }

  function handleTouchStart(e: TouchEvent) {
    handleDragStart(e.touches[0].clientY, e);
  }

  function handleTouchMove(e: TouchEvent) {
    if (isDragging) {
      handleDragMove(e.touches[0].clientY, e);
    }
  }

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
  class="absolute bottom-0 left-0 right-0 {isDragging
    ? ''
    : 'transition-transform duration-300'}"
  style="
    transform: translateY({playerTranslate});
    will-change: transform;"
>
  <div class="select-none h-[calc(100dvh+5rem)]">
    <div
      class="mx-1.5 rounded-xl overflow-clip border border-input bg-muted/50 backdrop-blur-md"
      style="opacity: {playerBarOpacity}; transition: {isDragging
        ? 'none'
        : 'opacity 200ms cubic-bezier(0.83, 0, 0.17, 1)'};"
      role="button"
      tabindex="0"
      ontouchstart={handleTouchStart}
      ontouchmove={(e) => {
        handleTouchMove(e);
        if (panelState.isOpen && isDragging) {
          e.preventDefault();
        }
      }}
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
        <ProgressBar />
      </div>
    </div>

    <audio bind:this={audioEl}></audio>

    <QueueDialog
      open={queueDialog.isOpen}
      onOpenChange={(open) => !open && queueDialog.close()}
    />

    <div
      style="opacity: {detailsPanelOpacity}; transition: {isDragging
        ? 'none'
        : 'opacity 200ms cubic-bezier(0.83, 0, 0.17, 1)'};"
    >
      <PlayerDetailsPanel
        bind:open={panelState.isOpen}
        onOpenChange={() => panelState.toggle()}
        onQueueOpen={() => queueDialog.open()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      />
    </div>
  </div>
</div>
