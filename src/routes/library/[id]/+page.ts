import { browser } from "$app/environment";
import { db } from "$lib/db/offline";
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
    };
  }

  if (isSpecialPlaylist(playlistId)) {
    return {
      playlist: await loadSpecialPlaylist(playlistId),
      playlistId,
    };
  }

  const playlistDetail = await playlistsStore.loadPlaylistDetail(playlistId);

  return {
    playlist: playlistDetail,
    playlistId,
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
    const tracks = tracksStore.tracks.slice().sort((a, b) => {
      const titleA = (a.metadata?.title || a.filename).toLowerCase();
      const titleB = (b.metadata?.title || b.filename).toLowerCase();
      return titleA.localeCompare(titleB);
    });

    playlist.items = tracks.map((track, index) => ({
      id: `${track.id}_${index}`,
      position: index,
      addedAt: now,
      audio: track,
    }));
  } else if (id === SPECIAL_PLAYLIST_IDS.DOWNLOADED) {
    const offlineTracks = await db.tracks.toArray();
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
        } as AudioFile)
    );

    playlist.items = tracks.map((track, index) => ({
      id: `${track.id}_${index}`,
      position: index,
      addedAt: now,
      audio: track,
    }));
  }

  return playlist;
}
