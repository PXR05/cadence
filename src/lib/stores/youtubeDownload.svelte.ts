import {
  downloadYoutubeWithProgress,
  type YouTubeProgressEvent,
} from "$lib/api";
import { tracksStore } from "./tracks.svelte";

interface DownloadProgress {
  videoId: string;
  title: string;
  percent: number;
  message: string;
}

interface QueueItem {
  videoId: string;
  result: YouTubeSearchResult;
}

interface PersistentState {
  currentDownload: QueueItem | null;
  queue: QueueItem[];
  progress: DownloadProgress | null;
}

class YouTubeDownloadStore {
  private _currentDownload = $state<QueueItem | null>(null);
  private _queue = $state<QueueItem[]>([]);
  private _progress = $state<DownloadProgress | null>(null);
  private _isProcessing = false;
  private _completedVideoId = $state<string | null>(null);

  constructor() {
    if (typeof window !== "undefined") {
      this.loadFromStorage();
      setTimeout(() => this.checkForPendingDownloads(), 1000);
    }
  }

  get currentDownload() {
    return this._currentDownload;
  }

  get queue() {
    return this._queue;
  }

  get progress() {
    return this._progress;
  }

  get isDownloading() {
    return this._currentDownload !== null;
  }

  get queueCount() {
    return this._queue.length;
  }

  get completedVideoId() {
    return this._completedVideoId;
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem("youtubeDownloadState");
      if (stored) {
        const state: PersistentState = JSON.parse(stored);
        this._currentDownload = state.currentDownload;
        this._queue = state.queue || [];
        this._progress = state.progress;
      }
    } catch (error) {
      console.error("Failed to load YouTube download state:", error);
      localStorage.removeItem("youtubeDownloadState");
    }
  }

  private saveToStorage() {
    try {
      const state: PersistentState = {
        currentDownload: this._currentDownload,
        queue: this._queue,
        progress: this._progress,
      };
      localStorage.setItem("youtubeDownloadState", JSON.stringify(state));
    } catch (error) {
      console.error("Failed to save YouTube download state:", error);
    }
  }

  private async checkForPendingDownloads() {
    if (this._currentDownload && !this._isProcessing) {
      console.log(
        "Resuming YouTube download:",
        this._currentDownload.result.title
      );
      await this.processQueue();
    }
  }

  async addToQueue(result: YouTubeSearchResult) {
    const queueItem: QueueItem = {
      videoId: result.videoId,
      result,
    };

    if (this._queue.some((item) => item.videoId === result.videoId)) {
      console.log("Video already in queue:", result.title);
      return;
    }

    if (this._currentDownload?.videoId === result.videoId) {
      console.log("Video is already downloading:", result.title);
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
        if (!this._currentDownload) {
          this._currentDownload = this._queue.shift() || null;
          this.saveToStorage();
        }

        if (!this._currentDownload) break;

        await this.downloadTrack(this._currentDownload);

        this._currentDownload = null;
        this.saveToStorage();
      }
    } finally {
      this._isProcessing = false;
    }
  }

  private async downloadTrack(queueItem: QueueItem) {
    const { videoId, result } = queueItem;

    this._progress = {
      videoId,
      title: result.title,
      percent: 0,
      message: "Starting download...",
    };
    this.saveToStorage();

    try {
      const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

      await downloadYoutubeWithProgress(
        youtubeUrl,
        (event: YouTubeProgressEvent) => {
          if (event.type === "progress" && event.data?.percent !== undefined) {
            this._progress = {
              videoId,
              title: result.title,
              percent: event.data.percent,
              message: event.message,
            };
            this.saveToStorage();
          } else if (event.type === "info") {
            this._progress = {
              videoId,
              title: result.title,
              percent: this._progress?.percent || 0,
              message: event.message,
            };
            this.saveToStorage();
          }
        }
      );

      this._completedVideoId = videoId;
      this._progress = null;
      this.saveToStorage();

      setTimeout(async () => {
        if (this._completedVideoId === videoId) {
          this._completedVideoId = null;
        }
      }, 3000);

      await tracksStore.loadAllTracks();
    } catch (error) {
      console.error("Error downloading YouTube track:", error);
      this._progress = null;
      this.saveToStorage();
      throw error;
    }
  }

  async cancelCurrent() {
    if (this._currentDownload) {
      this._currentDownload = null;
      this._progress = null;
      this.saveToStorage();
    }
  }

  removeFromQueue(videoId: string) {
    this._queue = this._queue.filter((item) => item.videoId !== videoId);
    this.saveToStorage();
  }

  clearQueue() {
    this._queue = [];
    this._currentDownload = null;
    this._progress = null;
    this.saveToStorage();
  }

  isInQueue(videoId: string): boolean {
    return (
      this._queue.some((item) => item.videoId === videoId) ||
      this._currentDownload?.videoId === videoId
    );
  }
}

export const youtubeDownloadStore = new YouTubeDownloadStore();
