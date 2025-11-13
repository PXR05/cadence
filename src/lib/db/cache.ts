import type {
  AudioFile,
  AudioMetadata,
  Playlist,
  PlaylistDetail,
  PlaylistItem,
} from "$lib/schemas";
import Dexie, { type Table } from "dexie";

export interface CachedTrack {
  id: string;
  filename: string;
  size: number;
  uploadedAt: Date;
  metadata?: AudioMetadata;
  imageFile?: string;
  color?: string;
  cachedAt: number;
}

export interface CachedPlaylist {
  id: string;
  name: string;
  userId: string;
  coverImage?: string;
  createdAt: Date;
  updatedAt: Date;
  itemCount?: number;
  cachedAt: number;
}

export interface CachedPlaylistDetail {
  id: string;
  name: string;
  userId: string;
  coverImage?: string;
  createdAt: Date;
  updatedAt: Date;
  items: PlaylistItem[];
  cachedAt: number;
}

export interface TracksCache {
  id: string;
  tracks: CachedTrack[];
  lastFetchedAt: string | null;
}

export interface PlaylistsCache {
  id: string;
  userPlaylists: CachedPlaylist[];
  youtubePlaylists: CachedPlaylist[];
  lastFetchedAt: string | null;
}

class CacheDatabase extends Dexie {
  tracks!: Table<CachedTrack, string>;
  playlists!: Table<CachedPlaylist, string>;
  playlistDetails!: Table<CachedPlaylistDetail, string>;
  tracksCache!: Table<TracksCache, string>;
  playlistsCache!: Table<PlaylistsCache, string>;

  constructor() {
    super("CadenceCacheDB");
    this.version(1).stores({
      tracks: "id, cachedAt, uploadedAt",
      playlists: "id, cachedAt, updatedAt",
      playlistDetails: "id, cachedAt, updatedAt",
      tracksCache: "id",
      playlistsCache: "id",
    });
  }
}

export const cacheDb = new CacheDatabase();

export async function saveTracksCache(
  tracks: AudioFile[],
  lastFetchedAt: string | null
): Promise<void> {
  const cachedTracks: CachedTrack[] = tracks.map((track) => ({
    ...track,
    cachedAt: Date.now(),
  }));

  await cacheDb.transaction(
    "rw",
    [cacheDb.tracks, cacheDb.tracksCache],
    async () => {
      await cacheDb.tracks.clear();
      await cacheDb.tracks.bulkAdd(cachedTracks);
      await cacheDb.tracksCache.put({
        id: "main",
        tracks: cachedTracks,
        lastFetchedAt,
      });
    }
  );
}

export async function getTracksCache(): Promise<{
  tracks: AudioFile[];
  lastFetchedAt: string | null;
} | null> {
  const cache = await cacheDb.tracksCache.get("main");
  if (!cache) return null;

  const tracks: AudioFile[] = cache.tracks.map((track) => ({
    id: track.id,
    filename: track.filename,
    size: track.size,
    uploadedAt: track.uploadedAt,
    metadata: track.metadata,
    imageFile: track.imageFile,
    color: track.color,
  }));

  return {
    tracks,
    lastFetchedAt: cache.lastFetchedAt,
  };
}

export async function savePlaylistsCache(
  userPlaylists: Playlist[],
  youtubePlaylists: Playlist[],
  lastFetchedAt: string | null
): Promise<void> {
  const cachedUserPlaylists: CachedPlaylist[] = userPlaylists.map((p) => ({
    ...p,
    cachedAt: Date.now(),
  }));

  const cachedYoutubePlaylists: CachedPlaylist[] = youtubePlaylists.map(
    (p) => ({
      ...p,
      cachedAt: Date.now(),
    })
  );

  await cacheDb.transaction(
    "rw",
    [cacheDb.playlists, cacheDb.playlistsCache],
    async () => {
      await cacheDb.playlists.clear();
      await cacheDb.playlists.bulkAdd([
        ...cachedUserPlaylists,
        ...cachedYoutubePlaylists,
      ]);
      await cacheDb.playlistsCache.put({
        id: "main",
        userPlaylists: cachedUserPlaylists,
        youtubePlaylists: cachedYoutubePlaylists,
        lastFetchedAt,
      });
    }
  );
}

