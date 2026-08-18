<script lang="ts">
  import * as Carousel from "$lib/components/ui/carousel";
  import type { CarouselAPI } from "$lib/components/ui/carousel/context";
  import { getTrackImageUrl as getImageUrl } from "$lib/backend/services/media";
  import type { AudioFile } from "$lib/schemas";
  import { downloadStore } from "$lib/stores/download.svelte";
  import { appearanceStore } from "$lib/stores/appearance.svelte";
  import { playerStore } from "$lib/stores/player.svelte";
  import { trackMenuStore } from "$lib/stores/trackMenu.svelte";
  import { shouldLoadItem } from "$lib/utils/queue";
  import {
    ListMusic as ListMusicIcon,
    Minimize2 as Minimize2Icon,
    Pause as PauseIcon,
    Play as PlayIcon,
    Repeat as RepeatIcon,
    Shuffle as ShuffleIcon,
  } from "@lucide/svelte";
  import { onDestroy } from "svelte";
  import { fade } from "svelte/transition";
  import QueueItem from "../tracks/QueueItem.svelte";
  import TrackInfo from "../tracks/TrackInfo.svelte";
  import { Button } from "../ui/button";
  import { Image } from "../ui/image";
  import { VirtualScroll } from "../ui/virtual-scroll";
  import { formatTime } from "$lib/utils/format";
  import VolumeControl from "./VolumeControl.svelte";

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  let isQueueOpen = $state(false);
  let controlsVisible = $state(true);
  let isHoveringControls = $state(false);
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  let virtualScroll: any = $state(null);
  const ROW_HEIGHT = 74;

  let isDraggingCarousel = $state(false);
  let queueScrollTop = $state(0);
  let queueScrollHeight = $state(0);
  let queueClientHeight = $state(0);

  const track = $derived(playerStore.currentTrack);
  const title = $derived(track?.metadata?.title ?? track?.filename ?? "");
  const artists = $derived(
    (track?.metadata?.artist ?? "Unknown").split(
      track?.metadata?.artist?.includes(",") ? ", " : "、",
    ),
  );

  function showControlsAndResetTimer() {
    controlsVisible = true;
    if (hideTimer) {
      clearTimeout(hideTimer);
    }
    hideTimer = setTimeout(() => {
      if (!isHoveringControls) {
        controlsVisible = false;
      }
    }, 3500);
  }

  function setExpandedCarouselApi(api: CarouselAPI | null) {
    if (api) {
      playerStore.initializeCarousel("desktop_expanded", api);
      api.on("scroll", () => {
        isDraggingCarousel = true;
      });
      api.on("settle", () => {
        isDraggingCarousel = false;
      });
    }
  }

  async function openCarouselTrackMenu(queueTrack?: AudioFile | null) {
    if (!queueTrack) return;
    const isOffline = await downloadStore.checkTrackOfflineStatus(
      queueTrack.id,
    );
    const refreshOfflineStatus = async () => {
      await downloadStore.checkTrackOfflineStatus(queueTrack.id);
    };
    trackMenuStore.open(queueTrack, isOffline, refreshOfflineStatus);
  }

  function handleCarouselContextMenu(e: MouseEvent, queueTrack: AudioFile) {
    e.preventDefault();
    e.stopPropagation();
    openCarouselTrackMenu(queueTrack);
  }

  function handleKeydown(e: KeyboardEvent) {
    showControlsAndResetTimer();

    const active = document.activeElement;
    if (
      active &&
      (active.tagName === "INPUT" || active.tagName === "TEXTAREA")
    ) {
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      if (isQueueOpen) {
        isQueueOpen = false;
      } else {
        onClose();
      }
    } else if (e.key === " " || e.code === "Space") {
      e.preventDefault();
      playerStore.togglePlayPause();
    } else if (e.key === "q" || e.key === "Q") {
      e.preventDefault();
      isQueueOpen = !isQueueOpen;
    } else if (e.key === "s" || e.key === "S") {
      e.preventDefault();
      playerStore.isShuffled = !playerStore.isShuffled;
    } else if (e.key === "r" || e.key === "R") {
      e.preventDefault();
      playerStore.isRepeated = !playerStore.isRepeated;
    }
  }

  function handleQueueScroll(scrollTop: number) {
    queueScrollTop = scrollTop;
    const container = virtualScroll?.getContainerRef?.();
    if (container) {
      queueScrollHeight = container.scrollHeight;
      queueClientHeight = container.clientHeight;
    }
  }

  function queueMaskStyle() {
    const topColor = queueScrollTop > 10 ? "transparent" : "black";
    const bottomColor =
      queueScrollHeight > 0 &&
      queueClientHeight > 0 &&
      queueScrollTop >= queueScrollHeight - queueClientHeight - 8
        ? "black"
        : "transparent";

    return `
      -webkit-mask-image: linear-gradient(to bottom, ${topColor} 0%, black 2.5rem, black calc(100% - 2.5rem), ${bottomColor} 100%);
      mask-image: linear-gradient(to bottom, ${topColor} 0%, black 2.5rem, black calc(100% - 2.5rem), ${bottomColor} 100%);
      -webkit-mask-repeat: no-repeat;
      mask-repeat: no-repeat;
    `;
  }

  $effect(() => {
    showControlsAndResetTimer();
    return () => {
      if (hideTimer) clearTimeout(hideTimer);
    };
  });

  $effect(() => {
    if (isQueueOpen && virtualScroll && playerStore.queueIndex >= 0) {
      requestAnimationFrame(() => {
        setTimeout(() => {
          virtualScroll?.scrollToIndex(playerStore.queueIndex, false);
          const container = virtualScroll?.getContainerRef?.();
          if (container) {
            queueScrollTop = container.scrollTop;
            queueScrollHeight = container.scrollHeight;
            queueClientHeight = container.clientHeight;
          }
        }, 50);
      });
    }
  });

  onDestroy(() => {
    if (hideTimer) clearTimeout(hideTimer);
  });
