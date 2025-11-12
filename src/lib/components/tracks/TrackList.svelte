<script lang="ts">
  import { LoaderIcon } from "@lucide/svelte";
  import TrackItem from "./TrackItem.svelte";
  import { tracksStore } from "$lib/stores/tracks.svelte";
  import { VirtualScroll } from "../ui/virtual-scroll";
  import { playerStore } from "$lib/stores/player.svelte";

  const tracks = $derived(tracksStore.tracks);
  const isInitialLoad = $derived(tracksStore.isInitialLoad);
  const isLoadingMore = $derived(tracksStore.isLoadingMore);
  const error = $derived(tracksStore.error);
  const currentId = $derived(playerStore.currentTrack?.id);

  const ROW_HEIGHT = 81;
</script>

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
  <VirtualScroll items={tracks} rowHeight={ROW_HEIGHT} class="border h-dvh">
    {#snippet children({ item: track, visibleIndex })}
      <TrackItem
        index={visibleIndex}
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
  {:else}
    <div class="h-[50dvh]"></div>
  {/if}
{/if}
