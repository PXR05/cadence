<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { deletePlaylist } from "$lib/api";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { MenuDialog } from "$lib/components/ui/menu-dialog";
  import { getPlaylistImageUrl } from "$lib/constants";
  import { deleteOfflineImage } from "$lib/db/offline";
  import {
    useDialogState,
    useMenuDialogState,
    usePlaylistOffline,
  } from "$lib/hooks";
  import { playerStore } from "$lib/stores/player.svelte";
  import { playlistMenuStore } from "$lib/stores/playlistMenu.svelte";
  import { playlistsStore } from "$lib/stores/playlists.svelte";
  import { remoteDownloadStore } from "$lib/stores/remoteDownload.svelte";
  import {
    getPlaylistDisplayName,
    getTidalCollectionId,
    isArtistPlaylist,
    isSpecialPlaylist,
    isTidalAlbumPlaylist,
    isTidalCollectionPlaylist,
    isYoutubeCollectionPlaylist,
    SPECIAL_PLAYLIST_IDS,
  } from "$lib/utils/playlist";
  import { buildRemoteCollectionUrl } from "$lib/utils/remote";
  import {
    CloudDownload as CloudDownloadIcon,
    CloudOff as CloudOffIcon,
    Download as DownloadIcon,
    ListPlus as ListPlusIcon,
    LoaderIcon,
    Music as MusicIcon,
    Pencil as PencilIcon,
    Play as PlayIcon,
    RefreshCw as RefreshCwIcon,
    Trash2Icon,
    TrashIcon,
  } from "@lucide/svelte";
  import { toast } from "svelte-sonner";
  import { Button } from "../ui/button";
  import EditPlaylistDialog from "./EditPlaylistDialog.svelte";

  const editDialog = useDialogState("edit-playlist");
  const deleteDialog = useDialogState("delete-playlist");

  const dialogState = useMenuDialogState({
    paramName: "playlist-menu",
    onOpen: restorePlaylistFromId,
    onClose: () => playlistMenuStore.clear(),
  });

  async function restorePlaylistFromId(playlistId: string) {
    if (playlistMenuStore.playlist?.id === playlistId) return;

    const foundPlaylist = playlistsStore.allPlaylists.find(
      (p) => p.id === playlistId,
    );
    if (foundPlaylist) {
      playlistMenuStore.setPlaylist(foundPlaylist, false, false);
    }
  }

  playlistMenuStore.registerDialogHandlers(dialogState.open, dialogState.close);

  const playlist = $derived(playlistMenuStore.playlist);
  const displayName = $derived(
    playlist ? getPlaylistDisplayName(playlist) : "Unknown",
  );
  const playlistId = $derived(playlist?.id ?? "");

  const isNonModifiable = $derived(
    playlist
      ? isSpecialPlaylist(playlist.id) || isArtistPlaylist(playlist.id)
      : true,
  );
  const isResyncable = $derived(
    playlist
      ? isYoutubeCollectionPlaylist(playlist.id) ||
          isTidalCollectionPlaylist(playlist.id)
      : false,
  );

  const itemCount = $derived(playlist?.itemCount ?? 0);
  const imageUrl = $derived(
    playlist?.coverImage ? getPlaylistImageUrl(playlist.id) : undefined,
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
      handleClose();
      await offline.downloadPlaylist(detail);
    } else {
      toast.error("Failed to load playlist details");
    }
  }

  async function handleMakeOffline() {
    const detail = await getPlaylistDetail();
    if (detail) {
      handleClose();
      await offline.makeOffline(detail);
    } else {
      toast.error("Failed to load playlist details");
    }
  }

  async function handleRemoveOffline() {
    await offline.removeOffline();
    handleClose();
  }

  async function handlePlay() {
    const playlist = await getPlaylistDetail();
    if (!playlist) {
      toast.error("Failed to load playlist details");
      return;
    }
    const tracks = playlist.items.map((item) => item.audio);
    playerStore.setQueue(tracks, 0, playlist);
    handleClose();
  }

  async function handleAddToQueue() {
    const detail = await getPlaylistDetail();
    if (detail && detail.items.length > 0) {
      playerStore.addPlaylistToQueue(detail.items.map((item) => item.audio));
      handleClose();
      toast.success(`Added ${detail.items.length} tracks to queue`);
    } else {
      toast.error("No tracks to add to queue");
    }
  }

  async function handlePlaylistResync() {
    if (!playlist) return;
    try {
      handleClose();
      if (isYoutubeCollectionPlaylist(playlist.id)) {
        await remoteDownloadStore.addUrlToQueue(
          "youtube",
          buildRemoteCollectionUrl(
            "youtube",
            "playlist",
            playlist.id.replace("youtube_", ""),
          ),
        );
        toast.success("Resynced from YouTube");
      } else if (isTidalCollectionPlaylist(playlist.id)) {
        const isTidalAlbum = isTidalAlbumPlaylist(playlist.id);
        const tidalType = isTidalAlbum ? "album" : "playlist";
        const tidalId = getTidalCollectionId(playlist.id);
        await remoteDownloadStore.addUrlToQueue(
          "tidal",
          buildRemoteCollectionUrl("tidal", tidalType, tidalId),
        );
        toast.success(`Resynced from Tidal ${tidalType}`);
      }
    } catch (error) {
      const providerError =
        playlist && isTidalCollectionPlaylist(playlist.id)
          ? "Failed to download from Tidal"
          : "Failed to download from YouTube";
      const errorMessage =
        error instanceof Error ? error.message : providerError;
      toast.error(errorMessage);
    }
  }

  function handleEditPlaylist() {
    editDialog.open();
  }

  async function handlePlaylistUpdated(v: {
    name: string;
    coverImage?: string | null;
  }) {
    if (!playlist) return;
    await playlistsStore.invalidatePlaylistDetail(playlist.id);
    playlistsStore.invalidate();
    await playlistsStore.updateCachedPlaylist({
      ...playlist,
      name: v.name,
      coverImage: v.coverImage,
    });
    await deleteOfflineImage(playlist.id);
    editDialog.close();
    handleClose();
    invalidateAll();
  }

  let deleteLoading = $state(false);
  async function handleDelete() {
    deleteLoading = true;
    try {
      if (!playlist) return;

      await deletePlaylist(playlist.id);
      deleteDialog.close();
      deleteLoading = false;

      await playlistsStore.invalidatePlaylist(playlist.id);
      playlistsStore.invalidate();
      await deleteOfflineImage(playlist.id);

      handleClose();
      invalidateAll();
    } catch (error) {
      console.error("Failed to delete playlist:", error);
    }
  }

  function handleEditDialogOpenChange(open: boolean) {
    if (!open && editDialog.isOpen) {
      editDialog.close();
    }
  }

  const menuActionItems = $derived.by(() =>
    [
      {
        key: "play",
        label: "Play",
        icon: PlayIcon,
        onClick: handlePlay,
        disabled: itemCount === 0,
      },
      {
        key: "add-to-queue",
        label: "Add to Queue",
        icon: ListPlusIcon,
        onClick: handleAddToQueue,
        disabled: itemCount === 0,
      },
      {
        key: "download-zip",
        label: "Download as ZIP",
        icon: DownloadIcon,
        onClick: handleDownloadPlaylist,
        disabled: offline.isDownloading || itemCount === 0,
        dividerBefore: true,
      },
      {
        key: "resync",
        label:
          playlist && isTidalAlbumPlaylist(playlist.id)
            ? "Resync Album"
            : "Resync Playlist",
        icon: RefreshCwIcon,
        onClick: handlePlaylistResync,
        disabled: !isResyncable,
        show:
          playlist !== null &&
          (isYoutubeCollectionPlaylist(playlist.id) ||
            isTidalCollectionPlaylist(playlist.id)),
      },
      {
        key: "offline",
        label:
          offline.isOffline || playlist?.id === SPECIAL_PLAYLIST_IDS.DOWNLOADED
            ? "Remove Offline"
            : "Make Available Offline",
        icon:
          offline.isOffline || playlist?.id === SPECIAL_PLAYLIST_IDS.DOWNLOADED
            ? CloudOffIcon
            : CloudDownloadIcon,
        onClick:
          offline.isOffline || playlist?.id === SPECIAL_PLAYLIST_IDS.DOWNLOADED
            ? handleRemoveOffline
            : handleMakeOffline,
        disabled:
          offline.isOffline || playlist?.id === SPECIAL_PLAYLIST_IDS.DOWNLOADED
            ? offline.isDownloading
            : offline.isDownloading || itemCount === 0,
      },
      {
        key: "edit",
        label: "Edit Playlist",
        icon: PencilIcon,
        onClick: handleEditPlaylist,
        dividerBefore: true,
        show: !isNonModifiable,
      },
      {
        key: "delete-playlist",
        label: "Delete Playlist",
        icon: Trash2Icon,
        onClick: deleteDialog.open,
        show: !isNonModifiable,
        isDanger: true,
      },
    ].filter((item) => item.show ?? true),
  );
