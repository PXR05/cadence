<script lang="ts">
  import {
    LoaderIcon,
    SquareDashedIcon,
    TriangleAlertIcon,
  } from "@lucide/svelte";
  import TrackItem from "$lib/components/tracks/TrackItem.svelte";
  import { HorizontalTrackList } from "$lib/components/home";
  import { tracksStore } from "$lib/stores/tracks.svelte";
  import { historyStore } from "$lib/stores/history.svelte";
  import * as Carousel from "$lib/components/ui/carousel";
  import { playerStore } from "$lib/stores/player.svelte";
  import { slide } from "svelte/transition";
  import { appearanceStore } from "$lib/stores/appearance.svelte";
  import { Skeleton } from "$lib/components/ui/skeleton";

  const tracks = $derived(tracksStore.tracks);
  const isInitialLoad = $derived(tracksStore.isInitialLoad);
  const isLoadingMore = $derived(tracksStore.isLoadingMore);
  const error = $derived(tracksStore.error);
  const currentId = $derived(playerStore.currentTrack?.id);

  const recommendedTracks = $derived(tracksStore.getRandomTracks(10));
  const recentlyPlayed = $derived(historyStore.recentlyPlayed);

  const COLUMNS = 4;
  const ROWS = 4;

  $effect(() => {
    if (tracksStore.tracksCount > 0) {
      historyStore.loadRecentlyPlayed(10);
    }
  });
</script>

<svelte:head>
  <title
    >{playerStore.isPlaying && playerStore.currentTrack?.metadata?.title
      ? `${playerStore.currentTrack.metadata?.title} | `
      : ""}Cadence</title
  >
</svelte:head>

{#if isInitialLoad}
  <div class="pt-4 grid pb-74 space-y-2">
    <div class="flex flex-col gap-2">
      <Skeleton class="h-7 w-44 mx-4" />
      <div class="flex overflow-hidden ml-2 pb-4">
        {#each { length: 6 } as _}
          <div class="flex flex-col gap-2 w-48 md:w-56 p-2 shrink-0">
            <Skeleton class="aspect-square w-full" />
            <Skeleton class="h-10 w-full" />
          </div>
        {/each}
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <Skeleton class="h-7 w-44 mx-4" />
      <div class="flex overflow-hidden ml-2 pb-4">
        {#each { length: 6 } as _}
          <div class="flex flex-col gap-2 w-48 md:w-56 p-2 shrink-0">
            <Skeleton class="aspect-square w-full" />
            <Skeleton class="h-10 w-full" />
          </div>
        {/each}
      </div>
    </div>

    <Skeleton class="h-7 w-36 mx-4 mb-2" />
    <div class="flex overflow-hidden ml-2">
      {#each { length: 4 } as _}
        <div
          class="w-[calc(100%-2rem)] md:w-[calc(50%-1rem)] lg:w-[calc(33%-0.5rem)] xl:w-[calc(25%-0.5rem)] shrink-0"
        >
          <div class="grid gap-2">
            {#each { length: ROWS } as _}
              <div class="flex items-center gap-4 p-2">
                <Skeleton class="size-16 shrink-0" />
                <Skeleton class="h-10 flex-1" />
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </div>
{:else if error}
  <div
    class="mx-auto w-full h-full grid place-items-center p-16 text-destructive text-center"
  >
    <div class="flex flex-col items-center text-destructive">
      <TriangleAlertIcon size={48} strokeWidth={1.5} class="mb-4" />
      <p class="text-center">
        Error loading tracks: {error}
      </p>
    </div>
  </div>
{:else if tracks.length === 0}
  <div class="mx-auto w-full h-full grid place-items-center p-16">
    <div class="flex flex-col items-center text-muted-foreground">
      <SquareDashedIcon size={48} strokeWidth={1.5} class="mb-4 rotate-45" />
      <p class="text-center">No songs added yet.</p>
    </div>
  </div>
{:else}
  <div class="pt-4 grid pb-74">
    <HorizontalTrackList title="Recommended" tracks={recommendedTracks} />

    {#if recentlyPlayed.length > 0}
      <div
        transition:slide={{
          axis: "y",
          duration: appearanceStore.disableAnimations ? 0 : 200,
        }}
      >
        <HorizontalTrackList title="Recently Played" tracks={recentlyPlayed} />
      </div>
    {/if}

    <h2 class="px-4 pb-2 text-2xl font-semibold">Releases</h2>

    <Carousel.Root
      class="w-full"
      opts={{
        align: "start",
      }}
    >
      <Carousel.Content
        class="w-[calc(100%-2rem)] md:w-[calc(50%-1rem)] lg:w-[calc(33%-0.5rem)] xl:w-[calc(25%-0.5rem)] ml-2"
      >
        {#each { length: COLUMNS }, i}
          <Carousel.Item class="grid gap-2 p-0">
            {#each tracks.slice(ROWS * i, ROWS * i + ROWS) as item, i (item)}
              {@const index = ROWS * i + i}
              <TrackItem
                {index}
                isCurrentTrack={item.id === currentId}
                track={item}
              />
            {/each}
          </Carousel.Item>
        {/each}
      </Carousel.Content>
    </Carousel.Root>

    {#if isLoadingMore}
      <div
        class="p-4 flex items-center justify-center gap-2 text-muted-foreground border-t sticky bottom-0 bg-background"
      >
        <LoaderIcon
          class="delayed-loader animate-spin text-muted-foreground"
          size={16}
        />
      </div>
    {/if}
  </div>
{/if}
