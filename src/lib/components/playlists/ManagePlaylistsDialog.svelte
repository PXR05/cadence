<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";
  import {
    getUserPlaylists,
    getPlaylistById,
    addItemToPlaylist,
    removeItemFromPlaylist,
  } from "$lib/api";
  import { LoaderIcon } from "@lucide/svelte";
  import { SvelteSet } from "svelte/reactivity";

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    trackId: string;
    trackTitle: string;
    onSuccess?: (removedFromPlaylists: string[]) => void;
  }

  let { open, onOpenChange, trackId, trackTitle, onSuccess }: Props = $props();

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
      const response = await getUserPlaylists();
      playlists = response.playlists;

      const trackInPlaylists = new SvelteSet<string>();
      await Promise.all(
        playlists.map(async (playlist) => {
          try {
            const details = await getPlaylistById(playlist.id);
            const hasTrack = details.playlist.items.some(
              (item) => item.audio.id === trackId
            );
            if (hasTrack) {
              trackInPlaylists.add(playlist.id);
            }
          } catch (error) {
            console.error(`Failed to check playlist ${playlist.id}:`, error);
          }
        })
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
        ...toAdd.map((playlistId) => addItemToPlaylist(playlistId, trackId)),
        ...toRemove.map(async (playlistId) => {
          const details = await getPlaylistById(playlistId);
          const item = details.playlist.items.find(
            (i) => i.audio.id === trackId
          );
          if (item) {
            return removeItemFromPlaylist(playlistId, item.id);
          }
        }),
      ]);

      onSuccess?.(toRemove);
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

  const hasChanges = $derived(
    JSON.stringify([...playlistsWithTrack].sort()) !==
      JSON.stringify([...originalPlaylistsWithTrack].sort())
  );
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
  <Dialog.Content class="sm:max-w-md p-4">
    <Dialog.Header class="text-left truncate">
      <Dialog.Title>Add to Playlists</Dialog.Title>
      <Dialog.Description class="truncate">
        {trackTitle}
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4">
      {#if loading}
        <div class="flex items-center justify-center p-8">
          <LoaderIcon class="animate-spin text-muted-foreground" size={24} />
        </div>
      {:else if playlists.length === 0}
        <p class="text-center text-muted-foreground text-sm p-8">
          No playlists found. Create a playlist first.
        </p>
      {:else}
        <div class="border max-h-64 overflow-y-auto">
          {#each playlists as playlist (playlist.id)}
            {@const isSelected = playlistsWithTrack.has(playlist.id)}
            <button
              onclick={() => togglePlaylist(playlist.id)}
              class="w-full flex items-center gap-3 p-3 border-b hover:bg-muted/30 transition-colors text-left"
              class:bg-muted={isSelected}
              disabled={saving}
            >
              <div class="size-4 border flex-shrink-0 grid place-items-center">
                {#if isSelected}
                  <div class="size-2 bg-primary"></div>
                {/if}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate">{playlist.name}</p>
                <p class="text-xs text-muted-foreground">
                  {playlist.itemCount ?? 0} tracks
                </p>
              </div>
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <div class="flex gap-2 justify-end">
      <Button
        variant="outline"
        onclick={() => handleOpenChange(false)}
        disabled={saving}
      >
        Cancel
      </Button>
      <Button onclick={handleSave} disabled={!hasChanges || saving}>
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
