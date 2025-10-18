import { browser } from "$app/environment";
import { getUserPlaylists } from "$lib/api";
import { getSpecialPlaylists } from "$lib/utils/playlist";

export async function load() {
  if (!browser) {
    return {
      specialPlaylists: [] as Playlist[],
      userPlaylists: [] as Playlist[],
      youtubePlaylists: [] as Playlist[],
    };
  }

  return {
    specialPlaylists: getSpecialPlaylists(),
    userPlaylists: getUserPlaylists("user", 10),
    youtubePlaylists: getUserPlaylists("youtube", 10),
  };
}
