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
    PlaylistSortDialog,
  } from "$lib/components";
  import { innerWidth } from "svelte/reactivity/window";
  import {
    Loader as LoaderIcon,
    TriangleAlert as TriangleAlertIcon,
  } from "@lucide/svelte";
  import type { PlaylistDetail, PlaylistItem } from "$lib/schemas";
  import { playerStore } from "$lib/stores/player.svelte.js";
  import { loadPlaylistForRoute } from "./load-playlist";

  let { data } = $props();

  const playlistId = $derived(data.playlistId);

  let playlist = $state<PlaylistDetail | undefined>(undefined);
  let searchQuery = $state("");
  let isScrolled = $state(false);
  let mobileListScrollTop = $state(0);
  let sortBy = $state<"custom" | "title" | "addedAt" | "artist">("custom");
  let sortDirection = $state<"asc" | "desc">("asc");

  $effect(() => {
    playlist = undefined;
    searchQuery = "";
    isScrolled = false;
    mobileListScrollTop = 0;
    sortBy = "custom";
    sortDirection = "asc";

    data.playlist.then((resolved) => {
      playlist = resolved;
    });
  });

  const addTracksDialog = useDialogState("add-tracks");
  const sortDialog = useDialogState("sort");

  const existingTrackIds = $derived(
    new SvelteSet(playlist?.items.map((item) => item.audio.id) ?? []),
  );

  const isNonModifiable = $derived(
    playlist &&
      (isSpecialPlaylist(playlist.id) || isArtistPlaylist(playlist.id)),
  );

  const hasAddButton = $derived(
    !searchQuery.trim() && Boolean(playlist) && !isNonModifiable,
  );

  const filteredTracks = $derived(
    sortTracks(
      searchQuery.trim()
        ? filterTracks(playlist?.items ?? [], searchQuery)
        : (playlist?.items ?? []),
      sortBy,
      sortDirection,
    ),
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

  function sortTracks(
    items: PlaylistItem[],
    currentSortBy: "custom" | "title" | "addedAt" | "artist",
    currentSortDirection: "asc" | "desc",
  ) {
    const sorted = [...items];

    sorted.sort((a, b) => {
      let result = 0;

      if (currentSortBy === "custom") {
        result = a.position - b.position;
      } else if (currentSortBy === "addedAt") {
        result = a.addedAt.getTime() - b.addedAt.getTime();
      } else if (currentSortBy === "artist") {
        const artistA = (a.audio.metadata?.artist || "").toLowerCase();
        const artistB = (b.audio.metadata?.artist || "").toLowerCase();
        result = artistA.localeCompare(artistB, undefined, {
          sensitivity: "base",
          numeric: true,
        });
      } else {
        const titleA = (
          a.audio.metadata?.title || a.audio.filename
        ).toLowerCase();
        const titleB = (
          b.audio.metadata?.title || b.audio.filename
        ).toLowerCase();
        result = titleA.localeCompare(titleB, undefined, {
          sensitivity: "base",
          numeric: true,
        });
      }

      if (result === 0) {
        result = a.position - b.position;
      }

      return currentSortDirection === "asc" ? result : -result;
    });

    return sorted;
  }

  const isMobile = $derived((innerWidth.current ?? 0) <= 768);
  const pullToRefreshEnabled = $derived(
    Boolean(playlistId) && (!isMobile || mobileListScrollTop <= 0),
  );

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
  enabled={pullToRefreshEnabled}
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
      <div class="delayed-loader flex items-center justify-center h-dvh">
        <LoaderIcon class="animate-spin text-muted-foreground" />
      </div>
    {:else if isMobile}
      <PlaylistPageMobile
        {playlist}
        bind:isScrolled
        bind:searchQuery
        {hasAddButton}
        items={filteredTracks}
        onListScroll={(scrollTop) => {
          mobileListScrollTop = scrollTop;
        }}
        onOpenSort={() => sortDialog.open()}
        onAddTracks={() => addTracksDialog.open()}
      />
    {:else}
      <PlaylistPageDesktop
        {playlist}
        bind:isScrolled
        bind:searchQuery
        {hasAddButton}
        items={filteredTracks}
        onOpenSort={() => sortDialog.open()}
        onAddTracks={() => addTracksDialog.open()}
      />
    {/if}
  </div>
</PullToRefresh>

<PlaylistSortDialog
  open={sortDialog.isOpen}
  onOpenChange={(open) => {
    if (open) {
      sortDialog.open();
    } else {
      sortDialog.close();
    }
  }}
  {sortBy}
  {sortDirection}
  onSortByChange={(value) => {
    sortBy = value;
  }}
  onSortDirectionChange={(value) => {
    sortDirection = value;
  }}
/>

{#if playlist && playlistId && !isNonModifiable}
  <AddTracksDialog
    open={addTracksDialog.isOpen}
    onOpenChange={(open) => !open && addTracksDialog.close()}
    {playlistId}
    {existingTrackIds}
  />
{/if}
