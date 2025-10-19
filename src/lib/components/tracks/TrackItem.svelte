<script lang="ts">
  import { getStreamUrl, getImageUrl } from "$lib/stores/player.svelte";
  import { playerStore } from "$lib/stores/player.svelte";
  import { tracksStore } from "$lib/stores/tracks.svelte";
  import { downloadStore } from "$lib/stores/download.svelte";
  import * as ContextMenu from "$lib/components/ui/context-menu";
  import { ManagePlaylistsDialog } from "../playlists";
  import {
    DownloadIcon,
    ListMusicIcon,
    PlusIcon,
    SkipForwardIcon,
    CloudCheckIcon,
    CloudDownloadIcon,
    CloudOffIcon,
  } from "@lucide/svelte";
  import { onMount } from "svelte";

  interface Props {
    track: AudioFile;
    playlist?: PlaylistItem[];
    fromQueue?: boolean;
    onRemovedFromPlaylist?: (trackId: string, playlistIds: string[]) => void;
  }

  let {
    track,
    playlist,
    fromQueue = false,
    onRemovedFromPlaylist,
  }: Props = $props();

  const isCurrentTrack = $derived(playerStore.currentTrack?.id === track.id);
  const title = $derived(track.metadata?.title ?? track.filename);
  const artist = $derived(track.metadata?.artist ?? "Unknown");

  let managePlaylistsDialogOpen = $state(false);
  let isOffline = $state(false);

  onMount(async () => {
    isOffline = await downloadStore.checkTrackOfflineStatus(track.id);
  });

  async function handlePlay() {
    if (fromQueue) {
      const trackIndex = playerStore.trackQueue.findIndex(
        (t) => t.id === track.id,
      );
      if (trackIndex !== -1) {
        playerStore.queueIndex = trackIndex;
        playerStore.play(track);
        return;
      }
    }

    if (playlist) {
      const tracks = playlist.map((item) => item.audio);
      const trackIndex = tracks.findIndex((t) => t.id === track.id);
      playerStore.setQueue(tracks, trackIndex);
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

  async function handleToggleOffline() {
    if (isOffline) {
      await downloadStore.removeTrackOffline(track.id);
    } else {
      await downloadStore.makeTrackOffline(
        track.id,
        {
          title: track.metadata?.title,
          artist: track.metadata?.artist,
          album: track.metadata?.album,
          duration: track.metadata?.duration,
        },
        track.filename,
      );
    }
    isOffline = await downloadStore.checkTrackOfflineStatus(track.id);
  }
</script>

<ContextMenu.Root>
  <ContextMenu.Trigger
    class="relative flex items-center gap-4 w-full hover:bg-muted/30 p-2 border
    {isCurrentTrack ? 'bg-muted/50' : ''}"
    onclick={handlePlay}
  >
    <div class="border rounded-md size-16 flex-shrink-0 overflow-hidden">
      <img
        loading="lazy"
        src={getImageUrl(track.id)}
        alt={track.id}
        class="size-full object-cover"
      />
    </div>
    <div class="flex flex-col text-left flex-1 min-w-0">
      <div class="flex items-center gap-1.5">
        <p
          class="font-medium truncate {isCurrentTrack
            ? 'text-primary'
            : 'text-foreground'}"
        >
          {title}
        </p>
        {#if isOffline}
          <CloudCheckIcon size={16} class="flex-shrink-0 text-primary" />
        {/if}
      </div>
      <p
        class="truncate text-sm {isCurrentTrack
          ? 'text-primary/50'
          : 'text-muted-foreground'}"
      >
        {artist}
      </p>
    </div>
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
    <ContextMenu.Item onclick={handleToggleOffline}>
      {#if isOffline}
        <CloudOffIcon size={16} class="mr-2" />
        Remove from Offline
      {:else}
        <CloudDownloadIcon size={16} class="mr-2" />
        Make Available Offline
      {/if}
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
