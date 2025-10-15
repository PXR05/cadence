<script lang="ts">
  import { onMount } from "svelte";
  import TrackItem from "$lib/components/tracks/TrackItem.svelte";
  import { SearchIcon, PlusIcon } from "@lucide/svelte";

  interface Props {
    items: PlaylistItem[];
    searchQuery?: string;
    hasAddButton?: boolean | null;
    onAddTracks?: () => void;
    onTrackRemovedFromPlaylist?: (
      trackId: string,
      removedFromPlaylists: string[]
    ) => void;
  }

  let {
    items,
    searchQuery = $bindable(""),
    hasAddButton = false,
    onAddTracks,
    onTrackRemovedFromPlaylist,
  }: Props = $props();

  const showAddButton = $derived(hasAddButton ?? false);

  const ROW_HEIGHT = 88;
  const ADD_BUTTON_HEIGHT = 88;
  const OVERSCAN = 10;

  let pagination = $state({
    offset: 0,
    pageSize: 20,
  });

  const range = $derived({
    start: Math.max(0, pagination.offset - OVERSCAN),
    end: Math.min(
      items.length,
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
    let scrollTop = ref.scrollTop;
    if (showAddButton) {
      scrollTop = Math.max(0, scrollTop - ADD_BUTTON_HEIGHT);
    }
    pagination.offset = Math.floor(scrollTop / ROW_HEIGHT);
  }

  $effect(() => {
    searchQuery;
    pagination.offset = 0;
    if (containerRef) {
      containerRef.scrollTop = 0;
    }
  });

  $effect(() => {
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

<div class="flex items-center border-b">
  <SearchIcon size={16} class="ml-3 text-muted-foreground flex-shrink-0" />
  <input
    type="text"
    bind:value={searchQuery}
    placeholder="Search in playlist..."
    class="flex-1 bg-transparent p-3 outline-none font-mono placeholder:text-muted-foreground"
  />
</div>

<div class="flex-1 overflow-y-auto" bind:this={containerRef}>
  {#if showAddButton && onAddTracks}
    <button
      onclick={onAddTracks}
      class="w-full flex items-center gap-4 p-3 border-b hover:bg-muted/50 transition-colors"
    >
      <div
        class="size-16 border flex-shrink-0 bg-muted grid place-items-center"
      >
        <PlusIcon size={24} class="text-muted-foreground" />
      </div>
      <div class="flex-1 text-left">
        <p class="font-medium">Add Tracks</p>
        <p class="text-sm text-muted-foreground">Add tracks to this playlist</p>
      </div>
    </button>
  {/if}

  {#if items.length === 0}
    <div
      class={searchQuery.trim()
        ? "flex flex-col items-center justify-center p-8 h-full"
        : "h-24"}
    >
      {#if searchQuery.trim()}
        <p class="text-muted-foreground mb-2">No tracks found</p>
        <p class="text-sm text-muted-foreground">
          Try a different search query
        </p>
      {/if}
    </div>
  {:else}
    <div
      style="height: {items.length *
        ROW_HEIGHT}px; position: relative; width: 100%;"
    >
      <div
        style="position: absolute; top: {range.start *
          ROW_HEIGHT}px; left: 0; right: 0;"
      >
        {#each items.slice(range.start, range.end) as item (item.id)}
          <TrackItem
            playlist={items}
            track={item.audio}
            fromQueue={false}
            onRemovedFromPlaylist={onTrackRemovedFromPlaylist}
          />
        {/each}
      </div>
    </div>
    <div class="h-24"></div>
  {/if}
</div>
