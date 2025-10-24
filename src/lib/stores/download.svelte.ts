import {
  saveTrackOffline,
  savePlaylistOffline,
  isPlaylistOffline as checkIsPlaylistOffline,
  isTrackOffline as checkIsTrackOffline,
  isTrackOfflineWithSize,
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

type PendingDownload = {
  playlistId: string;
  playlistName: string;
  totalTracks: number;
  startedAt: number;
};

class DownloadStore {
  private _progress = $state<DownloadProgress | null>(null);
  private _offlineStatus = $state<Map<string, boolean>>(new Map());
  private _trackOfflineStatus = $state<Map<string, boolean>>(new Map());
  private _abortController: AbortController | null = null;
  private _isCancelled = false;
  private _isResuming = false;

  constructor() {
    if (typeof window !== "undefined") {
      setTimeout(() => this.checkForPendingDownloads(), 1000);
    }
  }

  private async checkForPendingDownloads(): Promise<void> {
    try {
      const pendingData = localStorage.getItem("pendingDownload");
      if (!pendingData) return;

      const pending: PendingDownload = JSON.parse(pendingData);

      const isComplete = await checkIsPlaylistOffline(pending.playlistId);

      if (isComplete) {
        localStorage.removeItem("pendingDownload");
        return;
      }

      const hoursSinceStart =
        (Date.now() - pending.startedAt) / (1000 * 60 * 60);
      if (hoursSinceStart > 24) {
        localStorage.removeItem("pendingDownload");
        return;
      }

      console.log(
        `Auto-resuming incomplete download for playlist: ${pending.playlistName}`
      );

      await this.resumePendingDownload(pending);
    } catch (error) {
      console.error("Failed to check for pending downloads:", error);
      localStorage.removeItem("pendingDownload");
    }
  }

  private async resumePendingDownload(pending: PendingDownload): Promise<void> {
    try {
      const response = await fetch(`/api/playlist/${pending.playlistId}`);
      if (!response.ok) {
        console.error("Failed to fetch playlist for resume");
        localStorage.removeItem("pendingDownload");
        return;
      }

      const playlist: PlaylistDetail = await response.json();

      await this.makeOffline(playlist, pending.playlistId, true);
    } catch (error) {
      console.error("Failed to resume pending download:", error);
    }
  }

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
    playlistId: string,
    isResume: boolean = false
  ): Promise<void> {
    this._abortController = new AbortController();
    this._isCancelled = false;
    this._isResuming = isResume;

    try {
      const pendingDownload: PendingDownload = {
        playlistId,
        playlistName: playlist.name,
        totalTracks: playlist.items.length,
        startedAt: Date.now(),
      };
      localStorage.setItem("pendingDownload", JSON.stringify(pendingDownload));

      this._progress = {
        playlistId: playlist.id,
        playlistName: playlist.name,
        current: 0,
        total: playlist.items.length,
        type: "offline",
      };

      const trackIds: string[] = [];
      let skippedCount = 0;
      let resumedFrom = 0;

      for (let i = 0; i < playlist.items.length; i++) {
        if (this._isCancelled) {
          console.log("Download cancelled, progress saved for resume");
          return;
        }

        const item = playlist.items[i];

        const alreadyExists = await isTrackOfflineWithSize(
          item.audio.id,
          item.audio.size
        );

        if (alreadyExists) {
          if (i === 0 || skippedCount === 0) {
            resumedFrom = i + 1;
          }
          trackIds.push(item.audio.id);
          skippedCount++;
          this._progress = {
            ...this._progress,
            current: i + 1,
          };
          continue;
        }

        try {
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
            item.audio.filename,
            item.audio.size
          );

          trackIds.push(item.audio.id);
          this._progress = {
            ...this._progress,
            current: i + 1,
          };
        } catch (error) {
          console.error(`Failed to download track ${item.audio.id}:`, error);

          throw error;
        }
      }

      if (this._isCancelled) {
        console.log("Download cancelled, progress saved for resume");
        return;
      }

      await savePlaylistOffline(playlistId, playlist.name, trackIds);
      this._offlineStatus.set(playlistId, true);

      localStorage.removeItem("pendingDownload");

      if (isResume && resumedFrom > 0) {
        console.log(`Download resumed from track ${resumedFrom}`);
      }

      if (skippedCount > 0) {
        console.log(`Skipped ${skippedCount} already downloaded track(s)`);
      }
    } catch (error) {
      if (this._isCancelled) {
        console.log("Download cancelled, progress saved for resume");
        return;
      }
      console.error("Failed to make playlist offline:", error);

      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      alert(
        `Download failed: ${errorMsg}\n\nYou can resume the download later.`
      );
      throw error;
    } finally {
      this._progress = null;
      this._abortController = null;
      this._isCancelled = false;
      this._isResuming = false;
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
    filename: string,
    size?: number
  ): Promise<void> {
    this._abortController = new AbortController();
    this._isCancelled = false;

    try {
      if (size) {
        const alreadyExists = await isTrackOfflineWithSize(trackId, size);
        if (alreadyExists) {
          console.log(`Track already downloaded: ${trackId}`);
          this._trackOfflineStatus.set(trackId, true);
          return;
        }
      }

      this._progress = {
        trackId,
        trackName: metadata.title || filename,
        current: 0,
        total: 1,
        type: "offline",
      };

      const blob = await this.downloadTrackBlob(trackId);

      await saveTrackOffline(trackId, blob, metadata, filename, size);

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

    this._progress = null;
  }
}

export const downloadStore = new DownloadStore();
