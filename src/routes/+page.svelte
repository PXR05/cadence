<script lang="ts">
  import { LoaderIcon } from "@lucide/svelte";
  import TrackItem from "$lib/components/tracks/TrackItem.svelte";
  import { HorizontalTrackList } from "$lib/components/home";
  import { tracksStore } from "$lib/stores/tracks.svelte";
  import { historyStore } from "$lib/stores/history.svelte";
  import { VirtualScroll } from "$lib/components/ui/virtual-scroll";
  import { playerStore } from "$lib/stores/player.svelte";
  import { onMount } from "svelte";

  const tracks = $derived(tracksStore.tracks);
  const isInitialLoad = $derived(tracksStore.isInitialLoad);
  const isLoadingMore = $derived(tracksStore.isLoadingMore);
  const error = $derived(tracksStore.error);
  const currentId = $derived(playerStore.currentTrack?.id);

  const recommendedTracks = $derived(tracksStore.getRandomTracks(10));
  const recentlyPlayed = $derived(historyStore.recentlyPlayed);

  const ROW_HEIGHT = 80;

  onMount(async () => {
    await historyStore.loadRecentlyPlayed(10);
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
  <VirtualScroll items={tracks} rowHeight={ROW_HEIGHT} class="h-dvh">
    {#snippet children({ item: track, actualIndex, visibleIndex })}
      {#if actualIndex === 0}
        <div class="pt-4 grid gap-2">
          <HorizontalTrackList title="Recommended" tracks={recommendedTracks} />
          {#if recentlyPlayed.length > 0}
            <HorizontalTrackList
              title="Recently Played"
              tracks={recentlyPlayed}
            />
          {/if}
          <h2 class="px-4 pb-2 text-2xl font-semibold">All Songs</h2>
        </div>
      {:else if visibleIndex === 0}
        <div style="height: {recentlyPlayed.length > 0 ? 672 : 364}px;"></div>
      {/if}

      <TrackItem
        index={actualIndex}
        isCurrentTrack={track.id === currentId}
        {track}
      />
    {/snippet}
  </VirtualScroll>

  {#if isLoadingMore}
    <div
      class="p-4 flex items-center justify-center gap-2 text-muted-foreground border-t sticky bottom-0 bg-background"
    >
      <LoaderIcon class="animate-spin text-muted-foreground" size={16} />
    </div>
  {/if}
{/if}
