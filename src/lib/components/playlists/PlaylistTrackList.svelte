<script lang="ts">
  import TrackItem from "$lib/components/tracks/TrackItem.svelte";
  import { PlusIcon, SquareDashedIcon } from "@lucide/svelte";
  import { innerWidth } from "svelte/reactivity/window";
  import { VirtualScroll } from "../ui/virtual-scroll";
  import { playerStore } from "$lib/stores/player.svelte";
  import type { PlaylistDetail, PlaylistItem } from "$lib/schemas";

  interface Props {
    playlist: PlaylistDetail;
    items: PlaylistItem[];
    hasAddButton?: boolean | null;
    onAddTracks?: () => void;
    onScroll?: (scrollTop: number) => void;
  }

  let {
    playlist,
    items,
    hasAddButton = false,
    onAddTracks,
    onScroll,
  }: Props = $props();

  const showAddButton = $derived(hasAddButton ?? false);

  const ROW_HEIGHT = 80;
  const isMobile = $derived((innerWidth.current ?? 0) <= 768);
  const topOffset = $derived(isMobile ? 227 + 6 : 272 + 44 + 16);

  let virtualScrollRef: VirtualScroll<PlaylistItem> | null = $state(null);

  $effect(() => {
    items;
    virtualScrollRef?.scrollToTop();
  });
</script>

{#snippet addButton()}
  <button
    onclick={onAddTracks}
    class="w-full flex items-center gap-4 p-2 rounded-xl hover:bg-muted/50 transition-colors"
  >
    <div
      class="size-16 border shrink-0 bg-muted grid place-items-center rounded-md"
    >
      <PlusIcon size={24} class="text-muted-foreground" />
    </div>
    <div class="flex-1 text-left">
      <p class="font-medium">Add Tracks</p>
      <p class="text-sm text-muted-foreground">Add tracks to this playlist</p>
    </div>
  </button>
{/snippet}

{#if items.length === 0}
  <div class="h-dvh px-2" style="margin-top: {topOffset}px;">
    {#if showAddButton && onAddTracks}
      {@render addButton()}
    {/if}
    <div
      class="px-2 flex flex-col items-center text-muted-foreground justify-center"
      style="height: calc(100dvh - {topOffset + 80}px);"
    >
      <SquareDashedIcon size={48} strokeWidth={1.5} class="mb-4 rotate-45" />
      <p>No tracks in this playlist</p>
    </div>
  </div>
{:else}
  <VirtualScroll
    bind:this={virtualScrollRef}
    {items}
    rowHeight={ROW_HEIGHT}
    class="h-dvh px-2"
    {topOffset}
    {onScroll}
  >
    {#snippet children({ item, visibleIndex, actualIndex })}
      {#if showAddButton && onAddTracks && visibleIndex === 0}
        {@render addButton()}
      {/if}
      <TrackItem
        index={actualIndex}
        {playlist}
        isCurrentTrack={item.audio.id === playerStore.currentTrack?.id}
        track={item.audio}
        fromQueue={false}
      />
    {/snippet}
  </VirtualScroll>
{/if}
