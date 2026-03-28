<script lang="ts">
  import TrackItem from "$lib/components/tracks/TrackItem.svelte";
  import { PlusIcon, SquareDashedIcon } from "@lucide/svelte";
  import { innerWidth } from "svelte/reactivity/window";
  import { VirtualScroll } from "../ui/virtual-scroll";
  import { playerStore } from "$lib/stores/player.svelte";
  import type { Snippet } from "svelte";
  import type { PlaylistDetail, PlaylistItem } from "$lib/schemas";

  interface Props {
    playlist: PlaylistDetail;
    items: PlaylistItem[];
    hasAddButton?: boolean | null;
    useVirtualScroll?: boolean;
    header?: Snippet;
    headerHeight?: number;
    onAddTracks?: () => void;
    onScroll?: (scrollTop: number) => void;
  }

  let {
    playlist,
    items,
    hasAddButton = false,
    useVirtualScroll = true,
    header,
    headerHeight = 0,
    onAddTracks,
    onScroll,
  }: Props = $props();

  const showAddButton = $derived(hasAddButton ?? false);
  const hasVirtualHeader = $derived(!!header && headerHeight > 0);
  const showStandaloneAddButton = $derived(
    !hasVirtualHeader && !!(showAddButton && onAddTracks),
  );
  const showAddButtonRow = $derived(showStandaloneAddButton);

  const ROW_HEIGHT = 80;
  const ADD_BUTTON_HEIGHT = 88;
  const isMobile = $derived((innerWidth.current ?? 0) <= 768);
  const topOffset = $derived(isMobile ? 0 : 272 + 44 + 16);
  type VirtualRow = PlaylistItem | { __header: true } | { __addButton: true };
  const virtualRows = $derived<VirtualRow[]>([
    ...(hasVirtualHeader ? [{ __header: true } as const] : []),
    ...(showAddButtonRow ? [{ __addButton: true } as const] : []),
    ...items,
  ]);
  const firstItemHeight = $derived(
    hasVirtualHeader
      ? headerHeight
      : showAddButtonRow
        ? ADD_BUTTON_HEIGHT
        : undefined,
  );
  const itemOffset = $derived(
    (hasVirtualHeader ? 1 : 0) + (showAddButtonRow ? 1 : 0),
  );

  let virtualScrollRef: VirtualScroll<VirtualRow> | null = $state(null);

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
    {#if hasVirtualHeader && header}
      {@render header()}
    {/if}
    {#if showStandaloneAddButton}
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
{:else if useVirtualScroll}
  <VirtualScroll
    bind:this={virtualScrollRef}
    items={virtualRows}
    rowHeight={ROW_HEIGHT}
    {firstItemHeight}
    class="h-dvh px-2 overflow-x-hidden"
    {topOffset}
    {onScroll}
  >
    {#snippet children({ item, actualIndex })}
      {#if "__header" in item}
        {@render header?.()}
      {:else if "__addButton" in item}
        {@render addButton()}
      {:else}
        {@const trackIndex = actualIndex - itemOffset}
        <TrackItem
          index={trackIndex}
          {playlist}
          isCurrentTrack={item.audio.id === playerStore.currentTrack?.id}
          track={item.audio}
          fromQueue={false}
        />
      {/if}
    {/snippet}
  </VirtualScroll>
{:else}
  <div class="flex flex-col gap-2 px-2">
    {#if hasVirtualHeader && header}
      {@render header()}
    {/if}
    {#if showStandaloneAddButton}
      {@render addButton()}
    {/if}
    {#each items as item, index}
      <TrackItem
        {index}
        {playlist}
        isCurrentTrack={item.audio.id === playerStore.currentTrack?.id}
        track={item.audio}
        fromQueue={false}
      />
    {/each}
    <span class="h-[50dvh]"></span>
  </div>
{/if}
