<script lang="ts">
  import {
    ArtistCard,
    CreatePlaylistDialog,
    LibraryFilters,
    LibrarySectionHeader,
    PlaylistCard,
    PullToRefresh,
  } from "$lib/components";
  import { Plus as PlusIcon } from "@lucide/svelte";
  import { playlistsStore } from "$lib/stores/playlists.svelte";
  import { tracksStore } from "$lib/stores/tracks.svelte";
  import { offlineDb } from "$lib/db/offline";
  import { liveQuery } from "dexie";
  import { playerStore } from "$lib/stores/player.svelte";
  import { useDialogState } from "$lib/hooks";
  import { backendCapabilities } from "$lib/backend/config";
  import { getBasePlaylists } from "$lib/utils/library";
  import { getArtistsFromTracks } from "$lib/utils/artists";
  import { appearanceStore } from "$lib/stores/appearance.svelte";
  import { flip } from "svelte/animate";
  import { innerWidth } from "svelte/reactivity/window";

  const createDialog = useDialogState("create-playlist");

  const PREVIEW_ROWS = $derived((innerWidth.current ?? 0) >= 1024 ? 2 : 3);

  let offlineCount = liveQuery(() => offlineDb.tracks.count());

  let searchQuery = $state("");
  const query = $derived(searchQuery.trim().toLowerCase());
  const isEmpty = $derived(searchQuery.trim().length === 0);

  const allPlaylists = $derived(
    getBasePlaylists(
      playlistsStore,
      "",
      tracksStore.tracksCount,
      $offlineCount || 0,
    ),
  );

  const allArtists = $derived(getArtistsFromTracks(tracksStore.tracks));

  const filteredPlaylists = $derived(
    query
      ? allPlaylists.filter((p) => p.name.toLowerCase().includes(query))
      : allPlaylists,
  );
  const filteredArtists = $derived(
    query
      ? allArtists.filter((a) => a.name.toLowerCase().includes(query))
      : allArtists,
  );

  let playlistGrid: HTMLDivElement | null = $state(null);
  let artistGrid: HTMLDivElement | null = $state(null);
  let playlistCols = $state(2);
  let artistCols = $state(2);

  function columnCount(el: HTMLElement | null): number {
    if (!el) return 2;
    const cols = getComputedStyle(el)
      .gridTemplateColumns.split(" ")
      .filter(Boolean).length;
    return cols > 0 ? cols : 2;
  }

  $effect(() => {
    const update = () => {
      playlistCols = columnCount(playlistGrid);
      artistCols = columnCount(artistGrid);
    };
    update();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update);
    if (playlistGrid) ro.observe(playlistGrid);
    if (artistGrid) ro.observe(artistGrid);
    return () => ro.disconnect();
  });

  const playlistPreview = $derived(
    filteredPlaylists.slice(
      0,
      Math.max(
        1,
        playlistCols * PREVIEW_ROWS -
          (backendCapabilities.playlists.create ? 1 : 0),
      ),
    ),
  );
  const artistPreview = $derived(
    [...filteredArtists]
      .sort(
        (a, b) =>
          b.trackCount - a.trackCount ||
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      )
      .slice(0, Math.max(1, artistCols * PREVIEW_ROWS)),
  );

  async function handlePlaylistCreated() {
    await refreshLibrary();
  }

  async function refreshLibrary() {
    await tracksStore.loadAllTracks(true);
    playlistsStore.invalidate();
    await playlistsStore.loadAllPlaylists(true);
    Promise.all(
      playlistsStore.allPlaylists.map((p) =>
        playlistsStore.loadPlaylistDetail(p.id, true),
      ),
    )
      .then(() => {
        console.log("Playlist details refreshed");
      })
      .catch((err) => {
        console.error("Failed to refresh playlist details", err);
      });
  }
</script>

<svelte:head>
  <title
    >{playerStore.isPlaying && playerStore.currentTrack?.metadata?.title
      ? playerStore.currentTrack.metadata?.title
      : "Library"} | Cadence</title
  >
</svelte:head>

<PullToRefresh onStageOne={refreshLibrary}>
  <h2 class="p-4 pb-0 text-2xl font-semibold">Library</h2>

  <LibraryFilters
    bind:searchQuery
    searchPlaceholder="Search playlists and artists..."
    showTypeFilters={false}
    showSourceFilters={false}
  />

  <div class="pb-72">
    <LibrarySectionHeader title="Playlists" href="/library/playlists" />

    <div
      bind:this={playlistGrid}
      class="p-4 grid grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-4 @7xl:grid-cols-5 @9xl:grid-cols-6 gap-4"
    >
      {#each playlistPreview as playlist (playlist.id)}
        <div
          animate:flip={{ duration: appearanceStore.disableAnimations ? 0 : 150 }}
        >
          <PlaylistCard {playlist} size="large" />
        </div>
      {/each}
      {#if backendCapabilities.playlists.create && isEmpty}
        <button
          onclick={createDialog.open}
          class="rounded-lg aspect-square w-full shrink-0 border hover:bg-muted/50 transition-colors grid place-items-center"
        >
          <PlusIcon
            size={48}
            absoluteStrokeWidth
            strokeWidth={2}
            class="text-muted-foreground"
          />
        </button>
      {/if}
      {#if playlistPreview.length === 0}
        <p class="col-span-full text-sm text-muted-foreground">
          No playlists found.
        </p>
      {/if}
    </div>

    <LibrarySectionHeader title="Artists" href="/library/artists" />

    <div
      bind:this={artistGrid}
      class="p-4 grid grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-4 @7xl:grid-cols-5 @9xl:grid-cols-6 gap-4"
    >
      {#each artistPreview as artist (artist.name.toLowerCase())}
        <div
          animate:flip={{ duration: appearanceStore.disableAnimations ? 0 : 150 }}
        >
          <ArtistCard {artist} />
        </div>
      {/each}
      {#if artistPreview.length === 0}
        <p class="col-span-full text-sm text-muted-foreground">
          No artists found.
        </p>
      {/if}
    </div>
  </div>
</PullToRefresh>

{#if backendCapabilities.playlists.create}
  <CreatePlaylistDialog
    open={createDialog.isOpen}
    onOpenChange={(open) =>
      !open && createDialog.isOpen ? createDialog.close() : null}
    onCreated={handlePlaylistCreated}
  />
{/if}
