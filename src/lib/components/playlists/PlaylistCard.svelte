<script lang="ts">
  import { page } from "$app/state";
  import PlaylistCoverImage from "$lib/components/playlists/PlaylistCoverImage.svelte";
  import { playlistMenuStore } from "$lib/stores/playlistMenu.svelte";
  import { playerStore } from "$lib/stores/player.svelte";
  import { getPlaylistDisplayName } from "$lib/utils/playlist";
  import { Volume2 as Volume2Icon } from "@lucide/svelte";
  import type { Playlist } from "$lib/schemas";
  import { appearanceStore } from "$lib/stores/appearance.svelte";

  interface Props {
    playlist: Playlist;
    size?: "small" | "large";
  }

  let { playlist, size = "small" }: Props = $props();

  const displayName = $derived(getPlaylistDisplayName(playlist));

  function handleContextMenu(e: MouseEvent) {
    e.preventDefault();
    playlistMenuStore.open(playlist, false, false);
  }

  function isPlaylistPlaying(playlistId: string): boolean {
    return (
      playerStore.isPlaying &&
      playerStore.currentTrack !== null &&
      playerStore.currentPlaylist?.id === playlistId
    );
  }

  function isPlaylistActive(playlistId: string): boolean {
    return (
      page.url.pathname === "/playlist" &&
      page.url.searchParams.get("id") === playlistId
    );
  }
</script>

<a
  href="/playlist?id={playlist.id}"
  oncontextmenu={handleContextMenu}
  class="relative rounded-xl overflow-clip aspect-square bg-muted/50 hover:bg-muted/20 transition-colors flex flex-col
  {size === 'large' ? 'w-full shrink-0' : 'w-40 shrink-0'}
  "
>
  <PlaylistCoverImage
    {playlist}
    iconSize={48}
    containerClass="h-full overflow-hidden relative grid place-items-center"
    iconWrapperClass="absolute inset-0 grid place-items-center pb-10"
    imageClass="w-full h-full object-cover relative z-10"
  />
  <div class="absolute bottom-0 w-full z-10 p-1.5">
    <div
      class="flex items-center justify-between p-2 border border-muted-foreground/10 rounded-md
      {appearanceStore.disableBlur
        ? 'bg-muted'
        : 'bg-muted/80 dark:bg-muted/60 backdrop-blur-md'}"
    >
      <div class="flex flex-col truncate gap-0.5">
        <p class="text-sm font-medium truncate leading-tight flex-1">
          {displayName}
        </p>
        <p class="text-xs leading-tight">
          {playlist.itemCount ?? 0} tracks
        </p>
      </div>
      {#if isPlaylistPlaying(playlist.id)}
        <Volume2Icon
          strokeWidth={1.5}
          absoluteStrokeWidth
          class="size-5 shrink-0 ml-1 mr-0.5 {isPlaylistActive(playlist.id)
            ? 'text-background'
            : 'text-foreground'}"
        />
      {/if}
    </div>
  </div>
</a>
