<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";
  import { VirtualScroll } from "$lib/components/ui/virtual-scroll";
  import {
    getPlaylistById,
    addItemToPlaylist,
    removeItemFromPlaylist,
  } from "$lib/remote";
  import { playlistsStore } from "$lib/stores/playlists.svelte";
  import { LoaderIcon, ChevronDown } from "@lucide/svelte";
  import { SvelteSet } from "svelte/reactivity";
  import type { Playlist } from "$lib/schemas";
  import { invalidateAll } from "$app/navigation";

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    trackId: string;
    trackTitle: string;
  }

  let { open, onOpenChange, trackId, trackTitle }: Props = $props();

  let playlists = $state<Playlist[]>([]);
  let playlistsWithTrack = $state(new SvelteSet<string>());
  let originalPlaylistsWithTrack = $state(new SvelteSet<string>());
  let loading = $state(true);
  let saving = $state(false);

  $effect(() => {
    if (open) {
      loadPlaylists();
    }
  });

  async function loadPlaylists() {
    loading = true;
    try {
      await playlistsStore.loadUserPlaylists();
      playlists = playlistsStore.userPlaylists.concat(
        playlistsStore.youtubePlaylists,
      );

      const trackInPlaylists = new SvelteSet<string>();
      await Promise.all(
        playlists.map(async (playlist) => {
          try {
            const details = await getPlaylistById(playlist.id);
            const hasTrack = details.playlist.items.some(
              (item) => item.audio.id === trackId,
            );
            if (hasTrack) {
              trackInPlaylists.add(playlist.id);
            }
          } catch (error) {
            console.error(`Failed to check playlist ${playlist.id}:`, error);
          }
        }),
      );

      playlistsWithTrack = trackInPlaylists;
      originalPlaylistsWithTrack = new SvelteSet(trackInPlaylists);
    } catch (error) {
      console.error("Failed to load playlists:", error);
    } finally {
      loading = false;
    }
  }

  function togglePlaylist(playlistId: string) {
    if (playlistsWithTrack.has(playlistId)) {
      playlistsWithTrack.delete(playlistId);
    } else {
      playlistsWithTrack.add(playlistId);
    }
    playlistsWithTrack = playlistsWithTrack;
  }

  async function handleSave() {
    saving = true;
    try {
      const toAdd: string[] = [];
      const toRemove: string[] = [];

      for (const playlistId of playlistsWithTrack) {
        if (!originalPlaylistsWithTrack.has(playlistId)) {
          toAdd.push(playlistId);
        }
      }

      for (const playlistId of originalPlaylistsWithTrack) {
        if (!playlistsWithTrack.has(playlistId)) {
          toRemove.push(playlistId);
        }
      }

      await Promise.all([
        ...toAdd.map((playlistId) =>
          addItemToPlaylist({ playlistId, audioId: trackId }),
        ),
        ...toRemove.map(async (playlistId) => {
          const details = await getPlaylistById(playlistId);
          const item = details.playlist.items.find(
            (i) => i.audio.id === trackId,
          );
          if (item) {
            return removeItemFromPlaylist({ playlistId, itemId: item.id });
          }
        }),
      ]);

      await Promise.all([
        ...toAdd.map(async (playlistId) => {
          await playlistsStore.invalidatePlaylistDetail(playlistId);
        }),
        ...toRemove.map(async (playlistId) => {
          await playlistsStore.invalidatePlaylistDetail(playlistId);
        }),
      ]);

      await invalidateAll();

      handleOpenChange(false);
    } catch (error) {
      console.error("Failed to update playlists:", error);
    } finally {
      saving = false;
    }
  }

  function handleOpenChange(isOpen: boolean) {
    onOpenChange(isOpen);
  }
  const ROW_HEIGHT = 52;
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
  <Dialog.Content
    showCloseButton={false}
    class="md:max-w-2xl h-dvh md:h-[90dvh] overflow-clip max-w-dvw flex flex-col z-60 p-0 max-md:border-0 rounded-none md:rounded-2xl bg-background"
  >
    <div
      class="absolute top-1.5 left-1.5 right-1.5 z-10 rounded-lg bg-muted border border-input/15 px-2 py-3 flex justify-between items-start"
    >
      <Dialog.Close
        class="opacity-70 transition-opacity hover:opacity-100 my-auto size-8 grid place-items-center"
      >
        <ChevronDown />
      </Dialog.Close>

      <Dialog.Header class="truncate">
        <Dialog.Title class="text-center">Add to Playlists</Dialog.Title>
        <Dialog.Description class="truncate text-center">
          {trackTitle}
        </Dialog.Description>
      </Dialog.Header>

      <Dialog.Close class="opacity-0 pointer-events-none">
        <ChevronDown />
      </Dialog.Close>
    </div>

    {#if loading}
      <div
        class="flex items-center justify-center flex-1 text-muted-foreground"
      >
        <LoaderIcon class="animate-spin" size={24} />
      </div>
    {:else if playlists.length === 0}
      <div class="flex items-center justify-center flex-1 p-8">
        <p class="text-center text-muted-foreground text-sm">
          No playlists found. Create a playlist first.
        </p>
      </div>
    {:else}
      <VirtualScroll
        items={playlists}
        rowHeight={ROW_HEIGHT}
        class="h-dvh md:h-[calc(90dvh-1rem)]"
        topOffset={82}
        leftPadding={8}
        rightPadding={8}
        itemGap={4}
        getItemKey={(playlist) => playlist.id}
      >
        {#snippet emptyState()}
          <div class="text-center py-8 text-muted-foreground pt-15.5">
            No playlists available
          </div>
        {/snippet}

        {#snippet children({ item: playlist, actualIndex })}
          {@const isSelected = playlistsWithTrack.has(playlist.id)}

          <Button
            variant="ghost"
            onclick={() => togglePlaylist(playlist.id)}
            disabled={saving}
            class="h-auto !transition-none w-full flex items-center gap-3 p-2 text-left group
              {isSelected ? 'bg-muted/70' : ''} {actualIndex ===
            playlists.length - 1
              ? 'mb-20'
              : ''}"
          >
            <div
              class="size-4 border-2 border-muted-foreground flex-shrink-0 grid place-items-center rounded-sm"
            >
              {#if isSelected}
                <div class="size-2 bg-primary rounded-sm"></div>
              {/if}
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-medium truncate text-sm">{playlist.name}</p>
              <p class="text-xs text-muted-foreground truncate">
                {playlist.itemCount ?? 0} tracks
              </p>
            </div>
          </Button>
        {/snippet}
      </VirtualScroll>
    {/if}

    <div
      class="absolute bottom-1.5 left-1.5 right-1.5 z-10 rounded-lg bg-muted border border-input/15 p-1.5 flex gap-1.5"
    >
      <Button
        variant="outline"
        onclick={() => handleOpenChange(false)}
        disabled={saving}
        class="dark:bg-background h-11 flex-1"
      >
        Cancel
      </Button>
      <Button onclick={handleSave} disabled={saving} class="h-11 flex-1">
        {#if saving}
          <LoaderIcon class="animate-spin" size={14} />
          Saving...
        {:else}
          Save
        {/if}
      </Button>
    </div>
  </Dialog.Content>
</Dialog.Root>
