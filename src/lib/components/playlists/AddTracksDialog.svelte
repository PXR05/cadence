<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";
  import { tracksStore } from "$lib/stores/tracks.svelte";
  import { getImageUrl } from "$lib/stores/player.svelte";
  import { addItemToPlaylist } from "$lib/api";
  import { SearchIcon, LoaderIcon } from "@lucide/svelte";
  import { SvelteSet } from "svelte/reactivity";

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    playlistId: string;
    existingTrackIds: Set<string>;
    onTracksAdded?: () => void;
  }

  let {
    open,
    onOpenChange,
    playlistId,
    existingTrackIds,
    onTracksAdded,
  }: Props = $props();

  let selectedTracks = $state(new SvelteSet<string>());
  let searchQuery = $state("");
  let loading = $state(false);

  const tracks = $derived(tracksStore.tracks);
  const availableTracks = $derived(
    tracks.filter((track) => !existingTrackIds.has(track.id))
  );
  const filteredTracks = $derived(
    searchQuery.trim()
      ? availableTracks.filter((track) => {
          const title = track.metadata?.title || track.filename;
          const artist = track.metadata?.artist || "";
          const query = searchQuery.toLowerCase();
          return (
            title.toLowerCase().includes(query) ||
            artist.toLowerCase().includes(query)
          );
        })
      : availableTracks
  );

  function toggleTrack(trackId: string) {
    if (selectedTracks.has(trackId)) {
      selectedTracks.delete(trackId);
    } else {
      selectedTracks.add(trackId);
    }
    selectedTracks = selectedTracks;
  }

  async function handleAdd() {
    if (selectedTracks.size === 0) return;

    loading = true;
    try {
      await Promise.all(
        Array.from(selectedTracks).map((trackId) =>
          addItemToPlaylist(playlistId, trackId)
        )
      );
      resetDialog();
      onOpenChange(false);
      onTracksAdded?.();
    } catch (error) {
      console.error("Failed to add tracks:", error);
    } finally {
      loading = false;
    }
  }

  function resetDialog() {
    selectedTracks = new SvelteSet<string>();
    searchQuery = "";
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      resetDialog();
    }
    onOpenChange(isOpen);
  }

  const isValid = $derived(selectedTracks.size > 0 && !loading);
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
  <Dialog.Content
    class="md:max-w-2xl h-dvh md:max-h-[90dvh] sm:max-w-dvw max-w-dvw flex flex-col p-0"
  >
    <Dialog.Header class="p-6 pb-4 text-left">
      <Dialog.Title>Add Tracks</Dialog.Title>
    </Dialog.Header>

    <div class="flex-1 overflow-y-auto px-4 space-y-4">
      <div class="relative">
        <SearchIcon
          size={16}
          class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Search tracks..."
          class="w-full pl-9 pr-3 py-2 text-sm border bg-background"
          disabled={loading}
        />
      </div>

      {#if selectedTracks.size > 0}
        <p class="text-sm text-muted-foreground">
          {selectedTracks.size} track{selectedTracks.size !== 1 ? "s" : ""} selected
        </p>
      {/if}

      <div
        class="border overflow-y-auto
        {selectedTracks.size === 0
          ? 'h-[calc(100dvh-12.5rem)] md:h-[calc(90dvh-12.5rem)]'
          : 'h-[calc(100dvh-15rem)] md:h-[calc(90dvh-15rem)]'}"
      >
        {#if filteredTracks.length === 0}
          <div class="p-8 text-center text-muted-foreground text-sm">
            {#if availableTracks.length === 0}
              All tracks are already in this playlist
            {:else}
              No tracks found
            {/if}
          </div>
        {:else}
          {#each filteredTracks as track (track.id)}
            {@const isSelected = selectedTracks.has(track.id)}
            {@const title = track.metadata?.title || track.filename}
            {@const artist = track.metadata?.artist || "Unknown"}
            <button
              onclick={() => toggleTrack(track.id)}
              class="w-full flex items-center gap-3 p-3 border-b hover:bg-muted/30 text-left"
              class:bg-muted={isSelected}
              disabled={loading}
            >
              <div class="size-4 border flex-shrink-0 grid place-items-center">
                {#if isSelected}
                  <div class="size-2 bg-primary"></div>
                {/if}
              </div>
              <div class="size-12 border flex-shrink-0 overflow-hidden">
                <img
                  loading="lazy"
                  src={getImageUrl(track.id)}
                  alt={track.id}
                  class="size-full object-cover"
                />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate">{title}</p>
                <p class="text-xs text-muted-foreground truncate">{artist}</p>
              </div>
            </button>
          {/each}
        {/if}
      </div>
    </div>

    <div class="p-4 pt-0 flex gap-2 justify-end">
      <Button
        variant="outline"
        onclick={() => handleOpenChange(false)}
        disabled={loading}
      >
        Cancel
      </Button>
      <Button onclick={handleAdd} disabled={!isValid}>
        {#if loading}
          <LoaderIcon class="animate-spin" size={14} />
          Adding...
        {:else}
          Add {selectedTracks.size > 0 ? `(${selectedTracks.size})` : ""}
        {/if}
      </Button>
    </div>
  </Dialog.Content>
</Dialog.Root>
