<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { untrack } from "svelte";
  import { MenuDialog } from "$lib/components/ui/menu-dialog";
  import { trackMenuStore } from "$lib/stores/trackMenu.svelte";
  import { tracksStore } from "$lib/stores/tracks.svelte";
  import { getImageUrl, getStreamUrl } from "$lib/stores/player.svelte";
  import { playerStore } from "$lib/stores/player.svelte";
  import { downloadStore } from "$lib/stores/download.svelte";
  import { useDialogState } from "$lib/hooks";
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
  } from "@lucide/svelte";
  import { toast } from "svelte-sonner";

  const PARAM_NAME = "track-menu";

  const managePlaylistDialog = useDialogState("manage-playlists");
  const deleteTrackDialog = useDialogState("delete-track");

  let isOpen = $state(page.url.searchParams.has(PARAM_NAME));

  $effect.pre(() => {
    const trackIdFromUrl = page.url.searchParams.get(PARAM_NAME);
    const currentlyOpen = trackIdFromUrl !== null;

    if (currentlyOpen !== untrack(() => isOpen)) {
      isOpen = currentlyOpen;

      if (currentlyOpen && trackIdFromUrl) {
        restoreTrackFromId(trackIdFromUrl);
      } else if (!currentlyOpen) {
        trackMenuStore.clear();
      }
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

  function openDialog(trackId: string) {
    if (isOpen) return;

    const url = new URL(page.url);
    url.searchParams.set(PARAM_NAME, trackId);
    goto(url.toString(), {
      replaceState: false,
      noScroll: true,
      keepFocus: true,
    });
    isOpen = true;
  }

  function closeDialog() {
    if (isOpen) {
      history.back();
      isOpen = false;
    }
  }

  trackMenuStore.registerDialogHandlers(openDialog, closeDialog);

  const track = $derived(trackMenuStore.track);
  const title = $derived(
    track?.metadata?.title ?? track?.filename ?? "Unknown",
  );
  const artist = $derived(track?.metadata?.artist ?? "Unknown Artist");
  const imageUrl = $derived(track ? getImageUrl(track.id) : "");

  function handleClose() {
    closeDialog();
  }

  function handleOpenChange(open: boolean) {
    if (!open && isOpen) {
      closeDialog();
    }
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

  function handleDeleteTrack() {
    deleteTrackDialog.open();
  }

  async function confirmDeleteTrack() {
    if (!track) return;
    deleteTrackDialog.close();
    try {
      await tracksStore.deleteTrack(track.id);
      const queueIndex = playerStore.trackQueue.findIndex(
        (queuedTrack) => queuedTrack.id === track.id,
      );
      if (queueIndex !== -1) {
        playerStore.removeFromQueue(queueIndex);
      }
      toast.success("Track deleted");
      handleClose();
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
    open={isOpen}
    onOpenChange={handleOpenChange}
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
