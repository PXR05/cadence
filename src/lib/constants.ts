const BACKEND_URL = import.meta.env.VITE_API_URL;

export const BASE_URL = `${BACKEND_URL}/audio`;
export const PLAYLIST_URL = `${BACKEND_URL}/playlist`;

export const getStreamUrl = (id: string) => `${BASE_URL}/${id}/stream`;
export const getImageUrl = (id: string) => `${BASE_URL}/${id}/image`;
export const getPlaylistImageUrl = (id: string) =>
  `${PLAYLIST_URL}/${id}/image`;
