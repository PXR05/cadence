import { browser } from "$app/environment";
import type { PageLoad } from "./$types";
import { loadPlaylistForRoute } from "./load-playlist";

export const load: PageLoad = ({ url }) => {
  if (!browser) {
    return {
      playlistId: null,
      playlist: Promise.resolve(undefined),
    };
  }

  const playlistId = url.searchParams.get("id");

  if (!playlistId) {
    return {
      playlistId: null,
      playlist: Promise.resolve(undefined),
    };
  }

  return {
    playlistId,
    playlist: loadPlaylistForRoute(playlistId),
  };
};
