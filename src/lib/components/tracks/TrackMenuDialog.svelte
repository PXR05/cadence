<script lang="ts">
  import { MenuDialog } from "$lib/components/ui/menu-dialog";
  import { trackMenuStore } from "$lib/stores/trackMenu.svelte";
  import { tracksStore } from "$lib/stores/tracks.svelte";
  import { getImageUrl, getStreamUrl } from "$lib/constants";
  import { playerStore } from "$lib/stores/player.svelte";
  import { downloadStore } from "$lib/stores/download.svelte";
  import { useDialogState, useMenuDialogState } from "$lib/hooks";
  import { ManagePlaylistsDialog } from "../playlists";
  import { DeleteTrackDialog } from "../admin";
  import { Button } from "../ui/button";
  import {
    DownloadIcon,
    ListMusicIcon,
    PlusIcon,
    SkipForwardIcon,
    CloudDownloadIcon,
    CloudOffIcon,
    Trash2Icon,
    ListXIcon,
    InfoIcon,
  } from "@lucide/svelte";
  import { toast } from "svelte-sonner";
  import { page } from "$app/state";
  import { getPlaylistById, removeItemFromPlaylist } from "$lib/api/playlist";
  import { playlistsStore } from "$lib/stores/playlists.svelte";
  import { invalidateAll, goto } from "$app/navigation";
  import { trackInfoDialogStore } from "$lib/stores/trackInfoDialog.svelte";

  const managePlaylistDialog = useDialogState("manage-playlists");
  const deleteTrackDialog = useDialogState("delete-track");

  const dialogState = useMenuDialogState({
    paramName: "track-menu",
    onOpen: restoreTrackFromId,
    onClose: () => trackMenuStore.clear(),
  });

  const playlistId = $derived.by(() => {
    if (page.url.pathname === "/playlist") {
      return page.url.searchParams.get("id") ?? null;
    } else {
      return null;
    }
  });

  async function restoreTrackFromId(trackId: string) {
    if (trackMenuStore.track?.id === trackId) return;

    const foundTrack = tracksStore.tracks.find((t) => t.id === trackId);
    if (foundTrack) {
      const offline = await downloadStore.checkTrackOfflineStatus(trackId);
      trackMenuStore.setTrack(foundTrack, offline);
    }
  }

  trackMenuStore.registerDialogHandlers(dialogState.open, dialogState.close);

  const track = $derived(trackMenuStore.track);
  const title = $derived(
    track?.metadata?.title ?? track?.filename ?? "Unknown",
  );
  const artist = $derived(track?.metadata?.artist ?? "Unknown Artist");
  const imageUrl = $derived(track ? getImageUrl(track.id) : "");

  function handleClose() {
    dialogState.close();
  }

  function handlePlayNext() {
    if (!track) return;
    playerStore.addNextInQueue(track);
    toast.success("Added to play next");
    handleClose();
  }

  function handleAddToQueue() {
    if (!track) return;
    playerStore.addToQueue(track);
    toast.success("Added to queue");
    handleClose();
  }

  function handleDownload() {
    if (!track) return;
    const downloadUrl = getStreamUrl(track.id);
    const link = document.createElement("a");
    link.href = downloadUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    handleClose();
  }

  async function handleToggleOffline() {
    if (!track) return;
    handleClose();
    if (trackMenuStore.isOffline) {
      await downloadStore.removeTrackOffline(track.id);
      toast.success("Removed from offline");
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
      toast.success("Available offline");
    }
    trackMenuStore.onOfflineStatusChange?.();
    trackMenuStore.updateOfflineStatus(!trackMenuStore.isOffline);
  }

  function handleAddToPlaylist() {
    managePlaylistDialog.open();
  }

  function handleOpenTrackInfo() {
    if (!track) return;

    trackInfoDialogStore.setTrack(track);

    const url = new URL(page.url);
    url.searchParams.delete("track-menu");
    url.searchParams.set("track-info", track.id);

    goto(url.toString(), {
      replaceState: false,
      noScroll: true,
      keepFocus: true,
    });
  }

  async function handleRemoveFromPlaylist() {
    if (!track || !playlistId) return;

    const details = await getPlaylistById(playlistId);
    const item = details.playlist.items.find((i) => i.audio.id === track.id);
    if (item) {
      await removeItemFromPlaylist({ playlistId, itemId: item.id });
      await playlistsStore.invalidatePlaylistDetail(playlistId);
      await invalidateAll();
    }

    handleClose();
    toast.success("Track removed from playlist");
  }

  function handleDeleteTrack() {
    deleteTrackDialog.open();
  }

  async function confirmDeleteTrack() {
    if (!track) return;
    deleteTrackDialog.close();
    try {
      handleClose();
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

  function handleManagePlaylistOpenChange(open: boolean) {
    if (!open && managePlaylistDialog.isOpen) {
      managePlaylistDialog.close();
    }
  }

  function handleDeleteDialogOpenChange(open: boolean) {
    if (!open && deleteTrackDialog.isOpen) {
      deleteTrackDialog.close();
    }
  }
</script>

{#snippet menuItems()}
  <Button
    variant="ghost"
    class="justify-start gap-3 h-12"
    onclick={handlePlayNext}
  >
    <SkipForwardIcon class="size-5" />
    Play Next
  </Button>

  <Button
    variant="ghost"
    class="justify-start gap-3 h-12"
    onclick={handleAddToQueue}
  >
    <PlusIcon class="size-5" />
    Add to Queue
  </Button>

  <div class="h-px bg-border my-1"></div>

  <Button
    variant="ghost"
    class="justify-start gap-3 h-12"
    onclick={handleAddToPlaylist}
  >
    <ListMusicIcon class="size-5" />
    Add to Playlist
  </Button>

  <Button
    variant="ghost"
    class="justify-start gap-3 h-12"
    onclick={handleOpenTrackInfo}
  >
    <InfoIcon class="size-5" />
    Track Info
  </Button>

  {#if playlistId}
    <Button
      variant="ghost"
      class="justify-start gap-3 h-12"
      onclick={handleRemoveFromPlaylist}
    >
      <ListXIcon class="size-5" />
      Remove from Playlist
    </Button>
  {/if}

  <div class="h-px bg-border my-1"></div>

  <Button
    variant="ghost"
    class="justify-start gap-3 h-12"
    onclick={handleDownload}
  >
    <DownloadIcon class="size-5" />
    Download
  </Button>

  <Button
    variant="ghost"
    class="justify-start gap-3 h-12"
    onclick={handleToggleOffline}
  >
    {#if trackMenuStore.isOffline}
      <CloudOffIcon class="size-5" />
      Remove from Offline
    {:else}
      <CloudDownloadIcon class="size-5" />
      Make Available Offline
    {/if}
  </Button>

  <div class="h-px bg-border my-1"></div>

  <Button
    variant="ghost"
    class="justify-start gap-3 h-12 text-destructive hover:text-destructive hover:bg-destructive/10"
    onclick={handleDeleteTrack}
  >
    <Trash2Icon class="size-5" />
    Delete Track
  </Button>
{/snippet}

{#if track}
  <MenuDialog
    open={dialogState.isOpen}
    onOpenChange={dialogState.handleOpenChange}
    {imageUrl}
    {title}
    subtitle={artist}
    {menuItems}
  >
    {#snippet children()}
      <ManagePlaylistsDialog
        open={managePlaylistDialog.isOpen}
        onOpenChange={handleManagePlaylistOpenChange}
        trackId={track.id}
        trackTitle={title}
      />

      <DeleteTrackDialog
        open={deleteTrackDialog.isOpen}
        onOpenChange={handleDeleteDialogOpenChange}
        trackName={track?.metadata?.title || track?.filename || "this track"}
        onConfirm={confirmDeleteTrack}
      />
    {/snippet}
  </MenuDialog>
{/if}
