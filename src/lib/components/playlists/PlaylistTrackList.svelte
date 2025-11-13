<script lang="ts">
  import TrackItem from "$lib/components/tracks/TrackItem.svelte";
  import { PlusIcon } from "@lucide/svelte";
  import { innerWidth } from "svelte/reactivity/window";
  import { VirtualScroll } from "../ui/virtual-scroll";
  import { playerStore } from "$lib/stores/player.svelte";
  import type { PlaylistDetail, PlaylistItem } from "$lib/schemas";

  interface Props {
    playlist: PlaylistDetail;
    items: PlaylistItem[];
    hasAddButton?: boolean | null;
    onAddTracks?: () => void;
    onTrackRemovedFromPlaylist?: (
      trackId: string,
      removedFromPlaylists: string[],
    ) => void;
    onScroll?: (scrollTop: number) => void;
  }

  let {
    playlist,
    items,
    hasAddButton = false,
    onAddTracks,
    onTrackRemovedFromPlaylist,
    onScroll,
  }: Props = $props();

  const showAddButton = $derived(hasAddButton ?? false);

  const ROW_HEIGHT = 81;
  const isMobile = $derived((innerWidth.current ?? 0) <= 768);
  const topOffset = $derived(isMobile ? 227 + 6 : 255 + 6);

  let virtualScrollRef: VirtualScroll<PlaylistItem> | null = $state(null);

  const currentId = $derived(playerStore.currentTrack?.id);

  $effect(() => {
    items;
    virtualScrollRef?.scrollToTop();
  });
</script>

{#if items.length === 0}
  <div class="h-24"></div>
{:else}
  <VirtualScroll
    bind:this={virtualScrollRef}
    {items}
    rowHeight={ROW_HEIGHT}
    class="h-dvh"
    {topOffset}
    {onScroll}
  >
    {#snippet children({ item, visibleIndex, actualIndex })}
      {#if showAddButton && onAddTracks && visibleIndex === 0}
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
      <TrackItem
        index={actualIndex}
        {playlist}
        isCurrentTrack={item.id === currentId}
        track={item.audio}
        fromQueue={false}
        onRemovedFromPlaylist={onTrackRemovedFromPlaylist}
      />
      {#if actualIndex === items.length - 1}
        <div class="h-[50dvh]"></div>
      {/if}
    {/snippet}
  </VirtualScroll>
{/if}
