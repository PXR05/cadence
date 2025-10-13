import Dexie, { type Table } from "dexie";

export interface OfflineTrack {
  id: string;
  audioBlob: Blob;
  mimeType: string;
  metadata: {
    title?: string;
    artist?: string;
    album?: string;
    duration?: number;
  };
  filename: string;
  downloadedAt: number;
}

export interface OfflinePlaylist {
  id: string;
  name: string;
  trackIds: string[];
  downloadedAt: number;
}

class OfflineDatabase extends Dexie {
  tracks!: Table<OfflineTrack, string>;
  playlists!: Table<OfflinePlaylist, string>;

  constructor() {
    super("CadenceOfflineDB");
    this.version(1).stores({
      tracks: "id, downloadedAt",
      playlists: "id, downloadedAt",
    });

    this.version(2)
      .stores({
        tracks: "id, downloadedAt",
        playlists: "id, downloadedAt",
      })
      .upgrade(async (tx) => {
        const tracks = await tx.table("tracks").toArray();
        for (const track of tracks) {
          if (!track.mimeType) {
            await tx.table("tracks").update(track.id, {
              mimeType: track.audioBlob?.type || "audio/mpeg",
            });
          }
        }
      });
  }
}

export const db = new OfflineDatabase();

export async function saveTrackOffline(
  trackId: string,
  audioBlob: Blob,
  metadata: OfflineTrack["metadata"],
  filename: string
): Promise<void> {
  await db.tracks.put({
    id: trackId,
    audioBlob,
    mimeType: audioBlob.type || "audio/mpeg",
    metadata,
    filename,
    downloadedAt: Date.now(),
  });
}

export async function getOfflineTrack(
  trackId: string
): Promise<OfflineTrack | undefined> {
  return db.tracks.get(trackId);
}

export async function isTrackOffline(trackId: string): Promise<boolean> {
  const track = await db.tracks.get(trackId);
  return !!track;
}

export async function deleteOfflineTrack(trackId: string): Promise<void> {
  await db.tracks.delete(trackId);
}

export async function savePlaylistOffline(
  playlistId: string,
  name: string,
  trackIds: string[]
): Promise<void> {
  await db.playlists.put({
    id: playlistId,
    name,
    trackIds,
    downloadedAt: Date.now(),
  });
}

export async function getOfflinePlaylist(
  playlistId: string
): Promise<OfflinePlaylist | undefined> {
  return db.playlists.get(playlistId);
}

export async function isPlaylistOffline(playlistId: string): Promise<boolean> {
  const playlist = await db.playlists.get(playlistId);
  if (!playlist) return false;

  const trackStatuses = await Promise.all(
    playlist.trackIds.map((id) => isTrackOffline(id))
  );

  return trackStatuses.every((status) => status);
}

export async function deleteOfflinePlaylist(playlistId: string): Promise<void> {
  const playlist = await db.playlists.get(playlistId);
  if (playlist) {
    await Promise.all(playlist.trackIds.map((id) => deleteOfflineTrack(id)));
    await db.playlists.delete(playlistId);
  }
}

export async function getAllOfflinePlaylists(): Promise<OfflinePlaylist[]> {
  return db.playlists.toArray();
}

export async function getStorageEstimate(): Promise<{
  usage: number;
  quota: number;
} | null> {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0,
    };
  }
  return null;
}
