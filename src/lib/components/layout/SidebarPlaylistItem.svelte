<script lang="ts">
  import { page } from "$app/state";
  import * as Sidebar from "$lib/components/ui/sidebar";
  import { getPlaylistImageUrl } from "$lib/constants";
  import type { Playlist } from "$lib/schemas";
  import { playlistMenuStore } from "$lib/stores/playlistMenu.svelte";
  import { playerStore } from "$lib/stores/player.svelte";
  import {
    SPECIAL_PLAYLIST_IDS,
    isAlbumPlaylist,
    isArtistPlaylist,
    isTidalCollectionPlaylist,
    isYoutubePlaylist,
  } from "$lib/utils/playlist";
  import {
    CloudCheckIcon,
    Disc3Icon,
    LibraryIcon,
    MusicIcon,
    UserIcon,
    Volume2Icon,
    YoutubeIcon,
  } from "@lucide/svelte";
  import { appearanceStore } from "$lib/stores/appearance.svelte";

  interface Props {
    playlist: Playlist;
  }

  let { playlist }: Props = $props();

  const isYoutube = $derived(isYoutubePlaylist(playlist.id));
  const isTidal = $derived(isTidalCollectionPlaylist(playlist.id));
  const isArtist = $derived(isArtistPlaylist(playlist.id));
  const isAlbum = $derived(isAlbumPlaylist(playlist.id));
  const isActive = $derived(
    page.url.pathname === "/playlist" &&
      page.url.searchParams.get("id") === playlist.id,
  );
  const isPlaying = $derived(
    playerStore.isPlaying &&
      playerStore.currentTrack !== null &&
      playerStore.currentPlaylist?.id === playlist.id,
  );

  function handleContextMenu(e: MouseEvent) {
    e.preventDefault();
    playlistMenuStore.open(playlist, false, false);
  }
</script>

<Sidebar.MenuItem>
  <Sidebar.MenuButton class="relative h-14 p-1" {isActive}>
    {#snippet child({ props })}
      <a
        href="/playlist?id={playlist.id}"
        oncontextmenu={handleContextMenu}
        {...props}
      >
        <div
          class="size-12 shrink-0 rounded-sm overflow-hidden bg-muted relative grid place-items-center"
        >
          <div class="absolute inset-0 grid place-items-center">
            {#if playlist.id === SPECIAL_PLAYLIST_IDS.ALL_SONGS}
              <LibraryIcon
                size={16}
                strokeWidth={2}
                class="text-muted-foreground"
              />
            {:else if playlist.id === SPECIAL_PLAYLIST_IDS.DOWNLOADED}
              <CloudCheckIcon
                size={16}
                strokeWidth={2}
                class="text-muted-foreground"
              />
            {:else if isArtist}
              <UserIcon
                size={16}
                strokeWidth={2}
                class="text-muted-foreground"
              />
            {:else if isAlbum}
              <Disc3Icon
                size={16}
                strokeWidth={2}
                class="text-muted-foreground"
              />
            {:else if isYoutube}
              <YoutubeIcon
                size={16}
                strokeWidth={2}
                class="text-muted-foreground"
              />
            {:else if isTidal}
              <MusicIcon
                size={16}
                strokeWidth={2}
                class={isActive ? "text-background" : "text-cyan-500"}
              />
            {:else}
              <MusicIcon
                size={16}
                strokeWidth={2}
                class="text-muted-foreground"
              />
            {/if}
          </div>

          {#if playlist.coverImage}
            <img
              loading="lazy"
              crossorigin="use-credentials"
              src={getPlaylistImageUrl(playlist.id)}
              alt={playlist.name}
              class="size-full object-cover relative z-10"
            />
          {/if}
        </div>

        <div class="flex flex-col items-start min-w-0 truncate">
          <span class="flex-1 truncate">{playlist.name}</span>
          <span class="flex-1 truncate text-xs font-normal opacity-50"
            >{playlist.itemCount} songs</span
          >
        </div>

        {#if isPlaying}
          <div
            class="size-12 bg-background/80 z-10 absolute left-1 top-1 grid place-items-center rounded-sm"
          >
            <Volume2Icon
              class="size-4 shrink-0 group-data-[collapsible=icon]:hidden text-primary"
            />
          </div>
        {/if}
      </a>
    {/snippet}
  </Sidebar.MenuButton>
</Sidebar.MenuItem>