</script>

<svelte:window onkeydown={handleKeydown} />

<div
  class="fixed inset-0 z-50 overflow-hidden bg-background select-none flex flex-col transition-all duration-200
  {!controlsVisible ? 'cursor-none' : 'cursor-default'}"
  onmousemove={showControlsAndResetTimer}
  onmousedown={showControlsAndResetTimer}
  ontouchstart={showControlsAndResetTimer}
  onclick={showControlsAndResetTimer}
  role="dialog"
  aria-modal="true"
  aria-label="Fullscreen player"
  tabindex="0"
  onkeydown={handleKeydown}
>
  {#if track}
    {#key track.id}
      <div
        class="absolute inset-0 pointer-events-none"
        transition:fade={{
          duration: appearanceStore.disableAnimations ? 0 : 500,
        }}
      >
        <Image
          loading="eager"
          crossorigin="use-credentials"
          src={getImageUrl(track.id)}
          alt=""
          aria-hidden="true"
          class="size-full object-cover text-transparent brightness-110 dark:brightness-50 blur-3xl scale-120"
        />
      </div>
    {/key}
  {/if}

  <div
    class="absolute inset-0 size-full pointer-events-none"
    style="
      background: radial-gradient(
        circle at center,
        color-mix(in oklab, var(--background) 0%, transparent) 0%,
        color-mix(in oklab, var(--background) 20%, transparent) 50%,
        color-mix(in oklab, var(--background) 80%, transparent) 100%
      );
    "
  ></div>

  <header
    class="relative z-30 flex items-center justify-between px-8 pt-6 transition-all duration-200 ease-out
    {controlsVisible
      ? 'opacity-100 translate-y-0 pointer-events-auto'
      : 'opacity-0 -translate-y-2 pointer-events-none'}"
    onmouseenter={() => (isHoveringControls = true)}
    onmouseleave={() => {
      isHoveringControls = false;
      showControlsAndResetTimer();
    }}
    role="toolbar"
    tabindex="-1"
    aria-label="Fullscreen player controls"
  >
    <Button
      variant="ghost"
      size="icon"
      onclick={onClose}
      class="size-10 rounded-full bg-foreground/10 hover:bg-foreground/20 backdrop-blur-md transition-all cursor-pointer"
      aria-label="Exit fullscreen"
    >
      <Minimize2Icon size={20} />
    </Button>

    <div class="flex items-center gap-3">
      <VolumeControl side="bottom" />

      <Button
        variant={isQueueOpen ? "secondary" : "ghost"}
        size="icon"
        onclick={() => (isQueueOpen = !isQueueOpen)}
        class="size-10 rounded-full backdrop-blur-md transition-all cursor-pointer
        {isQueueOpen
          ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md'
          : 'bg-foreground/10 hover:bg-foreground/20'}"
        aria-label={isQueueOpen ? "Close queue" : "Open queue"}
      >
        <ListMusicIcon size={20} />
      </Button>
    </div>
  </header>

  <main
    class="relative z-20 flex-1 flex items-center justify-center min-h-0 overflow-hidden size-full p-8"
  >
    <div
      class="w-[min(460px,46vh,46vw)] shrink-0 flex flex-col items-center justify-center min-w-0 h-full max-h-full py-4 transition-transform duration-200 ease-out will-change-transform
      {isQueueOpen ? '-translate-x-48 lg:-translate-x-56' : 'translate-x-0'}"
    >
      <div class="w-full shrink-0 flex items-center justify-center">
        <Carousel.Root
          class="w-full"
          opts={{ loop: true }}
          setApi={(emblaApi) => setExpandedCarouselApi(emblaApi ?? null)}
        >
          <Carousel.Content>
            {#each playerStore.trackQueue as queueTrack, i}
              {@const isCurrentTrack = queueTrack.id === track?.id}
              <Carousel.Item
                class="flex items-center justify-center"
                onclick={() => playerStore.togglePlayPause()}
                oncontextmenu={(e) => handleCarouselContextMenu(e, queueTrack)}
              >
                {#if shouldLoadItem(i)}
                  <div
                    class="group relative aspect-square w-full rounded-3xl overflow-hidden cursor-pointer"
                  >
                    <Image
                      loading="lazy"
                      crossorigin="use-credentials"
                      src={getImageUrl(queueTrack.id)}
                      alt={queueTrack.metadata?.title ??
                        queueTrack.filename ??
                        queueTrack.id}
                      class="size-full object-cover text-transparent"
                    />

                    {#if isCurrentTrack}
                      <div
                        class="absolute inset-0 bg-black/50 opacity-0 backdrop-blur-xs transition-opacity duration-200 flex flex-col justify-between p-5 pointer-events-none
                        {!isDraggingCarousel ? 'group-hover:opacity-100' : ''}"
                      >
                        <div class="h-6"></div>

                        <div class="flex items-center justify-center">
                          <div
                            class="size-16 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-xs border border-white/20 flex items-center justify-center text-white shadow-lg transition-transform duration-200 group-hover:scale-105"
                          >
                            {#if playerStore.isPlaying}
                              <PauseIcon size={30} fill="currentColor" />
                            {:else}
                              <PlayIcon size={30} fill="currentColor" />
                            {/if}
                          </div>
                        </div>

                        <div
                          class="flex items-center justify-between w-full pointer-events-auto"
                        >
                          <button
                            type="button"
                            onclick={(e) => {
                              e.stopPropagation();
                              playerStore.isShuffled = !playerStore.isShuffled;
                            }}
                            class="size-10 rounded-full grid place-items-center backdrop-blur-xs transition-all cursor-pointer border
                            {playerStore.isShuffled
                              ? 'bg-white/30 text-white border-white/40 ring-1 ring-white/30 shadow-md'
                              : 'bg-white/10 text-white/70 hover:text-white hover:bg-white/20 border-white/15'}"
                            aria-label="Toggle shuffle"
                          >
                            <ShuffleIcon size={18} />
                          </button>

                          <span
                            class="text-xs text-white/80 tabular-nums font-medium backdrop-blur-xs px-3 py-1 rounded-full bg-white/10 border border-white/15"
                          >
                            {formatTime(playerStore.currentTime)} / {formatTime(
                              playerStore.duration,
                            )}
                          </span>

                          <button
                            type="button"
                            onclick={(e) => {
                              e.stopPropagation();
                              playerStore.isRepeated = !playerStore.isRepeated;
                            }}
                            class="size-10 rounded-full grid place-items-center backdrop-blur-xs transition-all cursor-pointer border
                            {playerStore.isRepeated
                              ? 'bg-white/30 text-white border-white/40 ring-1 ring-white/30 shadow-md'
                              : 'bg-white/10 text-white/70 hover:text-white hover:bg-white/20 border-white/15'}"
                            aria-label="Toggle repeat"
                          >
                            <RepeatIcon size={18} />
                          </button>
                        </div>
                      </div>
                    {/if}
                  </div>
                {:else}
                  <div
                    class="aspect-square w-full rounded-3xl bg-muted/30 border border-white/5 grid place-items-center"
                  ></div>
                {/if}
              </Carousel.Item>
            {/each}
          </Carousel.Content>
        </Carousel.Root>
      </div>

      <div class="w-full mt-8 text-center">
        <TrackInfo
          trackId={track?.id ?? ""}
          {title}
          {artists}
          centered={true}
          openDialogOnClick={false}
        />
      </div>
    </div>

    <aside
      class="absolute right-8 lg:right-16 top-20 bottom-8 w-96 lg:w-md flex flex-col overflow-hidden py-4 my-auto transition-all duration-200 ease-out will-change-[opacity,transform]
      {isQueueOpen
        ? 'opacity-100 translate-x-0 pointer-events-auto'
        : 'opacity-0 translate-x-12 pointer-events-none'}"
      onmouseenter={() => (isHoveringControls = true)}
      onmouseleave={() => {
        isHoveringControls = false;
        showControlsAndResetTimer();
      }}
      role="region"
      aria-label="Now playing queue"
      aria-hidden={!isQueueOpen}
    >
      <div class="flex-1 min-h-0 relative w-full" style={queueMaskStyle()}>
        <VirtualScroll
          bind:this={virtualScroll}
          items={playerStore.trackQueue}
          rowHeight={ROW_HEIGHT}
          class="h-full overscroll-contain"
          topOffset={4}
          leftPadding={4}
          rightPadding={4}
          itemGap={4}
          getItemKey={(t) => t.id ?? t.filename}
          enableDragReorder
          onReorder={(from, to) => playerStore.reorderQueue(from, to)}
          onScroll={handleQueueScroll}
        >
          {#snippet emptyState()}
            <div
              class="h-full flex items-center justify-center text-muted-foreground text-sm py-12"
            >
              No tracks in queue
            </div>
          {/snippet}

          {#snippet children({ item: qTrack, index, dragHandleProps })}
            {@const isCurrentTrack = index === playerStore.queueIndex}
            <QueueItem
              {index}
              track={qTrack}
              {isCurrentTrack}
              {dragHandleProps}
              transparent
            />
          {/snippet}
        </VirtualScroll>
      </div>
    </aside>
  </main>
</div>
