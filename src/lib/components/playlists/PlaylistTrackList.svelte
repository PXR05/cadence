<script lang="ts">
  import TrackItem from "$lib/components/tracks/TrackItem.svelte";
  import { Plus as PlusIcon, SquareDashed as SquareDashedIcon } from "@lucide/svelte";
  import { innerWidth } from "svelte/reactivity/window";
  import { VirtualScroll } from "../ui/virtual-scroll";
  import { playerStore } from "$lib/stores/player.svelte";
  import type { Snippet } from "svelte";
  import type { PlaylistDetail, PlaylistItem } from "$lib/schemas";

  interface Props {
    playlist: PlaylistDetail;
    items: PlaylistItem[];
    height?: string;
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
    height = "100dvh",
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

  const ROW_HEIGHT = 72;
  const ADD_BUTTON_HEIGHT = 72;
  const isMobile = $derived((innerWidth.current ?? 0) <= 768);
  const topOffset = $derived(isMobile ? 0 : 272 + 44 + 24);
  type VirtualRow = PlaylistItem | { __header: true } | { __addButton: true };
  const HEADER_ROW: VirtualRow = { __header: true };
  const ADD_BUTTON_ROW: VirtualRow = { __addButton: true };

  function getVirtualRowKey(row: VirtualRow): string | number {
    if ("__header" in row) return "__header";
    if ("__addButton" in row) return "__addButton";
    return row.audio.id;
  }

  const virtualRows = $derived<VirtualRow[]>([
    ...(hasVirtualHeader ? [HEADER_ROW] : []),
    ...(showAddButtonRow ? [ADD_BUTTON_ROW] : []),
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
      class="size-14 border shrink-0 bg-muted grid place-items-center rounded-md"
    >
      <PlusIcon size={24} class="text-muted-foreground" />
    </div>
    <div class="flex-1 text-left">
      <p class="font-medium">Add Tracks</p>
      <p class="text-sm text-muted-foreground">Add tracks to this playlist</p>
    </div>
  </button>
{/snippet}

{#snippet emptyTracks()}
  <div
    class="px-2 flex flex-col items-center text-muted-foreground justify-center"
    style="height: calc(100dvh - {topOffset + 80}px);"
  >
    <SquareDashedIcon size={48} strokeWidth={1.5} class="mb-4 rotate-45" />
    <p>No tracks in this playlist</p>
  </div>
{/snippet}

{#if useVirtualScroll}
  <VirtualScroll
    bind:this={virtualScrollRef}
    items={virtualRows}
    rowHeight={ROW_HEIGHT}
    {firstItemHeight}
    getItemKey={getVirtualRowKey}
    class="px-2 overflow-x-hidden"
    style="height: {height};"
    {topOffset}
    {onScroll}
  >
    {#snippet emptyState()}
      <div class="px-2" style="margin-top: {topOffset}px; height: {height};">
        {@render emptyTracks()}
      </div>
    {/snippet}

    {#snippet children({ item, actualIndex })}
      {#if "__header" in item}
        {@render header?.()}
        {#if items.length === 0}
          {@render emptyTracks()}
        {/if}
      {:else if "__addButton" in item}
        {@render addButton()}
        {#if items.length === 0}
          {@render emptyTracks()}
        {/if}
      {:else}
        {@const trackIndex = actualIndex - itemOffset}
        <TrackItem
          index={trackIndex}
          {playlist}
          isCurrentTrack={item.audio.id === playerStore.currentTrack?.id}
          track={item.audio}
        />
      {/if}
    {/snippet}
  </VirtualScroll>
{:else if items.length === 0}
  <div class="px-2" style="margin-top: {topOffset}px; height: {height};">
    {#if hasVirtualHeader && header}
      {@render header()}
    {/if}
    {#if showStandaloneAddButton}
      {@render addButton()}
    {/if}
    {@render emptyTracks()}
  </div>
{:else}
  <div class="flex flex-col gap-2 px-2" style="height: {height};">
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
      />
    {/each}
    <span class="h-[50dvh]"></span>
  </div>
{/if}
