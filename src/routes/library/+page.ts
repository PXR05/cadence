import { browser } from "$app/environment";
import { playlistsStore } from "$lib/stores/playlists.svelte";
import { getSpecialPlaylists } from "$lib/utils/playlist";

export async function load() {
  if (!browser) {
    return {
      specialPlaylists: [] as Playlist[],
      userPlaylists: [] as Playlist[],
      youtubePlaylists: [] as Playlist[],
      streaming: {
        userPlaylists: Promise.resolve([]),
        youtubePlaylists: Promise.resolve([]),
      },
    };
  }

  const cachedUserPlaylists = playlistsStore.getUserPlaylistsFiltered(10);
  const cachedYoutubePlaylists = playlistsStore.getYoutubePlaylistsFiltered(10);

  const streamingData = playlistsStore.loadAllPlaylists().then(() => ({
    userPlaylists: playlistsStore.getUserPlaylistsFiltered(10),
    youtubePlaylists: playlistsStore.getYoutubePlaylistsFiltered(10),
  }));

  return {
    specialPlaylists: await getSpecialPlaylists(),
    userPlaylists: cachedUserPlaylists,
    youtubePlaylists: cachedYoutubePlaylists,
    streaming: {
      userPlaylists: streamingData.then((d) => d.userPlaylists),
      youtubePlaylists: streamingData.then((d) => d.youtubePlaylists),
    },
  };
}
