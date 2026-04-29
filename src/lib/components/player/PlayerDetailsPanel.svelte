<script lang="ts">
  import { downloadStore } from "$lib/stores/download.svelte";
  import { getImageUrl } from "$lib/constants";
  import { playerStore } from "$lib/stores/player.svelte";
  import { trackInfoDialogStore } from "$lib/stores/trackInfoDialog.svelte";
  import { trackMenuStore } from "$lib/stores/trackMenu.svelte";
  import { shouldLoadItem } from "$lib/utils/queue";
  import {
    ChevronDown as ChevronDownIcon,
    ChevronUp as ChevronUpIcon,
    Ellipsis as EllipsisIcon,
  } from "@lucide/svelte";
  import { onMount } from "svelte";
  import { PlaybackControls, ProgressBar } from ".";
  import TrackInfo from "../tracks/TrackInfo.svelte";
  import { ManagePlaylistsDialog } from "../playlists";
  import { Button } from "../ui/button";
  import * as Carousel from "../ui/carousel";
  import type { CarouselAPI } from "../ui/carousel/context";
  import { Image } from "../ui/image";

  interface Props {
    onQueueOpen: () => void;
    onTouchStart?: (e: TouchEvent) => void;
    onTouchMove?: (e: TouchEvent) => void;
    onTouchEnd?: (e: TouchEvent) => void;
    onMouseDown?: (e: MouseEvent) => void;
    isPanelAnimating?: boolean;
  }

  let {
    onQueueOpen,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onMouseDown,
    isPanelAnimating = false,
  }: Props = $props();

  const track = $derived(playerStore.currentTrack);
  const title = $derived(track?.metadata?.title ?? track?.filename ?? "");
  const artists = $derived(
    (track?.metadata?.artist ?? "Unknown").split(
      track?.metadata?.artist?.includes(",") ? ", " : "、",
    ),
  );

  let managePlaylistsDialogOpen = $state(false);
  let panelElement: HTMLDivElement | null = $state(null);
  let isOffline = $state(false);

  let swipeStartY = $state(0);
  let isSwiping = $state(false);
  const SWIPE_THRESHOLD = 50;

  function handleSwipeStart(e: TouchEvent | MouseEvent) {
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    swipeStartY = clientY;
    isSwiping = true;
  }

  function handleSwipeEnd(e: TouchEvent | MouseEvent) {
    if (!isSwiping) return;

    const clientY =
      "changedTouches" in e ? e.changedTouches[0].clientY : e.clientY;
    const swipeDistance = swipeStartY - clientY;

    if (swipeDistance > SWIPE_THRESHOLD) {
      onQueueOpen();
    }

    isSwiping = false;
  }

  async function refreshOfflineStatus() {
    if (!track) return;
    isOffline = await downloadStore.checkTrackOfflineStatus(track.id);
  }

  function handleClose() {
    history.back();
  }

  onMount(async () => {
    if (!track) return;
    isOffline = await downloadStore.checkTrackOfflineStatus(track.id);
  });

  onMount(() => {
    if (panelElement) {
      const handleTouchStart = (e: TouchEvent) => {
        onTouchStart?.(e);
      };

      const handleTouchMove = (e: TouchEvent) => {
        onTouchMove?.(e);
      };

      panelElement.addEventListener("touchstart", handleTouchStart, {
        passive: false,
      });
      panelElement.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });

      return () => {
        panelElement?.removeEventListener("touchstart", handleTouchStart);
        panelElement?.removeEventListener("touchmove", handleTouchMove);
      };
    }
  });

  function setDetailCarouselApi(api: CarouselAPI | null) {
    if (api) {
      playerStore.initializeCarousel("detail", api);
    }
  }

  async function openCarouselTrackMenu(queueTrack: typeof track) {
    if (!queueTrack) return;
    const trackIsOffline = await downloadStore.checkTrackOfflineStatus(
      queueTrack.id,
    );
    const refreshTrackOfflineStatus = async () => {
      await downloadStore.checkTrackOfflineStatus(queueTrack.id);
    };
    trackMenuStore.open(queueTrack, trackIsOffline, refreshTrackOfflineStatus);
  }

  function handleCarouselContextMenu(e: MouseEvent, queueTrack: typeof track) {
    e.preventDefault();
    e.stopPropagation();
    openCarouselTrackMenu(queueTrack);
  }

  function openTrackInfoDialog() {
    if (!track) return;
    trackInfoDialogStore.openById(track.id);
  }
</script>

