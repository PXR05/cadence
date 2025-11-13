import type { PlaylistDetail } from "$lib/schemas";
import { downloadStore } from "$lib/stores/download.svelte";

export function usePlaylistOffline(getPlaylistId: () => string | undefined) {
  let playlistId = $state<string | undefined>(undefined);

  $effect(() => {
    playlistId = getPlaylistId();
  });

  const isOffline = $derived(
    playlistId ? downloadStore.isPlaylistOffline(playlistId) : false
  );

  const isDownloading = $derived(
    playlistId !== undefined &&
      downloadStore.isDownloading &&
      downloadStore.progress?.playlistId === playlistId
  );

  const downloadProgress = $derived(
    playlistId !== undefined &&
      downloadStore.progress?.playlistId === playlistId
      ? downloadStore.progress
      : null
  );

  async function checkOfflineStatus() {
    if (!playlistId) return;
    await downloadStore.checkOfflineStatus(playlistId);
  }

  async function downloadPlaylist(playlist: PlaylistDetail) {
    await downloadStore.downloadPlaylist(playlist);
  }

  async function makeOffline(
    playlist: PlaylistDetail,
    isResume: boolean = false
  ) {
    if (!playlistId) return;
    await downloadStore.makeOffline(playlist, playlistId, isResume);
  }

  async function removeOffline() {
    if (!playlistId) return;
    await downloadStore.removeOffline(playlistId);
  }

  return {
    get isOffline() {
      return isOffline;
    },
    get downloadProgress() {
      return downloadProgress;
    },
    get isDownloading() {
      return isDownloading;
    },
    checkOfflineStatus,
    downloadPlaylist,
    makeOffline,
    removeOffline,
  };
}
