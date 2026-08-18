import { backendConfig } from "../config";
import { buildBackendUrl } from "../runtime.svelte";
import { backendRequest } from "../client";
import { requireBackendCapability } from "../capabilities";
import { authStore } from "$lib/stores/auth.svelte";

const IMAGE_AUTH_MODE_PARAM = "cadenceImageAuth";
const IMAGE_AUTH_MODE_CUSTOM = "custom";

function withImageAuthModeMarker(urlString: string, customAuth: boolean): string {
  if (!customAuth) return urlString;
  const url = new URL(urlString);
  url.searchParams.set(IMAGE_AUTH_MODE_PARAM, IMAGE_AUTH_MODE_CUSTOM);
  return url.toString();
}

export function getStreamUrl(id: string): string {
  requireBackendCapability("media.streaming");
  return buildBackendUrl(backendConfig.routes.audio.stream(id));
}

export function getTrackImageUrl(
  id: string,
  customAuth = authStore.shouldUseCustomMediaAuthFetch,
): string {
  if (!backendConfig.capabilities.media.images) return "";
  return withImageAuthModeMarker(
    buildBackendUrl(backendConfig.routes.audio.image(id)),
    customAuth,
  );
}

export function getPlaylistImageUrl(
  id: string,
  customAuth = authStore.shouldUseCustomMediaAuthFetch,
): string {
  if (!backendConfig.capabilities.media.images) return "";
  return withImageAuthModeMarker(
    buildBackendUrl(backendConfig.routes.playlists.image(id)),
    customAuth,
  );
}

export async function fetchTrackStream(
  id: string,
  signal?: AbortSignal,
): Promise<Response> {
  requireBackendCapability("media.streaming");
  return backendRequest(backendConfig.routes.audio.stream(id), { signal });
}

export async function fetchTrackImage(
  id: string,
  signal?: AbortSignal,
): Promise<Response> {
  requireBackendCapability("media.images");
  return backendRequest(backendConfig.routes.audio.image(id), { signal });
}

export async function fetchMediaUrl(
  url: string,
  signal?: AbortSignal,
): Promise<Response> {
  requireBackendCapability("media.images");
  return backendRequest(url, { signal });
}

export async function getStreamTicket(id: string): Promise<{
  ticket: string;
  expiresAt: number;
}> {
  requireBackendCapability("media.streamTickets");
  const response = await backendRequest(backendConfig.routes.audio.ticket(id), {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(
      `Failed to get stream ticket: ${response.status} ${response.statusText}`,
    );
  }
  return response.json();
}
