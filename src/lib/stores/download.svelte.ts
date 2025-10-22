import {
  saveTrackOffline,
  savePlaylistOffline,
  isPlaylistOffline as checkIsPlaylistOffline,
  isTrackOffline as checkIsTrackOffline,
  deleteOfflinePlaylist,
  deleteOfflineTrack,
} from "$lib/db/offline";
import zip from "jszip";

type DownloadProgress = {
  playlistId?: string;
  playlistName?: string;
  trackId?: string;
  trackName?: string;
  current: number;
  total: number;
  type: "offline" | "download";
};

class DownloadStore {
  private _progress = $state<DownloadProgress | null>(null);
  private _offlineStatus = $state<Map<string, boolean>>(new Map());
  private _trackOfflineStatus = $state<Map<string, boolean>>(new Map());
  private _abortController: AbortController | null = null;
  private _isCancelled = false;

  get progress(): DownloadProgress | null {
    return this._progress;
  }

  get isDownloading(): boolean {
    return this._progress !== null;
  }

  isPlaylistOffline(playlistId: string): boolean {
    return this._offlineStatus.get(playlistId) ?? false;
  }

  isTrackOffline(trackId: string): boolean {
    return this._trackOfflineStatus.get(trackId) ?? false;
  }

  async checkOfflineStatus(playlistId: string): Promise<void> {
    const isOffline = await checkIsPlaylistOffline(playlistId);
    this._offlineStatus.set(playlistId, isOffline);
  }

  async checkTrackOfflineStatus(trackId: string): Promise<boolean> {
    const isOffline = await checkIsTrackOffline(trackId);
    this._trackOfflineStatus.set(trackId, isOffline);
    return isOffline;
  }

  private async downloadTrackBlob(audioId: string): Promise<Blob> {
    const response = await fetch(`/api/audio/${audioId}/stream`);
    if (!response.ok) throw new Error(`Failed to download track ${audioId}`);
    return response.blob();
  }

