import { deleteTrack, fetchTracks } from "$lib/api";
import {
  getTracksCache,
  saveTracksCache,
  clearTracksCache,
  deleteTrackFromCache,
} from "$lib/db/cache";
import type { AudioFile } from "$lib/schemas";
import { deduplicateByIsrc } from "$lib/utils/trackSources";
import { downloadStore } from "./download.svelte";

class TracksStore {
  private _tracks = $state<AudioFile[]>([]);
  private _sourcesByIsrc = new Map<string, AudioFile[]>();
  private _lastFetchedAt = $state<string | null>(null);
  private _isInitialLoad = $state(true);
  private _isLoadingMore = $state(false);
  private _error = $state<string | null>(null);
  private _initialized = false;

  get tracks() {
    return this._tracks;
  }

  get lastFetchedAt() {
    return this._lastFetchedAt;
  }

  get isInitialLoad() {
    return this._isInitialLoad;
  }

  get isLoadingMore() {
    return this._isLoadingMore;
  }

  get error() {
    return this._error;
  }

  get tracksCount() {
    return this._tracks.length;
  }

  private set isInitialLoad(value: boolean) {
    this._isInitialLoad = value;
  }

  private set isLoadingMore(value: boolean) {
    this._isLoadingMore = value;
  }

  private set error(value: string | null) {
    this._error = value;
  }

  getSourcesForTrack(track: AudioFile): AudioFile[] {
    if (!track.isrc) return [track];
    return this._sourcesByIsrc.get(track.isrc) ?? [track];
  }

  private applyDeduplication(rawTracks: AudioFile[]): AudioFile[] {
    const { deduplicated, sourcesByIsrc } = deduplicateByIsrc(rawTracks);
    this._sourcesByIsrc = sourcesByIsrc;
    return deduplicated;
  }

  private async initializeFromCache(): Promise<void> {
    if (this._initialized) return;

    try {
      const cache = await getTracksCache();
      if (cache) {
        this._tracks = this.applyDeduplication(cache.tracks);
        this._lastFetchedAt = cache.lastFetchedAt;
      }
    } catch (err) {
      console.error("Failed to load tracks from cache:", err);
    } finally {
      this._initialized = true;
      this.isInitialLoad = false;
    }
  }

  async loadAllTracks(forceRefresh: boolean = false): Promise<void> {
    await this.initializeFromCache();

    if (!forceRefresh && this.tracks.length > 0 && this.lastFetchedAt) {
      if ("onLine" in navigator && !navigator.onLine) {
        return;
      }

      const shouldRefresh = await this.shouldRefreshTracks();
      if (!shouldRefresh) {
        return;
      }
    }

    this.error = null;

    try {
      const allTracks: AudioFile[] = [];
      let currentPage = 1;
      let hasMore = true;

      while (hasMore) {
        try {
          const result = await fetchTracks({
            page: currentPage,
            limit: 100,
            sortBy: "uploadedAt",
            sortOrder: "desc",
          });

          allTracks.push(...result.tracks);
          hasMore = result.hasMore;
          currentPage++;
        } catch (err) {
          console.error("Error fetching tracks page:", err);
          return;
        }
      }

      this._tracks = this.applyDeduplication(allTracks);
      this._lastFetchedAt = new Date().toISOString();
      this.isLoadingMore = false;
      this.error = null;

      await saveTracksCache(allTracks, this._lastFetchedAt);
    } catch (err) {
      this.error = err instanceof Error ? err.message : "Failed to load tracks";
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

  getRandomTracks(count: number = 10, seed?: number): AudioFile[] {
    if (this.tracks.length === 0) return [];

    const currentSeed = seed ?? new Date().setHours(0, 0, 0, 0);

    const seededRandom = (seed: number) => {
      let state = seed;
      return () => {
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    };

    const random = seededRandom(currentSeed);
    const shuffled = [...this.tracks];

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  async deleteTrack(trackId: string): Promise<void> {
    const track = this._tracks.find((t) => t.id === trackId);
    const allVariants = track ? this.getSourcesForTrack(track) : [{ id: trackId }];

    await Promise.all(
      allVariants.map(async (variant) => {
        await deleteTrackFromCache(variant.id);
        await downloadStore.removeTrackOffline(variant.id);
        await deleteTrack(variant.id);
      }),
    );

    if (track?.isrc) {
      this._sourcesByIsrc.delete(track.isrc);
    }

    const variantIds = new Set(allVariants.map((v) => v.id));
    this._tracks = this._tracks.filter((t) => !variantIds.has(t.id));
  }

  async clear(): Promise<void> {
    this._tracks = [];
    this._lastFetchedAt = null;
    this._error = null;
    this._isInitialLoad = false;
    this._isLoadingMore = false;
    await clearTracksCache();
  }
}

export const tracksStore = new TracksStore();
