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
  youtubeId?: string;
  tidalId?: string;
  isrc?: string;
  cachedAt: number;
}

export interface CachedPlaylist {
  id: string;
  name: string;
  userId: string;
  coverImage?: string | null;
  createdAt: Date;
  updatedAt: Date;
  itemCount?: number;
  isOffline?: boolean;
  cachedAt: number;
}

export interface CachedPlaylistDetail {
  id: string;
  name: string;
  userId: string;
  coverImage?: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: PlaylistItem[];
  cachedAt: number;
}

export interface CacheMetadata {
  key: string;
  value: string | null;
}

interface SyncOptions {
  replace?: boolean;
}

interface PlaylistCollections {
  userPlaylists: Playlist[];
  youtubePlaylists: Playlist[];
  tidalPlaylists: Playlist[];
}

class CacheDatabase extends Dexie {
  tracks!: Table<CachedTrack, string>;
  playlists!: Table<CachedPlaylist, string>;
  playlistDetails!: Table<CachedPlaylistDetail, string>;
  metadata!: Table<CacheMetadata, string>;

  constructor() {
    super("CadenceCacheDB");
    this.version(3).stores({
      tracks: "id, cachedAt, uploadedAt",
      playlists: "id, cachedAt, updatedAt, createdAt",
      playlistDetails: "id, cachedAt, updatedAt",
      metadata: "key",
    });
  }
}

export const cacheDb = new CacheDatabase();

function toCachedTrack(track: AudioFile, existing?: CachedTrack): CachedTrack {
  return {
    ...track,
    color: existing?.color ?? track.color,
    cachedAt: Date.now(),
  };
}

function toCachedPlaylist(
  playlist: Playlist,
  existing?: CachedPlaylist,
): CachedPlaylist {
  return {
    ...playlist,
    isOffline: existing?.isOffline,
    cachedAt: Date.now(),
  };
}

function mergePlaylistItems(
  existingItems: PlaylistItem[],
  incomingItems: PlaylistItem[],
  deletedItemIds: string[],
): PlaylistItem[] {
  const deletedIds = new Set(deletedItemIds);
  const itemsById = new Map<string, PlaylistItem>();

  for (const item of existingItems) {
    if (!deletedIds.has(item.id)) {
      itemsById.set(item.id, item);
    }
  }

  for (const item of incomingItems) {
    itemsById.set(item.id, item);
  }

  return Array.from(itemsById.values()).sort((a, b) => a.position - b.position);
}

export async function syncTracksCache(
  tracks: AudioFile[],
  deletedIds: string[],
  lastFetchedAt: string | null,
): Promise<void> {

  await cacheDb.transaction(
    "rw",
    [cacheDb.tracks, cacheDb.metadata],
    async () => {
      const existingTracks = await cacheDb.tracks.toArray();
      const existingById = new Map(existingTracks.map((track) => [track.id, track]));

      if (deletedIds.length > 0) {
        await cacheDb.tracks.bulkDelete(deletedIds);
      }

      if (tracks.length > 0) {
        await cacheDb.tracks.bulkPut(
          tracks.map((track) => toCachedTrack(track, existingById.get(track.id))),
        );
      }

      await cacheDb.metadata.put({
        key: "tracks_lastFetchedAt",
        value: lastFetchedAt,
      });
    },
  );
}

export async function syncPlaylistsCache(
  playlists: PlaylistCollections,
  deletedIds: string[],
  lastFetchedAt: string | null,
  options: SyncOptions = {},
): Promise<void> {
  const { replace = false } = options;
  const allPlaylists = [
    ...playlists.userPlaylists,
    ...playlists.youtubePlaylists,
    ...playlists.tidalPlaylists,
  ];

  await cacheDb.transaction(
    "rw",
    [cacheDb.playlists, cacheDb.playlistDetails, cacheDb.metadata],
    async () => {
      const existingPlaylists = await cacheDb.playlists.toArray();
      const existingById = new Map(
        existingPlaylists.map((playlist) => [playlist.id, playlist]),
      );
      const incomingIds = new Set(allPlaylists.map((playlist) => playlist.id));
      const idsToDelete = replace
        ? existingPlaylists
            .filter((playlist) => !incomingIds.has(playlist.id))
            .map((playlist) => playlist.id)
        : deletedIds;

      if (idsToDelete.length > 0) {
        await cacheDb.playlists.bulkDelete(idsToDelete);
        await cacheDb.playlistDetails.bulkDelete(idsToDelete);
      }

      if (allPlaylists.length > 0) {
        await cacheDb.playlists.bulkPut(
          allPlaylists.map((playlist) =>
            toCachedPlaylist(playlist, existingById.get(playlist.id)),
          ),
        );
      }

      await cacheDb.metadata.put({
        key: "playlists_lastFetchedAt",
        value: lastFetchedAt,
      });
    },
  );
}

