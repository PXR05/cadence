import { browser } from "$app/environment";
import { getUserPlaylists } from "$lib/api";
import { playlistsStore } from "$lib/stores/playlists.svelte";
import { getSpecialPlaylists } from "$lib/utils/playlist";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ params }) => {
  const type = params.type as "user" | "artist" | "album" | "youtube";

  if (!browser) {
    return {
      playlists: [] as Playlist[],
      specialPlaylists: [] as Playlist[],
      type,
      streaming: { playlists: Promise.resolve([]) },
    };
  }

  let cachedPlaylists: Playlist[] = [];
  let streamingData: Promise<Playlist[]>;

  if (type === "user") {
    cachedPlaylists = playlistsStore.userPlaylists;
    streamingData = playlistsStore
      .loadAllPlaylists()
      .then(() => playlistsStore.userPlaylists);

    return {
      playlists: cachedPlaylists,
      specialPlaylists: await getSpecialPlaylists(),
      type,
      streaming: { playlists: streamingData },
    };
  }

  if (type === "youtube") {
    cachedPlaylists = playlistsStore.youtubePlaylists;
    streamingData = playlistsStore
      .loadAllPlaylists()
      .then(() => playlistsStore.youtubePlaylists);

    return {
      playlists: cachedPlaylists,
      specialPlaylists: [] as Playlist[],
      type,
      streaming: { playlists: streamingData },
    };
  }

  const apiPlaylists = await getUserPlaylists(type);
  return {
    playlists: apiPlaylists,
    specialPlaylists: [] as Playlist[],
    type,
    streaming: { playlists: Promise.resolve(apiPlaylists) },
  };
};
