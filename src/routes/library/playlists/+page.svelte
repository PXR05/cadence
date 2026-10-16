<script lang="ts">
  import {
    CreatePlaylistDialog,
    PlaylistCard,
    PullToRefresh,
    LibraryFilters,
  } from "$lib/components";
  import SettingsHeader from "$lib/components/SettingsHeader.svelte";
  import { Plus as PlusIcon } from "@lucide/svelte";
  import { flip } from "svelte/animate";
  import { playlistsStore } from "$lib/stores/playlists.svelte";
  import { tracksStore } from "$lib/stores/tracks.svelte";
  import { offlineDb } from "$lib/db/offline";
  import { liveQuery } from "dexie";
  import { appearanceStore } from "$lib/stores/appearance.svelte";
  import { playerStore } from "$lib/stores/player.svelte";
  import { useDialogState } from "$lib/hooks";
  import { backendCapabilities } from "$lib/backend/config";
  import {
    applyPlaylistTypeFilter,
    getBasePlaylists,
  } from "$lib/utils/library";
  import type { LibrarySource, LibraryType } from "$lib/utils/artists";

  const createDialog = useDialogState("create-playlist");

  let offlineCount = liveQuery(() => offlineDb.tracks.count());

  let currentType = $state<LibraryType>("");
  let currentSource = $state<LibrarySource>("");
  let searchQuery = $state("");
  const query = $derived(searchQuery.trim().toLowerCase());

  const allPlaylists = $derived(
    applyPlaylistTypeFilter(
      getBasePlaylists(
        playlistsStore,
        currentSource,
        tracksStore.tracksCount,
        $offlineCount || 0,
      ),
      currentType,
    ),
  );

  const filteredPlaylists = $derived(
    query
      ? allPlaylists.filter((p) => p.name.toLowerCase().includes(query))
      : allPlaylists,
  );

  async function handlePlaylistCreated() {
    await refreshPlaylists();
  }

  async function refreshPlaylists() {
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
      : "Playlists"} | Cadence</title
  >
</svelte:head>

<PullToRefresh onStageOne={refreshPlaylists}>
  <SettingsHeader title="Playlists" class="mt-1 mx-1" containerClass="pb-0!" />

  <LibraryFilters
    bind:searchQuery
    searchPlaceholder="Search playlists..."
    {currentType}
    {currentSource}
    onTypeChange={(t) => (currentType = t)}
    onSourceChange={(s) => (currentSource = s)}
  />

  <div
    class="p-4 pt-0 grid grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-4 @7xl:grid-cols-5 @9xl:grid-cols-6 gap-4 pb-72"
  >
    {#each filteredPlaylists as playlist (playlist.id)}
      <div
        animate:flip={{ duration: appearanceStore.disableAnimations ? 0 : 150 }}
      >
        <PlaylistCard {playlist} size="large" />
      </div>
    {/each}
    {#if backendCapabilities.playlists.create && query === ""}
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
    {#if filteredPlaylists.length === 0}
      <p class="col-span-full text-sm text-muted-foreground">
        No playlists found.
      </p>
    {/if}
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
