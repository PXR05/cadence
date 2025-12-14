<script lang="ts">
  import { LoaderIcon } from "@lucide/svelte";
  import TrackItem from "$lib/components/tracks/TrackItem.svelte";
  import { HorizontalTrackList } from "$lib/components/home";
  import { tracksStore } from "$lib/stores/tracks.svelte";
  import { historyStore } from "$lib/stores/history.svelte";
  import * as Carousel from "$lib/components/ui/carousel";
  import { playerStore } from "$lib/stores/player.svelte";
  import { fade, slide } from "svelte/transition";
  import { ScrollArea } from "$lib/components/ui/scroll-area";

  const tracks = $derived(tracksStore.tracks);
  const isInitialLoad = $derived(tracksStore.isInitialLoad);
  const isLoadingMore = $derived(tracksStore.isLoadingMore);
  const error = $derived(tracksStore.error);
  const currentId = $derived(playerStore.currentTrack?.id);

  const recommendedTracks = $derived(tracksStore.getRandomTracks(10));
  const recentlyPlayed = $derived(historyStore.recentlyPlayed);

  const ROW_HEIGHT = 80;
  const COLUMNS = 4;
  const ROWS = 4;

  $effect(() => {
    if (tracksStore.tracksCount > 0) {
      historyStore.loadRecentlyPlayed(10);
    }
  });
</script>

<svelte:head>
  <title>Cadence</title>
</svelte:head>

{#if isInitialLoad}
  <div class="mx-auto w-full h-full grid place-items-center p-8">
    <LoaderIcon class="animate-spin text-muted-foreground" />
  </div>
{:else if error}
  <div class="mx-auto w-full p-16 text-destructive text-center">
    Error loading tracks: {error}
  </div>
{:else if tracks.length === 0}
  <div class="mx-auto w-full p-16 text-muted-foreground text-center">
    No songs added yet. Go search for some songs and add them to your library.
  </div>
{:else}
  <ScrollArea class="h-dvh py-2">
    <div transition:fade={{ duration: 150 }} class="pt-2 grid pb-72">
      <HorizontalTrackList title="Recommended" tracks={recommendedTracks} />

      {#if recentlyPlayed.length > 0}
        <div transition:slide={{ axis: "y", duration: 200, delay: 100 }}>
          <HorizontalTrackList
            title="Recently Played"
            tracks={recentlyPlayed}
          />
        </div>
      {/if}

      <h2 class="px-4 pb-2 text-2xl font-semibold">Releases</h2>

      <Carousel.Root
        class="w-dvw"
        opts={{
          align: "start",
        }}
      >
        <Carousel.Content
          class="w-[calc(100dvw-2rem)] md:w-[calc(50dvw-1rem)] lg:w-[calc(33dvw-0.5rem)] xl:w-[25dvw] ml-2"
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
          <LoaderIcon class="animate-spin text-muted-foreground" size={16} />
        </div>
      {/if}
    </div>
  </ScrollArea>
{/if}
