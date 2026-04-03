import { buildBackendUrl } from "$lib/stores/apiUrl.svelte";
import { authStore } from "$lib/stores/auth.svelte";

const IMAGE_AUTH_MODE_PARAM = "cadenceImageAuth";
const IMAGE_AUTH_MODE_CUSTOM = "custom";

function withImageAuthModeMarker(urlString: string): string {
  if (!authStore.shouldUseCustomMediaAuthFetch) {
    return urlString;
  }

  try {
    const url = new URL(urlString);
    url.searchParams.set(IMAGE_AUTH_MODE_PARAM, IMAGE_AUTH_MODE_CUSTOM);
    return url.toString();
  } catch {
    return urlString;
  }
}

export const getAudioBaseUrl = () => buildBackendUrl("/audio");
export const getPlaylistBaseUrl = () => buildBackendUrl("/playlist");

export const getStreamUrl = (id: string) =>
  buildBackendUrl(`/audio/${id}/stream`);
export const getImageUrl = (id: string) =>
  withImageAuthModeMarker(buildBackendUrl(`/audio/${id}/image`));
export const getPlaylistImageUrl = (id: string) =>
  withImageAuthModeMarker(buildBackendUrl(`/playlist/${id}/image`));