export async function getPlaylistsCache(): Promise<{
  userPlaylists: Playlist[];
  youtubePlaylists: Playlist[];
  lastFetchedAt: string | null;
} | null> {
  const cache = await cacheDb.playlistsCache.get("main");
  if (!cache) return null;

  const userPlaylists: Playlist[] = cache.userPlaylists.map((p) => ({
    id: p.id,
    name: p.name,
    userId: p.userId,
    coverImage: p.coverImage,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    itemCount: p.itemCount,
  }));

  const youtubePlaylists: Playlist[] = cache.youtubePlaylists.map((p) => ({
    id: p.id,
    name: p.name,
    userId: p.userId,
    coverImage: p.coverImage,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    itemCount: p.itemCount,
  }));

  return {
    userPlaylists,
    youtubePlaylists,
    lastFetchedAt: cache.lastFetchedAt,
  };
}

export async function savePlaylistDetail(
  playlistDetail: PlaylistDetail
): Promise<void> {
  await cacheDb.playlistDetails.put({
    ...playlistDetail,
    cachedAt: Date.now(),
  });
}

export async function getPlaylistDetail(
  id: string
): Promise<PlaylistDetail | undefined> {
  const cached = await cacheDb.playlistDetails.get(id);
  if (!cached) return undefined;

  return {
    id: cached.id,
    name: cached.name,
    userId: cached.userId,
    coverImage: cached.coverImage,
    createdAt: cached.createdAt,
    updatedAt: cached.updatedAt,
    items: cached.items,
  };
}

export async function deletePlaylistDetail(id: string): Promise<void> {
  await cacheDb.playlistDetails.delete(id);
}

export async function clearTracksCache(): Promise<void> {
  await cacheDb.transaction(
    "rw",
    [cacheDb.tracks, cacheDb.tracksCache],
    async () => {
      await cacheDb.tracks.clear();
      await cacheDb.tracksCache.clear();
    }
  );
}

export async function clearPlaylistsCache(): Promise<void> {
  await cacheDb.transaction(
    "rw",
    [cacheDb.playlists, cacheDb.playlistDetails, cacheDb.playlistsCache],
    async () => {
      await cacheDb.playlists.clear();
      await cacheDb.playlistDetails.clear();
      await cacheDb.playlistsCache.clear();
    }
  );
}

export async function clearAllCache(): Promise<void> {
  await cacheDb.transaction(
    "rw",
    [
      cacheDb.tracks,
      cacheDb.playlists,
      cacheDb.playlistDetails,
      cacheDb.tracksCache,
      cacheDb.playlistsCache,
    ],
    async () => {
      await cacheDb.tracks.clear();
      await cacheDb.playlists.clear();
      await cacheDb.playlistDetails.clear();
      await cacheDb.tracksCache.clear();
      await cacheDb.playlistsCache.clear();
    }
  );
}

export async function updateTrackColor(
  trackId: string,
  color: string
): Promise<void> {
  const track = await cacheDb.tracks.get(trackId);
  if (track) {
    await cacheDb.tracks.put({
      ...track,
      color,
    });
  }

  const cache = await cacheDb.tracksCache.get("main");
  if (cache) {
    const updatedTracks = cache.tracks.map((t) =>
      t.id === trackId ? { ...t, color } : t
    );
    await cacheDb.tracksCache.put({
      ...cache,
      tracks: updatedTracks,
    });
  }
}

export async function searchCachedTracks(
  query: string,
  limit: number = 20
): Promise<AudioFile[]> {
  const cache = await cacheDb.tracksCache.get("main");
  if (!cache) return [];

  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return [];

  const results = cache.tracks.filter((track) => {
    if (track.filename.toLowerCase().includes(normalizedQuery)) {
      return true;
    }

    if (track.metadata) {
      const { title, artist, album } = track.metadata;

      if (title && title.toLowerCase().includes(normalizedQuery)) {
        return true;
      }

      if (artist && artist.toLowerCase().includes(normalizedQuery)) {
        return true;
      }

      if (album && album.toLowerCase().includes(normalizedQuery)) {
        return true;
      }
    }

    return false;
  });

  return results.slice(0, limit).map((track) => ({
    id: track.id,
    filename: track.filename,
    size: track.size,
    uploadedAt: track.uploadedAt,
    metadata: track.metadata,
    imageFile: track.imageFile,
    color: track.color,
  }));
}
