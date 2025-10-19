<script lang="ts">
  import TrackItem from "$lib/components/tracks/TrackItem.svelte";
  import { PlusIcon } from "@lucide/svelte";
  import { innerWidth } from "svelte/reactivity/window";
  import { ScrollArea } from "../ui/scroll-area";

  interface Props {
    items: PlaylistItem[];
    hasAddButton?: boolean | null;
    onAddTracks?: () => void;
    onTrackRemovedFromPlaylist?: (
      trackId: string,
      removedFromPlaylists: string[]
    ) => void;
    onScroll?: (scrollTop: number) => void;
  }

  let {
    items,
    hasAddButton = false,
    onAddTracks,
    onTrackRemovedFromPlaylist,
    onScroll,
  }: Props = $props();

  const showAddButton = $derived(hasAddButton ?? false);

  const ROW_HEIGHT = 81;
  const ADD_BUTTON_HEIGHT = 81;
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
    onScroll?.(ref.scrollTop);
  }

  $effect(() => {
    items;
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

  const isMobile = $derived((innerWidth.current ?? 0) <= 768);
</script>

<ScrollArea orientation="vertical" class="h-dvh" bind:ref={containerRef}>
  {#if items.length === 0}
    <div class="h-24"></div>
  {:else}
    <div
      style="height: {items.length *
        ROW_HEIGHT}px; position: relative; width: 100%;"
    >
      <div
        style="
      position: absolute; 
      top: {range.start * ROW_HEIGHT + (isMobile ? 227 + 6 : 255 + 6)}px; 
      left: 0; 
      right: 0;"
      >
        {#if showAddButton && onAddTracks}
          <button
            onclick={onAddTracks}
            class="w-full flex items-center gap-4 p-2 border-b hover:bg-muted/50 transition-colors"
          >
            <div
              class="size-16 border flex-shrink-0 bg-muted grid place-items-center rounded-md"
            >
              <PlusIcon size={24} class="text-muted-foreground" />
            </div>
            <div class="flex-1 text-left">
              <p class="font-medium">Add Tracks</p>
              <p class="text-sm text-muted-foreground">
                Add tracks to this playlist
              </p>
            </div>
          </button>
        {/if}
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
    <div class="h-[50dvh]"></div>
  {/if}
</ScrollArea>
