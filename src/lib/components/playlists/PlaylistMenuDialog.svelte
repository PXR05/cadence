<script lang="ts">
  import { MenuDialog } from "$lib/components/ui/menu-dialog";
  import { playlistMenuStore } from "$lib/stores/playlistMenu.svelte";
  import { playlistsStore } from "$lib/stores/playlists.svelte";
  import { remoteDownloadStore } from "$lib/stores/remoteDownload.svelte";
  import { playerStore } from "$lib/stores/player.svelte";
  import {
    useDialogState,
    useMenuDialogState,
    usePlaylistOffline,
  } from "$lib/hooks";
  import { getPlaylistImageUrl } from "$lib/constants";
  import {
    getTidalCollectionId,
    getPlaylistDisplayName,
    isArtistPlaylist,
    isAlbumPlaylist,
    isSpecialPlaylist,
    isYoutubeCollectionPlaylist,
    isTidalAlbumPlaylist,
    isTidalCollectionPlaylist,
    SPECIAL_PLAYLIST_IDS,
  } from "$lib/utils/playlist";
  import { buildRemoteCollectionUrl } from "$lib/utils/remote";
  import EditPlaylistDialog from "./EditPlaylistDialog.svelte";
  import { Button } from "../ui/button";
  import {
    CloudDownload as CloudDownloadIcon,
    CloudOff as CloudOffIcon,
    Pencil as PencilIcon,
    RefreshCw as RefreshCwIcon,
    Download as DownloadIcon,
    Music as MusicIcon,
    ListPlus as ListPlusIcon,
    Play as PlayIcon,
  } from "@lucide/svelte";
  import { toast } from "svelte-sonner";
  import { invalidateAll } from "$app/navigation";
  import { deleteOfflineImage } from "$lib/db/offline";

  const editDialog = useDialogState("edit-playlist");

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
      ? isSpecialPlaylist(playlist.id) ||
          isArtistPlaylist(playlist.id) ||
          isAlbumPlaylist(playlist.id)
      : true,
  );
  const isResyncable = $derived(
    playlist
      ? isYoutubeCollectionPlaylist(playlist.id) || isTidalCollectionPlaylist(playlist.id)
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
        await remoteDownloadStore.downloadFromUrl(
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
        await remoteDownloadStore.downloadFromUrl(
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

  async function handlePlaylistDeleted() {
    if (!playlist) return;
    await playlistsStore.invalidatePlaylist(playlist.id);
    playlistsStore.invalidate();
    await deleteOfflineImage(playlist.id);
    editDialog.close();
    handleClose();
    invalidateAll();
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
  <Button
    variant="ghost"
    class="justify-start gap-3 h-12"
    onclick={handlePlay}
    disabled={itemCount === 0}
  >
    <PlayIcon class="size-5" />
    Play
  </Button>

  <Button
    variant="ghost"
    class="justify-start gap-3 h-12"
    onclick={handleAddToQueue}
    disabled={itemCount === 0}
  >
    <ListPlusIcon class="size-5" />
    Add to Queue
  </Button>

  <div class="h-px bg-border my-1"></div>

  <Button
    variant="ghost"
    class="justify-start gap-3 h-12"
    onclick={handleDownloadPlaylist}
    disabled={offline.isDownloading || itemCount === 0}
  >
    <DownloadIcon class="size-5" />
    Download as ZIP
  </Button>

  {#if playlist && (isYoutubeCollectionPlaylist(playlist.id) || isTidalCollectionPlaylist(playlist.id))}
    <Button
      variant="ghost"
      class="justify-start gap-3 h-12"
      onclick={handlePlaylistResync}
      disabled={!isResyncable}
    >
      <RefreshCwIcon class="size-5" />
      {#if playlist && isTidalAlbumPlaylist(playlist.id)}
        Resync Album
      {:else}
        Resync Playlist
      {/if}
    </Button>
  {/if}

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
      Make Available Offline
    </Button>
  {/if}

  {#if !isNonModifiable}
    <div class="h-px bg-border my-1"></div>

    <Button
      variant="ghost"
      class="justify-start gap-3 h-12"
      onclick={handleEditPlaylist}
    >
      <PencilIcon class="size-5" />
      Edit Playlist
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
