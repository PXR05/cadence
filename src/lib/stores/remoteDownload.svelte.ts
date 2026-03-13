import { BASE_URL } from "$lib/constants";
import type {
  RemoteCollectionKind,
  RemoteDownloadResponse,
  RemoteProvider,
  RemoteSearchResult,
} from "$lib/schemas";
import {
  buildRemoteItemUrl,
  getRemoteCollectionKindFromUrl,
  getRemoteItemIdFromUrl,
  getRemoteProviderLabel,
} from "$lib/utils/remote";
import { tracksStore } from "./tracks.svelte";

interface DownloadProgress {
  provider: RemoteProvider;
  providerItemId: string;
  title: string;
  percent: number;
  message: string;
}

interface QueueItem {
  provider: RemoteProvider;
  type: "item" | "url";
  providerItemId: string;
  streamId: string;
  result?: RemoteSearchResult;
  url?: string;
  collectionKind?: RemoteCollectionKind | null;
}

interface PersistentState {
  currentDownload: QueueItem | null;
  queue: QueueItem[];
  progress: DownloadProgress | null;
}

interface RemoteProgressEvent {
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
  trackTitle?: string;
  result?: RemoteDownloadResponse;
}

class RemoteDownloadStore {
  private _currentDownload = $state<QueueItem | null>(null);
  private _queue = $state<QueueItem[]>([]);
  private _progress = $state<DownloadProgress | null>(null);
  private _isProcessing = false;
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

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem("cadence.remote_download");
      if (stored) {
        const state: PersistentState = JSON.parse(stored);
        this._currentDownload = state.currentDownload;
        this._queue = state.queue || [];
        this._progress = state.progress;
      }
    } catch (error) {
      console.error("Failed to load remote download state:", error);
      localStorage.removeItem("cadence.remote_download");
    }
  }

  private saveToStorage() {
    try {
      const state: PersistentState = {
        currentDownload: this._currentDownload,
        queue: this._queue,
        progress: this._progress,
      };
      localStorage.setItem("cadence.remote_download", JSON.stringify(state));
    } catch (error) {
      console.error("Failed to save remote download state:", error);
    }
  }

  private async checkForPendingDownloads() {
    if (this._currentDownload && !this._isProcessing) {
      const current = this._currentDownload;
      const label = getRemoteProviderLabel(current.provider);
      const title =
        current.type === "item"
          ? current.result?.title
          : `${label} ${current.collectionKind ?? "item"}`;
      console.log("Resuming remote download:", title);
      await this.processQueue();
    }
  }

  async addToQueue(result: RemoteSearchResult) {
    const queueItem: QueueItem = {
      provider: result.provider,
      type: "item",
      providerItemId: result.providerItemId,
      streamId: crypto.randomUUID(),
      result,
      collectionKind: null,
    };

    if (
      this._queue.some(
        (item) =>
          item.provider === queueItem.provider &&
          item.providerItemId === queueItem.providerItemId,
      )
    ) {
      return;
    }

    if (
      this._currentDownload?.provider === queueItem.provider &&
      this._currentDownload.providerItemId === queueItem.providerItemId
    ) {
      return;
    }

    this._queue.push(queueItem);
    this.saveToStorage();

    if (!this._isProcessing) {
      await this.processQueue();
    }
  }

  async addUrlToQueue(provider: RemoteProvider, url: string) {
    const collectionKind = getRemoteCollectionKindFromUrl(provider, url);
    const providerItemId =
      getRemoteItemIdFromUrl(provider, url) ||
      `${collectionKind || "url"}_${Date.now()}`;

    const queueItem: QueueItem = {
      provider,
      type: "url",
      streamId: crypto.randomUUID(),
      providerItemId,
      url,
      collectionKind,
    };

    if (
      this._queue.some((item) => item.provider === provider && item.url === url)
    ) {
      return;
    }

    if (
      this._currentDownload?.provider === provider &&
      this._currentDownload?.url === url
    ) {
      return;
    }

    this._queue.push(queueItem);
    this.saveToStorage();

    if (!this._isProcessing) {
      await this.processQueue();
    }
  }

  async downloadFromUrl(provider: RemoteProvider, url: string): Promise<void> {
    await this.addUrlToQueue(provider, url);
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

        await this.downloadQueueItem(this._currentDownload);

        this._currentDownload = null;
        this.saveToStorage();
      }
    } finally {
      this._isProcessing = false;
    }
  }

  private async downloadQueueItem(queueItem: QueueItem) {
    const {
      provider,
      type,
      providerItemId,
      streamId,
      result,
      url,
      collectionKind,
    } = queueItem;

    const providerLabel = getRemoteProviderLabel(provider);
    const isUrl = type === "url";
    const downloadUrl = isUrl
      ? url!
      : buildRemoteItemUrl(provider, providerItemId);
    const initialTitle = isUrl
      ? `${providerLabel} ${collectionKind ?? "item"}`
      : result!.title;

    this._progress = {
      provider,
      providerItemId,
      title: initialTitle,
      percent: 0,
      message: "Starting download...",
    };
    this.saveToStorage();

    let playlistTotal = 0;
    let playlistCurrent = 0;
    let wasCancelled = false;

    try {
      await this.downloadRemote(provider, downloadUrl, streamId, (event) => {
        if (event.type === "progress" && event.data?.percent !== undefined) {
          let overallPercent = event.data.percent;

          if (playlistTotal > 0) {
            const playlistProgress =
              ((playlistCurrent - 1) / playlistTotal) * 100;
            const currentItemProgress = event.data.percent / playlistTotal;
            overallPercent = playlistProgress + currentItemProgress;
          }

          this._progress = {
            provider,
            providerItemId,
            title: this._progress?.title || initialTitle,
            percent: overallPercent,
            message: event.message,
          };
          this.saveToStorage();
        } else if (event.type === "info") {
          const title =
            event.trackTitle ??
            event.videoTitle ??
            this._progress?.title ??
            initialTitle;

          playlistTotal = event.playlistTotal ?? playlistTotal;
          playlistCurrent = event.playlistCurrent ?? playlistCurrent;

          this._progress = {
            provider,
            providerItemId,
            title,
            percent:
              playlistTotal > 0
                ? (playlistCurrent / playlistTotal) * 100
                : (this._progress?.percent ?? 0),
            message: event.message,
          };
          this.saveToStorage();
        } else if (event.type === "cancelled") {
          wasCancelled = true;
          this._progress = {
            provider,
            providerItemId,
            title: this._progress?.title || initialTitle,
            percent: this._progress?.percent ?? 0,
            message: event.message || "Download cancelled",
          };
          this.saveToStorage();
        }
      });

      this._progress = null;
      this.saveToStorage();

      if (!wasCancelled) {
        await tracksStore.loadAllTracks();
      }
    } catch (error) {
      console.error("Error downloading remote track:", error);
      this._progress = null;
      this.saveToStorage();
    }
  }

  private async downloadRemote(
    provider: RemoteProvider,
    url: string,
    stream: string,
    onProgress: (event: RemoteProgressEvent) => void,
  ): Promise<void> {
    const params = new URLSearchParams({ url, stream });
    const eventSource = new EventSource(
      `${BASE_URL}/upload/${provider}?${params}`,
      {
        withCredentials: true,
      },
    );
    this._activeEventSource = eventSource;

    return new Promise((resolve, reject) => {
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as RemoteProgressEvent;
          onProgress(data);

          if (data.type === "complete" || data.type === "cancelled") {
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

    const { provider, streamId } = this._currentDownload;

    try {
      const response = await fetch(
        `${BASE_URL}/upload/${provider}/${streamId}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

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
      console.error("Error requesting remote download cancellation:", error);
      throw error;
    }
  }

  clearQueue() {
    this._queue = [];
    this._currentDownload = null;
    this._progress = null;
    this._activeEventSource?.close();
    this._activeEventSource = null;
    this.saveToStorage();
  }

  isInQueue(provider: RemoteProvider, providerItemId: string): boolean {
    return (
      this._queue.some(
        (item) =>
          item.provider === provider && item.providerItemId === providerItemId,
      ) ||
      (this._currentDownload?.provider === provider &&
        this._currentDownload.providerItemId === providerItemId)
    );
  }
}

export const remoteDownloadStore = new RemoteDownloadStore();
