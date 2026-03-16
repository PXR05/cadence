<script lang="ts">
  import { goto } from "$app/navigation";
  import { downloadStore } from "$lib/stores/download.svelte";
  import { getImageUrl } from "$lib/constants";
  import { playerStore } from "$lib/stores/player.svelte";
  import { trackMenuStore } from "$lib/stores/trackMenu.svelte";
  import { shouldLoadItem } from "$lib/utils/queue";
  import {
    ChevronDown,
    ChevronUpIcon,
    EllipsisIcon,
    ListMusicIcon,
  } from "@lucide/svelte";
  import { onMount } from "svelte";
  import { PlaybackControls, ProgressBar } from ".";
  import { ManagePlaylistsDialog } from "../playlists";
  import { Button } from "../ui/button";
  import * as Carousel from "../ui/carousel";
  import type { CarouselAPI } from "../ui/carousel/context";

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
              <img
                loading="lazy"
                crossorigin="use-credentials"
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
  <div class="flex flex-col gap-8 px-6 my-auto z-20">
    <div class="text-center mb-2 grid gap-1">
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
        {#each artists as a, i}
          <span
            role="link"
            tabindex="0"
            class="hover:underline cursor-pointer"
            onclick={(e) => {
              e.stopPropagation();
              goto(`/playlist?id=artist_${a}`);
            }}
            onkeydown={(e) =>
              e.key === "Enter" && goto(`/playlist?id=artist_${a}`)}>{a}</span
          >{#if i < artists.length - 1},&nbsp;{/if}
        {/each}
      </p>
    </div>

    <div class="flex flex-col gap-6">
      <ProgressBar height={10} {isPanelAnimating} showTime />

      <PlaybackControls variant="large" />
    </div>
  </div>
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

        <span class="flex items-center gap-2 text-muted-foreground">
          <ListMusicIcon size={20} />
          <span>
            {playerStore.queueLength} track{playerStore.queueLength !== 1
              ? "s"
              : ""} in queue
          </span>
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
