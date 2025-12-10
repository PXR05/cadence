<script lang="ts">
  import * as ContextMenu from "$lib/components/ui/context-menu";
  import { useDialogState, usePlaylistOffline } from "$lib/hooks";
  import {
    isArtistPlaylist,
    isAlbumPlaylist,
    isSpecialPlaylist,
    isYoutubePlaylist,
    SPECIAL_PLAYLIST_IDS,
  } from "$lib/utils/playlist";
  import {
    CloudDownloadIcon,
    CloudOffIcon,
    PencilIcon,
    RefreshCwIcon,
    DownloadIcon,
  } from "@lucide/svelte";
  import EditPlaylistDialog from "./EditPlaylistDialog.svelte";
  import { youtubeDownloadStore } from "$lib/stores/youtubeDownload.svelte";
  import { playlistsStore } from "$lib/stores/playlists.svelte";
  import { toast } from "svelte-sonner";
  import type { Playlist } from "$lib/schemas";
  import type { Snippet } from "svelte";

  interface Props {
    playlist: Playlist;
    children: Snippet;
    onPlaylistUpdated?: () => void;
    onPlaylistDeleted?: () => void;
  }

  let { playlist, children, onPlaylistUpdated, onPlaylistDeleted }: Props =
    $props();

  const playlistId = $derived(playlist.id);
  const editDialog = useDialogState("edit-playlist-card-" + playlist.id);
  const offline = usePlaylistOffline(() => playlistId);

  const isNonModifiable = $derived(
    isSpecialPlaylist(playlist.id) ||
      isArtistPlaylist(playlist.id) ||
      isAlbumPlaylist(playlist.id),
  );

  const itemCount = $derived(playlist.itemCount ?? 0);

  $effect(() => {
    offline.checkOfflineStatus();
  });

  async function getPlaylistDetail() {
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
    } else {
      toast.error("Failed to load playlist details");
    }
  }

  async function handleMakeOffline() {
    const detail = await getPlaylistDetail();
    if (detail) {
      await offline.makeOffline(detail);
    } else {
      toast.error("Failed to load playlist details");
    }
  }

  async function handlePlaylistResync() {
    try {
      await youtubeDownloadStore.downloadFromUrl(
        `https://music.youtube.com/playlist?list=${playlistId.replace("youtube_", "")}`,
      );
      toast.success("Resynced from YouTube");
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to download from YouTube";
      toast.error(errorMessage);
    }
  }

  async function handlePlaylistUpdated(updated: {
    name: string;
    coverImage?: string;
  }) {
    await playlistsStore.invalidatePlaylistDetail(playlistId);
    playlistsStore.invalidate();
    onPlaylistUpdated?.();
  }

  async function handlePlaylistDeleted() {
    await playlistsStore.invalidatePlaylistDetail(playlistId);
    playlistsStore.invalidate();
    onPlaylistDeleted?.();
  }
</script>

<ContextMenu.Root>
  <ContextMenu.Trigger>
    {@render children()}
  </ContextMenu.Trigger>
  <ContextMenu.Content>
    {#if !isNonModifiable}
      <ContextMenu.Item
        disabled={isNonModifiable}
        onclick={() => editDialog.open()}
      >
        <PencilIcon size={16} class="mr-2" />
        Edit Playlist
      </ContextMenu.Item>
      <ContextMenu.Separator />
    {/if}

    <ContextMenu.Item
      onclick={handleDownloadPlaylist}
      disabled={offline.isDownloading || itemCount === 0}
    >
      <DownloadIcon size={16} class="mr-2" />
      Download as ZIP
    </ContextMenu.Item>

    {#if isYoutubePlaylist(playlist.id)}
      <ContextMenu.Item
        onclick={handlePlaylistResync}
        disabled={itemCount === 0}
      >
        <RefreshCwIcon size={16} class="mr-2" />
        Resync Playlist
      </ContextMenu.Item>
    {/if}

    {#if offline.isOffline || playlist.id === SPECIAL_PLAYLIST_IDS.DOWNLOADED}
      <ContextMenu.Item
        onclick={() => offline.removeOffline()}
        disabled={offline.isDownloading}
      >
        <CloudOffIcon size={16} class="mr-2" />
        Remove Offline
      </ContextMenu.Item>
    {:else}
      <ContextMenu.Item
        onclick={handleMakeOffline}
        disabled={offline.isDownloading || itemCount === 0}
      >
        <CloudDownloadIcon size={16} class="mr-2" />
        Make Offline
      </ContextMenu.Item>
    {/if}
  </ContextMenu.Content>
</ContextMenu.Root>

{#if !isNonModifiable}
  <EditPlaylistDialog
    open={editDialog.isOpen}
    onOpenChange={(open) => !open && editDialog.close()}
    playlist={{ ...playlist, items: [] }}
    onUpdated={handlePlaylistUpdated}
    onDeleted={handlePlaylistDeleted}
  />
{/if}
