import {
  saveTrackOffline,
  isTrackOffline as checkIsTrackOffline,
  isTrackOfflineWithSize,
  deleteOfflineTrack,
  saveImageOffline,
} from "$lib/db/offline";
import {
  getPlaylistOfflineStatus,
  updatePlaylistOfflineStatus,
  checkAndUpdatePlaylistOfflineStatus,
  getTrackIdsUsedByOtherOfflinePlaylists,
  cacheDb,
} from "$lib/db/cache";
import type { PlaylistDetail } from "$lib/schemas";
import zip from "jszip";
import {
  fetchTrackImage,
  fetchTrackStream,
} from "$lib/backend/services/media";
import { requireBackendCapability } from "$lib/backend/capabilities";
import { backendCapabilities } from "$lib/backend/config";

type DownloadProgress = {
  playlistId?: string;
  playlistName?: string;
  trackId?: string;
  trackName?: string;
  current: number;
  total: number;
  type: "offline" | "download";
};

interface QueueItem {
  id: string;
  type: "playlist-offline" | "playlist-download" | "track-offline";
  playlistId?: string;
  playlistName?: string;
  playlist?: PlaylistDetail;
  trackId?: string;
  trackName?: string;
  metadata?: {
    title?: string;
    artist?: string;
    album?: string;
    duration?: number;
  };
  filename?: string;
  size?: number;
}

interface PersistentState {
  currentDownload: QueueItem | null;
  queue: QueueItem[];
  progress: DownloadProgress | null;
}

class DownloadStore {
  private _currentDownload = $state<QueueItem | null>(null);
  private _queue = $state<QueueItem[]>([]);
  private _progress = $state<DownloadProgress | null>(null);
  private _offlineStatus = $state<Map<string, boolean>>(new Map());
  private _trackOfflineStatus = $state<Map<string, boolean>>(new Map());
  private _abortController: AbortController | null = null;
  private _isCancelled = false;
  private _isProcessing = false;

