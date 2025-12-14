<script lang="ts">
  import { MediaQuery } from "svelte/reactivity";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { untrack } from "svelte";
  import * as Dialog from "$lib/components/ui/dialog";
  import * as Drawer from "$lib/components/ui/drawer";
  import { playlistMenuStore } from "$lib/stores/playlistMenu.svelte";
  import { playlistsStore } from "$lib/stores/playlists.svelte";
  import { youtubeDownloadStore } from "$lib/stores/youtubeDownload.svelte";
  import { useDialogState, usePlaylistOffline } from "$lib/hooks";
  import { getPlaylistImageUrl } from "$lib/stores/player.svelte";
  import {
    getPlaylistDisplayName,
    isArtistPlaylist,
    isAlbumPlaylist,
    isSpecialPlaylist,
    isYoutubePlaylist,
    SPECIAL_PLAYLIST_IDS,
  } from "$lib/utils/playlist";
  import EditPlaylistDialog from "./EditPlaylistDialog.svelte";
  import { Button, buttonVariants } from "../ui/button";
  import {
    CloudDownloadIcon,
    CloudOffIcon,
    PencilIcon,
    RefreshCwIcon,
    DownloadIcon,
    XIcon,
    MusicIcon,
  } from "@lucide/svelte";
  import { toast } from "svelte-sonner";

  const PARAM_NAME = "playlist-menu";
  const isDesktop = new MediaQuery("(min-width: 768px)");

  const editDialog = useDialogState("edit-playlist");

  let isOpen = $state(page.url.searchParams.has(PARAM_NAME));

  $effect.pre(() => {
    const playlistIdFromUrl = page.url.searchParams.get(PARAM_NAME);
    const currentlyOpen = playlistIdFromUrl !== null;

    if (currentlyOpen !== untrack(() => isOpen)) {
      isOpen = currentlyOpen;

      if (currentlyOpen && playlistIdFromUrl) {
        restorePlaylistFromId(playlistIdFromUrl);
      } else if (!currentlyOpen) {
        playlistMenuStore.clear();
      }
    }
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

  function openDialog(playlistId: string) {
    if (isOpen) return;

    const url = new URL(page.url);
    url.searchParams.set(PARAM_NAME, playlistId);
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

  playlistMenuStore.registerDialogHandlers(openDialog, closeDialog);

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

  const itemCount = $derived(playlist?.itemCount ?? 0);

  const offline = usePlaylistOffline(() => playlistId);

  // Check offline status when playlist changes
  $effect(() => {
    if (playlist) {
      offline.checkOfflineStatus();
    }
  });

  function handleClose() {
    closeDialog();
  }

  function handleOpenChange(open: boolean) {
    if (!open && isOpen) {
      closeDialog();
    }
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
        `https://music.youtube.com/playlist?list=${playlist.id.replace("youtube_", "")}`,
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

  async function handlePlaylistUpdated(updated: {
    name: string;
    coverImage?: string;
  }) {
    if (!playlist) return;
    await playlistsStore.invalidatePlaylistDetail(playlist.id);
    playlistsStore.invalidate();
    playlistMenuStore.onPlaylistUpdated?.();
    editDialog.close();
  }

  async function handlePlaylistDeleted() {
    if (!playlist) return;
    await playlistsStore.invalidatePlaylistDetail(playlist.id);
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

{#snippet playlistHeader()}
  <div class="flex gap-3 p-4">
    <div
      class="rounded-md size-20 flex-shrink-0 overflow-hidden bg-muted grid place-items-center"
    >
      {#if playlist?.coverImage}
        <img
          src={getPlaylistImageUrl(playlist.id)}
          alt={displayName}
          class="size-full object-cover"
        />
      {:else}
        <MusicIcon class="size-6 text-muted-foreground" />
      {/if}
    </div>
    <div class="flex flex-col flex-1 min-w-0 mt-auto">
      <p class="font-medium truncate">{displayName}</p>
      <p class="text-sm text-muted-foreground truncate">
        {itemCount} tracks
      </p>
    </div>
    {#if isDesktop.current}
      <Drawer.Close class={buttonVariants({ variant: "ghost", size: "icon" })}>
        <XIcon class="size-5" />
      </Drawer.Close>
    {/if}
  </div>
{/snippet}

{#snippet menuItems()}
  <div class="flex flex-col p-1">
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
  </div>
{/snippet}

{#if isDesktop.current}
  <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
    <Dialog.Content class="max-w-sm p-0 gap-0" showCloseButton={false}>
      {#if playlist}
        {@render playlistHeader()}
        {@render menuItems()}
      {/if}
    </Dialog.Content>
  </Dialog.Root>
{:else}
  <Drawer.Root open={isOpen} onOpenChange={handleOpenChange}>
    <Drawer.Content>
      {#if playlist}
        <Drawer.Header class="text-left p-0">
          {@render playlistHeader()}
        </Drawer.Header>
        {@render menuItems()}
        <Drawer.Footer class="pt-2">
          <Drawer.Close>
            <Button variant="outline" class="w-full">Cancel</Button>
          </Drawer.Close>
        </Drawer.Footer>
      {/if}
    </Drawer.Content>
  </Drawer.Root>
{/if}

{#if playlist && !isNonModifiable}
  <EditPlaylistDialog
    open={editDialog.isOpen}
    onOpenChange={handleEditDialogOpenChange}
    playlist={{ ...playlist, items: [] }}
    onUpdated={handlePlaylistUpdated}
    onDeleted={handlePlaylistDeleted}
  />
{/if}
