<script lang="ts">
  import { getStreamUrl, getImageUrl } from "$lib/stores/player.svelte";
  import { playerStore } from "$lib/stores/player.svelte";
  import { tracksStore } from "$lib/stores/tracks.svelte";
  import * as ContextMenu from "$lib/components/ui/context-menu";
  import { ManagePlaylistsDialog } from "../playlists";
  import {
    DownloadIcon,
    ListMusicIcon,
    PlusIcon,
    SkipForwardIcon,
    CloudCheckIcon,
  } from "@lucide/svelte";
  import { isTrackOffline } from "$lib/db/offline";
  import { onMount } from "svelte";

  interface Props {
    track: AudioFile;
    fromQueue?: boolean;
    onRemovedFromPlaylist?: (trackId: string, playlistIds: string[]) => void;
  }

  let { track, fromQueue = false, onRemovedFromPlaylist }: Props = $props();

  const isCurrentTrack = $derived(playerStore.currentTrack?.id === track.id);
  const title = $derived(track.metadata?.title ?? track.filename);
  const artist = $derived(track.metadata?.artist ?? "Unknown");

  let managePlaylistsDialogOpen = $state(false);
  let isOffline = $state(false);

  onMount(async () => {
    isOffline = await isTrackOffline(track.id);
  });

  async function handlePlay() {
    if (fromQueue) {
      const trackIndex = playerStore.trackQueue.findIndex(
        (t) => t.id === track.id
      );
      if (trackIndex !== -1) {
        playerStore.queueIndex = trackIndex;
        playerStore.play(track);
        return;
      }
    }
    
    if (onRemovedFromPlaylist) {
      const trackIndex = playerStore.trackQueue.findIndex(
        (t) => t.id === track.id
      );
      playerStore.setQueue([], trackIndex);
    } else {
    const shuffledTracks = tracksStore.getShuffledTracks(track);
    playerStore.setQueue(shuffledTracks, 0);
    }
  }

  function handlePlayNext() {
    playerStore.addNextInQueue(track);
  }

  function handleAddToQueue() {
    playerStore.addToQueue(track);
  }

  function handleDownload() {
    const downloadUrl = getStreamUrl(track.id);
    const link = document.createElement("a");
    link.href = downloadUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
</script>

<ContextMenu.Root>
  <ContextMenu.Trigger>
    <button
      class="flex items-center gap-4 w-full hover:bg-muted/30 p-3 border-b"
      class:bg-muted={isCurrentTrack}
      class:text-primary={isCurrentTrack}
      onclick={handlePlay}
    >
      <div class="border size-16 flex-shrink-0 overflow-hidden">
        <img
          loading="lazy"
          src={getImageUrl(track.id)}
          alt={track.id}
          class="size-full object-cover"
        />
      </div>
      <div class="flex flex-col text-left flex-1 min-w-0">
        <div class="flex items-center gap-1.5">
          <p class="font-medium truncate">
            {title}
          </p>
          {#if isOffline}
            <CloudCheckIcon
              size={16}
              class="flex-shrink-0 text-primary"
            />
          {/if}
        </div>
        <p class="truncate text-muted-foreground text-sm">
          {artist}
        </p>
      </div>
    </button>
  </ContextMenu.Trigger>
  <ContextMenu.Content>
    <ContextMenu.Item onclick={handlePlayNext}>
      <SkipForwardIcon size={16} class="mr-2" />
      Play Next
    </ContextMenu.Item>
    <ContextMenu.Item onclick={handleAddToQueue}>
      <PlusIcon size={16} class="mr-2" />
      Add to Queue
    </ContextMenu.Item>
    <ContextMenu.Separator />
    <ContextMenu.Item onclick={() => (managePlaylistsDialogOpen = true)}>
      <ListMusicIcon size={16} class="mr-2" />
      Add to Playlist
    </ContextMenu.Item>
    <ContextMenu.Separator />
    <ContextMenu.Item onclick={handleDownload}>
      <DownloadIcon size={16} class="mr-2" />
      Download
    </ContextMenu.Item>
  </ContextMenu.Content>
</ContextMenu.Root>

<ManagePlaylistsDialog
  open={managePlaylistsDialogOpen}
  onOpenChange={(open) => (managePlaylistsDialogOpen = open)}
  trackId={track.id}
  trackTitle={title}
  onSuccess={(removedFromPlaylists) =>
    onRemovedFromPlaylist?.(track.id, removedFromPlaylists)}
/>