  async downloadPlaylist(playlist: PlaylistDetail): Promise<void> {
    this._abortController = new AbortController();
    this._isCancelled = false;

    try {
      this._progress = {
        playlistId: playlist.id,
        playlistName: playlist.name,
        current: 0,
        total: playlist.items.length,
        type: "download",
      };

      for (let i = 0; i < playlist.items.length; i++) {
        if (this._isCancelled) {
          return;
        }

        const item = playlist.items[i];
        const blob = await this.downloadTrackBlob(item.audio.id);
        const filename = item.audio.metadata?.title
          ? `${item.audio.metadata.artist || "Unknown"} - ${
              item.audio.metadata.title
            }.${item.audio.filename.split(".").pop()}`
          : item.audio.filename;

        zip.file(filename, blob);
        this._progress = {
          ...this._progress,
          current: i + 1,
        };
      }

      if (this._isCancelled) {
        return;
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${playlist.name}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      if (this._isCancelled) {
        return;
      }
      console.error("Failed to download playlist:", error);
      alert("Failed to download playlist. Please try again.");
    } finally {
      this._progress = null;
      this._abortController = null;
      this._isCancelled = false;
    }
  }

  async makeOffline(
    playlist: PlaylistDetail,
    playlistId: string
  ): Promise<void> {
    // Check if Background Fetch API is supported
    const supportsBackgroundFetch =
      "serviceWorker" in navigator && "BackgroundFetchManager" in globalThis;

    if (supportsBackgroundFetch) {
      try {
        await this.makeOfflineWithBackgroundFetch(playlist, playlistId);
      } catch (error) {
        console.error(
          "Background fetch failed, falling back to standard fetch:",
          error
        );
        await this.makeOfflineWithStandardFetch(playlist, playlistId);
      }
    } else {
      await this.makeOfflineWithStandardFetch(playlist, playlistId);
    }
  }

  private async makeOfflineWithBackgroundFetch(
    playlist: PlaylistDetail,
    playlistId: string
  ): Promise<void> {
    try {
      const registration = await navigator.serviceWorker.ready;

      const requests = playlist.items.map(
        (item) => `/api/audio/${item.audio.id}/stream`
      );

      const totalSize = playlist.items.reduce(
        (sum, item) => sum + (item.audio.size || 0),
        0
      );

      const bgFetch = await registration.backgroundFetch.fetch(
        `offline-playlist-${playlistId}`,
        requests,
        {
          title: `Downloading: ${playlist.name}`,
          icons: [
            {
              sizes: "192x192",
              src: "/icon-192x192.png",
              type: "image/png",
            },
          ],
          downloadTotal: totalSize,
        }
      );

      this._progress = {
        playlistId: playlist.id,
        playlistName: playlist.name,
        current: 0,
        total: playlist.items.length,
        type: "offline",
      };

      const updateProgress = async () => {
        const downloaded = bgFetch.downloaded;
        const total = bgFetch.downloadTotal;

        if (total > 0) {
          const percentage = (downloaded / total) * 100;
          const tracksDownloaded = Math.floor(
            (percentage / 100) * playlist.items.length
          );

          this._progress = {
            playlistId: playlist.id,
            playlistName: playlist.name,
            current: tracksDownloaded,
            total: playlist.items.length,
            type: "offline",
          };
        }
      };

      const progressInterval = setInterval(updateProgress, 500);

      await new Promise<void>((resolve, reject) => {
        bgFetch.addEventListener("progress", updateProgress);

        const checkCompletion = setInterval(async () => {
          try {
            const updated = await registration.backgroundFetch.get(
              `offline-playlist-${playlistId}`
            );

            if (!updated) {
              clearInterval(checkCompletion);
              clearInterval(progressInterval);

              const trackIds = playlist.items.map((item) => item.audio.id);
              await savePlaylistOffline(playlistId, playlist.name, trackIds);

              for (const item of playlist.items) {
                const response = await caches.match(
                  `/api/audio/${item.audio.id}/stream`
                );
                if (response) {
                  const blob = await response.blob();
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
                }
              }

              this._offlineStatus.set(playlistId, true);
              resolve();
            }
          } catch (error) {
            clearInterval(checkCompletion);
            clearInterval(progressInterval);
            reject(error);
          }
        }, 1000);
      });
    } catch (error) {
      console.error(
        "Failed to make playlist offline with background fetch:",
        error
      );
      throw error;
    } finally {
      this._progress = null;
    }
  }

  private async makeOfflineWithStandardFetch(
    playlist: PlaylistDetail,
    playlistId: string
  ): Promise<void> {
    this._abortController = new AbortController();
    this._isCancelled = false;

    try {
      this._progress = {
        playlistId: playlist.id,
        playlistName: playlist.name,
        current: 0,
        total: playlist.items.length,
        type: "offline",
      };

      const trackIds: string[] = [];

      for (let i = 0; i < playlist.items.length; i++) {
        if (this._isCancelled) {
          return;
        }

        const item = playlist.items[i];
        const blob = await this.downloadTrackBlob(item.audio.id);

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
        this._progress = {
          ...this._progress,
          current: i + 1,
        };
      }

      if (this._isCancelled) {
        return;
      }

      await savePlaylistOffline(playlistId, playlist.name, trackIds);
      this._offlineStatus.set(playlistId, true);
    } catch (error) {
      if (this._isCancelled) {
        return;
      }
      console.error("Failed to make playlist offline:", error);
      alert("Failed to save playlist offline. Please try again.");
    } finally {
      this._progress = null;
      this._abortController = null;
      this._isCancelled = false;
    }
  }

  async removeOffline(playlistId: string): Promise<void> {
    try {
      await deleteOfflinePlaylist(playlistId);
      this._offlineStatus.set(playlistId, false);
    } catch (error) {
      console.error("Failed to remove offline playlist:", error);
      alert("Failed to remove offline playlist. Please try again.");
    }
  }

  async makeTrackOffline(
    trackId: string,
    metadata: {
      title?: string;
      artist?: string;
      album?: string;
      duration?: number;
    },
    filename: string
  ): Promise<void> {
    this._abortController = new AbortController();
    this._isCancelled = false;

    try {
      this._progress = {
        trackId,
        trackName: metadata.title || filename,
        current: 0,
        total: 1,
        type: "offline",
      };

      const blob = await this.downloadTrackBlob(trackId);

      await saveTrackOffline(trackId, blob, metadata, filename);

      if (!this._isCancelled) {
        this._progress = {
          ...this._progress,
          current: 1,
        };
        this._trackOfflineStatus.set(trackId, true);
      }
    } catch (error) {
      if (this._isCancelled) {
        return;
      }
      console.error("Failed to make track offline:", error);
      alert("Failed to save track offline. Please try again.");
    } finally {
      this._progress = null;
      this._abortController = null;
      this._isCancelled = false;
    }
  }

  async removeTrackOffline(trackId: string): Promise<void> {
    try {
      await deleteOfflineTrack(trackId);
      this._trackOfflineStatus.set(trackId, false);
    } catch (error) {
      console.error("Failed to remove offline track:", error);
      alert("Failed to remove offline track. Please try again.");
    }
  }

  async cancelDownload(): Promise<void> {
    this._isCancelled = true;

    if (this._abortController) {
      this._abortController.abort();
      this._abortController = null;
    }

    if (this._progress?.playlistId && "serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const bgFetchId = `offline-playlist-${this._progress.playlistId}`;
        const bgFetch = await registration.backgroundFetch.get(bgFetchId);

        if (bgFetch) {
          await bgFetch.abort();
        }
      } catch (error) {
        console.error("Failed to cancel background fetch:", error);
      }
    }

    this._progress = null;
  }
}

export const downloadStore = new DownloadStore();
