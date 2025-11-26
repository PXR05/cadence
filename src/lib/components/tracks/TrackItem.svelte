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
    Trash2Icon,
  } from "@lucide/svelte";
  import { onMount } from "svelte";
  import type { AudioFile, PlaylistDetail } from "$lib/schemas";
  import { useDialogState } from "$lib/hooks";
  import { toast } from "svelte-sonner";
  import { DeleteTrackDialog } from "../admin";

  interface Props {
    index: number;
    track: AudioFile;
    isCurrentTrack: boolean;
    playlist?: PlaylistDetail;
    fromQueue?: boolean;
  }

  let {
    index,
    track,
    isCurrentTrack,
    playlist,
    fromQueue = false,
  }: Props = $props();

  const title = $derived(track.metadata?.title ?? track.filename);
  const artist = $derived(track.metadata?.artist ?? "Unknown");

  const managePlaylistDialog = useDialogState("manage-playlist-" + track.id);

  let isOffline = $state(false);

  onMount(async () => {
    isOffline = await downloadStore.checkTrackOfflineStatus(track.id);
  });

  async function handlePlay() {
    if (fromQueue) {
      playerStore.queueIndex = index;
      playerStore.play({ index });
    }

    if (playlist) {
      const tracks = playlist.items.map((item) => item.audio);
      const actualIndex =
        playlist.items.findIndex((item) => item.audio.id === track.id) ?? index;
      playerStore.setQueue(tracks, actualIndex);
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
        track.size,
      );
    }
    isOffline = await downloadStore.checkTrackOfflineStatus(track.id);
  }

  let deleteTrackDialogOpen = $state(false);
  async function confirmDeleteTrack() {
    deleteTrackDialogOpen = false;
    try {
      await tracksStore.deleteTrack(track.id);
      const queueIndex = playerStore.trackQueue.findIndex(
        (queuedTrack) => queuedTrack.id === track.id,
      );
      if (queueIndex !== -1) {
        playerStore.removeFromQueue(queueIndex);
      }
      toast.success("Track deleted");
    } catch (e) {
      console.error("Failed to delete track", e);
      toast.error("Failed to delete track", {
        description: e instanceof Error ? e.message : JSON.stringify(e),
      });
    }
  }
</script>

<ContextMenu.Root>
  <ContextMenu.Trigger
    class="relative flex items-center gap-4 w-full hover:bg-muted/30 p-2 select-none
    {isCurrentTrack ? 'bg-muted/50' : ''}"
    onclick={handlePlay}
  >
    <div class="rounded-md size-16 flex-shrink-0 overflow-hidden">
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
    <ContextMenu.Item onclick={() => managePlaylistDialog.open()}>
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
    <ContextMenu.Separator />
    <ContextMenu.Item
      variant="destructive"
      onclick={() => (deleteTrackDialogOpen = true)}
    >
      <Trash2Icon size={16} class="mr-2" />
      Delete Track
    </ContextMenu.Item>
  </ContextMenu.Content>
</ContextMenu.Root>

<ManagePlaylistsDialog
  open={managePlaylistDialog.isOpen}
  onOpenChange={(open) => !open && managePlaylistDialog.close()}
  trackId={track.id}
  trackTitle={title}
/>

<DeleteTrackDialog
  bind:open={deleteTrackDialogOpen}
  trackName={track?.metadata?.title || track?.filename || "this track"}
  onConfirm={confirmDeleteTrack}
/>
