import Dexie, { type Table } from "dexie";
import { getImageUrl } from "$lib/constants";

export interface OfflineTrack {
  id: string;
  audioBlob: Blob;
  mimeType: string;
  size: number;
  metadata: {
    title?: string;
    artist?: string;
    album?: string;
    duration?: number;
  };
  filename: string;
  downloadedAt: number;
  isrc?: string;
}

export interface OfflineImage {
  id: string;
  imageBlob: Blob;
  mimeType: string;
  size: number;
  downloadedAt: number;
}

class OfflineDatabase extends Dexie {
  tracks!: Table<OfflineTrack, string>;
  images!: Table<OfflineImage, string>;

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

    this.version(3).stores({
      tracks: "id, downloadedAt",
      playlists: "id, downloadedAt",
      images: "id, downloadedAt",
    });

    this.version(4).stores({
      tracks: "id, downloadedAt",
      playlists: null,
      images: "id, downloadedAt",
    });
  }
}

export const offlineDb = new OfflineDatabase();

export async function saveTrackOffline(
  trackId: string,
  audioBlob: Blob,
  metadata: OfflineTrack["metadata"],
  filename: string,
  size?: number
): Promise<void> {
  await offlineDb.tracks.put({
    id: trackId,
    audioBlob,
    mimeType: audioBlob.type || "audio/mpeg",
    size: size || audioBlob.size,
    metadata,
    filename,
    downloadedAt: Date.now(),
  });

  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: "CACHE_IMAGE",
      url: getImageUrl(trackId),
    });
  }
}

export async function getOfflineTrack(
  trackId: string
): Promise<OfflineTrack | undefined> {
  return offlineDb.tracks.get(trackId);
}

export async function isTrackOffline(trackId: string): Promise<boolean> {
  const track = await offlineDb.tracks.get(trackId);
  return !!track;
}

export async function isTrackOfflineWithSize(
  trackId: string,
  expectedSize: number
): Promise<boolean> {
  const track = await offlineDb.tracks.get(trackId);
  if (!track) return false;
  return track.size === expectedSize;
}

export async function deleteOfflineTrack(trackId: string): Promise<void> {
  await offlineDb.tracks.delete(trackId);
  await offlineDb.images.delete(trackId).catch(() => {});
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

export async function saveImageOffline(
  trackId: string,
  imageBlob: Blob
): Promise<void> {
  await offlineDb.images.put({
    id: trackId,
    imageBlob,
    mimeType: imageBlob.type || "image/jpeg",
    size: imageBlob.size,
    downloadedAt: Date.now(),
  });
}

export async function getOfflineImage(
  trackId: string
): Promise<OfflineImage | undefined> {
  return offlineDb.images.get(trackId);
}

export async function deleteOfflineImage(trackId: string): Promise<void> {
  await offlineDb.images.delete(trackId);
}
