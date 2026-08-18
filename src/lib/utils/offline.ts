import {
  getStreamTicket,
  getStreamUrl,
} from "$lib/backend/services/media";
import { backendCapabilities } from "$lib/backend/config";
import { getOfflineTrack } from "$lib/db/offline";

interface GetAudioUrlOptions {
  useCustomAuthFetch?: boolean;
  forceRefreshTicket?: boolean;
}

interface TicketInfo {
  ticket: string;
  expiresAt: number;
}

const activeTickets = new Map<string, TicketInfo>();

export async function getOrFetchStreamTicket(
  trackId: string,
  forceRefresh = false,
): Promise<string> {
  const cached = activeTickets.get(trackId);
  const BUFFER_MS = 30_000;

  if (cached && !forceRefresh && Date.now() < cached.expiresAt - BUFFER_MS) {
    return cached.ticket;
  }

  try {
    const data: TicketInfo = await getStreamTicket(trackId);
    activeTickets.set(trackId, data);
    return data.ticket;
  } catch (error) {
    console.error(`Failed to acquire stream ticket for ${trackId}:`, error);
    throw error;
  }
}

export async function getAudioUrl(
  trackId: string,
  options?: GetAudioUrlOptions,
): Promise<string> {
  if (!backendCapabilities.media.streamTickets) {
    return getStreamUrl(trackId);
  }

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

  try {
    const ticket = await getOrFetchStreamTicket(
      trackId,
      options?.forceRefreshTicket,
    );
    const baseUrl = getStreamUrl(trackId);
    const separator = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${separator}ticket=${encodeURIComponent(ticket)}`;
  } catch (error) {
    console.warn(`Falling back to base stream URL for ${trackId}:`, error);
    return getStreamUrl(trackId);
  }
}

export function revokeAudioUrl(url: string): void {
  if (url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}
