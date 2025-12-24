<script lang="ts">
  import { MenuDialog } from "$lib/components/ui/menu-dialog";
  import { playlistMenuStore } from "$lib/stores/playlistMenu.svelte";
  import { playlistsStore } from "$lib/stores/playlists.svelte";
  import { youtubeDownloadStore } from "$lib/stores/youtubeDownload.svelte";
  import {
    useDialogState,
    useMenuDialogState,
    usePlaylistOffline,
  } from "$lib/hooks";
  import { getPlaylistImageUrl } from "$lib/constants";
  import {
    getPlaylistDisplayName,
    isArtistPlaylist,
    isAlbumPlaylist,
    isSpecialPlaylist,
    isYoutubePlaylist,
    SPECIAL_PLAYLIST_IDS,
  } from "$lib/utils/playlist";
  import EditPlaylistDialog from "./EditPlaylistDialog.svelte";
  import { Button } from "../ui/button";
  import {
    CloudDownloadIcon,
    CloudOffIcon,
    PencilIcon,
    RefreshCwIcon,
    DownloadIcon,
    MusicIcon,
  } from "@lucide/svelte";
  import { toast } from "svelte-sonner";

  const editDialog = useDialogState("edit-playlist");

  const dialogState = useMenuDialogState({
    paramName: "playlist-menu",
    onOpen: restorePlaylistFromId,
    onClose: () => playlistMenuStore.clear(),
  });

  async function restorePlaylistFromId(playlistId: string) {
    if (playlistMenuStore.playlist?.id === playlistId) return;

    const foundPlaylist = playlistsStore.allPlaylists.find(
      (p) => p.id === playlistId
    );
    if (foundPlaylist) {
      playlistMenuStore.setPlaylist(foundPlaylist, false, false);
    }
  }

  playlistMenuStore.registerDialogHandlers(dialogState.open, dialogState.close);

  const playlist = $derived(playlistMenuStore.playlist);
  const displayName = $derived(
    playlist ? getPlaylistDisplayName(playlist) : "Unknown"
  );
  const playlistId = $derived(playlist?.id ?? "");

  const isNonModifiable = $derived(
    playlist
      ? isSpecialPlaylist(playlist.id) ||
          isArtistPlaylist(playlist.id) ||
          isAlbumPlaylist(playlist.id)
      : true
  );

  const itemCount = $derived(playlist?.itemCount ?? 0);
  const imageUrl = $derived(
    playlist?.coverImage ? getPlaylistImageUrl(playlist.id) : undefined
  );

  const offline = usePlaylistOffline(() => playlistId);

  $effect(() => {
    if (playlist) {
      offline.checkOfflineStatus();
    }
  });

  function handleClose() {
    dialogState.close();
  }

  async function getPlaylistDetail() {
    if (!playlist) return null;
    let detail = playlistsStore.getPlaylistDetail(playlist.id);
    if (!detail) {
      await playlistsStore.loadPlaylistDetail(playlist.id);
      detail = playlistsStore.getPlaylistDetail(playlist.id);
    }
    return detail;
  }

  async function handleDownloadPlaylist() {
    const detail = await getPlaylistDetail();
    if (detail) {
      await offline.downloadPlaylist(detail);
      handleClose();
    } else {
      toast.error("Failed to load playlist details");
    }
  }

  async function handleMakeOffline() {
    const detail = await getPlaylistDetail();
    if (detail) {
      await offline.makeOffline(detail);
      handleClose();
    } else {
      toast.error("Failed to load playlist details");
    }
  }

  async function handleRemoveOffline() {
    await offline.removeOffline();
    handleClose();
  }

  async function handlePlaylistResync() {
    if (!playlist) return;
    try {
      await youtubeDownloadStore.downloadFromUrl(
        `https://music.youtube.com/playlist?list=${playlist.id.replace("youtube_", "")}`
      );
      toast.success("Resynced from YouTube");
      handleClose();
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to download from YouTube";
      toast.error(errorMessage);
    }
  }

  function handleEditPlaylist() {
    editDialog.open();
  }

  async function handlePlaylistUpdated() {
    if (!playlist) return;
    await playlistsStore.invalidatePlaylistDetail(playlist.id);
    playlistsStore.invalidate();
    playlistMenuStore.onPlaylistUpdated?.();
    editDialog.close();
  }

  async function handlePlaylistDeleted() {
    if (!playlist) return;
    await playlistsStore.invalidatePlaylist(playlist.id);
    playlistsStore.invalidate();
    playlistMenuStore.onPlaylistDeleted?.();
    editDialog.close();
    handleClose();
  }

  function handleEditDialogOpenChange(open: boolean) {
    if (!open && editDialog.isOpen) {
      editDialog.close();
    }
  }
</script>

{#snippet imageFallback()}
  <MusicIcon class="size-6 text-muted-foreground" />
{/snippet}

{#snippet menuItems()}
  {#if !isNonModifiable}
    <Button
      variant="ghost"
      class="justify-start gap-3 h-12"
      onclick={handleEditPlaylist}
    >
      <PencilIcon class="size-5" />
      Edit Playlist
    </Button>

    <div class="h-px bg-border my-1"></div>
  {/if}

  <Button
    variant="ghost"
    class="justify-start gap-3 h-12"
    onclick={handleDownloadPlaylist}
    disabled={offline.isDownloading || itemCount === 0}
  >
    <DownloadIcon class="size-5" />
    Download as ZIP
  </Button>

  {#if playlist && isYoutubePlaylist(playlist.id)}
    <Button
      variant="ghost"
      class="justify-start gap-3 h-12"
      onclick={handlePlaylistResync}
      disabled={itemCount === 0}
    >
      <RefreshCwIcon class="size-5" />
      Resync Playlist
    </Button>
  {/if}

  <div class="h-px bg-border my-1"></div>

  {#if offline.isOffline || playlist?.id === SPECIAL_PLAYLIST_IDS.DOWNLOADED}
    <Button
      variant="ghost"
      class="justify-start gap-3 h-12"
      onclick={handleRemoveOffline}
      disabled={offline.isDownloading}
    >
      <CloudOffIcon class="size-5" />
      Remove Offline
    </Button>
  {:else}
    <Button
      variant="ghost"
      class="justify-start gap-3 h-12"
      onclick={handleMakeOffline}
      disabled={offline.isDownloading || itemCount === 0}
    >
      <CloudDownloadIcon class="size-5" />
      Make Offline
    </Button>
  {/if}
{/snippet}

{#if playlist}
  <MenuDialog
    open={dialogState.isOpen}
    onOpenChange={dialogState.handleOpenChange}
    {imageUrl}
    {imageFallback}
    title={displayName}
    subtitle="{itemCount} tracks"
    {menuItems}
  >
    {#snippet children()}
      {#if !isNonModifiable}
        <EditPlaylistDialog
          open={editDialog.isOpen}
          onOpenChange={handleEditDialogOpenChange}
          playlist={{ ...playlist, items: [] }}
          onUpdated={handlePlaylistUpdated}
          onDeleted={handlePlaylistDeleted}
        />
      {/if}
    {/snippet}
  </MenuDialog>
{/if}
