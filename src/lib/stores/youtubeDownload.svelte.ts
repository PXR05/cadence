import { BASE_URL } from "$lib/constants";
import type {
  YouTubeSearchResult,
  YoutubeDownloadResponse,
} from "$lib/schemas";
import { tracksStore } from "./tracks.svelte";

interface DownloadProgress {
  videoId: string;
  title: string;
  percent: number;
  message: string;
}

interface QueueItem {
  type: "video" | "url";
  videoId: string;
  streamId: string;
  result?: YouTubeSearchResult;
  url?: string;
}

interface PersistentState {
  currentDownload: QueueItem | null;
  queue: QueueItem[];
  progress: DownloadProgress | null;
}

interface YouTubeProgressEvent {
  type: "progress" | "complete" | "error" | "info" | "cancelled";
  message: string;
  data?: {
    percent?: number;
    speed?: string;
    eta?: string;
    downloaded?: string;
    totalSize?: string;
  };
  playlistTitle?: string;
  playlistTotal?: number;
  playlistCurrent?: number;
  videoTitle?: string;
  result?: YoutubeDownloadResponse;
}

class YouTubeDownloadStore {
  private _currentDownload = $state<QueueItem | null>(null);
  private _queue = $state<QueueItem[]>([]);
  private _progress = $state<DownloadProgress | null>(null);
  private _isProcessing = false;
  private _completedVideoId = $state<string | null>(null);
  private _activeEventSource: EventSource | null = null;

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
      const stored = localStorage.getItem("cadence.youtube_download");
      if (stored) {
        const state: PersistentState = JSON.parse(stored);
        this._currentDownload = state.currentDownload;
        this._queue = state.queue || [];
        this._progress = state.progress;
      }
    } catch (error) {
      console.error("Failed to load YouTube download state:", error);
      localStorage.removeItem("cadence.youtube_download");
    }
  }

  private saveToStorage() {
    try {
      const state: PersistentState = {
        currentDownload: this._currentDownload,
        queue: this._queue,
        progress: this._progress,
      };
      localStorage.setItem("cadence.youtube_download", JSON.stringify(state));
    } catch (error) {
      console.error("Failed to save YouTube download state:", error);
    }
  }

  private async checkForPendingDownloads() {
    if (this._currentDownload && !this._isProcessing) {
      const title =
        this._currentDownload.type === "video"
          ? this._currentDownload.result?.title
          : this._currentDownload.url;
      console.log("Resuming YouTube download:", title);
      await this.processQueue();
    }
  }

  async addToQueue(result: YouTubeSearchResult) {
    const queueItem: QueueItem = {
      type: "video",
      videoId: result.videoId,
      streamId: crypto.randomUUID(),
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

  async addUrlToQueue(url: string) {
    const isPlaylist = url.includes("list=") || url.includes("/playlist");
    const videoIdMatch = url.match(/[?&]v=([^&]+)/);
    const videoId = isPlaylist
      ? `playlist_${Date.now()}`
      : videoIdMatch?.[1] || `url_${Date.now()}`;

    const queueItem: QueueItem = {
      type: "url",
      streamId: crypto.randomUUID(),
      videoId,
      url,
    };

    if (this._queue.some((item) => item.url === url)) {
      console.log("URL already in queue:", url);
      return;
    }

    if (this._currentDownload?.url === url) {
      console.log("URL is already downloading:", url);
      return;
    }

    this._queue.push(queueItem);
    this.saveToStorage();

    if (!this._isProcessing) {
      await this.processQueue();
    }
  }

  async downloadFromUrl(url: string): Promise<void> {
    await this.addUrlToQueue(url);
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
    const { type, videoId, streamId, result, url } = queueItem;

    const isUrl = type === "url";
    const isPlaylist =
      isUrl && (url?.includes("list=") || url?.includes("/playlist"));
    const downloadUrl = isUrl
      ? url!
      : `https://www.youtube.com/watch?v=${videoId}`;
    const initialTitle = isUrl
      ? isPlaylist
        ? "YouTube Playlist"
        : "YouTube Video"
      : result!.title;

    this._progress = {
      videoId,
      title: initialTitle,
      percent: 0,
      message: "Starting download...",
    };
    this.saveToStorage();

    let playlistTotal = 0;
    let playlistCurrent = 0;
    let wasCancelled = false;

    try {
      await this.downloadYoutube(
        downloadUrl,
        streamId,
        (event: YouTubeProgressEvent) => {
          if (event.type === "progress" && event.data?.percent !== undefined) {
            let overallPercent = event.data.percent;

            if (playlistTotal > 0) {
              const playlistProgress =
                ((playlistCurrent - 1) / playlistTotal) * 100;
              const currentVideoProgress = event.data.percent / playlistTotal;
              overallPercent = playlistProgress + currentVideoProgress;
            }

            this._progress = {
              videoId,
              title: this._progress?.title || initialTitle,
              percent: overallPercent,
              message: event.message,
            };
            this.saveToStorage();
          } else if (event.type === "info") {
            const infoMessage = event.message;
            const title =
              event.videoTitle ?? this._progress?.title ?? initialTitle;

            playlistTotal = event.playlistTotal ?? playlistTotal;
            playlistCurrent = event.playlistCurrent ?? playlistCurrent;
            const percent =
              playlistTotal > 0
                ? (playlistCurrent / playlistTotal) * 100
                : (this._progress?.percent ?? 0);

            this._progress = {
              videoId,
              title,
              percent,
              message: infoMessage,
            };
            this.saveToStorage();
          } else if (event.type === "cancelled") {
            wasCancelled = true;
            this._progress = {
              videoId,
              title: this._progress?.title || initialTitle,
              percent: this._progress?.percent ?? 0,
              message: event.message || "Download cancelled",
            };
            this.saveToStorage();
          }
        },
      );

      this._progress = null;
      this.saveToStorage();

      if (wasCancelled) {
        return;
      }

      this._completedVideoId = videoId;

      setTimeout(() => {
        if (this._completedVideoId === videoId) {
          this._completedVideoId = null;
        }
      }, 3000);

      await tracksStore.loadAllTracks();
    } catch (error) {
      console.error("Error downloading YouTube track:", error);
      this._progress = null;
      this.saveToStorage();
    }
  }

  private async downloadYoutube(
    url: string,
    stream: string,
    onProgress: (event: YouTubeProgressEvent) => void,
  ): Promise<void> {
    const params = new URLSearchParams({ url, stream });
    const eventSource = new EventSource(
      `${BASE_URL}/upload/youtube?${params}`,
      {
        withCredentials: true,
      },
    );
    this._activeEventSource = eventSource;

    return new Promise((resolve, reject) => {
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as YouTubeProgressEvent;
          onProgress(data);

          if (data.type === "complete") {
            eventSource.close();
            this._activeEventSource = null;
            resolve();
          } else if (data.type === "cancelled") {
            eventSource.close();
            this._activeEventSource = null;
            resolve();
          } else if (data.type === "error") {
            eventSource.close();
            this._activeEventSource = null;
            reject(new Error(data.message));
          }
        } catch (error) {
          console.error("Error parsing SSE data:", error);
        }
      };

      eventSource.onerror = (event) => {
        console.error("SSE connection error:", event);
        eventSource.close();
        this._activeEventSource = null;
        reject(
          new Error(
            "Connection to server lost" +
              (event ? `: ${JSON.stringify(event)}` : ""),
          ),
        );
      };
    });
  }

  async cancelCurrent() {
    if (!this._currentDownload) return;

    const streamId = this._currentDownload.streamId;

    try {
      const response = await fetch(`${BASE_URL}/upload/youtube/${streamId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to cancel download: ${await response.text()}`);
      }

      const data = (await response.json()) as {
        success: boolean;
        message: string;
      };

      if (!data.success) {
        throw new Error(data.message || "Failed to cancel download");
      }
    } catch (error) {
      console.error("Error requesting YouTube download cancellation:", error);
      throw error;
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
    this._activeEventSource?.close();
    this._activeEventSource = null;
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
