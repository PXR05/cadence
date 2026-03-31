import { getStreamUrl } from "$lib/constants";
import { authFetch } from "$lib/api/fetch";
import { getOfflineTrack } from "$lib/db/offline";

interface GetAudioUrlOptions {
  useCustomAuthFetch?: boolean;
}

export async function getAudioUrl(
  trackId: string,
  options?: GetAudioUrlOptions,
): Promise<string> {
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
      error,
    );
  }

  if (options?.useCustomAuthFetch) {
    const response = await authFetch(`/audio/${trackId}/stream`);

    if (!response.ok) {
      throw new Error(
        `Failed to load audio stream: ${response.status} ${response.statusText}`,
      );
    }

    const audioBlob = await response.blob();
    return URL.createObjectURL(audioBlob);
  }

  return getStreamUrl(trackId);
}

export function revokeAudioUrl(url: string): void {
  if (url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}
