<script lang="ts">
  import { getPlaylistImageUrl } from "$lib/constants";
  import {
    isAlbumPlaylist,
    isArtistPlaylist,
    isTidalCollectionPlaylist,
    isYoutubePlaylist,
    SPECIAL_PLAYLIST_IDS,
  } from "$lib/utils/playlist";
  import {
    CloudCheckIcon,
    Disc3Icon,
    LibraryIcon,
    MusicIcon,
    UserIcon,
    YoutubeIcon,
  } from "@lucide/svelte";

  interface PlaylistCoverData {
    id: string;
    name: string;
    coverImage?: string | null;
  }

  interface Props {
    playlist: PlaylistCoverData;
    iconSize?: number;
    youtubeIconSize?: number;
    strokeWidth?: number;
    useAbsoluteStrokeWidth?: boolean;
    containerClass?: string;
    iconWrapperClass?: string;
    imageClass?: string;
    fallbackIconClass?: string;
    tidalIconClass?: string;
  }

  let {
    playlist,
    iconSize = 48,
    youtubeIconSize,
    strokeWidth = 2,
    useAbsoluteStrokeWidth = true,
    containerClass = "relative grid place-items-center",
    iconWrapperClass = "absolute inset-0 grid place-items-center",
    imageClass = "w-full h-full object-cover relative z-10",
    fallbackIconClass = "text-muted-foreground",
    tidalIconClass = "text-cyan-500",
  }: Props = $props();

  const isYoutube = $derived(isYoutubePlaylist(playlist.id));
  const isTidal = $derived(isTidalCollectionPlaylist(playlist.id));
  const isArtist = $derived(isArtistPlaylist(playlist.id));
  const isAlbum = $derived(isAlbumPlaylist(playlist.id));
</script>

<div class={containerClass}>
  <div class={iconWrapperClass}>
    {#if playlist.id === SPECIAL_PLAYLIST_IDS.ALL_SONGS}
      <LibraryIcon
        size={iconSize}
        {strokeWidth}
        absoluteStrokeWidth={useAbsoluteStrokeWidth}
        class={fallbackIconClass}
      />
    {:else if playlist.id === SPECIAL_PLAYLIST_IDS.DOWNLOADED}
      <CloudCheckIcon
        size={iconSize}
        {strokeWidth}
        absoluteStrokeWidth={useAbsoluteStrokeWidth}
        class={fallbackIconClass}
      />
    {:else if isArtist}
      <UserIcon
        size={iconSize}
        {strokeWidth}
        absoluteStrokeWidth={useAbsoluteStrokeWidth}
        class={fallbackIconClass}
      />
    {:else if isAlbum}
      <Disc3Icon
        size={iconSize}
        {strokeWidth}
        absoluteStrokeWidth={useAbsoluteStrokeWidth}
        class={fallbackIconClass}
      />
    {:else if isYoutube}
      <YoutubeIcon
        size={youtubeIconSize ?? iconSize}
        {strokeWidth}
        absoluteStrokeWidth={useAbsoluteStrokeWidth}
        class={fallbackIconClass}
      />
    {:else if isTidal}
      <MusicIcon
        size={iconSize}
        {strokeWidth}
        absoluteStrokeWidth={useAbsoluteStrokeWidth}
        class={tidalIconClass}
      />
    {:else}
      <MusicIcon
        size={iconSize}
        {strokeWidth}
        absoluteStrokeWidth={useAbsoluteStrokeWidth}
        class={fallbackIconClass}
      />
    {/if}
  </div>

  {#if playlist.coverImage}
    <img
      loading="lazy"
      crossorigin="use-credentials"
      src={getPlaylistImageUrl(playlist.id)}
      alt={playlist.name}
      class={imageClass}
    />
  {/if}
</div>
