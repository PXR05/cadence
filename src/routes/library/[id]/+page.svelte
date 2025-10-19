<script lang="ts">
  import { goto, invalidateAll } from "$app/navigation";
  import { SvelteSet } from "svelte/reactivity";
  import { playerStore } from "$lib/stores/player.svelte";
  import { navigationStore } from "$lib/stores/navigation.svelte";
  import { useDialogState, usePlaylistOffline } from "$lib/hooks";
  import {
    getPlaylistDisplayName,
    isArtistPlaylist,
    isAlbumPlaylist,
    isSpecialPlaylist,
  } from "$lib/utils/playlist";
  import {
    AddTracksDialog,
    EditPlaylistDialog,
    PlaylistHeader,
    VirtualizedPlaylistTracks,
  } from "$lib/components";
  import PlaylistSearch from "$lib/components/playlists/PlaylistSearch.svelte";
  import { innerWidth } from "svelte/reactivity/window";

  let { data } = $props();

  const playlistId = $derived(data.playlistId);
  const loadedPlaylist = $derived(data.playlist);

  let searchQuery = $state("");
  let isScrolled = $state(false);

  const addTracksDialog = useDialogState("add-tracks");
  const editDialog = useDialogState("edit-playlist");
  const offline = usePlaylistOffline(() => playlistId);

  const existingTrackIds = $derived.by(async () => {
    const pl = await loadedPlaylist;
    return new SvelteSet(pl?.items.map((item) => item.audio.id) ?? []);
  });

  const isNonModifiable = $derived.by(async () => {
    const playlist = await loadedPlaylist;
    return (
      playlist &&
      (isSpecialPlaylist(playlist.id) ||
        isArtistPlaylist(playlist.id) ||
        isAlbumPlaylist(playlist.id))
    );
  });

  const hasAddButton = $derived.by(async () => {
    const playlist = await loadedPlaylist;
    const nonModifiable = await isNonModifiable;
    return !searchQuery.trim() && playlist && !nonModifiable;
  });

  const filteredTracks = $derived.by(async () => {
    const playlist = await loadedPlaylist;
    const items = playlist?.items ?? [];
    return searchQuery.trim() ? filterTracks(items, searchQuery) : items;
  });

  $effect(() => {
    Promise.resolve(loadedPlaylist).then((playlist) => {
      if (playlist) {
        updateNavigation(playlist.name);
        offline.checkOfflineStatus();
      }
    });
  });

  function filterTracks(items: PlaylistItem[], query: string) {
    const lowerQuery = query.toLowerCase();
    return items.filter((item) => {
      const title = item.audio.metadata?.title || item.audio.filename;
      const artist = item.audio.metadata?.artist || "";
      return (
        title.toLowerCase().includes(lowerQuery) ||
        artist.toLowerCase().includes(lowerQuery)
      );
    });
  }

  function updateNavigation(playlistName: string) {
    navigationStore.setNavigation(
      [{ label: "Library", path: "/library" }],
      getPlaylistDisplayName({ name: playlistName } as Playlist)
    );
  }

  async function handlePlay() {
    const playlist = await loadedPlaylist;
    if (!playlist || playlist.items.length === 0) return;
    const tracks = playlist.items.map((item) => item.audio);
    playerStore.setQueue(tracks, 0);
  }

  function handlePlaylistUpdated(updated: {
    name: string;
    coverImage?: string;
  }) {
    updateNavigation(updated.name);
    invalidateAll();
  }

  async function handleTrackRemovedFromPlaylist() {
    await invalidateAll();
  }

  function handlePlaylistDeleted() {
    goto("/library", { replaceState: true });
  }

  const isMobile = $derived((innerWidth.current ?? 0) <= 768);
</script>

<svelte:head>
  {#await loadedPlaylist then playlist}
    <title>{playlist?.name ?? "Playlist"} | Cadence</title>
  {/await}
</svelte:head>

<div class="flex flex-col mx-auto w-full h-full border-x relative">
  {#await loadedPlaylist then playlist}
    {#if playlist}
      <div
        style="--h: {isScrolled ? 10 : 16}rem;"
        class="z-20 p-1.5 md:p-2 flex flex-col absolute top-0 w-full gap-1.5 md:gap-2"
      >
        <div class="_bg _blur absolute inset-0 -z-10"></div>
        <div class="_bg _color absolute inset-0 -z-10"></div>
        {#await isNonModifiable then nonModifiable}
          <PlaylistHeader
            {playlist}
            {isScrolled}
            isOffline={offline.isOffline}
            isDownloading={offline.isDownloading}
            isNonModifiable={!!nonModifiable}
            onPlay={handlePlay}
            onEdit={() => editDialog.open()}
            onDownload={() => playlist && offline.downloadPlaylist(playlist)}
            onMakeOffline={() => playlist && offline.makeOffline(playlist)}
            onRemoveOffline={() => offline.removeOffline()}
          />
        {/await}

        <PlaylistSearch bind:searchQuery />
      </div>

      {#await filteredTracks then tracks}
        {#await hasAddButton then showAddButton}
          <VirtualizedPlaylistTracks
            items={tracks}
            hasAddButton={showAddButton}
            onAddTracks={() => addTracksDialog.open()}
            onTrackRemovedFromPlaylist={handleTrackRemovedFromPlaylist}
            onScroll={(scrollTop) => {
              if (isScrolled && scrollTop < 154) {
                isScrolled = false;
              } else if (!isScrolled && scrollTop > (isMobile ? 245 : 273)) {
                isScrolled = true;
              }
            }}
          />
        {/await}
      {/await}
    {:else}
      <div class="flex items-center justify-center h-full">
        <p class="text-muted-foreground">Playlist not found</p>
      </div>
    {/if}
  {:catch error}
    <div class="flex items-center justify-center h-full">
      <p class="text-muted-foreground">{error.message}</p>
    </div>
  {/await}
</div>

{#await Promise.all( [loadedPlaylist, isNonModifiable, existingTrackIds] ) then [playlist, nonModifiable, trackIds]}
  {#if playlist && playlistId && !nonModifiable}
    <AddTracksDialog
      open={addTracksDialog.isOpen}
      onOpenChange={(open) => !open && addTracksDialog.close()}
      {playlistId}
      existingTrackIds={trackIds}
      onTracksAdded={() => invalidateAll()}
    />

    <EditPlaylistDialog
      open={editDialog.isOpen}
      onOpenChange={(open) => !open && editDialog.close()}
      {playlist}
      onUpdated={handlePlaylistUpdated}
      onDeleted={handlePlaylistDeleted}
    />
  {/if}
{/await}

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
      background-color: hsl(from var(--background) h s l / 0.8);
    }
  }

  /*._blur {
    &::before,
    &::after {
      backdrop-filter: blur(1rem) saturate(120%) contrast(120%) brightness(120%);
    }
  }*/
</style>
