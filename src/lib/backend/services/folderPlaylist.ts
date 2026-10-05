import { requireBackendCapability } from "../capabilities";
import { addItemToPlaylist } from "./playlists";
import { uploadAudioFileWithResult } from "./uploads";

export interface FolderTrack {
  file: File;
  audioId?: string;
}

export interface FolderTrackFailure extends FolderTrack {
  error: string;
}

export async function uploadFolderToPlaylist(
  playlistId: string,
  tracks: FolderTrack[],
  onProgress?: (index: number, file: File, percent: number) => void,
) {
  requireBackendCapability("uploads.file");
  requireBackendCapability("playlists.manageItems");
  let addedCount = 0;
  const failures: FolderTrackFailure[] = [];

  for (const [index, track] of tracks.entries()) {
    let audioId = track.audioId;
    onProgress?.(index + 1, track.file, 0);
    try {
      if (!audioId) {
        const uploaded = await uploadAudioFileWithResult(track.file, {
          onProgress: (percent) => onProgress?.(index + 1, track.file, percent),
        });
        audioId = uploaded.id;
      }
      const result = await addItemToPlaylist({ playlistId, audioId });
      if (!result.success) throw new Error(result.message || "Failed to add track");
      addedCount++;
    } catch (error) {
      failures.push({
        file: track.file,
        audioId,
        error: error instanceof Error ? error.message : "Failed to import track",
      });
    }
    onProgress?.(index + 1, track.file, 100);
  }

  return { addedCount, failures };
}