{#snippet coverCarousel()}
  <div class="relative shrink-0 my-auto w-full z-20">
    <Carousel.Root
      class="w-full z-20"
      opts={{ loop: true }}
      setApi={(emblaApi) => setDetailCarouselApi(emblaApi ?? null)}
    >
      <Carousel.Content>
        {#each playerStore.trackQueue as queueTrack, i}
          <Carousel.Item
            onclick={() => playerStore.togglePlayPause()}
            oncontextmenu={(e) => handleCarouselContextMenu(e, queueTrack)}
            onlongpress={() => openCarouselTrackMenu(queueTrack)}
          >
            {#if shouldLoadItem(i)}
              <Image
                loading="lazy"
                crossorigin="use-credentials"
                src={getImageUrl(queueTrack.id)}
                alt={queueTrack.id}
                class="size-[min(calc(100dvh-400px),calc(100dvw-3rem))] object-cover mx-auto rounded-2xl text-transparent"
              />
            {:else}
              <div
                class="h-[min(40dvh,90dvw)] aspect-square bg-muted/50 mx-auto rounded-2xl grid place-items-center"
              ></div>
            {/if}
          </Carousel.Item>
        {/each}
      </Carousel.Content>
    </Carousel.Root>
  </div>
{/snippet}

{#snippet controls()}
  <div class="flex flex-col gap-8 px-6 mt-auto mb-2 z-20">
    <div class="px-2">
      <TrackInfo trackId={track?.id ?? ""} {title} {artists} />
    </div>

    <div class="flex flex-col gap-14">
      <div class="px-2">
        <ProgressBar
          monochrome
          height={6}
          {isPanelAnimating}
          showTime
          timeSide="bottom"
        />
      </div>

      <PlaybackControls variant="large" monochrome />
    </div>
  </div>
{/snippet}

<div
  bind:this={panelElement}
  role="dialog"
  tabindex="0"
  class="hide-scrollbar mt-0 relative h-dvh w-full bg-background"
  ontouchend={(e) => onTouchEnd?.(e)}
  ontouchcancel={(e) => onTouchEnd?.(e)}
  onmousedown={(e) => onMouseDown?.(e)}
>
  {#if playerStore.currentTrack}
    <Image
      loading="lazy"
      crossorigin="use-credentials"
      src={getImageUrl(playerStore.currentTrack.id)}
      alt={playerStore.currentTrack.id}
      class="absolute inset-0 size-full object-cover text-transparent brightness-125 dark:brightness-60 blur-2xl scale-115"
    />
  {/if}

  <div
    class="flex flex-col h-dvh backdrop-brightness-95"
    style="
    background: linear-gradient(
      to top,
      color-mix(in oklab, var(--background) 80%, transparent) 0%,
      color-mix(in oklab, var(--background) 10%, transparent) 50%,
      color-mix(in oklab, var(--background) 80%, transparent) 100%
    );
    "
  >
    <div class="flex justify-between items-center p-6">
      <Button
        size="icon"
        variant="ghost"
        onclick={handleClose}
        class="transition-opacity hover:opacity-90 cursor-pointer"
        aria-label="Close player details"
      >
        <ChevronDownIcon class="size-5" />
      </Button>

      <button
        class="text-muted-foreground text-xs grid"
        onclick={openTrackInfoDialog}
        aria-label="Open track info"
      >
        <span>
          {track?.metadata?.format?.toUpperCase()}
        </span>
        <span>
          <!-- {#if track?.metadata?.bitDepth}
            {track?.metadata?.bitDepth}-bit
          {/if}
          {#if track?.metadata?.sampleRate}
            {(track.metadata.sampleRate / 1000).toFixed(1)} kHz
            {/if} -->
          {#if track?.metadata?.bitrate}
            {track.metadata.bitrate >= 1000
              ? (track.metadata.bitrate / 1000).toFixed(1) + " kbps"
              : track.metadata.bitrate + " bps"}
          {/if}
        </span>
      </button>

      <Button
        size="icon"
        variant="ghost"
        class="transition-opacity hover:opacity-90 cursor-pointer"
        onclick={() =>
          track
            ? trackMenuStore.open(track, isOffline, refreshOfflineStatus)
            : {}}
      >
        <EllipsisIcon class="size-5" />
      </Button>
    </div>

    {#if track}
      <div class="flex-1 flex flex-col justify-between gap-4">
        {@render coverCarousel()}
        {@render controls()}
      </div>
    {/if}

    <div
      class="z-20"
      role="presentation"
      ontouchstart={handleSwipeStart}
      ontouchend={handleSwipeEnd}
      onmousedown={handleSwipeStart}
      onmouseup={handleSwipeEnd}
    >
      <Button
        variant="ghost"
        onclick={onQueueOpen}
        class="hover:bg-transparent! w-full h-full py-6 flex-col items-center justify-center gap-1 bg-transparent"
      >
        <ChevronUpIcon size={24} />

        <span class="text-muted-foreground">
          {playerStore.queueLength} track{playerStore.queueLength !== 1
            ? "s"
            : ""} in queue
        </span>
      </Button>
    </div>
  </div>
</div>

{#if track}
  <ManagePlaylistsDialog
    open={managePlaylistsDialogOpen}
    onOpenChange={(open) => (managePlaylistsDialogOpen = open)}
    trackId={track.id}
    trackTitle={title}
  />
{/if}