export async function syncPlaylistDetailCache(
  playlistDetail: PlaylistDetail,
  deletedItemIds: string[] = [],
  options: SyncOptions = {},
): Promise<PlaylistDetail> {
  const { replace = false } = options;
  const existing = await cacheDb.playlistDetails.get(playlistDetail.id);
  const items = replace
    ? [...playlistDetail.items].sort((a, b) => a.position - b.position)
    : mergePlaylistItems(existing?.items ?? [], playlistDetail.items, deletedItemIds);

  const mergedDetail: PlaylistDetail = {
    ...playlistDetail,
    items,
  };

  await cacheDb.playlistDetails.put({
    ...mergedDetail,
    cachedAt: Date.now(),
  });

  return mergedDetail;
}

export async function saveTracksCache(
  tracks: AudioFile[],
  lastFetchedAt: string | null,
): Promise<void> {
  await syncTracksCache(tracks, [], lastFetchedAt);
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
    youtubeId: track.youtubeId,
    tidalId: track.tidalId,
    isrc: track.isrc,
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
  tidalPlaylists: Playlist[],
  lastFetchedAt: string | null,
): Promise<void> {
  await syncPlaylistsCache(
    {
      userPlaylists,
      youtubePlaylists,
      tidalPlaylists,
    },
    [],
    lastFetchedAt,
    { replace: true },
  );
}

export async function getPlaylistsCache(): Promise<{
  userPlaylists: Playlist[];
  youtubePlaylists: Playlist[];
  tidalPlaylists: Playlist[];
  lastFetchedAt: string | null;
} | null> {
  const playlists = await cacheDb.playlists.orderBy("updatedAt").toArray();
  if (playlists.length === 0) {
    const metadata = await cacheDb.metadata.get("playlists_lastFetchedAt");
    if (!metadata) return null;
  }

  const metadata = await cacheDb.metadata.get("playlists_lastFetchedAt");

  const userPlaylists: Playlist[] = [];
  const youtubePlaylists: Playlist[] = [];
  const tidalPlaylists: Playlist[] = [];

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

    if (p.id.startsWith("youtube_")) {
      youtubePlaylists.push(playlist);
    } else if (p.id.startsWith("tidal_")) {
      tidalPlaylists.push(playlist);
    } else {
      userPlaylists.push(playlist);
    }
  });

  return {
    userPlaylists,
    youtubePlaylists,
    tidalPlaylists,
    lastFetchedAt: metadata?.value ?? null,
  };
}

export async function savePlaylistCache(playlist: Playlist): Promise<void> {
  const existing = await cacheDb.playlists.get(playlist.id);
  await cacheDb.playlists.put({
    ...playlist,
    isOffline: existing?.isOffline,
    cachedAt: existing ? existing.cachedAt : Date.now(),
  });
}

export async function savePlaylistDetail(
  playlistDetail: PlaylistDetail,
): Promise<void> {
  await syncPlaylistDetailCache(playlistDetail, [], { replace: true });
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

export async function deletePlaylist(id: string): Promise<void> {
  await cacheDb.playlists.delete(id);
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
    youtubeId: track.youtubeId,
    tidalId: track.tidalId,
    isrc: track.isrc,
  }));
}

export async function updatePlaylistOfflineStatus(
  playlistId: string,
  isOffline: boolean,
): Promise<void> {
  const playlist = await cacheDb.playlists.get(playlistId);
  if (playlist) {
    await cacheDb.playlists.put({
      ...playlist,
      isOffline,
    });
  }
}

export async function getPlaylistOfflineStatus(
  playlistId: string,
): Promise<boolean> {
  const playlist = await cacheDb.playlists.get(playlistId);
  return playlist?.isOffline ?? false;
}

export async function checkAndUpdatePlaylistOfflineStatus(
  playlistId: string,
  checkTrackOffline: (trackId: string) => Promise<boolean>,
): Promise<boolean> {
  const playlistDetail = await cacheDb.playlistDetails.get(playlistId);
  if (!playlistDetail || playlistDetail.items.length === 0) {
    await updatePlaylistOfflineStatus(playlistId, false);
    return false;
  }

  const trackStatuses = await Promise.all(
    playlistDetail.items.map((item) => checkTrackOffline(item.audio.id)),
  );

  const isOffline = trackStatuses.every((status) => status);
  await updatePlaylistOfflineStatus(playlistId, isOffline);
  return isOffline;
}

export async function getTrackIdsUsedByOtherOfflinePlaylists(
  excludePlaylistId: string,
  trackIds: string[],
): Promise<Set<string>> {
  const offlinePlaylists = await cacheDb.playlists
    .filter((p) => p.isOffline === true && p.id !== excludePlaylistId)
    .toArray();

  const usedTrackIds = new Set<string>();

  for (const playlist of offlinePlaylists) {
    const detail = await cacheDb.playlistDetails.get(playlist.id);
    if (detail) {
      for (const item of detail.items) {
        if (trackIds.includes(item.audio.id)) {
          usedTrackIds.add(item.audio.id);
        }
      }
    }
  }

  return usedTrackIds;
}