</script>

{#snippet imageFallback()}
  <MusicIcon class="size-6 text-muted-foreground" />
{/snippet}

{#snippet menuItems()}
  {#each menuActionItems as item (item.key)}
    {#if item.dividerBefore}
      <div class="h-px bg-border my-1"></div>
    {/if}

    <Button
      variant="ghost"
      class="rounded-3xl justify-start gap-3 h-12"
      onclick={item.onClick}
      disabled={item.disabled}
    >
      <item.icon class="size-5" />
      {item.label}
    </Button>
  {/each}
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
        />
      {/if}
    {/snippet}
  </MenuDialog>
{/if}

{#if playlist}
  <AlertDialog.Root
    open={deleteDialog.isOpen}
    onOpenChange={(v) => {
      if (!v && deleteDialog.isOpen) {
        deleteDialog.close();
      }
    }}
  >
    <AlertDialog.Content>
      <AlertDialog.Header>
        <AlertDialog.Title>Delete Playlist</AlertDialog.Title>
        <AlertDialog.Description>
          Are you sure you want to delete "{playlist.name}"? This action cannot
          be undone.
        </AlertDialog.Description>
      </AlertDialog.Header>
      <AlertDialog.Footer>
        <AlertDialog.Cancel disabled={deleteLoading}>Cancel</AlertDialog.Cancel>
        <AlertDialog.Action
          onclick={handleDelete}
          disabled={deleteLoading}
          class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        >
          {#if deleteLoading}
            <LoaderIcon class="animate-spin mr-2" size={16} />
          {/if}
          Delete
        </AlertDialog.Action>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  </AlertDialog.Root>
{/if}
