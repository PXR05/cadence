<script lang="ts">
  import { fade, slide } from "svelte/transition";
  import { appearanceStore } from "$lib/stores/appearance.svelte.js";
  import type { PlaylistDetail, PlaylistItem } from "$lib/schemas";
  import PlaylistHeaderMobile from "./PlaylistHeaderMobile.svelte";
  import PlaylistTrackList from "./PlaylistTrackList.svelte";
  import { usePlaylistHeaderActions } from "./usePlaylistHeaderActions.svelte";
  import PlaylistSearch from "./PlaylistSearch.svelte";

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
</script>

<div
  transition:fade={{
    duration: appearanceStore.disableAnimations ? 0 : 150,
  }}
  class="flex flex-col relative w-full overflow-x-hidden overflow-y-scroll"
  onscroll={(e) => {
    const scrollTop = e.currentTarget.scrollTop;
    if (scrollTop < 380) {
      isScrolled = false;
    } else {
      isScrolled = true;
    }
  }}
>
  {#if isScrolled}
    <div
      style="--h: 5rem;"
      class="_bg _color fixed top-0 left-0 right-0 z-10"
    ></div>
  {/if}

  <div class="flex-1 z-10">
    <PlaylistHeaderMobile
      {playlist}
      {isScrolled}
      onPlay={header.handlePlay}
      onMenu={header.handleMenu}
      onShuffle={header.handleShuffle}
      onAddTracks={hasAddButton ? onAddTracks : undefined}
    />
  </div>

  <div class="p-4">
    <PlaylistSearch bind:searchQuery />
  </div>

  <PlaylistTrackList
    useVirtualScroll={false}
    {playlist}
    {items}
    {onAddTracks}
  />
</div>

<style>
  ._bg {
    height: var(--h);

    &::before,
    &::after {
      pointer-events: none;
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      z-index: -1;
      mask: linear-gradient(to top, transparent, black 90%, black);
    }
    &::before {
      height: var(--h);
    }
    &::after {
      height: calc(var(--h) - 0rem);
    }
  }

  ._color {
    &::before,
    &::after {
      background-color: var(--background);
    }
  }
</style>
