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
    };
  }

  await playlistsStore.loadAllPlaylists();

  if (type === "user") {
    return {
      playlists: playlistsStore.userPlaylists,
      specialPlaylists: await getSpecialPlaylists(),
      type,
    };
  }

  if (type === "youtube") {
    return {
      playlists: playlistsStore.youtubePlaylists,
      specialPlaylists: [] as Playlist[],
      type,
    };
  }

  return {
    playlists: await getUserPlaylists(type),
    specialPlaylists: [] as Playlist[],
    type,
  };
};
