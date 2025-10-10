import { fetchTracks } from "$lib/api";
import { createLocalStorageState } from "./localStorage.svelte";

interface TracksState {
  tracks: AudioFile[];
  lastFetchedAt: string | null;
  isInitialLoad: boolean;
  isLoadingMore: boolean;
  error: string | null;
}

class TracksStore {
  private persistedState = createLocalStorageState<TracksState>(
    "cadence.tracks_cache",
    {
      tracks: [],
      lastFetchedAt: null,
      isInitialLoad: false,
      isLoadingMore: false,
      error: null,
    }
  );

  get tracks() {
    return this.persistedState.value.tracks;
  }

  get lastFetchedAt() {
    return this.persistedState.value.lastFetchedAt;
  }

  get isInitialLoad() {
    return this.persistedState.value.isInitialLoad;
  }

  get isLoadingMore() {
    return this.persistedState.value.isLoadingMore;
  }

  get error() {
    return this.persistedState.value.error;
  }

  private set isInitialLoad(value: boolean) {
    this.persistedState.value = {
      ...this.persistedState.value,
      isInitialLoad: value,
    };
  }

  private set isLoadingMore(value: boolean) {
    this.persistedState.value = {
      ...this.persistedState.value,
      isLoadingMore: value,
    };
  }

  private set error(value: string | null) {
    this.persistedState.value = {
      ...this.persistedState.value,
      error: value,
    };
  }

  async loadAllTracks(forceRefresh: boolean = false): Promise<void> {
    if (!forceRefresh && this.tracks.length > 0 && this.lastFetchedAt) {
      const shouldRefresh = await this.shouldRefreshTracks();
      if (!shouldRefresh) {
        return;
      }
    }

    this.isInitialLoad = true;
    this.error = null;

    try {
      const allTracks: AudioFile[] = [];
      let currentPage = 1;
      let hasMore = true;

      while (hasMore) {
        const result = await fetchTracks({
          page: currentPage,
          limit: 100,
          sortBy: "uploadedAt",
          sortOrder: "desc",
        });

        allTracks.push(...result.tracks);

        if (currentPage === 1) {
          this.persistedState.value = {
            ...this.persistedState.value,
            tracks: [...result.tracks],
            isInitialLoad: false,
            isLoadingMore: result.hasMore,
          };
        } else {
          this.persistedState.value = {
            ...this.persistedState.value,
            tracks: [...allTracks],
          };
        }

        hasMore = result.hasMore;
        currentPage++;
      }

      this.persistedState.value = {
        tracks: allTracks,
        lastFetchedAt: new Date().toISOString(),
        isInitialLoad: false,
        isLoadingMore: false,
        error: null,
      };
    } catch (err) {
      this.error = err instanceof Error ? err.message : "Failed to load tracks";
      this.isInitialLoad = false;
      this.isLoadingMore = false;
      throw err;
    }
  }

  private async shouldRefreshTracks(): Promise<boolean> {
    try {
      const result = await fetchTracks({
        page: 1,
        limit: 1,
        sortBy: "uploadedAt",
        sortOrder: "desc",
      });

      if (result.tracks.length === 0) {
        return false;
      }

      const latestServerTrack = result.tracks[0];
      const latestCachedTrack = this.tracks[0];

      if (!latestCachedTrack) {
        return true;
      }

      const serverDate = new Date(latestServerTrack.uploadedAt);
      const cachedDate = new Date(latestCachedTrack.uploadedAt);

      return serverDate > cachedDate;
    } catch (err) {
      console.error("Error checking for updates:", err);
      return false;
    }
  }

  getShuffledTracks(firstTrack?: AudioFile): AudioFile[] {
    const shuffled = [...this.tracks];

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    if (firstTrack) {
      const index = shuffled.findIndex((t) => t.id === firstTrack.id);
      if (index > 0) {
        shuffled.splice(index, 1);
        shuffled.unshift(firstTrack);
      }
    }

    return shuffled;
  }

  clear(): void {
    this.persistedState.clear();
  }
}

export const tracksStore = new TracksStore();