  constructor() {
    if (typeof window !== "undefined") {
      this.loadFromStorage();
      setTimeout(() => this.checkForPendingDownloads(), 1000);
    }
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem("cadence.download_queue");
      if (stored) {
        const state: PersistentState = JSON.parse(stored);
        this._currentDownload = state.currentDownload;
        this._queue = state.queue || [];
        this._progress = state.progress;
      }
    } catch (error) {
      console.error("Failed to load download queue state:", error);
      localStorage.removeItem("cadence.download_queue");
    }
  }

  private saveToStorage() {
    try {
      const state: PersistentState = {
        currentDownload: this._currentDownload,
        queue: this._queue,
        progress: this._progress,
      };
      localStorage.setItem("cadence.download_queue", JSON.stringify(state));
    } catch (error) {
      console.error("Failed to save download queue state:", error);
    }
  }

  private async checkForPendingDownloads(): Promise<void> {
    if (!backendCapabilities.media.streaming) return;
    if (this._currentDownload && !this._isProcessing) {
      console.log("Resuming pending download:", this._currentDownload.id);
      await this.processQueue();
    }
  }

  get currentDownload() {
    return this._currentDownload;
  }

  get queue() {
    return this._queue;
  }

  get progress(): DownloadProgress | null {
    return this._progress;
  }

  get isDownloading(): boolean {
    return this._currentDownload !== null;
  }

  get queueCount() {
    return this._queue.length;
  }

  isPlaylistOffline(playlistId: string): boolean {
    return this._offlineStatus.get(playlistId) ?? false;
  }

  isTrackOffline(trackId: string): boolean {
    return this._trackOfflineStatus.get(trackId) ?? false;
  }

  async checkOfflineStatus(playlistId: string): Promise<void> {
    const isOffline = await getPlaylistOfflineStatus(playlistId);
    this._offlineStatus.set(playlistId, isOffline);
  }

  async recalculatePlaylistOfflineStatus(playlistId: string): Promise<void> {
    const isOffline = await checkAndUpdatePlaylistOfflineStatus(
      playlistId,
      checkIsTrackOffline,
    );
    this._offlineStatus.set(playlistId, isOffline);
  }

  async recalculateAllTrackedPlaylists(): Promise<void> {
    const playlistIds = Array.from(this._offlineStatus.keys());
    await Promise.all(
      playlistIds.map((id) => this.recalculatePlaylistOfflineStatus(id)),
    );
  }

  async checkTrackOfflineStatus(trackId: string): Promise<boolean> {
    const isOffline = await checkIsTrackOffline(trackId);
    this._trackOfflineStatus.set(trackId, isOffline);
    return isOffline;
  }

  private async downloadTrackBlob(
    audioId: string,
    signal?: AbortSignal,
  ): Promise<Blob> {
    const response = await fetchTrackStream(audioId, signal);
    if (!response.ok) throw new Error(`Failed to download track ${audioId}`);
    return response.blob();
  }

  private async downloadAndSaveImage(trackId: string): Promise<void> {
    try {
      const response = await fetchTrackImage(trackId);
      if (response.ok) {
        const imageBlob = await response.blob();
        await saveImageOffline(trackId, imageBlob);
      }
    } catch (error) {
      console.warn(`Failed to download image for track ${trackId}:`, error);
    }
  }

  async addPlaylistToDownloadQueue(playlist: PlaylistDetail): Promise<void> {
    requireBackendCapability("media.streaming");
    const queueItem: QueueItem = {
      id: `playlist-download-${playlist.id}`,
      type: "playlist-download",
      playlistId: playlist.id,
      playlistName: playlist.name,
      playlist,
    };

    if (this._queue.some((item) => item.id === queueItem.id)) {
      console.log("Playlist already in download queue:", playlist.name);
      return;
    }

    if (this._currentDownload?.id === queueItem.id) {
      console.log("Playlist is already downloading:", playlist.name);
      return;
    }

    this._queue.push(queueItem);
    this.saveToStorage();

    if (!this._isProcessing) {
      await this.processQueue();
    }
  }

  async addPlaylistToOfflineQueue(
    playlist: PlaylistDetail,
    playlistId: string,
  ): Promise<void> {
    requireBackendCapability("offline");
    const queueItem: QueueItem = {
      id: `playlist-offline-${playlistId}`,
      type: "playlist-offline",
      playlistId,
      playlistName: playlist.name,
      playlist,
    };

    if (this._queue.some((item) => item.id === queueItem.id)) {
      console.log("Playlist already in offline queue:", playlist.name);
      return;
    }

    if (this._currentDownload?.id === queueItem.id) {
      console.log("Playlist is already being saved offline:", playlist.name);
      return;
    }

    this._queue.push(queueItem);
    this.saveToStorage();

    if (!this._isProcessing) {
      await this.processQueue();
    }
  }

  async addTrackToOfflineQueue(
    trackId: string,
    metadata: {
      title?: string;
      artist?: string;
      album?: string;
      duration?: number;
    },
    filename: string,
    size?: number,
  ): Promise<void> {
    requireBackendCapability("offline");
    const queueItem: QueueItem = {
      id: `track-offline-${trackId}`,
      type: "track-offline",
      trackId,
      trackName: metadata.title || filename,
      metadata,
      filename,
      size,
    };

    if (this._queue.some((item) => item.id === queueItem.id)) {
      console.log("Track already in offline queue:", queueItem.trackName);
      return;
    }

    if (this._currentDownload?.id === queueItem.id) {
      console.log("Track is already being saved offline:", queueItem.trackName);
      return;
    }

    this._queue.push(queueItem);
    this.saveToStorage();

    if (!this._isProcessing) {
      await this.processQueue();
    }
  }

  private async processQueue() {
    if (this._isProcessing) return;
    if (this._currentDownload === null && this._queue.length === 0) return;

    this._isProcessing = true;

    try {
      while (this._currentDownload || this._queue.length > 0) {
        if (this._isCancelled) break;

        if (!this._currentDownload) {
          this._currentDownload = this._queue.shift() || null;
          this.saveToStorage();
        }

        if (!this._currentDownload) break;

        try {
          await this.processQueueItem(this._currentDownload);
        } catch (error) {
          console.error("Queue item failed, skipping to next:", error);
        }

        this._currentDownload = null;
        this.saveToStorage();
      }
    } finally {
      this._isProcessing = false;
    }
  }

  private async processQueueItem(queueItem: QueueItem) {
    try {
      if (queueItem.type === "playlist-download" && queueItem.playlist) {
        await this._downloadPlaylist(queueItem.playlist);
      } else if (
        queueItem.type === "playlist-offline" &&
        queueItem.playlist &&
        queueItem.playlistId
      ) {
        await this._makeOffline(queueItem.playlist, queueItem.playlistId);
      } else if (
        queueItem.type === "track-offline" &&
        queueItem.trackId &&
        queueItem.metadata &&
        queueItem.filename
      ) {
        await this._makeTrackOffline(
          queueItem.trackId,
          queueItem.metadata,
          queueItem.filename,
          queueItem.size,
        );
      }
    } catch (error) {
      console.error("Error processing queue item:", error);
    }
  }

  async downloadPlaylist(playlist: PlaylistDetail): Promise<void> {
    await this.addPlaylistToDownloadQueue(playlist);
  }

  private async _downloadPlaylist(playlist: PlaylistDetail): Promise<void> {
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
      this.saveToStorage();

      const zipFile = new zip();

      for (let i = 0; i < playlist.items.length; i++) {
        if (this._isCancelled) {
          return;
        }

        const item = playlist.items[i];
        const blob = await this.downloadTrackBlob(
          item.audio.id,
          this._abortController?.signal,
        );
        const filename = item.audio.metadata?.title
          ? `${(i + 1).toString().padStart(playlist.items.length.toString().length, "0")}. ${item.audio.metadata.artist || "Unknown"} - ${
              item.audio.metadata.title
            }.${item.audio.filename.split(".").pop()}`
          : item.audio.filename;
        const cleanFilename = filename.replace(/[/\\?%*:|"<>]/g, "_");

        zipFile.file(cleanFilename, blob);
        this._progress = {
          ...this._progress,
          current: i + 1,
        };
        this.saveToStorage();
      }

      if (this._isCancelled) {
        return;
      }

      const content = await zipFile.generateAsync({ type: "blob" });
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
      throw error;
    } finally {
      this._progress = null;
      this._abortController = null;
      this._isCancelled = false;
      this.saveToStorage();
    }
  }

  async makeOffline(
    playlist: PlaylistDetail,
    playlistId: string,
  ): Promise<void> {
    await this.addPlaylistToOfflineQueue(playlist, playlistId);
  }

  private async _makeOffline(
    playlist: PlaylistDetail,
    playlistId: string,
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
      this.saveToStorage();

      const trackIds: string[] = [];
      let skippedCount = 0;

      for (let i = 0; i < playlist.items.length; i++) {
        if (this._isCancelled) {
          console.log("Download cancelled, progress saved for resume");
          return;
        }

        const item = playlist.items[i];

        const alreadyExists = await isTrackOfflineWithSize(
          item.audio.id,
          item.audio.size,
        );

        if (alreadyExists) {
          trackIds.push(item.audio.id);
          skippedCount++;
          this._progress = {
            ...this._progress,
            current: i + 1,
          };
          this.saveToStorage();
          continue;
        }

        try {
          const blob = await this.downloadTrackBlob(
            item.audio.id,
            this._abortController?.signal,
          );

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
            item.audio.size,
          );

          await this.downloadAndSaveImage(item.audio.id);

          trackIds.push(item.audio.id);
          this._progress = {
            ...this._progress,
            current: i + 1,
          };
          this.saveToStorage();
        } catch (error) {
          console.error(`Failed to download track ${item.audio.id}:`, error);
          throw error;
        }
      }

      if (this._isCancelled) {
        console.log("Download cancelled, progress saved for resume");
        return;
      }

      await updatePlaylistOfflineStatus(playlistId, true);
      this._offlineStatus.set(playlistId, true);

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
      console.error(errorMsg);
      throw error;
    } finally {
      this._progress = null;
      this._abortController = null;
      this._isCancelled = false;
      this.saveToStorage();
    }
  }

  async removeOffline(playlistId: string): Promise<void> {
    try {
      const playlistDetail = await cacheDb.playlistDetails.get(playlistId);
      if (playlistDetail) {
        const trackIds = playlistDetail.items.map((item) => item.audio.id);

        const tracksUsedByOthers = await getTrackIdsUsedByOtherOfflinePlaylists(
          playlistId,
          trackIds,
        );

        const tracksToDelete = trackIds.filter(
          (id) => !tracksUsedByOthers.has(id),
        );
        await Promise.all(tracksToDelete.map((id) => deleteOfflineTrack(id)));
      }
      await updatePlaylistOfflineStatus(playlistId, false);
      this._offlineStatus.set(playlistId, false);
    } catch (error) {
      console.error("Failed to remove offline playlist:", error);
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
    size?: number,
  ): Promise<void> {
    await this.addTrackToOfflineQueue(trackId, metadata, filename, size);
  }

  private async _makeTrackOffline(
    trackId: string,
    metadata: {
      title?: string;
      artist?: string;
      album?: string;
      duration?: number;
    },
    filename: string,
    size?: number,
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
      this.saveToStorage();

      const blob = await this.downloadTrackBlob(
        trackId,
        this._abortController?.signal,
      );

      await saveTrackOffline(
        trackId,
        blob,
        {
          title: metadata.title,
          artist: metadata.artist,
          album: metadata.album,
          duration: metadata.duration,
        },
        filename,
        size,
      );

      await this.downloadAndSaveImage(trackId);

      if (!this._isCancelled) {
        this._progress = {
          ...this._progress,
          current: 1,
        };
        this.saveToStorage();
        this._trackOfflineStatus.set(trackId, true);
        await this.recalculateAllTrackedPlaylists();
      }
    } catch (error) {
      if (this._isCancelled) {
        return;
      }
      console.error("Failed to make track offline:", error);
      throw error;
    } finally {
      this._progress = null;
      this._abortController = null;
      this._isCancelled = false;
      this.saveToStorage();
    }
  }

  async removeTrackOffline(trackId: string): Promise<void> {
    try {
      await deleteOfflineTrack(trackId);
      this._trackOfflineStatus.set(trackId, false);
      await this.recalculateAllTrackedPlaylists();
    } catch (error) {
      console.error("Failed to remove offline track:", error);
    }
  }

  async cancelDownload(): Promise<void> {
    this._isCancelled = true;

    if (this._abortController) {
      this._abortController.abort();
      this._abortController = null;
    }

    if (this._currentDownload) {
      this._currentDownload = null;
      this._progress = null;
      this.saveToStorage();
    }
  }

  removeFromQueue(id: string) {
    this._queue = this._queue.filter((item) => item.id !== id);
    this.saveToStorage();
  }

  clearQueue() {
    this._queue = [];
    this.saveToStorage();
  }

  resetState() {
    this._queue = [];
    this._currentDownload = null;
    this._progress = null;
    this._isCancelled = false;
    this._isProcessing = false;
    this._offlineStatus = new Map();
    this._trackOfflineStatus = new Map();
    this.saveToStorage();
  }

  isInQueue(id: string): boolean {
    return (
      this._queue.some((item) => item.id === id) ||
      this._currentDownload?.id === id
    );
  }

  isPlaylistInQueue(playlistId: string, type: "offline" | "download"): boolean {
    const id =
      type === "offline"
        ? `playlist-offline-${playlistId}`
        : `playlist-download-${playlistId}`;
    return this.isInQueue(id);
  }

  isTrackInQueue(trackId: string): boolean {
    const id = `track-offline-${trackId}`;
    return this.isInQueue(id);
  }
}

export const downloadStore = new DownloadStore();
