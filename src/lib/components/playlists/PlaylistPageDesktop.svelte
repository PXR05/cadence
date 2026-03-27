<script lang="ts">
  import { fade } from "svelte/transition";
  import { appearanceStore } from "$lib/stores/appearance.svelte.js";
  import type { PlaylistDetail, PlaylistItem } from "$lib/schemas";
  import { useSidebar } from "$lib/components/ui/sidebar/index.js";
  import PlaylistHeaderDesktop from "./PlaylistHeaderDesktop.svelte";
  import PlaylistTrackList from "./PlaylistTrackList.svelte";
  import PlaylistSearch from "./PlaylistSearch.svelte";
  import { usePlaylistHeaderActions } from "./usePlaylistHeaderActions.svelte";

  interface Props {
    playlist: PlaylistDetail;
    isScrolled?: boolean;
    hasAddButton: boolean;
    items: PlaylistItem[];
    searchQuery?: string;
    onAddTracks: () => void;
  }

  let {
    playlist,
    isScrolled = $bindable(false),
    hasAddButton,
    items,
    searchQuery = $bindable(""),
    onAddTracks,
  }: Props = $props();

  const header = usePlaylistHeaderActions(() => playlist);
  const isSidebarCollapsed = $derived(useSidebar().state === "collapsed");
</script>

<div
  style="--h: {isScrolled ? 10 : 16}rem;"
  class="z-10 flex flex-col absolute top-0 w-full gap-2"
>
  <div class="_bg _color absolute inset-0 -z-10"></div>

  <PlaylistHeaderDesktop
    {playlist}
    {isScrolled}
    isOffline={header.offline.isOffline}
    onPlay={header.handlePlay}
    onMenu={header.handleMenu}
  />

  <div
    class="p-2 absolute w-dvw ease-vaul
      {isScrolled ? 'translate-y-15' : 'translate-y-68'}
      {appearanceStore.disableAnimations ? 'duration-0' : 'duration-200'}
      {isSidebarCollapsed ? 'w-[calc(100dvw-64px)]' : 'w-[calc(100dvw-256px)]'}"
  >
    <PlaylistSearch bind:searchQuery />
  </div>
</div>

<PlaylistTrackList
  useVirtualScroll={true}
  {playlist}
  {hasAddButton}
  {items}
  {onAddTracks}
  onScroll={(scrollTop) => {
    if (isScrolled && scrollTop < 154) {
      isScrolled = false;
    } else if (!isScrolled && scrollTop > 273 + 64) {
      isScrolled = true;
    }
  }}
/>

<style>
  ._bg {
    &::before,
    &::after {
      pointer-events: none;
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      z-index: -1;
      mask: linear-gradient(to top, transparent, black);
    }
    &::before {
      height: var(--h);
    }
    &::after {
      height: calc(var(--h) - 1rem);
    }
  }

  ._color {
    &::before,
    &::after {
      background-color: var(--background);
    }
  }
</style>
