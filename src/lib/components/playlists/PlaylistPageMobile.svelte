<script lang="ts">
  import type { PlaylistDetail, PlaylistItem } from "$lib/schemas";
  import PlaylistHeaderMobile from "./PlaylistHeaderMobile.svelte";
  import PlaylistTrackList from "./PlaylistTrackList.svelte";
  import { usePlaylistHeaderActions } from "./usePlaylistHeaderActions.svelte";
  import PlaylistSearch from "./PlaylistSearch.svelte";
  import { appearanceStore } from "$lib/stores/appearance.svelte";
  import { ArrowLeft as ArrowLeftIcon, Ellipsis as EllipsisIcon } from "@lucide/svelte";
  import { Button } from "../ui/button";
  import { isArtistPlaylist, isSpecialPlaylist } from "$lib/utils/playlist";

  interface Props {
    playlist: PlaylistDetail;
    isScrolled?: boolean;
    hasAddButton: boolean;
    items: PlaylistItem[];
    searchQuery?: string;
    onAddTracks: () => void;
    onOpenSort?: () => void;
    onListScroll?: (scrollTop: number) => void;
  }

  let {
    playlist,
    isScrolled = $bindable(false),
    hasAddButton,
    items,
    searchQuery = $bindable(""),
    onAddTracks,
    onOpenSort = () => {},
    onListScroll,
  }: Props = $props();

  const isArtist = $derived(isArtistPlaylist(playlist.id));
  const isSpecial = $derived(isSpecialPlaylist(playlist.id));
  const headerActions = usePlaylistHeaderActions(() => playlist);
  const DEFAULT_MOBILE_VIRTUAL_HEADER_HEIGHT = $derived(
    isArtist || isSpecial ? 620 : 650,
  );

  let headerContentRef = $state<HTMLDivElement | null>(null);
  let mobileVirtualHeaderHeight = $state<number>(650);

  function updateMobileHeaderHeight() {
    if (!headerContentRef) return;

    const measuredHeight = Math.max(
      1,
      Math.ceil(headerContentRef.getBoundingClientRect().height),
    );

    if (measuredHeight !== mobileVirtualHeaderHeight) {
      mobileVirtualHeaderHeight = measuredHeight;
    }
  }

  $effect(() => {
    mobileVirtualHeaderHeight = DEFAULT_MOBILE_VIRTUAL_HEADER_HEIGHT;
  });

  $effect(() => {
    const element = headerContentRef;
    if (!element || typeof ResizeObserver === "undefined") return;

    updateMobileHeaderHeight();
    const resizeObserver = new ResizeObserver(() => {
      updateMobileHeaderHeight();
    });

    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  });
</script>

<div class="flex flex-col relative w-full overflow-x-hidden">
  <div class="fixed top-0 left-0 right-0 z-10 flex flex-col p-2">
    <div
      class="absolute inset-0 transition-all duration-100 {isScrolled
        ? 'opacity-100 translate-y-0'
        : 'opacity-0 -translate-y-full'}"
      style="
      background: linear-gradient(
        to bottom,
        color-mix(in oklab, var(--background) 100%, transparent) 0%,
        color-mix(in oklab, var(--background) 100%, transparent) 20%,
        color-mix(in oklab, var(--background) 0%, transparent) 100%
      );
    "
    ></div>

    <div
      class="z-10 flex items-center justify-between rounded-4xl p-2 border border-muted-foreground/10
      {!isScrolled
        ? 'border-transparent'
        : appearanceStore.disableBlur
          ? 'bg-muted'
          : 'bg-muted-foreground/10 dark:bg-muted/60 backdrop-blur-md'}
    "
    >
      <Button
        variant="ghost"
        size="icon"
        class="rounded-xl size-11 border border-transparent 
        {isScrolled
          ? ''
          : appearanceStore.disableBlur
            ? 'bg-muted/10 border-muted-foreground/10'
            : 'bg-muted/10 border-muted-foreground/10 backdrop-blur-md'}"
        title="Back"
        onclick={() => history.back()}
      >
        <ArrowLeftIcon class="size-5" />
      </Button>

      {#if isScrolled}
        <button
          onclick={(e) => {
            const thisButton = e.currentTarget;
            const upTwoLevels = thisButton.parentElement?.parentElement;
            if (upTwoLevels) {
              upTwoLevels.scrollIntoView({ behavior: "smooth" });
            }
          }}
          class="text-lg font-semibold truncate max-w-[50%] text-center"
        >
          {playlist.name}
        </button>
      {/if}

      <Button
        variant="ghost"
        size="icon"
        class="rounded-xl size-11 border border-transparent 
        {isScrolled
          ? ''
          : appearanceStore.disableBlur
            ? 'bg-muted/10 border-muted-foreground/10'
            : 'bg-muted/10 border-muted-foreground/10 backdrop-blur-md'}"
        title="Menu"
        onclick={headerActions.handleMenu}
      >
        <EllipsisIcon class="size-5" />
      </Button>
    </div>
  </div>

  <PlaylistTrackList
    useVirtualScroll={true}
    {playlist}
    {hasAddButton}
    {items}
    {onAddTracks}
    headerHeight={mobileVirtualHeaderHeight}
    onScroll={(scrollTop) => {
      isScrolled = scrollTop >= 440;
      onListScroll?.(scrollTop);
    }}
  >
    {#snippet header()}
      <div class="flex flex-col" bind:this={headerContentRef}>
        <div class="flex-1 z-20">
          <PlaylistHeaderMobile
            {playlist}
            onPlay={headerActions.handlePlay}
            onShuffle={headerActions.handleShuffle}
            {onAddTracks}
            onMenu={headerActions.handleMenu}
          />
        </div>
        <div class="py-4">
          <PlaylistSearch bind:searchQuery {onOpenSort} />
        </div>
      </div>
    {/snippet}
  </PlaylistTrackList>
</div>
