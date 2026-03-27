<script lang="ts">
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
  class="flex flex-col relative w-full overflow-x-hidden overflow-y-scroll"
  onscroll={(e) => {
    const scrollTop = e.currentTarget.scrollTop;
    if (scrollTop < 440) {
      isScrolled = false;
    } else {
      isScrolled = true;
    }
  }}
>
  <div class="flex-1 z-20">
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