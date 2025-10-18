<script lang="ts">
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { SvelteSet } from "svelte/reactivity";
  import { getPlaylistById, fetchTracks } from "$lib/api";
  import { playerStore } from "$lib/stores/player.svelte";
  import { navigationStore } from "$lib/stores/navigation.svelte";
  import { useDialogState, usePlaylistOffline } from "$lib/hooks";
  import {
    getPlaylistDisplayName,
    isArtistPlaylist,
    isAlbumPlaylist,
  } from "$lib/utils/playlist";
  import {
    AddTracksDialog,
    EditPlaylistDialog,
    PlaylistHeader,
    VirtualizedPlaylistTracks,
  } from "$lib/components";
  import PlaylistSearch from "$lib/components/playlists/PlaylistSearch.svelte";
  import { LoaderIcon } from "@lucide/svelte";
  import { db } from "$lib/db/offline";
  import {
    isSpecialPlaylist,
    getSpecialPlaylist,
    SPECIAL_PLAYLIST_IDS,
  } from "$lib/utils/playlist";
  import { innerWidth } from "svelte/reactivity/window";

  const playlistId = $derived(page.params.id);

  let playlist = $state<PlaylistDetail | null>(null);
  let loading = $state(true);
  let searchQuery = $state("");
  let isScrolled = $state(false);

  const addTracksDialog = useDialogState("add-tracks");
  const editDialog = useDialogState("edit-playlist");
  const offline = usePlaylistOffline(() => playlistId);

  const existingTrackIds = $derived(
    new SvelteSet(playlist?.items.map((item) => item.audio.id) ?? [])
  );

  const isNonModifiable = $derived(
    playlist &&
      (isSpecialPlaylist(playlist.id) ||
        isArtistPlaylist(playlist.id) ||
        isAlbumPlaylist(playlist.id))
  );

  const hasAddButton = $derived(
    !searchQuery.trim() && playlist && !isNonModifiable
  );

  const filteredTracks = $derived(
    searchQuery.trim()
      ? filterTracks(playlist?.items ?? [], searchQuery)
      : (playlist?.items ?? [])
  );

  $effect(() => {
    if (playlistId) {
      loadPlaylist();
    }
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

  function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  async function loadPlaylist() {
    if (!playlistId) return;

    loading = true;
    try {
      if (isSpecialPlaylist(playlistId)) {
        await loadSpecialPlaylist(playlistId);
      } else {
        const response = await getPlaylistById(playlistId);
        playlist = response.playlist;
        if (playlist) {
          updateNavigation(playlist.name);
          offline.checkOfflineStatus();
        }
      }
    } catch (error) {
      console.error("Failed to load playlist:", error);
    } finally {
      loading = false;
    }
  }

  async function loadSpecialPlaylist(id: string) {
    const specialPlaylist = getSpecialPlaylist(id);
    if (!specialPlaylist) return;

    const now = new Date();
    playlist = {
      id: specialPlaylist.id,
      name: specialPlaylist.name,
      userId: specialPlaylist.userId,
      createdAt: new Date(specialPlaylist.createdAt),
      updatedAt: now,
      items: [],
    };

    updateNavigation(specialPlaylist.name);
    offline.checkOfflineStatus();

    if (id === SPECIAL_PLAYLIST_IDS.ALL_SONGS) {
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const result = await fetchTracks({
          page,
          limit: 100,
          sortBy: "title",
          sortOrder: "asc",
        });

        if (playlist && playlist.id === id) {
          const currentLength = playlist.items.length;
          const newItems = result.tracks.map(
            (track, index): PlaylistItem => ({
              id: `${track.id}_${currentLength + index}`,
              position: currentLength + index,
              addedAt: now,
              audio: track,
            })
          );

          playlist = {
            ...playlist,
            items: [...playlist.items, ...newItems],
          };
        }

        hasMore = result.hasMore;
        page++;
      }
    } else if (id === SPECIAL_PLAYLIST_IDS.DOWNLOADED) {
      const offlineTracks = await db.tracks.toArray();
      const tracks = offlineTracks.map(
        (track) =>
          ({
            id: track.id,
            filename: track.filename,
            metadata: {
              title: track.metadata.title,
              artist: track.metadata.artist,
              album: track.metadata.album,
              duration: track.metadata.duration,
            },
          }) as AudioFile
      );

      if (playlist && playlist.id === id) {
        playlist = {
          ...playlist,
          items: tracks.map((track, index) => ({
            id: `${track.id}_${index}`,
            position: index,
            addedAt: now,
            audio: track,
          })),
        };
      }
    }
  }

  function handleTrackRemovedFromPlaylist(
    trackId: string,
    removedFromPlaylists: string[]
  ) {
    if (!playlist || !playlistId) return;
    if (!removedFromPlaylists.includes(playlistId)) return;

    playlist = {
      ...playlist,
      items: playlist.items.filter((item) => item.audio.id !== trackId),
    };
  }

  function handlePlay() {
    if (!playlist || playlist.items.length === 0) return;
    const tracks = playlist.items.map((item) => item.audio);
    playerStore.setQueue(tracks, 0);
  }

  function handleShuffle() {
    if (!playlist || playlist.items.length === 0) return;
    const tracks = playlist.items.map((item) => item.audio);
    playerStore.setQueue(shuffleArray(tracks), 0);
  }

  function handlePlaylistUpdated(updated: {
    name: string;
    coverImage?: string;
  }) {
    if (!playlist) return;
    playlist = { ...playlist, ...updated };
    updateNavigation(updated.name);
  }

  function handlePlaylistDeleted() {
    goto("/library", { replaceState: true });
  }

  const isMobile = $derived((innerWidth.current ?? 0) <= 768);
</script>

<svelte:head>
  <title>{playlist?.name ?? "Playlist"} | Cadence</title>
</svelte:head>

<div class="flex flex-col max-w-4xl mx-auto w-full h-full border-x relative">
  {#if loading}
    <div class="flex items-center justify-center h-full">
      <LoaderIcon class="animate-spin text-muted-foreground" size={24} />
    </div>
  {:else if playlist}
    <div
      style="--h: 10rem;"
      class="z-20 max-w-4xl p-1.5 flex flex-col
      {isScrolled ? 'fixed top-0 w-full' : 'relative'}"
    >
      <!-- <div class="_bg _blur absolute inset-0 -z-10"></div> -->
      <div class="_bg _color absolute inset-0 -z-10"></div>
      <div
        class="transition-all duration-150 {isScrolled ? 'pb-1.5' : 'p-1.5'}"
      >
        <PlaylistHeader
          {playlist}
          {isScrolled}
          isOffline={offline.isOffline}
          isDownloading={offline.isDownloading}
          isNonModifiable={!!isNonModifiable}
          onPlay={handlePlay}
          onShuffle={handleShuffle}
          onEdit={() => editDialog.open()}
          onDownload={() => playlist && offline.downloadPlaylist(playlist)}
          onMakeOffline={() => playlist && offline.makeOffline(playlist)}
          onRemoveOffline={() => offline.removeOffline()}
        />
      </div>

      <div
        class="transition-all duration-150
        {isScrolled ? '' : 'p-1.5'}"
      >
        <PlaylistSearch bind:searchQuery />
      </div>
    </div>

    <VirtualizedPlaylistTracks
      items={filteredTracks}
      {hasAddButton}
      {isScrolled}
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
  {:else}
    <div class="flex items-center justify-center h-full">
      <p class="text-muted-foreground">Playlist not found</p>
    </div>
  {/if}
</div>

{#if playlist && playlistId && !isNonModifiable}
  <AddTracksDialog
    open={addTracksDialog.isOpen}
    onOpenChange={(open) => !open && addTracksDialog.close()}
    {playlistId}
    {existingTrackIds}
    onTracksAdded={loadPlaylist}
  />

  <EditPlaylistDialog
    open={editDialog.isOpen}
    onOpenChange={(open) => !open && editDialog.close()}
    {playlist}
    onUpdated={handlePlaylistUpdated}
    onDeleted={handlePlaylistDeleted}
  />
{/if}

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

  /* ._blur {
    &::before,
    &::after {
      backdrop-filter: blur(1rem) saturate(120%) contrast(120%) brightness(120%);
    }
  } */
</style>
