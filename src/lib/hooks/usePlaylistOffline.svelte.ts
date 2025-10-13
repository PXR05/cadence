import {
  saveTrackOffline,
  savePlaylistOffline,
  isPlaylistOffline,
  deleteOfflinePlaylist,
} from "$lib/db/offline";

export function usePlaylistOffline() {
  let isOffline = $state(false);
  let downloadProgress = $state<{ current: number; total: number } | null>(
    null
  );
  let isDownloading = $state(false);

  async function checkOfflineStatus(playlistId: string) {
    isOffline = await isPlaylistOffline(playlistId);
  }

  async function downloadTrackBlob(audioId: string): Promise<Blob> {
    const response = await fetch(`/api/audio/${audioId}/stream`);
    if (!response.ok) throw new Error(`Failed to download track ${audioId}`);
    return response.blob();
  }

  async function downloadPlaylist(playlist: PlaylistDetail) {
    try {
      isDownloading = true;
      const zip = await import("jszip").then((m) => new m.default());

      downloadProgress = { current: 0, total: playlist.items.length };

      for (let i = 0; i < playlist.items.length; i++) {
        const item = playlist.items[i];
        const blob = await downloadTrackBlob(item.audio.id);
        const filename = item.audio.metadata?.title
          ? `${item.audio.metadata.artist || "Unknown"} - ${
              item.audio.metadata.title
            }.${item.audio.filename.split(".").pop()}`
          : item.audio.filename;

        zip.file(filename, blob);
        downloadProgress = { current: i + 1, total: playlist.items.length };
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${playlist.name}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download playlist:", error);
      alert("Failed to download playlist. Please try again.");
    } finally {
      isDownloading = false;
      downloadProgress = null;
    }
  }

  async function makeOffline(playlist: PlaylistDetail, playlistId: string) {
    try {
      isDownloading = true;
      downloadProgress = { current: 0, total: playlist.items.length };

      const trackIds: string[] = [];

      for (let i = 0; i < playlist.items.length; i++) {
        const item = playlist.items[i];
        const blob = await downloadTrackBlob(item.audio.id);

        await saveTrackOffline(
          item.audio.id,
          blob,
          {
            title: item.audio.metadata?.title,
            artist: item.audio.metadata?.artist,
            album: item.audio.metadata?.album,
            duration: item.audio.metadata?.duration,
          },
          item.audio.filename
        );

        trackIds.push(item.audio.id);
        downloadProgress = { current: i + 1, total: playlist.items.length };
      }

      await savePlaylistOffline(playlistId, playlist.name, trackIds);
      isOffline = true;
    } catch (error) {
      console.error("Failed to make playlist offline:", error);
      alert("Failed to save playlist offline. Please try again.");
    } finally {
      isDownloading = false;
      downloadProgress = null;
    }
  }

  async function removeOffline(playlistId: string) {
    try {
      await deleteOfflinePlaylist(playlistId);
      isOffline = false;
    } catch (error) {
      console.error("Failed to remove offline playlist:", error);
      alert("Failed to remove offline playlist. Please try again.");
    }
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
