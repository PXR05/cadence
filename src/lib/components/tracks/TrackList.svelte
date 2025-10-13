<script lang="ts">
  import { LoaderIcon } from "@lucide/svelte";
  import TrackItem from "./TrackItem.svelte";
  import { tracksStore } from "$lib/stores/tracks.svelte";
  import { onMount } from "svelte";

  const tracks = $derived(tracksStore.tracks);
  const isInitialLoad = $derived(tracksStore.isInitialLoad);
  const isLoadingMore = $derived(tracksStore.isLoadingMore);
  const error = $derived(tracksStore.error);

  const ROW_HEIGHT = 88;
  const OVERSCAN = 10;

  let pagination = $state({
    offset: 0,
    pageSize: 20,
  });

  const range = $derived({
    start: Math.max(0, pagination.offset - OVERSCAN),
    end: Math.min(
      tracks.length,
      pagination.offset + pagination.pageSize + OVERSCAN
    ),
  });

  let containerRef = $state<HTMLDivElement | null>(null);

  function handleResize(ref: HTMLDivElement | null) {
    if (!ref) return;
    const clientHeight = ref.clientHeight;
    const visibleRows = Math.ceil(clientHeight / ROW_HEIGHT);
    pagination.pageSize = visibleRows;
  }

  function handleScroll(e: Event) {
    const ref = e.target as HTMLDivElement;
    const scrollTop = ref.scrollTop;
    pagination.offset = Math.floor(scrollTop / ROW_HEIGHT);
  }

  onMount(() => {
    if (containerRef) {
      handleResize(containerRef);
      const resizeHandler = () => handleResize(containerRef);
      window.addEventListener("resize", resizeHandler);
      containerRef.addEventListener("scroll", handleScroll);

      return () => {
        window.removeEventListener("resize", resizeHandler);
        containerRef?.removeEventListener("scroll", handleScroll);
      };
    }
  });
</script>

{#if isInitialLoad}
  <div
    class="max-w-4xl mx-auto w-full border-x h-full grid place-items-center p-8"
  >
    <LoaderIcon class="animate-spin text-muted-foreground" />
  </div>
{:else if error}
  <div
    class="max-w-4xl mx-auto w-full border-x p-4 text-destructive text-center"
  >
    Error loading tracks: {error}
  </div>
{:else if tracks.length === 0}
  <div
    class="max-w-4xl mx-auto w-full border-x p-4 text-muted-foreground text-center"
  >
    No audio files found.
  </div>
{:else}
  <div
    class="max-w-4xl mx-auto w-full border-x h-full overflow-y-auto"
    bind:this={containerRef}
  >
    <div
      style="height: {tracks.length *
        ROW_HEIGHT}px; position: relative; width: 100%;"
    >
      <div
        style="position: absolute; top: {range.start *
          ROW_HEIGHT}px; left: 0; right: 0;"
      >
        {#each tracks.slice(range.start, range.end) as track (track.id)}
          <TrackItem {track} />
        {/each}
      </div>
    </div>

    {#if isLoadingMore}
      <div
        class="p-4 flex items-center justify-center gap-2 text-muted-foreground border-t sticky bottom-0 bg-background"
      >
        <LoaderIcon class="animate-spin text-muted-foreground" size={16} />
      </div>
    {/if}
  </div>
{/if}
