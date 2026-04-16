<script lang="ts">
  import { page } from "$app/state";
  import PlaylistCoverImage from "$lib/components/playlists/PlaylistCoverImage.svelte";
  import * as Sidebar from "$lib/components/ui/sidebar";
  import type { Playlist } from "$lib/schemas";
  import { playlistMenuStore } from "$lib/stores/playlistMenu.svelte";
  import { playerStore } from "$lib/stores/player.svelte";
  import {  Volume2 as Volume2Icon } from "@lucide/svelte";

  interface Props {
    playlist: Playlist;
  }

  let { playlist }: Props = $props();

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
  <Sidebar.MenuButton
    class="relative group-data-[collapsible=icon]:rounded-md group-data-[collapsible=icon]:h-12 h-14 group-data-[collapsible=icon]:p-0 p-1 transition-all duration-200"
    {isActive}
    tooltipContent={playlist.name}
  >
    {#snippet child({ props })}
      <a
        href="/playlist?id={playlist.id}"
        oncontextmenu={handleContextMenu}
        {...props}
      >
        <PlaylistCoverImage
          {playlist}
          iconSize={16}
          strokeWidth={2}
          useAbsoluteStrokeWidth={false}
          containerClass="size-12 shrink-0 rounded-sm overflow-hidden bg-muted relative grid place-items-center"
          imageClass="size-full object-cover relative z-10"
          tidalIconClass={isActive ? "text-background" : "text-cyan-500"}
        />

        <div class="truncate flex flex-col items-start min-w-0">
          <span class="flex-1 truncate text-base font-medium"
            >{playlist.name}
          </span>
          <span class="flex-1 truncate text-xs opacity-75"
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
