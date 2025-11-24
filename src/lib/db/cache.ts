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

export interface CacheMetadata {
  key: string;
  value: string | null;
}

class CacheDatabase extends Dexie {
  tracks!: Table<CachedTrack, string>;
  playlists!: Table<CachedPlaylist, string>;
  playlistDetails!: Table<CachedPlaylistDetail, string>;
  metadata!: Table<CacheMetadata, string>;

  constructor() {
    super("CadenceCacheDB");
    this.version(2).stores({
      tracks: "id, cachedAt, uploadedAt",
      playlists: "id, cachedAt, updatedAt",
      playlistDetails: "id, cachedAt, updatedAt",
      metadata: "key",
    });
  }
}

export const cacheDb = new CacheDatabase();

export async function saveTracksCache(
  tracks: AudioFile[],
  lastFetchedAt: string | null,
): Promise<void> {
  const cachedTracks: CachedTrack[] = tracks.map((track) => ({
    ...track,
    cachedAt: Date.now(),
  }));

  await cacheDb.transaction(
    "rw",
    [cacheDb.tracks, cacheDb.metadata],
    async () => {
      await cacheDb.tracks.clear();
      await cacheDb.tracks.bulkAdd(cachedTracks);
      await cacheDb.metadata.put({
        key: "tracks_lastFetchedAt",
        value: lastFetchedAt,
      });
    },
  );
}

export async function getTracksCache(): Promise<{
  tracks: AudioFile[];
  lastFetchedAt: string | null;
} | null> {
  const tracks = await cacheDb.tracks.orderBy("uploadedAt").reverse().toArray();
  if (tracks.length === 0) {
    const metadata = await cacheDb.metadata.get("tracks_lastFetchedAt");
    if (!metadata) return null;
  }

  const metadata = await cacheDb.metadata.get("tracks_lastFetchedAt");

  const audioFiles: AudioFile[] = tracks.map((track) => ({
    id: track.id,
    filename: track.filename,
    size: track.size,
    uploadedAt: track.uploadedAt,
    metadata: track.metadata,
    imageFile: track.imageFile,
    color: track.color,
  }));

  return {
    tracks: audioFiles,
    lastFetchedAt: metadata?.value ?? null,
  };
}

export async function deleteTrackFromCache(id: string): Promise<void> {
  await cacheDb.tracks.delete(id);
}

export async function savePlaylistsCache(
  userPlaylists: Playlist[],
  youtubePlaylists: Playlist[],
  lastFetchedAt: string | null,
): Promise<void> {
  const cachedUserPlaylists: CachedPlaylist[] = userPlaylists.map((p) => ({
    ...p,
    cachedAt: Date.now(),
  }));

  const cachedYoutubePlaylists: CachedPlaylist[] = youtubePlaylists.map(
    (p) => ({
      ...p,
      cachedAt: Date.now(),
    }),
  );

  await cacheDb.transaction(
    "rw",
    [cacheDb.playlists, cacheDb.metadata],
    async () => {
      await cacheDb.playlists.clear();
      await cacheDb.playlists.bulkAdd([
        ...cachedUserPlaylists,
        ...cachedYoutubePlaylists,
      ]);
      await cacheDb.metadata.put({
        key: "playlists_lastFetchedAt",
        value: lastFetchedAt,
      });
    },
  );
}

export async function getPlaylistsCache(): Promise<{
  userPlaylists: Playlist[];
  youtubePlaylists: Playlist[];
  lastFetchedAt: string | null;
} | null> {
  const playlists = await cacheDb.playlists.toArray();
  if (playlists.length === 0) {
    const metadata = await cacheDb.metadata.get("playlists_lastFetchedAt");
    if (!metadata) return null;
  }

  const metadata = await cacheDb.metadata.get("playlists_lastFetchedAt");

  // Separate user and youtube playlists based on userId pattern
  const userPlaylists: Playlist[] = [];
  const youtubePlaylists: Playlist[] = [];

  playlists.forEach((p) => {
    const playlist: Playlist = {
      id: p.id,
      name: p.name,
      userId: p.userId,
      coverImage: p.coverImage,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      itemCount: p.itemCount,
    };

    // YouTube playlists have IDs starting with 'yt-'
    if (p.id.startsWith("yt-")) {
      youtubePlaylists.push(playlist);
    } else {
      userPlaylists.push(playlist);
    }
  });

  return {
    userPlaylists,
    youtubePlaylists,
    lastFetchedAt: metadata?.value ?? null,
  };
}

export async function savePlaylistDetail(
  playlistDetail: PlaylistDetail,
): Promise<void> {
  await cacheDb.playlistDetails.put({
    ...playlistDetail,
    cachedAt: Date.now(),
  });
}

export async function getPlaylistDetail(
  id: string,
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
    [cacheDb.tracks, cacheDb.metadata],
    async () => {
      await cacheDb.tracks.clear();
      await cacheDb.metadata.delete("tracks_lastFetchedAt");
    },
  );
}

export async function clearPlaylistsCache(): Promise<void> {
  await cacheDb.transaction(
    "rw",
    [cacheDb.playlists, cacheDb.playlistDetails, cacheDb.metadata],
    async () => {
      await cacheDb.playlists.clear();
      await cacheDb.playlistDetails.clear();
      await cacheDb.metadata.delete("playlists_lastFetchedAt");
    },
  );
}

export async function clearAllCache(): Promise<void> {
  await cacheDb.transaction(
    "rw",
    [
      cacheDb.tracks,
      cacheDb.playlists,
      cacheDb.playlistDetails,
      cacheDb.metadata,
    ],
    async () => {
      await cacheDb.tracks.clear();
      await cacheDb.playlists.clear();
      await cacheDb.playlistDetails.clear();
      await cacheDb.metadata.clear();
    },
  );
}

export async function updateTrackColor(
  trackId: string,
  color: string,
): Promise<void> {
  const track = await cacheDb.tracks.get(trackId);
  if (track) {
    await cacheDb.tracks.put({
      ...track,
      color,
    });
  }
}

export async function searchCachedTracks(
  query: string,
  limit: number = 20,
): Promise<AudioFile[]> {
  const tracks = await cacheDb.tracks.toArray();
  if (tracks.length === 0) return [];

  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return [];

  const results = tracks.filter((track) => {
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
