import { getUserPlaylists, getPlaylistById } from "$lib/api";
import {
  getPlaylistsCache,
  savePlaylistsCache,
  getPlaylistDetail as getCachedPlaylistDetail,
  savePlaylistDetail,
  deletePlaylistDetail,
  deletePlaylist,
  clearPlaylistsCache,
} from "$lib/db/cache";
import { downloadStore } from "$lib/stores/download.svelte";
import type { Playlist, PlaylistDetail } from "$lib/schemas";
import { SvelteMap, SvelteSet } from "svelte/reactivity";

class PlaylistsStore {
  private _userPlaylists = $state<Playlist[]>([]);
  private _youtubePlaylists = $state<Playlist[]>([]);
  private _playlistDetails = $state(new SvelteMap<string, PlaylistDetail>());
  private _loadingPlaylistIds = $state(new SvelteSet<string>());
  private _lastFetchedAt = $state<string | null>(null);
  private _isInitialLoad = $state(false);
  private _error = $state<string | null>(null);
  private _initialized = false;

  get userPlaylists() {
    return this._userPlaylists;
  }

  get youtubePlaylists() {
    return this._youtubePlaylists;
  }

  get allPlaylists() {
    return [...this._userPlaylists, ...this._youtubePlaylists];
  }

  get lastFetchedAt() {
    return this._lastFetchedAt;
  }

  get isInitialLoad() {
    return this._isInitialLoad;
  }

  get error() {
    return this._error;
  }

  private set isInitialLoad(value: boolean) {
    this._isInitialLoad = value;
  }

  private set error(value: string | null) {
    this._error = value;
  }

  private async initializeFromCache(): Promise<void> {
    if (this._initialized) return;

    try {
      const cache = await getPlaylistsCache();
      if (cache) {
        this._userPlaylists = cache.userPlaylists;
        this._youtubePlaylists = cache.youtubePlaylists;
        this._lastFetchedAt = cache.lastFetchedAt;
      }
    } catch (err) {
      console.error("Failed to load playlists from cache:", err);
    } finally {
      this._initialized = true;
    }
  }

  async loadAllPlaylists(forceRefresh: boolean = false): Promise<void> {
    await this.initializeFromCache();

    if (!forceRefresh && this.allPlaylists.length > 0 && this.lastFetchedAt) {
      const shouldRefresh = await this.shouldRefreshPlaylists();
      if (!shouldRefresh) {
        return;
      }
    }

    this.isInitialLoad = true;
    this.error = null;

    try {
      const [userPlaylists, youtubePlaylists] = await Promise.all([
        getUserPlaylists({ type: "user" }),
        getUserPlaylists({ type: "youtube" }),
      ]);

      this._userPlaylists = userPlaylists;
      this._youtubePlaylists = youtubePlaylists;
      this._lastFetchedAt = new Date().toISOString();
      this.isInitialLoad = false;
      this.error = null;

      await savePlaylistsCache(
        userPlaylists,
        youtubePlaylists,
        this._lastFetchedAt
      );
    } catch (err) {
      this.error =
        err instanceof Error ? err.message : "Failed to load playlists";
      this.isInitialLoad = false;
      throw err;
    }
  }

  async loadUserPlaylists(forceRefresh: boolean = false): Promise<void> {
    await this.initializeFromCache();

    if (!forceRefresh && this.userPlaylists.length > 0) {
      return;
    }

    this.error = null;

    try {
      const userPlaylists = await getUserPlaylists({ type: "user" });

      this._userPlaylists = userPlaylists;
      this._lastFetchedAt = new Date().toISOString();
      this.error = null;

      await savePlaylistsCache(
        userPlaylists,
        this._youtubePlaylists,
        this._lastFetchedAt
      );
    } catch (err) {
      this.error =
        err instanceof Error ? err.message : "Failed to load user playlists";
      throw err;
    }
  }

  async loadYoutubePlaylists(forceRefresh: boolean = false): Promise<void> {
    await this.initializeFromCache();

    if (!forceRefresh && this.youtubePlaylists.length > 0) {
      return;
    }

    this.error = null;

    try {
      const youtubePlaylists = await getUserPlaylists({ type: "youtube" });

      this._youtubePlaylists = youtubePlaylists;
      this._lastFetchedAt = new Date().toISOString();
      this.error = null;

      await savePlaylistsCache(
        this._userPlaylists,
        youtubePlaylists,
        this._lastFetchedAt
      );
    } catch (err) {
      this.error =
        err instanceof Error ? err.message : "Failed to load youtube playlists";
      throw err;
    }
  }

