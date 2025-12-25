export const BASE_URL = "/api/audio";
export const PLAYLIST_URL = "/api/playlist";

export const getStreamUrl = (id: string) => `${BASE_URL}/${id}/stream`;
export const getImageUrl = (id: string) => `${BASE_URL}/${id}/image`;
export const getPlaylistImageUrl = (id: string) =>
  `${PLAYLIST_URL}/${id}/image`;
