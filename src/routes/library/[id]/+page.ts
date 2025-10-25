export const ssr = false;

import { browser } from "$app/environment";
import { db as offlineDb } from "$lib/db/offline";
import { playlistsStore } from "$lib/stores/playlists.svelte";
import { tracksStore } from "$lib/stores/tracks.svelte";
import {
  isSpecialPlaylist,
  getSpecialPlaylist,
  SPECIAL_PLAYLIST_IDS,
} from "$lib/utils/playlist";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ params }) => {
  const playlistId = params.id;

  if (!browser) {
    return {
      playlist: null as PlaylistDetail | null,
      playlistId,
      streaming: { playlist: Promise.resolve(null) },
    };
  }

  if (isSpecialPlaylist(playlistId)) {
    const specialPlaylist = loadSpecialPlaylist(playlistId);
    return {
      playlist: await specialPlaylist,
      playlistId,
      streaming: { playlist: Promise.resolve(await specialPlaylist) },
    };
  }

  const cachedPlaylist = playlistsStore.getPlaylistDetail(playlistId);
  const streamingData = playlistsStore.loadPlaylistDetail(playlistId);

  return {
    playlist: cachedPlaylist,
    playlistId,
    streaming: { playlist: streamingData },
  };
};

async function loadSpecialPlaylist(id: string): Promise<PlaylistDetail> {
  const specialPlaylist = getSpecialPlaylist(id);
  if (!specialPlaylist) {
    throw new Error("Special playlist not found");
  }

  const now = new Date();
  const playlist: PlaylistDetail = {
    id: specialPlaylist.id,
    name: specialPlaylist.name,
    userId: specialPlaylist.userId,
    createdAt: new Date(specialPlaylist.createdAt),
    updatedAt: now,
    items: [],
  };

  if (id === SPECIAL_PLAYLIST_IDS.ALL_SONGS) {
    await tracksStore.loadAllTracks();
    
    playlist.items = tracksStore.tracks.map((track, index) => ({
      id: `${track.id}_${index}`,
      position: index,
      addedAt: now,
      audio: track,
    }));
  } else if (id === SPECIAL_PLAYLIST_IDS.DOWNLOADED) {
    const offlineTracks = (await offlineDb.tracks.toArray()).toSorted(
      (a, b) => a.downloadedAt - b.downloadedAt
    );
    const tracks = offlineTracks.map(
      (track) =>
        ({
          id: track.id,
          filename: track.filename,
          metadata: {
            title: track.metadata.title,
            artist: track.metadata.artist,
            album: track.metadata.album,
            duration: track.metadata.duration,
          },
          size: track.size,
          uploadedAt: new Date(track.downloadedAt),
        } as AudioFile)
    );

    playlist.items = tracks.map((track, index) => ({
      id: `${track.id}_${index}`,
      position: index,
      addedAt: track.uploadedAt,
      audio: track,
    }));
  }

  return playlist;
}
