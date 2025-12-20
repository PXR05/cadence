<script lang="ts">
  import { getImageUrl, playerStore } from "$lib/stores/player.svelte";
  import { ChevronDown, EllipsisIcon, ListMusicIcon } from "@lucide/svelte";
  import { ManagePlaylistsDialog } from "../playlists";
  import { onMount } from "svelte";
  import { Button } from "../ui/button";
  import { downloadStore } from "$lib/stores/download.svelte";
  import { trackMenuStore } from "$lib/stores/trackMenu.svelte";
  import { shouldLoadItem } from "$lib/utils/queue";
  import { ProgressBar, PlaybackControls } from ".";
  import * as Carousel from "../ui/carousel";
  import type { CarouselAPI } from "../ui/carousel/context";
  import { VirtualScroll } from "../ui/virtual-scroll";
  import QueueItem from "./QueueItem.svelte";

  interface Props {
    onOpenChange: (open: boolean) => void;
    onQueueOpen: () => void;
    onTouchStart?: (e: TouchEvent) => void;
    onTouchMove?: (e: TouchEvent) => void;
    onTouchEnd?: (e: TouchEvent) => void;
    onMouseDown?: (e: MouseEvent) => void;
    isPanelAnimating?: boolean;
  }

  let {
    onOpenChange,
    onQueueOpen,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onMouseDown,
    isPanelAnimating = false,
  }: Props = $props();

  const track = $derived(playerStore.currentTrack);
  const title = $derived(track?.metadata?.title ?? track?.filename ?? "");
  const artist = $derived(track?.metadata?.artist ?? "Unknown Artist");

  let managePlaylistsDialogOpen = $state(false);
  let panelElement: HTMLDivElement | null = $state(null);
  let isOffline = $state(false);

  async function refreshOfflineStatus() {
    if (!track) return;
    isOffline = await downloadStore.checkTrackOfflineStatus(track.id);
  }

  function handleClose() {
    onOpenChange(false);
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

  const ROW_HEIGHT = 52;
  let open = $state(false);
  let previousOpen = $state(false);
  let virtualScroll: any = $state(null);

  $effect(() => {
    if (!open) {
      return;
    }
    if (open && !previousOpen && virtualScroll && playerStore.queueIndex >= 0) {
      virtualScroll?.scrollToIndex(playerStore.queueIndex, false);
    }
    previousOpen = open;
  });
</script>

{#snippet coverCarousel()}
  <div class="relative shrink-0 my-auto w-full z-20">
    <!-- <img
      loading="lazy"
      src={playerStore.currentImageUrl}
      alt={playerStore.currentTrack?.id ?? ""}
      draggable="false"
      onauxclick={() => false}
      oncontextmenu={() => false}
      class="h-[min(42.5dvh,90dvw)] scale-200 aspect-square object-cover absolute inset-0 m-auto pointer-events-none blur-3xl -z-1 saturate-75 brightness-150 dark:saturate-100 dark:brightness-100"
    /> -->
    <Carousel.Root
      class="w-full z-20"
      style="will-change: transform; transform: translateZ(0); contain: layout style;"
      opts={{ loop: true }}
      setApi={(emblaApi) => setDetailCarouselApi(emblaApi ?? null)}
    >
      <Carousel.Content>
        {#each playerStore.trackQueue as queueTrack, i}
          <Carousel.Item onclick={() => playerStore.togglePlayPause()}>
            {#if shouldLoadItem(i)}
              <img
                loading="lazy"
                src={getImageUrl(queueTrack.id)}
                alt={queueTrack.id}
                class="size-[min(40dvh,90dvw)] object-cover mx-auto rounded-2xl text-transparent"
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
  <div class="flex flex-col gap-10 px-6 my-auto z-20">
    <div class="text-center mb-2">
      <h2
        class="text-xl font-semibold truncate"
        style="color: color-mix(in oklab, {playerStore.trackColor} 30%, var(--foreground));"
      >
        {title}
      </h2>
      <p
        class="text-muted-foreground truncate"
        style="color: color-mix(in oklab, {playerStore.trackColor} 30%, var(--muted-foreground));"
      >
        {artist}
      </p>
    </div>

    <div class="flex flex-col gap-6">
      <ProgressBar height={10} {isPanelAnimating} />

      <PlaybackControls variant="large" />
    </div>
  </div>
{/snippet}

{#snippet queue()}
  <div class="h-24"></div>
  <VirtualScroll
    bind:this={virtualScroll}
    items={playerStore.trackQueue}
    rowHeight={ROW_HEIGHT}
    class="h-[calc(100dvh-6rem)]"
    leftPadding={8}
    rightPadding={8}
    itemGap={4}
    getItemKey={(track) => track.id ?? track.filename}
    enableDragReorder
    onReorder={(from, to) => playerStore.reorderQueue(from, to)}
  >
    {#snippet emptyState()}
      <div class="text-center py-8 text-muted-foreground pt-15.5">
        No tracks in queue
      </div>
    {/snippet}

    {#snippet children({ item: track, index, dragHandleProps })}
      {@const isCurrentTrack = index === playerStore.queueIndex}
      <QueueItem {index} {track} {isCurrentTrack} {dragHandleProps} />
    {/snippet}
  </VirtualScroll>
{/snippet}

<div
  bind:this={panelElement}
  role="dialog"
  tabindex="0"
  class="hide-scrollbar mt-0 relative h-dvh w-full"
  style="
    background: linear-gradient(
      to top,
      color-mix(in oklab, {playerStore.trackColor} 10%, var(--background)) 0%,
      var(--background) 50%,
      color-mix(in oklab, {playerStore.trackColor} 10%, var(--background)) 100%
    );
    "
  ontouchend={(e) => onTouchEnd?.(e)}
  onmousedown={(e) => onMouseDown?.(e)}
>
  <div class="flex flex-col h-dvh">
    <div class="flex justify-between items-center p-6">
      <Button
        size="icon"
        variant="ghost"
        onclick={handleClose}
        class="transition-opacity hover:opacity-90 cursor-pointer"
        aria-label="Close player details"
      >
        <ChevronDown class="size-6" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        class="transition-opacity hover:opacity-90 cursor-pointer"
        onclick={() =>
          track
            ? trackMenuStore.open(track, isOffline, refreshOfflineStatus)
            : {}}
      >
        <EllipsisIcon class="size-6" />
      </Button>
    </div>

    {#if track}
      <div class="flex-1 flex flex-col justify-between gap-4">
        {@render coverCarousel()}
        {@render controls()}
      </div>
    {/if}
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
