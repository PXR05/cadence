import { getStreamUrl } from "$lib/constants";
import { getOfflineTrack } from "$lib/db/offline";

export async function getAudioUrl(trackId: string): Promise<string> {
  try {
    const offlineTrack = await getOfflineTrack(trackId);

    if (offlineTrack && offlineTrack.audioBlob) {
      const blob = new Blob([offlineTrack.audioBlob], {
        type:
          offlineTrack.mimeType || offlineTrack.audioBlob.type || "audio/mpeg",
      });
      return URL.createObjectURL(blob);
    }
  } catch (error) {
    console.warn(
      `Failed to load offline track ${trackId}, falling back to API:`,
      error
    );
  }

  return getStreamUrl(trackId);
}

export function revokeAudioUrl(url: string): void {
  if (url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}
