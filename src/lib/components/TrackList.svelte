<script lang="ts">
  import { onMount } from "svelte";
  import { LoaderIcon } from "@lucide/svelte";
  import TrackItem from "./TrackItem.svelte";
  import { fetchTracks } from "$lib/api";

  const LIMIT = 20;
  const ROOT_MARGIN = "200px";

  let tracks = $state<AudioFile[]>([]);
  let loading = $state(false);
  let initialLoading = $state(true);
  let hasMore = $state(true);
  let currentPage = $state(0);
  let sentinelElement: HTMLDivElement | null = $state(null);

  async function loadMoreTracks() {
    if (loading || !hasMore) return;

    loading = true;
    try {
      const nextPage = currentPage + 1;
      const result = await fetchTracks({
        page: nextPage,
        limit: LIMIT,
        sortBy: "uploadedAt",
        sortOrder: "desc",
      });

      tracks = [...tracks, ...result.tracks];
      currentPage = nextPage;
      hasMore = result.hasMore;
    } catch (error) {
      console.error("Error loading tracks:", error);
      hasMore = false;
    } finally {
      loading = false;
      initialLoading = false;
    }
  }

  $effect(() => {
    if (!sentinelElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMoreTracks();
        }
      },
      { rootMargin: ROOT_MARGIN }
    );

    observer.observe(sentinelElement);
    return () => observer.disconnect();
  });

  onMount(() => {
    loadMoreTracks();
  });
</script>

<div class="max-w-4xl mx-auto w-full h-[calc(100dvh-3rem-2px)] border-x overflow-y-auto">
  {#if initialLoading}
    <div class="grid place-items-center flex-1 p-8 h-full">
      <LoaderIcon class="animate-spin text-muted-foreground" />
    </div>
  {:else}
    <div class="flex flex-col w-full">
      {#each tracks as track, i (track.id)}
        <TrackItem {track} />
      {:else}
        <div class="p-4 text-muted-foreground text-center">
          No audio files found.
        </div>
      {/each}

      {#if loading && !initialLoading}
        <div
          class="p-4 flex items-center justify-center gap-2 text-muted-foreground border-t"
        >
          <LoaderIcon class="animate-spin text-muted-foreground" />
        </div>
      {/if}

      {#if hasMore && tracks.length > 0}
        <div bind:this={sentinelElement} class="h-2"></div>
      {/if}

      {#if tracks.length > 0}
        <div class="h-48"></div>
      {/if}
    </div>
  {/if}
</div>
