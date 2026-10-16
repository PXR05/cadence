<script lang="ts">
  import { ArtistCard, LibraryFilters, PullToRefresh } from "$lib/components";
  import SettingsHeader from "$lib/components/SettingsHeader.svelte";
  import { playlistsStore } from "$lib/stores/playlists.svelte";
  import { tracksStore } from "$lib/stores/tracks.svelte";
  import { flip } from "svelte/animate";
  import { appearanceStore } from "$lib/stores/appearance.svelte";
  import { playerStore } from "$lib/stores/player.svelte";
  import {
    filterTracksBySource,
    getArtistsFromTracks,
    type LibrarySource,
  } from "$lib/utils/artists";

  let currentSource = $state<LibrarySource>("");
  let searchQuery = $state("");
  const query = $derived(searchQuery.trim().toLowerCase());

  const allArtists = $derived(
    getArtistsFromTracks(
      filterTracksBySource(tracksStore.tracks, currentSource),
    ),
  );

  const filteredArtists = $derived(
    query
      ? allArtists.filter((a) => a.name.toLowerCase().includes(query))
      : allArtists,
  );

  async function refreshArtists() {
    await tracksStore.loadAllTracks(true);
    playlistsStore.invalidate();
    await playlistsStore.loadAllPlaylists(true);
  }
</script>

<svelte:head>
  <title
    >{playerStore.isPlaying && playerStore.currentTrack?.metadata?.title
      ? playerStore.currentTrack.metadata?.title
      : "Artists"} | Cadence</title
  >
</svelte:head>

<PullToRefresh onStageOne={refreshArtists}>
  <SettingsHeader title="Artists" class="mt-1 mx-1" containerClass="pb-0!" />

  <LibraryFilters
    bind:searchQuery
    searchPlaceholder="Search artists..."
    {currentSource}
    onSourceChange={(s) => (currentSource = s)}
    showTypeFilters={false}
  />

  <div
    class="p-4 pt-0 grid grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-4 @7xl:grid-cols-5 @9xl:grid-cols-6 gap-4 pb-72"
  >
    {#each filteredArtists as artist (artist.name.toLowerCase())}
      <div
        animate:flip={{ duration: appearanceStore.disableAnimations ? 0 : 150 }}
      >
        <ArtistCard {artist} />
      </div>
    {/each}
    {#if filteredArtists.length === 0}
      <p class="col-span-full text-sm text-muted-foreground">
        No artists found.
      </p>
    {/if}
  </div>
</PullToRefresh>
