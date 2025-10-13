<script lang="ts">
  import { LoaderIcon } from "@lucide/svelte";
  import TrackItem from "./TrackItem.svelte";
  import { tracksStore } from "$lib/stores/tracks.svelte";

  const tracks = $derived(tracksStore.tracks);
  const isInitialLoad = $derived(tracksStore.isInitialLoad);
  const isLoadingMore = $derived(tracksStore.isLoadingMore);
  const error = $derived(tracksStore.error);
</script>

<div class="max-w-4xl mx-auto w-full border-x">
  {#if isInitialLoad}
    <div class="grid place-items-center flex-1 p-8 h-full">
      <LoaderIcon class="animate-spin text-muted-foreground" />
    </div>
  {:else if error}
    <div class="p-4 text-destructive text-center">
      Error loading tracks: {error}
    </div>
  {:else}
    <div class="flex flex-col w-full">
      {#each tracks as track (track.id)}
        <TrackItem {track} />
      {:else}
        <div class="p-4 text-muted-foreground text-center">
          No audio files found.
        </div>
      {/each}

      {#if isLoadingMore}
        <div
          class="p-4 flex items-center justify-center gap-2 text-muted-foreground border-t"
        >
          <LoaderIcon class="animate-spin text-muted-foreground" size={16} />
        </div>
      {/if}
    </div>
  {/if}
</div>