  private async shouldRefreshPlaylists(): Promise<boolean> {
    try {
      const [latestUserPlaylists, latestYoutubePlaylists] = await Promise.all([
        getUserPlaylists({ type: "user", limit: 1 }),
        getUserPlaylists({ type: "youtube", limit: 1 }),
      ]);

      const currentUserCount = this.userPlaylists.length;
      const currentYoutubeCount = this.youtubePlaylists.length;

      if (
        (currentUserCount === 0 && latestUserPlaylists.length > 0) ||
        (currentYoutubeCount === 0 && latestYoutubePlaylists.length > 0)
      ) {
        return true;
      }

      if (latestUserPlaylists.length > 0) {
        const latestServerPlaylist = latestUserPlaylists[0];
        const latestCachedPlaylist = this.userPlaylists.find(
          (p) => p.id === latestServerPlaylist.id
        );

        if (latestCachedPlaylist) {
          const serverDate = new Date(latestServerPlaylist.updatedAt);
          const cachedDate = new Date(latestCachedPlaylist.updatedAt);

          if (serverDate > cachedDate) {
            return true;
          }
        } else {
          return true;
        }
      }

      if (latestYoutubePlaylists.length > 0) {
        const latestServerPlaylist = latestYoutubePlaylists[0];
        const latestCachedPlaylist = this.youtubePlaylists.find(
          (p) => p.id === latestServerPlaylist.id
        );

        if (latestCachedPlaylist) {
          const serverDate = new Date(latestServerPlaylist.updatedAt);
          const cachedDate = new Date(latestCachedPlaylist.updatedAt);

          if (serverDate > cachedDate) {
            return true;
          }
        } else {
          return true;
        }
      }

      return false;
    } catch (err) {
      console.error("Error checking for playlist updates:", err);
      return false;
    }
  }

  getUserPlaylistsFiltered(limit?: number): Playlist[] {
    const playlists = this.userPlaylists;
    return limit ? playlists.slice(0, limit) : playlists;
  }

  getYoutubePlaylistsFiltered(limit?: number): Playlist[] {
    const playlists = this.youtubePlaylists;
    return limit ? playlists.slice(0, limit) : playlists;
  }

  getPlaylistById(id: string): Playlist | undefined {
    return this.allPlaylists.find((p) => p.id === id);
  }

  getPlaylistDetail(id: string): PlaylistDetail | undefined {
    return this._playlistDetails.get(id);
  }

  isPlaylistLoading(id: string): boolean {
    return this._loadingPlaylistIds.has(id);
  }

  async loadPlaylistDetail(
    id: string,
    forceRefresh: boolean = false
  ): Promise<PlaylistDetail> {
    this._loadingPlaylistIds.add(id);

    try {
      const cached =
        this._playlistDetails.get(id) || (await getCachedPlaylistDetail(id));

      if (!forceRefresh && cached) {
        if (!this._playlistDetails.has(id)) {
          this._playlistDetails.set(id, cached);
        }
        const shouldRefresh = await this.shouldRefreshPlaylistDetail(
          id,
          cached
        );
        if (!shouldRefresh) {
          this._loadingPlaylistIds.delete(id);
          return cached;
        }
      }

      const response = await getPlaylistById(id);
      const playlistDetail = response.playlist;

      this._playlistDetails.set(id, playlistDetail);
      await savePlaylistDetail(playlistDetail);

      await downloadStore.recalculatePlaylistOfflineStatus(id);

      this._loadingPlaylistIds.delete(id);
      return playlistDetail;
    } catch (err) {
      const cached =
        this._playlistDetails.get(id) || (await getCachedPlaylistDetail(id));
      this._loadingPlaylistIds.delete(id);

      if (cached) {
        console.warn("Failed to refresh playlist, using cached version:", err);
        return cached;
      }
      throw err;
    }
  }

  private async shouldRefreshPlaylistDetail(
    id: string,
    cached: PlaylistDetail
  ): Promise<boolean> {
    try {
      const basicPlaylist = this.getPlaylistById(id);
      if (!basicPlaylist) return true;

      const cachedDate = new Date(cached.updatedAt);
      const listDate = new Date(basicPlaylist.updatedAt);

      return listDate > cachedDate;
    } catch (err) {
      console.error("Error checking playlist detail refresh:", err);
      return false;
    }
  }

  async invalidatePlaylistDetail(id: string): Promise<void> {
    this._playlistDetails.delete(id);
    await deletePlaylistDetail(id);
  }

  async invalidatePlaylist(id: string): Promise<void> {
    this._playlistDetails.delete(id);
    this._userPlaylists = this._userPlaylists.filter((p) => p.id !== id);
    this._youtubePlaylists = this._youtubePlaylists.filter((p) => p.id !== id);
    await deletePlaylist(id);
  }

  setPlaylistDetail(id: string, playlist: PlaylistDetail): void {
    this._playlistDetails.set(id, playlist);
    this._loadingPlaylistIds.delete(id);
  }

  setPlaylistLoading(id: string): void {
    this._loadingPlaylistIds.add(id);
  }

  clearPlaylistLoading(id: string): void {
    this._loadingPlaylistIds.delete(id);
  }

  async clear(): Promise<void> {
    this._userPlaylists = [];
    this._youtubePlaylists = [];
    this._playlistDetails.clear();
    this._loadingPlaylistIds.clear();
    this._lastFetchedAt = null;
    this._error = null;
    this._isInitialLoad = false;
    await clearPlaylistsCache();
  }

  invalidate(): void {
    this._lastFetchedAt = null;
  }
}

export const playlistsStore = new PlaylistsStore();
