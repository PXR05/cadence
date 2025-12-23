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
    PlaylistHeader,
    PlaylistTrackList,
  } from "$lib/components";
  import PlaylistSearch from "$lib/components/playlists/PlaylistSearch.svelte";
  import { innerWidth } from "svelte/reactivity/window";
  import { LoaderIcon } from "@lucide/svelte";
  import type { PlaylistDetail, PlaylistItem } from "$lib/schemas";
  import { fade } from "svelte/transition";

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
    !searchQuery.trim() && playlist && !isNonModifiable,
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
</script>

<svelte:head>
  <title>{playlist?.name ?? "Playlist"} | Cadence</title>
</svelte:head>

<div class="flex flex-col mx-auto w-full h-full relative">
  {#if !playlist}
    <div class="flex items-center justify-center h-full">
      <LoaderIcon class="animate-spin text-muted-foreground" />
    </div>
  {:else}
    <div
      transition:fade={{ duration: 150 }}
      style="--h: {isScrolled ? 10 : 16}rem;"
      class="z-20 p-1.5 md:p-2 flex flex-col absolute top-0 w-full gap-1.5 md:gap-2"
    >
      <div class="_bg _blur absolute inset-0 -z-10"></div>
      <div class="_bg _color absolute inset-0 -z-10"></div>
      <PlaylistHeader {playlist} {isScrolled} />

      <PlaylistSearch bind:searchQuery />
    </div>

    <PlaylistTrackList
      {playlist}
      {hasAddButton}
      items={filteredTracks}
      onAddTracks={() => addTracksDialog.open()}
      onScroll={(scrollTop) => {
        if (isScrolled && scrollTop < 154) {
          isScrolled = false;
        } else if (!isScrolled && scrollTop > (isMobile ? 245 : 273 + 64)) {
          isScrolled = true;
        }
      }}
    />
  {/if}
</div>

{#if playlist && playlistId && !isNonModifiable}
  <AddTracksDialog
    open={addTracksDialog.isOpen}
    onOpenChange={(open) => !open && addTracksDialog.close()}
    {playlistId}
    {existingTrackIds}
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
      background-color: var(--background);
    }
  }
</style>
