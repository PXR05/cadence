<script lang="ts">
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { SvelteSet } from "svelte/reactivity";
  import { getPlaylistById } from "$lib/api";
  import { playerStore, getPlaylistImageUrl } from "$lib/stores/player.svelte";
  import { navigationStore } from "$lib/stores/navigation.svelte";
  import { useDialogState } from "$lib/hooks";
  import {
    getPlaylistDisplayName,
    handlePlaylistImageError,
    isArtistPlaylist,
    isAlbumPlaylist,
  } from "$lib/utils/playlist";
  import {
    TrackItem,
    AddTracksDialog,
    EditPlaylistDialog,
  } from "$lib/components";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import {
    LoaderIcon,
    PlayIcon,
    ShuffleIcon,
    SearchIcon,
    PlusIcon,
    PencilIcon,
    EllipsisIcon,
    MusicIcon,
    AlbumIcon,
    UserIcon,
  } from "@lucide/svelte";

  const playlistId = $derived(page.params.id);

  let playlist = $state<PlaylistDetail | null>(null);
  let loading = $state(true);
  let searchQuery = $state("");

  const addTracksDialog = useDialogState("add-tracks");
  const editDialog = useDialogState("edit-playlist");

  const existingTrackIds = $derived(
    new SvelteSet(playlist?.items.map((item) => item.audio.id) ?? [])
  );

  const filteredTracks = $derived(
    searchQuery.trim()
      ? filterTracks(playlist?.items ?? [], searchQuery)
      : (playlist?.items ?? [])
  );

  onMount(() => loadPlaylist());

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
      const response = await getPlaylistById(playlistId);
      playlist = response.playlist;
      if (playlist) updateNavigation(playlist.name);
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
    goto("/library");
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
    <div class="border-b p-4 flex max-md:flex-col gap-4 items-end relative">
      <div class="size-48 border max-md:mx-auto flex-shrink-0 overflow-hidden">
        <img
          loading="lazy"
          src={getPlaylistImageUrl(playlist.id)}
          alt={playlist.name}
          class="w-full h-full object-cover"
          onerror={handlePlaylistImageError}
        />
        <div class="w-full h-full bg-muted hidden place-items-center">
          {#if playlist && isArtistPlaylist(playlist.id)}
            <UserIcon
              size={48}
              absoluteStrokeWidth
              strokeWidth={2}
              class="text-muted-foreground"
            />
          {:else if playlist && isAlbumPlaylist(playlist.id)}
            <AlbumIcon
              size={48}
              absoluteStrokeWidth
              strokeWidth={2}
              class="text-muted-foreground"
            />
          {:else}
            <MusicIcon
              size={48}
              absoluteStrokeWidth
              strokeWidth={2}
              class="text-muted-foreground"
            />
          {/if}
        </div>
      </div>

      <div
        class="flex-1 min-w-0 flex max-md:w-full max-md:flex-col max-md:text-center md:items-end items-center justify-between gap-4"
      >
        <div class="flex-1 min-w-0">
          <h1 class="text-2xl font-semibold truncate">{playlist.name}</h1>
          <p class="text-sm text-muted-foreground">
            {playlist.items.length} tracks
          </p>
        </div>

        <div class="flex max-md:w-full gap-2 flex-shrink-0">
          <button
            onclick={handlePlay}
            disabled={playlist.items.length === 0}
            class="max-md:w-full px-4 py-2 border bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center max-md:justify-center gap-2"
          >
            <PlayIcon size={16} />
            Play
          </button>
          <button
            onclick={handleShuffle}
            disabled={playlist.items.length === 0}
            class="max-md:w-full px-4 py-2 border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center max-md:justify-center gap-2"
          >
            <ShuffleIcon size={16} />
            Shuffle
          </button>
        </div>
      </div>

      <div class="absolute top-4 right-4">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <button
              class="p-2 hover:bg-muted transition-colors border"
              title="Playlist options"
            >
              <EllipsisIcon size={20} />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end">
            <DropdownMenu.Item onclick={() => editDialog.open()}>
              <PencilIcon size={16} class="mr-2" />
              Edit Playlist
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>
    </div>

    <div class="flex items-center border-b">
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
        <div
          class={searchQuery.trim()
            ? "flex flex-col items-center justify-center p-8 h-full"
            : "h-24"}
        >
          {#if searchQuery.trim()}
            <p class="text-muted-foreground mb-2">No tracks found</p>
            <p class="text-sm text-muted-foreground">
              Try a different search query
            </p>
          {/if}
        </div>
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

  <EditPlaylistDialog
    open={editDialog.isOpen}
    onOpenChange={(open) => !open && editDialog.close()}
    {playlist}
    onUpdated={handlePlaylistUpdated}
    onDeleted={handlePlaylistDeleted}
  />
{/if}
