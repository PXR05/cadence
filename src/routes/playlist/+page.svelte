<script lang="ts">
  import { SvelteSet } from "svelte/reactivity";
  import { useDialogState } from "$lib/hooks";
  import {
    isArtistPlaylist,
    isAlbumPlaylist,
    isSpecialPlaylist,
  } from "$lib/utils/playlist";
  import {
    AddTracksDialog,
    PullToRefresh,
    PlaylistPageDesktop,
    PlaylistPageMobile,
  } from "$lib/components";
  import { innerWidth } from "svelte/reactivity/window";
  import { LoaderIcon, TriangleAlertIcon } from "@lucide/svelte";
  import type { PlaylistDetail, PlaylistItem } from "$lib/schemas";
  import { playerStore } from "$lib/stores/player.svelte.js";
  import { loadPlaylistForRoute } from "./load-playlist";

  let { data } = $props();

  const playlistId = $derived(data.playlistId);

  let playlist = $state<PlaylistDetail | undefined>(undefined);
  let searchQuery = $state("");
  let isScrolled = $state(false);

  $effect(() => {
    playlist = undefined;
    searchQuery = "";
    isScrolled = false;

    data.playlist.then((resolved) => {
      playlist = resolved;
    });
  });

  const addTracksDialog = useDialogState("add-tracks");

  const existingTrackIds = $derived(
    new SvelteSet(playlist?.items.map((item) => item.audio.id) ?? []),
  );

  const isNonModifiable = $derived(
    playlist &&
      (isSpecialPlaylist(playlist.id) ||
        isArtistPlaylist(playlist.id) ||
        isAlbumPlaylist(playlist.id)),
  );

  const hasAddButton = $derived(
    !searchQuery.trim() && Boolean(playlist) && !isNonModifiable,
  );

  const filteredTracks = $derived(
    searchQuery.trim()
      ? filterTracks(playlist?.items ?? [], searchQuery)
      : (playlist?.items ?? []),
  );

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

  const isMobile = $derived((innerWidth.current ?? 0) <= 768);

  async function refreshCurrentPlaylist() {
    if (!playlistId) {
      return;
    }

    const refreshed = await loadPlaylistForRoute(playlistId);
    if (refreshed) {
      playlist = refreshed;
    }
  }
</script>

<svelte:head>
  <title
    >{playerStore.isPlaying && playerStore.currentTrack?.metadata?.title
      ? playerStore.currentTrack.metadata?.title
      : (playlist?.name ?? "Playlist")} | Cadence</title
  >
</svelte:head>

<PullToRefresh
  enabled={Boolean(playlistId)}
  onStageOne={refreshCurrentPlaylist}
>
  <div class="flex flex-col mx-auto w-full h-full relative">
    {#if !playlistId}
      <div
        class="flex flex-col items-center justify-center h-full text-muted-foreground gap-2"
      >
        <TriangleAlertIcon
          size={48}
          strokeWidth={1.5}
          class="text-muted-foreground"
        />
        <p>Invalid playlist ID</p>
      </div>
    {:else if !playlist}
      <div class="delayed-loader flex items-center justify-center h-full">
        <LoaderIcon class="animate-spin text-muted-foreground" />
      </div>
    {:else if isMobile}
      <PlaylistPageMobile
        {playlist}
        bind:isScrolled
        bind:searchQuery
        {hasAddButton}
        items={filteredTracks}
        onAddTracks={() => addTracksDialog.open()}
      />
    {:else}
      <PlaylistPageDesktop
        {playlist}
        bind:isScrolled
        bind:searchQuery
        {hasAddButton}
        items={filteredTracks}
        onAddTracks={() => addTracksDialog.open()}
      />
    {/if}
  </div>
</PullToRefresh>

{#if playlist && playlistId && !isNonModifiable}
  <AddTracksDialog
    open={addTracksDialog.isOpen}
    onOpenChange={(open) => !open && addTracksDialog.close()}
    {playlistId}
    {existingTrackIds}
  />
{/if}
