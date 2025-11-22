<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { VirtualScroll } from "$lib/components/ui/virtual-scroll";
  import { tracksStore } from "$lib/stores/tracks.svelte";
  import { getImageUrl } from "$lib/stores/player.svelte";
  import { addItemToPlaylist } from "$lib/remote";
  import { SearchIcon, LoaderIcon, XIcon, ChevronDown } from "@lucide/svelte";
  import { SvelteSet } from "svelte/reactivity";
  import { playlistsStore } from "$lib/stores/playlists.svelte";
  import { invalidateAll } from "$app/navigation";

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    playlistId: string;
    existingTrackIds: Set<string>;
  }

  let { open, onOpenChange, playlistId, existingTrackIds }: Props = $props();

  let selectedTracks = $state(new SvelteSet<string>());
  let searchQuery = $state("");
  let loading = $state(false);
  let searchInput: HTMLInputElement | null = $state(null);

  const tracks = $derived(tracksStore.tracks);
  const availableTracks = $derived(
    tracks.filter((track) => !existingTrackIds.has(track.id)),
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
      : availableTracks,
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
          addItemToPlaylist({ playlistId, audioId: trackId }),
        ),
      );

      await playlistsStore.invalidatePlaylistDetail(playlistId);
      await invalidateAll();

      resetDialog();
      onOpenChange(false);
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
  const isEmpty = $derived(searchQuery.trim().length === 0);
  const ROW_HEIGHT = 68;

  function clearSearch() {
    searchQuery = "";
  }
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
  <Dialog.Content
    showCloseButton={false}
    class="md:max-w-2xl h-dvh md:h-[90dvh] overflow-clip max-w-dvw flex flex-col z-60 p-0 max-md:border-0 rounded-none md:rounded-2xl bg-background"
  >
    <div
      class="absolute top-1.5 left-1.5 right-1.5 z-10 rounded-lg bg-muted border border-input/15 flex flex-col"
    >
      <div class="px-2 py-3 flex justify-between items-center">
        <Dialog.Close
          class="opacity-70 transition-opacity hover:opacity-100 my-auto size-8 grid place-items-center"
        >
          <ChevronDown />
        </Dialog.Close>

        <Dialog.Header>
          <Dialog.Title class="text-center">Add to Tracks</Dialog.Title>
        </Dialog.Header>

        <Dialog.Close class="opacity-0 pointer-events-none">
          <ChevronDown />
        </Dialog.Close>
      </div>
      <div class="flex items-center p-1.5">
        <SearchIcon
          size={16}
          class="absolute transition-all text-muted-foreground flex-shrink-0
          {!isEmpty ? 'opacity-0' : ''}"
          style="transform: translateX({!isEmpty ? '0' : '0.75rem'})"
        />
        <Input
          bind:ref={searchInput}
          bind:value={searchQuery}
          type="text"
          placeholder="search..."
          class="flex-1 text-base h-auto transition-all px-3 py-3 outline-none !bg-background rounded-lg border border-input/15
            {!isEmpty ? '' : 'pl-9'}"
          disabled={loading}
        />
        <Button
          variant="ghost"
          size="icon"
          class="text-muted-foreground absolute right-1 rounded-lg
            {isEmpty ? 'opacity-0' : ''}"
          style="transform: translateX({isEmpty ? '0.5rem' : '0rem'})"
          onclick={clearSearch}
          disabled={isEmpty || loading}
        >
          {#if !isEmpty}
            <XIcon size={16} />
          {/if}
        </Button>
      </div>
    </div>

    <VirtualScroll
      items={filteredTracks}
      rowHeight={ROW_HEIGHT}
      class="mt-30 h-[calc(100dvh-8rem)] md:h-[calc(90dvh-8rem)]"
      topOffset={8}
      leftPadding={8}
      rightPadding={8}
      itemGap={4}
      getItemKey={(track) => track.id}
    >
      {#snippet emptyState()}
        <div class="text-center py-8 text-muted-foreground pt-15.5">
          {#if availableTracks.length === 0}
            All tracks are already in this playlist
          {:else if searchQuery.trim()}
            No tracks found
          {:else}
            No tracks available
          {/if}
        </div>
      {/snippet}

      {#snippet children({ item: track, actualIndex })}
        {@const isSelected = selectedTracks.has(track.id)}
        {@const title = track.metadata?.title || track.filename}
        {@const artist = track.metadata?.artist || "Unknown"}

        <Button
          variant="ghost"
          onclick={() => toggleTrack(track.id)}
          disabled={loading}
          class="h-auto !transition-none w-full flex items-center gap-3 p-2 text-left group
            {isSelected ? 'bg-muted/70' : ''}
            {actualIndex === filteredTracks.length - 1 ? 'mb-20' : ''}"
        >
          <div
            class="size-4 border-2 border-muted-foreground flex-shrink-0 grid place-items-center rounded-sm"
          >
            {#if isSelected}
              <div class="size-2 bg-primary rounded-sm"></div>
            {/if}
          </div>

          <div
            class="size-12 border flex-shrink-0 overflow-hidden rounded-md bg-muted"
          >
            <img
              loading="lazy"
              src={getImageUrl(track.id)}
              alt={title}
              class="size-full object-cover"
            />
          </div>

          <div class="flex-1 min-w-0">
            <p class="font-medium truncate text-sm">
              {title}
            </p>
            <p class="text-xs truncate text-muted-foreground">
              {artist}
            </p>
          </div>
        </Button>
      {/snippet}
    </VirtualScroll>

    <div
      class="absolute bottom-1.5 left-1.5 right-1.5 z-10 rounded-lg bg-muted border border-input/15 p-1.5 flex gap-1.5"
    >
      <Button
        variant="outline"
        onclick={() => handleOpenChange(false)}
        disabled={loading}
        class="dark:bg-background h-11 flex-1 "
      >
        Cancel
      </Button>
      <Button onclick={handleAdd} disabled={!isValid} class="h-11 flex-1">
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