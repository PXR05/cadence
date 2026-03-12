import type { Playlist } from "$lib/schemas";

export function getPlaylistDisplayName(playlist: Playlist): string {
  if (playlist.name.startsWith("artist:")) {
    return playlist.name.replace("artist:", "");
  }
  if (playlist.name.startsWith("album:")) {
    return playlist.name.replace("album:", "");
  }
  return playlist.name;
}

export function handlePlaylistImageError(e: Event): void {
  const img = e.currentTarget as HTMLImageElement;
  img.style.display = "none";
  img.nextElementSibling?.classList.remove("hidden");
  img.nextElementSibling?.classList.add("grid");
}

export function isArtistPlaylist(playlistId: string): boolean {
  return playlistId.startsWith("artist_");
}

export function isAlbumPlaylist(playlistId: string): boolean {
  return playlistId.startsWith("album_");
}

export function isYoutubePlaylist(playlistId: string): boolean {
  return playlistId.startsWith("youtube_");
}

export const SPECIAL_PLAYLIST_IDS = {
  ALL_SONGS: "special_all_songs",
  DOWNLOADED: "special_downloaded",
} as const;

export type SpecialPlaylistId =
  (typeof SPECIAL_PLAYLIST_IDS)[keyof typeof SPECIAL_PLAYLIST_IDS];

export function isSpecialPlaylist(playlistId: string): boolean {
  return Object.values(SPECIAL_PLAYLIST_IDS).includes(
    playlistId as SpecialPlaylistId,
  );
}

export function getSpecialPlaylist(playlistId: string): Playlist | undefined {
  const now = new Date();
  if (playlistId === SPECIAL_PLAYLIST_IDS.ALL_SONGS) {
    return {
      id: SPECIAL_PLAYLIST_IDS.ALL_SONGS,
      name: "All Songs",
      userId: "system",
      createdAt: now,
      updatedAt: now,
      itemCount: 0,
    };
  } else if (playlistId === SPECIAL_PLAYLIST_IDS.DOWNLOADED) {
    return {
      id: SPECIAL_PLAYLIST_IDS.DOWNLOADED,
      name: "Downloaded Songs",
      userId: "system",
      createdAt: now,
      updatedAt: now,
      itemCount: 0,
    };
  }
  return undefined;
}