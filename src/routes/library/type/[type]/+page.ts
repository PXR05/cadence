import { browser } from "$app/environment";
import { getUserPlaylists } from "$lib/api";
import { getSpecialPlaylists } from "$lib/utils/playlist";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ params }) => {
  const type = params.type as "user" | "artist" | "album" | "youtube";

  if (!browser) {
    return {
      playlists: [] as Playlist[],
      specialPlaylists: [] as Playlist[],
      type,
    };
  }

  if (type === "user") {
    return {
      playlists: getUserPlaylists(type),
      specialPlaylists: getSpecialPlaylists(),
      type,
    };
  }

  return {
    playlists: getUserPlaylists(type),
    specialPlaylists: [] as Playlist[],
    type,
  };
};
