export const ssr = false;

import { browser } from "$app/environment";
import { offlineDb } from "$lib/db/offline";
import type { AudioFile, PlaylistDetail } from "$lib/schemas";
import { playlistsStore } from "$lib/stores/playlists.svelte";
import { tracksStore } from "$lib/stores/tracks.svelte";
import {
  isSpecialPlaylist,
  getSpecialPlaylist,
  SPECIAL_PLAYLIST_IDS,
} from "$lib/utils/playlist";
import type { PageLoad } from "./$types";

export const load: PageLoad = ({ params }) => {
  const playlistId = params.id;

  if (!browser) {
    return {
      playlistId,
      playlist: Promise.resolve(undefined),
    };
  }

  const playlistPromise = (async (): Promise<PlaylistDetail | undefined> => {
    try {
      if (isSpecialPlaylist(playlistId)) {
        playlistsStore.setPlaylistLoading(playlistId);
        const playlist = await loadSpecialPlaylist(playlistId);
        playlistsStore.setPlaylistDetail(playlistId, playlist);
        return playlist;
      } else {
        return await playlistsStore.loadPlaylistDetail(playlistId);
      }
    } catch (err) {
      console.error("Failed to load playlist:", err);
      playlistsStore.clearPlaylistLoading(playlistId);
      return undefined;
    }
  })();

  return {
    playlistId,
    playlist: playlistPromise,
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
