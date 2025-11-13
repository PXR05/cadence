export const prerender = true;
export const ssr = false;

import { browser } from "$app/environment";
import type { Playlist } from "$lib/schemas";
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

  const cachedUserPlaylists = playlistsStore.getUserPlaylistsFiltered();
  const cachedYoutubePlaylists = playlistsStore.getYoutubePlaylistsFiltered();

  const streamingData = playlistsStore.loadAllPlaylists().then(() => ({
    userPlaylists: playlistsStore.getUserPlaylistsFiltered(),
    youtubePlaylists: playlistsStore.getYoutubePlaylistsFiltered(),
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
