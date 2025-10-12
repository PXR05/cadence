<script lang="ts">
  import { getPlaylistImageUrl } from "$lib/stores/player.svelte";
  import {
    getPlaylistDisplayName,
    handlePlaylistImageError,
    isArtistPlaylist,
    isAlbumPlaylist,
  } from "$lib/utils/playlist";
  import { MusicIcon, AlbumIcon, UserIcon } from "@lucide/svelte";

  interface Props {
    playlist: Playlist;
    size?: "small" | "large";
  }

  let { playlist, size = "small" }: Props = $props();

  const displayName = $derived(getPlaylistDisplayName(playlist));
  const isArtist = $derived(isArtistPlaylist(playlist.id));
  const isAlbum = $derived(isAlbumPlaylist(playlist.id));

  const cardClass = $derived(
    size === "large"
      ? "aspect-square border hover:bg-muted/50 transition-colors flex flex-col"
      : "aspect-square w-40 flex-shrink-0 border hover:bg-muted/50 transition-colors flex flex-col"
  );
</script>

<a href="/library/{playlist.id}" class={cardClass}>
  <div class="h-full overflow-hidden">
    <img
      loading="lazy"
      src={getPlaylistImageUrl(playlist.id)}
      alt={playlist.name}
      class="w-full h-full object-cover"
      onerror={handlePlaylistImageError}
    />
    <div class="w-full h-full hidden place-items-center">
      {#if isArtist}
        <UserIcon
          size={48}
          absoluteStrokeWidth
          strokeWidth={2}
          class="text-muted-foreground"
        />
      {:else if isAlbum}
        <AlbumIcon
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
  </div>
  <div class="py-1 px-2 bg-muted border-t">
    <p class="text-sm font-medium truncate leading-tight">
      {displayName}
    </p>
    <p class="text-xs text-muted-foreground leading-tight">
      {playlist.itemCount ?? 0} tracks
    </p>
  </div>
</a>
