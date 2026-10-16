import { backendCapabilities } from "$lib/backend/config";
import type { Playlist } from "$lib/schemas";
import type { playlistsStore } from "$lib/stores/playlists.svelte";
import {
  isAlbumPlaylist,
  isPlaylistPlaylist,
  SPECIAL_PLAYLIST_IDS,
} from "$lib/utils/playlist";
import type { LibrarySource, LibraryType } from "$lib/utils/artists";

type PlaylistsStore = typeof playlistsStore;

export function getBasePlaylists(
  store: Pick<
    PlaylistsStore,
    "tidalPlaylists" | "youtubePlaylists" | "userPlaylists" | "allPlaylists"
  >,
  source: LibrarySource,
  tracksCount: number,
  offlineCount: number,
): Playlist[] {
  if (source === "tidal") {
    return backendCapabilities.remoteProviders.tidal.import
      ? store.tidalPlaylists
      : [];
  }
  if (source === "youtube") {
    return backendCapabilities.remoteProviders.youtube.import
      ? store.youtubePlaylists
      : [];
  }
  return [
    ...(backendCapabilities.library.enabled
      ? [
          {
            id: SPECIAL_PLAYLIST_IDS.ALL_SONGS,
            name: "All Songs",
            userId: "system",
            createdAt: new Date(),
            updatedAt: new Date(),
            itemCount: tracksCount,
          },
        ]
      : []),
    ...(backendCapabilities.offline
      ? [
          {
            id: SPECIAL_PLAYLIST_IDS.DOWNLOADED,
            name: "Downloaded Songs",
            userId: "system",
            createdAt: new Date(),
            updatedAt: new Date(),
            itemCount: offlineCount,
          },
        ]
      : []),
    ...(backendCapabilities.playlists.enabled
      ? source === "local"
        ? store.userPlaylists
        : store.allPlaylists.filter(
            (playlist) =>
              (!playlist.id.startsWith("youtube_") ||
                backendCapabilities.remoteProviders.youtube.import) &&
              (!playlist.id.startsWith("tidal_") ||
                backendCapabilities.remoteProviders.tidal.import),
          )
      : []),
  ];
}

export function applyPlaylistTypeFilter(
  playlists: Playlist[],
  type: LibraryType,
): Playlist[] {
  if (type === "playlists") {
    return playlists.filter((p) => isPlaylistPlaylist(p.id));
  }
  if (type === "albums") {
    return playlists.filter((p) => isAlbumPlaylist(p.id));
  }
  return playlists;
}
