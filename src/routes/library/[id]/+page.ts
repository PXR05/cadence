import { browser } from "$app/environment";
import { getPlaylistById, fetchTracks } from "$lib/api";
import { db } from "$lib/db/offline";
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
      playlist: loadSpecialPlaylist(playlistId),
      playlistId,
    };
  }

  return {
    playlist: getPlaylistById(playlistId).then((res) => res.playlist),
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
    let page = 1;
    let hasMore = true;
    const allItems: PlaylistItem[] = [];

    while (hasMore) {
      const result = await fetchTracks({
        page,
        limit: 100,
        sortBy: "title",
        sortOrder: "asc",
      });

      const newItems = result.tracks.map(
        (track, index): PlaylistItem => ({
          id: `${track.id}_${allItems.length + index}`,
          position: allItems.length + index,
          addedAt: now,
          audio: track,
        })
      );

      allItems.push(...newItems);
      hasMore = result.hasMore;
      page++;
    }

    playlist.items = allItems;
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
