<script lang="ts">
  import { getPlaylistImageUrl } from "$lib/stores/player.svelte";
  import {
    getPlaylistDisplayName,
    isArtistPlaylist,
    isAlbumPlaylist,
    isYoutubePlaylist,
  } from "$lib/utils/playlist";
  import {
    MusicIcon,
    Disc3Icon,
    UserIcon,
    LibraryIcon,
    CloudCheckIcon,
    YoutubeIcon,
  } from "@lucide/svelte";
  import { SPECIAL_PLAYLIST_IDS } from "$lib/utils/playlist";
  import type { Playlist } from "$lib/schemas";

  interface Props {
    playlist: Playlist;
    size?: "small" | "large";
  }

  let { playlist, size = "small" }: Props = $props();

  const displayName = $derived(getPlaylistDisplayName(playlist));
  const isYoutube = $derived(isYoutubePlaylist(playlist.id));
  const isArtist = $derived(isArtistPlaylist(playlist.id));
  const isAlbum = $derived(isAlbumPlaylist(playlist.id));
</script>

<a
  href="/library/{playlist.id}"
  class="relative rounded-lg overflow-clip aspect-square border hover:bg-muted/20 transition-colors flex flex-col
  {size === 'large' ? 'w-full flex-shrink-0' : 'w-40 flex-shrink-0'}
  "
>
  <div class="h-full overflow-hidden relative grid place-items-center">
    <div class="absolute inset-0 grid place-items-center pb-10">
      {#if playlist.id === SPECIAL_PLAYLIST_IDS.ALL_SONGS}
        <LibraryIcon
          size={48}
          absoluteStrokeWidth
          strokeWidth={2}
          class="text-muted-foreground"
        />
      {:else if playlist.id === SPECIAL_PLAYLIST_IDS.DOWNLOADED}
        <CloudCheckIcon
          size={48}
          absoluteStrokeWidth
          strokeWidth={2}
          class="text-muted-foreground"
        />
      {:else if isArtist}
        <UserIcon
          size={48}
          absoluteStrokeWidth
          strokeWidth={2}
          class="text-muted-foreground"
        />
      {:else if isAlbum}
        <Disc3Icon
          size={48}
          absoluteStrokeWidth
          strokeWidth={2}
          class="text-muted-foreground"
        />
      {:else if isYoutube}
        <YoutubeIcon
          size={48}
          absoluteStrokeWidth
          strokeWidth={2}
          class="text-muted-foreground"
        />
      {:else}
        <MusicIcon
          size={48}
          absoluteStrokeWidth
          strokeWidth={2}
          class="text-muted-foreground"
        />
      {/if}
    </div>
    {#if playlist.coverImage}
      <img
        loading="lazy"
        src={getPlaylistImageUrl(playlist.id)}
        alt={playlist.name}
        class="w-full h-full object-cover relative z-10"
      />
    {/if}
  </div>
  <div class="absolute bottom-0 w-full z-10 p-1">
    <div
      class="py-1 px-2 bg-muted/80 dark:bg-muted/50 backdrop-blur-md border border-input/15 rounded-md"
    >
      <p class="text-sm font-medium truncate leading-tight">
        {displayName}
      </p>
      <p class="text-xs text-muted-foreground leading-tight">
        {playlist.itemCount ?? 0} tracks
      </p>
    </div>
  </div>
</a>
