import { buildBackendUrl } from "$lib/stores/apiUrl.svelte";

export const getAudioBaseUrl = () => buildBackendUrl("/audio");
export const getPlaylistBaseUrl = () => buildBackendUrl("/playlist");

export const getStreamUrl = (id: string) =>
  buildBackendUrl(`/audio/${id}/stream`);
export const getImageUrl = (id: string) =>
  buildBackendUrl(`/audio/${id}/image`);
export const getPlaylistImageUrl = (id: string) =>
  buildBackendUrl(`/playlist/${id}/image`);
