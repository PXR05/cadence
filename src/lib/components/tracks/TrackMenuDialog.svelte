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
    Download as DownloadIcon,
    ListMusic as ListMusicIcon,
    Plus as PlusIcon,
    SkipForward as SkipForwardIcon,
    CloudDownload as CloudDownloadIcon,
    CloudOff as CloudOffIcon,
    Trash2 as Trash2Icon,
    ListX as ListXIcon,
    Info as InfoIcon,
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

  const menuActionItems = $derived.by(() =>
    [
      {
        key: "play-next",
        label: "Play Next",
        icon: SkipForwardIcon,
        onClick: handlePlayNext,
      },
      {
        key: "add-to-queue",
        label: "Add to Queue",
        icon: PlusIcon,
        onClick: handleAddToQueue,
      },
      {
        key: "add-to-playlist",
        label: "Add to Playlist",
        icon: ListMusicIcon,
        onClick: handleAddToPlaylist,
        dividerBefore: true,
      },
      {
        key: "track-info",
        label: "Track Info",
        icon: InfoIcon,
        onClick: handleOpenTrackInfo,
      },
      {
        key: "remove-from-playlist",
        label: "Remove from Playlist",
        icon: ListXIcon,
        onClick: handleRemoveFromPlaylist,
        show: Boolean(playlistId),
      },
      {
        key: "download",
        label: "Download",
        icon: DownloadIcon,
        onClick: handleDownload,
        dividerBefore: true,
      },
      {
        key: "toggle-offline",
        label: trackMenuStore.isOffline
          ? "Remove from Offline"
          : "Make Available Offline",
        icon: trackMenuStore.isOffline ? CloudOffIcon : CloudDownloadIcon,
        onClick: handleToggleOffline,
      },
      {
        key: "delete-track",
        label: "Delete Track",
        icon: Trash2Icon,
        onClick: handleDeleteTrack,
        dividerBefore: true,
        isDanger: true,
      },
    ].filter((item) => item.show ?? true),
  );
</script>

{#snippet menuItems()}
  {#each menuActionItems as item (item.key)}
    {#if item.dividerBefore}
      <div class="h-px bg-border my-1"></div>
    {/if}

    <Button
      variant="ghost"
      class="rounded-3xl justify-start gap-3 h-12 
      {item.isDanger
        ? 'text-destructive hover:text-destructive hover:bg-destructive/10'
        : ''}"
      onclick={item.onClick}
    >
      <item.icon class="size-5" />
      {item.label}
    </Button>
  {/each}
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
