<script lang="ts">
  import { page } from "$app/state";
  import { onMount } from "svelte";
  import { getPlaylistById } from "$lib/api";
  import { playerStore } from "$lib/stores/player.svelte";
  import {
    LoaderIcon,
    PlayIcon,
    ShuffleIcon,
    SearchIcon,
    PlusIcon,
  } from "@lucide/svelte";
  import { TrackItem, AddTracksDialog } from "$lib/components";
  import { MusicIcon } from "@lucide/svelte";
  import { SvelteSet } from "svelte/reactivity";
  import { useDialogState } from "$lib/hooks";

  const playlistId = $derived(page.params.id);

  let playlist = $state<PlaylistDetail | null>(null);
  let loading = $state(true);
  let searchQuery = $state("");
  const addTracksDialog = useDialogState("add-tracks");

  const existingTrackIds = $derived(
    new SvelteSet(playlist?.items.map((item) => item.audio.id) ?? [])
  );

  const filteredTracks = $derived(
    searchQuery.trim()
      ? (playlist?.items.filter((item) => {
          const title = item.audio.metadata?.title || item.audio.filename;
          const artist = item.audio.metadata?.artist || "";
          const query = searchQuery.toLowerCase();
          return (
            title.toLowerCase().includes(query) ||
            artist.toLowerCase().includes(query)
          );
        }) ?? [])
      : (playlist?.items ?? [])
  );

  onMount(async () => {
    await loadPlaylist();
  });

  async function loadPlaylist() {
    if (!playlistId) return;

    loading = true;
    try {
      const response = await getPlaylistById(playlistId);
      playlist = response.playlist;
    } catch (error) {
      console.error("Failed to load playlist:", error);
    } finally {
      loading = false;
    }
  }

  function handleTrackRemovedFromPlaylist(
    trackId: string,
    removedFromPlaylists: string[]
  ) {
    if (!playlist || !playlistId) return;

    if (removedFromPlaylists.includes(playlistId)) {
      playlist = {
        ...playlist,
        items: playlist.items.filter((item) => item.audio.id !== trackId),
      };
    }
  }

  function handlePlay() {
    if (!playlist || playlist.items.length === 0) return;
    const tracks = playlist.items.map((item) => item.audio);
    playerStore.setQueue(tracks, 0);
  }

  function handleShuffle() {
    if (!playlist || playlist.items.length === 0) return;
    const tracks = playlist.items.map((item) => item.audio);
    const shuffled = [...tracks];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    playerStore.setQueue(shuffled, 0);
  }
</script>

<div
  class="flex flex-col max-w-4xl mx-auto w-full h-[calc(100dvh-3rem-2px)] border-x"
>
  {#if loading}
    <div class="flex items-center justify-center h-full">
      <LoaderIcon class="animate-spin text-muted-foreground" size={24} />
    </div>
  {:else if playlist}
    <div class="border-b p-4 flex gap-4 items-end">
      <div class="size-32 border flex-shrink-0 overflow-hidden">
        {#if playlist.coverImage}
          <img
            src={playlist.coverImage}
            alt={playlist.name}
            class="w-full h-full object-cover"
          />
        {:else}
          <div class="w-full h-full bg-muted grid place-items-center">
            <MusicIcon size={48} class="text-muted-foreground" />
          </div>
        {/if}
      </div>
      <div class="flex-1 min-w-0 flex items-end justify-between gap-4">
        <div class="flex-1 min-w-0">
          <h1 class="text-2xl font-semibold truncate">{playlist.name}</h1>
          <p class="text-sm text-muted-foreground">
            {playlist.items.length} tracks
          </p>
        </div>
        <div class="flex gap-2 flex-shrink-0">
          <button
            onclick={handlePlay}
            disabled={playlist.items.length === 0}
            class="px-4 py-2 border bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <PlayIcon size={16} />
            Play
          </button>
          <button
            onclick={handleShuffle}
            disabled={playlist.items.length === 0}
            class="px-4 py-2 border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ShuffleIcon size={16} />
            Shuffle
          </button>
        </div>
      </div>
    </div>

    <div class="flex items-center relative border-b">
      <SearchIcon size={16} class="ml-3 text-muted-foreground flex-shrink-0" />
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Search in playlist..."
        class="flex-1 bg-transparent p-3 outline-none font-mono placeholder:text-muted-foreground"
      />
    </div>

    <div class="flex-1 overflow-y-auto">
      {#if !searchQuery.trim()}
        <button
          onclick={() => addTracksDialog.open()}
          class="w-full flex items-center gap-4 p-3 border-b hover:bg-muted/50 transition-colors"
        >
          <div
            class="size-16 border flex-shrink-0 bg-muted grid place-items-center"
          >
            <PlusIcon size={24} class="text-muted-foreground" />
          </div>
          <div class="flex-1 text-left">
            <p class="font-medium">Add Tracks</p>
            <p class="text-sm text-muted-foreground">
              Add tracks to this playlist
            </p>
          </div>
        </button>
      {/if}

      {#if filteredTracks.length === 0}
        {#if !searchQuery.trim()}
          <div class="h-24"></div>
        {:else}
          <div class="flex flex-col items-center justify-center p-8 h-full">
            <p class="text-muted-foreground mb-2">No tracks found</p>
            <p class="text-sm text-muted-foreground">
              Try a different search query
            </p>
          </div>
        {/if}
      {:else}
        {#each filteredTracks as item (item.id)}
          <TrackItem
            track={item.audio}
            fromQueue={false}
            onRemovedFromPlaylist={handleTrackRemovedFromPlaylist}
          />
        {/each}
        <div class="h-24"></div>
      {/if}
    </div>
  {:else}
    <div class="flex items-center justify-center h-full">
      <p class="text-muted-foreground">Playlist not found</p>
    </div>
  {/if}
</div>

{#if playlist && playlistId}
  <AddTracksDialog
    open={addTracksDialog.isOpen}
    onOpenChange={(open) => !open && addTracksDialog.close()}
    {playlistId}
    {existingTrackIds}
    onTracksAdded={loadPlaylist}
  />
{/if}
