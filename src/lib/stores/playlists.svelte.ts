import { getUserPlaylists, getPlaylistById } from "$lib/api";
import {
  getPlaylistsCache,
  savePlaylistCache,
  syncPlaylistsCache,
  getPlaylistDetail as getCachedPlaylistDetail,
  syncPlaylistDetailCache,
  deletePlaylistDetail,
  deletePlaylist as deletePlaylistFromCache,
  clearPlaylistsCache,
} from "$lib/db/cache";
import { downloadStore } from "$lib/stores/download.svelte";
import type { Playlist, PlaylistDetail } from "$lib/schemas";
import { SvelteMap, SvelteSet } from "svelte/reactivity";

function toLastFetchedAtQuery(lastFetchedAt: string | null): number | undefined {
  if (!lastFetchedAt) return undefined;

  const numeric = Number(lastFetchedAt);
  if (Number.isFinite(numeric)) {
    return numeric;
  }

  const parsed = Date.parse(lastFetchedAt);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function createFetchMarker(): string {
  return Date.now().toString();
}

class PlaylistsStore {
  private _userPlaylists = $state<Playlist[]>([]);
  private _youtubePlaylists = $state<Playlist[]>([]);
  private _tidalPlaylists = $state<Playlist[]>([]);
  private _playlistDetails = $state(new SvelteMap<string, PlaylistDetail>());
  private _loadingPlaylistIds = $state(new SvelteSet<string>());
  private _lastFetchedAt = $state<string | null>(null);
  private _error = $state<string | null>(null);
  private _initialized = false;

  get userPlaylists() {
    return this._userPlaylists;
  }

  get youtubePlaylists() {
    return this._youtubePlaylists;
  }

  get tidalPlaylists() {
    return this._tidalPlaylists;
  }

  get allPlaylists() {
    const all = [
      ...this._userPlaylists,
      ...this._youtubePlaylists,
      ...this._tidalPlaylists,
    ];
    return all.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  get lastFetchedAt() {
    return this._lastFetchedAt;
  }

  get error() {
    return this._error;
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
        this._tidalPlaylists = cache.tidalPlaylists;
        this._lastFetchedAt = cache.lastFetchedAt;
      }
    } catch (err) {
      console.error("Failed to load playlists from cache:", err);
    } finally {
      this._initialized = true;
    }
  }

  private async refreshCollectionsFromCache(): Promise<void> {
    const cache = await getPlaylistsCache();
    this._userPlaylists = cache?.userPlaylists ?? [];
    this._youtubePlaylists = cache?.youtubePlaylists ?? [];
    this._tidalPlaylists = cache?.tidalPlaylists ?? [];
    this._lastFetchedAt = cache?.lastFetchedAt ?? null;
  }

  async loadAllPlaylists(forceRefresh: boolean = false): Promise<void> {
    await this.initializeFromCache();

    if (!forceRefresh && this.allPlaylists.length > 0 && this.lastFetchedAt) {
      if ("onLine" in navigator && !navigator.onLine) {
        return;
      }

      const shouldRefresh = await this.shouldRefreshPlaylists();
      if (!shouldRefresh) {
        return;
      }
    }

    this.error = null;

    try {
      const lastFetchedAt = forceRefresh
        ? undefined
        : toLastFetchedAtQuery(this._lastFetchedAt);
      const shouldReplace = forceRefresh || lastFetchedAt === undefined;
      const [userPlaylists, youtubePlaylists, tidalPlaylists] =
        await Promise.all([
          getUserPlaylists({ type: "user", lastFetchedAt }),
          getUserPlaylists({ type: "youtube", lastFetchedAt }),
          getUserPlaylists({ type: "tidal", lastFetchedAt }),
        ]);

      const fetchMarker = createFetchMarker();
      await syncPlaylistsCache(
        {
          userPlaylists: userPlaylists.playlists,
          youtubePlaylists: youtubePlaylists.playlists,
          tidalPlaylists: tidalPlaylists.playlists,
        },
        [
          ...userPlaylists.deletedIds,
          ...youtubePlaylists.deletedIds,
          ...tidalPlaylists.deletedIds,
        ],
        fetchMarker,
        { replace: shouldReplace },
      );

      await this.refreshCollectionsFromCache();
      this.error = null;
    } catch (err) {
      this.error =
        err instanceof Error ? err.message : "Failed to load playlists";
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
      const lastFetchedAt = forceRefresh
        ? undefined
        : toLastFetchedAtQuery(this._lastFetchedAt);
      const shouldReplace = forceRefresh || lastFetchedAt === undefined;
      const userPlaylists = await getUserPlaylists({
        type: "user",
        lastFetchedAt,
      });

      const fetchMarker = createFetchMarker();
      await syncPlaylistsCache(
        {
          userPlaylists: userPlaylists.playlists,
          youtubePlaylists: [],
          tidalPlaylists: [],
        },
        userPlaylists.deletedIds,
        fetchMarker,
        { replace: shouldReplace },
      );

      await this.refreshCollectionsFromCache();
      this.error = null;
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
      const lastFetchedAt = forceRefresh
        ? undefined
        : toLastFetchedAtQuery(this._lastFetchedAt);
      const shouldReplace = forceRefresh || lastFetchedAt === undefined;
      const youtubePlaylists = await getUserPlaylists({
        type: "youtube",
        lastFetchedAt,
      });

      const fetchMarker = createFetchMarker();
      await syncPlaylistsCache(
        {
          userPlaylists: [],
          youtubePlaylists: youtubePlaylists.playlists,
          tidalPlaylists: [],
        },
        youtubePlaylists.deletedIds,
        fetchMarker,
        { replace: shouldReplace },
      );

      await this.refreshCollectionsFromCache();
      this.error = null;
    } catch (err) {
      this.error =
        err instanceof Error ? err.message : "Failed to load youtube playlists";
      throw err;
    }
  }

  async loadTidalPlaylists(forceRefresh: boolean = false): Promise<void> {
    await this.initializeFromCache();

    if (!forceRefresh && this.tidalPlaylists.length > 0) {
      return;
    }

    this.error = null;

    try {
      const lastFetchedAt = forceRefresh
        ? undefined
        : toLastFetchedAtQuery(this._lastFetchedAt);
      const shouldReplace = forceRefresh || lastFetchedAt === undefined;
      const tidalPlaylists = await getUserPlaylists({
        type: "tidal",
        lastFetchedAt,
      });

      const fetchMarker = createFetchMarker();
      await syncPlaylistsCache(
        {
          userPlaylists: [],
          youtubePlaylists: [],
          tidalPlaylists: tidalPlaylists.playlists,
        },
        tidalPlaylists.deletedIds,
        fetchMarker,
        { replace: shouldReplace },
      );

      await this.refreshCollectionsFromCache();
      this.error = null;
    } catch (err) {
      this.error =
        err instanceof Error ? err.message : "Failed to load tidal playlists";
      throw err;
    }
  }

  private async shouldRefreshPlaylists(): Promise<boolean> {
    try {
      const lastFetchedAt = toLastFetchedAtQuery(this._lastFetchedAt);
      const [
        latestUserPlaylists,
        latestYoutubePlaylists,
        latestTidalPlaylists,
      ] = await Promise.all([
        getUserPlaylists({ type: "user", limit: 1, lastFetchedAt }),
        getUserPlaylists({ type: "youtube", limit: 1, lastFetchedAt }),
        getUserPlaylists({ type: "tidal", limit: 1, lastFetchedAt }),
      ]);

      const currentUserCount = this.userPlaylists.length;
      const currentYoutubeCount = this.youtubePlaylists.length;
      const currentTidalCount = this.tidalPlaylists.length;

      if (
        latestUserPlaylists.deletedIds.length > 0 ||
        latestYoutubePlaylists.deletedIds.length > 0 ||
        latestTidalPlaylists.deletedIds.length > 0 ||
        (currentUserCount === 0 && latestUserPlaylists.playlists.length > 0) ||
        (currentYoutubeCount === 0 &&
          latestYoutubePlaylists.playlists.length > 0) ||
        (currentTidalCount === 0 && latestTidalPlaylists.playlists.length > 0)
      ) {
        return true;
      }

      if (latestUserPlaylists.playlists.length > 0) {
        const latestServerPlaylist = latestUserPlaylists.playlists[0];
        const latestCachedPlaylist = this.userPlaylists.find(
          (p) => p.id === latestServerPlaylist.id,
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

      if (latestYoutubePlaylists.playlists.length > 0) {
        const latestServerPlaylist = latestYoutubePlaylists.playlists[0];
        const latestCachedPlaylist = this.youtubePlaylists.find(
          (p) => p.id === latestServerPlaylist.id,
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

      if (latestTidalPlaylists.playlists.length > 0) {
        const latestServerPlaylist = latestTidalPlaylists.playlists[0];
        const latestCachedPlaylist = this.tidalPlaylists.find(
          (p) => p.id === latestServerPlaylist.id,
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

  getTidalPlaylistsFiltered(limit?: number): Playlist[] {
    const playlists = this.tidalPlaylists;
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
    forceRefresh: boolean = false,
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
          cached,
        );
        if (!shouldRefresh) {
          this._loadingPlaylistIds.delete(id);
          return cached;
        }
      }

      const lastFetchedAt =
        !forceRefresh && cached
          ? toLastFetchedAtQuery(new Date(cached.updatedAt).toISOString())
          : undefined;
      const response = await getPlaylistById(id, { lastFetchedAt });
      const playlistDetail = await syncPlaylistDetailCache(
        response.playlist,
        response.deletedItemIds,
        { replace: forceRefresh || !cached || lastFetchedAt === undefined },
      );

      this._playlistDetails.set(id, playlistDetail);

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
    cached: PlaylistDetail,
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
    this._tidalPlaylists = this._tidalPlaylists.filter((p) => p.id !== id);
    await deletePlaylistFromCache(id);
  }

  async updateCachedPlaylist(playlist: Playlist): Promise<void> {
    if (playlist.id.startsWith("youtube_")) {
      const index = this._youtubePlaylists.findIndex(
        (p) => p.id === playlist.id,
      );
      if (index !== -1) {
        this._youtubePlaylists[index] = playlist;
        await savePlaylistCache(playlist);
      }
    } else if (playlist.id.startsWith("tidal_")) {
      const index = this._tidalPlaylists.findIndex((p) => p.id === playlist.id);
      if (index !== -1) {
        this._tidalPlaylists[index] = playlist;
        await savePlaylistCache(playlist);
      }
    } else {
      const index = this._userPlaylists.findIndex((p) => p.id === playlist.id);
      if (index !== -1) {
        this._userPlaylists[index] = playlist;
        await savePlaylistCache(playlist);
      }
    }
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
    this._tidalPlaylists = [];
    this._playlistDetails.clear();
    this._loadingPlaylistIds.clear();
    this._lastFetchedAt = null;
    this._error = null;
    await clearPlaylistsCache();
  }

  invalidate(): void {
    this._lastFetchedAt = null;
  }
}

export const playlistsStore = new PlaylistsStore();
