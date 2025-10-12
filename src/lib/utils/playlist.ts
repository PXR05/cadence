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
