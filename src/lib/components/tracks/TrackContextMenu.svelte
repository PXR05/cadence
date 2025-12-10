<script lang="ts">
  import { getStreamUrl } from "$lib/stores/player.svelte";
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
    CloudDownloadIcon,
    CloudOffIcon,
    Trash2Icon,
  } from "@lucide/svelte";
  import type { AudioFile } from "$lib/schemas";
  import { useDialogState } from "$lib/hooks";
  import { toast } from "svelte-sonner";
  import { DeleteTrackDialog } from "../admin";
  import type { Snippet } from "svelte";

  interface Props {
    track: AudioFile;
    isOffline: boolean;
    onOfflineStatusChange?: () => void;
    children: Snippet;
  }

  let { track, isOffline, onOfflineStatusChange, children }: Props = $props();

  const title = $derived(track.metadata?.title ?? track.filename);

  const managePlaylistDialog = useDialogState("manage-playlist-" + track.id);

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
    onOfflineStatusChange?.();
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
  <ContextMenu.Trigger>
    {@render children()}
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
