<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";
  import { VirtualScroll } from "$lib/components/ui/virtual-scroll";
  import {
    getPlaylistById,
    addItemToPlaylist,
    removeItemFromPlaylist,
  } from "$lib/api";
  import { playlistsStore } from "$lib/stores/playlists.svelte";
  import { Loader as LoaderIcon, ChevronDown as ChevronDownIcon } from "@lucide/svelte";
  import { SvelteSet } from "svelte/reactivity";
  import type { Playlist } from "$lib/schemas";
  import { invalidateAll } from "$app/navigation";
  import PlaylistCoverImage from "./PlaylistCoverImage.svelte";
  import { appearanceStore } from "$lib/stores/appearance.svelte";

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
        playlistsStore.tidalPlaylists,
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

      handleOpenChange(false);

      await invalidateAll();
    } catch (error) {
      console.error("Failed to update playlists:", error);
    } finally {
      saving = false;
    }
  }

  function handleOpenChange(isOpen: boolean) {
    onOpenChange(isOpen);
  }
  const ROW_HEIGHT = 72;
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
  <Dialog.Content
    showCloseButton={false}
    class="md:max-w-2xl h-dvh md:h-[90dvh] overflow-clip max-w-dvw flex flex-col z-60 p-0 max-md:border-0 max-md:rounded-none bg-background"
  >
    <div
      class="absolute z-10 inset-0 flex flex-col h-dvh md:h-[90dvh] pointer-events-none"
      style="
        background: linear-gradient(
          to top,
          color-mix(in oklab, var(--background) 100%, transparent) 0%,
          color-mix(in oklab, var(--background) 0%, transparent) 15%,
          color-mix(in oklab, var(--background) 0%, transparent) 85%,
          color-mix(in oklab, var(--background) 100%, transparent) 100%
        );
      "
    ></div>

    <div
      class="absolute top-2 left-2 right-2 z-10 rounded-3xl border border-muted-foreground/10 flex flex-col
      {appearanceStore.disableBlur
        ? 'bg-muted'
        : 'bg-muted-foreground/10 dark:bg-muted/60 backdrop-blur-md'}"
    >
      <div class="px-2 py-3 flex justify-between items-start">
        <Dialog.Close
          class="opacity-70 transition-opacity hover:opacity-100 my-auto size-8 grid place-items-center"
        >
          <ChevronDownIcon />
        </Dialog.Close>

        <Dialog.Header class="min-w-0">
          <Dialog.Title class="text-center">Add to Playlists</Dialog.Title>
          <Dialog.Description class="truncate text-center">
            {trackTitle}
          </Dialog.Description>
        </Dialog.Header>

        <Dialog.Close class="opacity-0 pointer-events-none">
          <ChevronDownIcon />
        </Dialog.Close>
      </div>
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
        class="h-dvh md:h-[90dvh]"
        topOffset={90}
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
            class="h-auto rounded-2xl transition-none! w-full flex items-center gap-3 p-2 text-left group
              {isSelected ? 'bg-muted/60' : ''} {actualIndex ===
            playlists.length - 1
              ? 'mb-20'
              : ''}"
          >
            <div
              class="size-4 border-2 border-muted-foreground shrink-0 grid place-items-center rounded-full"
            >
              {#if isSelected}
                <div class="size-2 bg-foreground rounded-full"></div>
              {/if}
            </div>

            <div
              class="size-14 border shrink-0 overflow-hidden rounded-lg bg-muted"
            >
              <PlaylistCoverImage
                {playlist}
                iconSize={20}
                youtubeIconSize={18}
                containerClass="relative grid place-items-center size-full"
                iconWrapperClass="absolute inset-0 grid place-items-center"
                imageClass="size-full object-cover relative z-10"
                fallbackIconClass="text-muted-foreground"
              />
            </div>

            <div class="flex-1 min-w-0">
              <p class="font-medium truncate text-base">{playlist.name}</p>
              <p class="text-sm text-muted-foreground truncate">
                {playlist.itemCount ?? 0} tracks
              </p>
            </div>
          </Button>
        {/snippet}
      </VirtualScroll>
    {/if}

    <div
      class="absolute bottom-2 left-2 right-2 z-10 rounded-4xl border border-muted-foreground/10 p-1.5 flex gap-1.5
      {appearanceStore.disableBlur
        ? 'bg-muted'
        : 'bg-muted-foreground/10 dark:bg-muted/60 backdrop-blur-md'}"
    >
      <Button
        variant="outline"
        onclick={() => handleOpenChange(false)}
        disabled={saving}
        class="dark:bg-foreground/10 h-11 flex-1 rounded-3xl"
      >
        Cancel
      </Button>
      <Button
        onclick={handleSave}
        disabled={saving}
        class="h-11 flex-1 rounded-3xl bg-foreground hover:bg-foreground/90 text-background"
      >
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
