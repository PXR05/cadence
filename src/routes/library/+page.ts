export const prerender = true;
export const ssr = false;

import { browser } from "$app/environment";
import { playlistsStore } from "$lib/stores/playlists.svelte";

export async function load() {
  if (!browser) {
    return {};
  }

  playlistsStore.loadAllPlaylists();

  return {};
}
