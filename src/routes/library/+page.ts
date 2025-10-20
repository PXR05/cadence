import { browser } from "$app/environment";
import { playlistsStore } from "$lib/stores/playlists.svelte";
import { getSpecialPlaylists } from "$lib/utils/playlist";

export async function load() {
  if (!browser) {
    return {
      specialPlaylists: [] as Playlist[],
      userPlaylists: [] as Playlist[],
      youtubePlaylists: [] as Playlist[],
    };
  }

  await playlistsStore.loadAllPlaylists();

  return {
    specialPlaylists: await getSpecialPlaylists(),
    userPlaylists: playlistsStore.getUserPlaylistsFiltered(10),
    youtubePlaylists: playlistsStore.getYoutubePlaylistsFiltered(10),
  };
}
