import { usePlaylistOffline } from "$lib/hooks";
import type { PlaylistDetail } from "$lib/schemas";
import { playerStore } from "$lib/stores/player.svelte";
import { playlistMenuStore } from "$lib/stores/playlistMenu.svelte";

export function usePlaylistHeaderActions(getPlaylist: () => PlaylistDetail) {
  const playlistId = $derived(getPlaylist().id);
  const offline = usePlaylistOffline(() => playlistId);

  $effect(() => {
    offline.checkOfflineStatus();
  });

  function handlePlay() {
    const playlist = getPlaylist();
    if (playlist.items.length === 0) return;

    const tracks = playlist.items.map((item) => item.audio);
    playerStore.setQueue(tracks, 0, playlist);
  }

  function handleShuffle() {
    const playlist = getPlaylist();
    if (playlist.items.length === 0) return;

    const tracks = playlist.items.map((item) => item.audio);
    playerStore.setQueue(tracks, -1, playlist);
    playerStore.isShuffled = true;
    playerStore.play();
  }

  function handleMenu(e: MouseEvent) {
    e.preventDefault();

    const playlist = getPlaylist();
    playlistMenuStore.open(
      {
        id: playlist.id,
        name: playlist.name,
        userId: playlist.userId,
        createdAt: playlist.createdAt,
        updatedAt: playlist.updatedAt,
        coverImage: playlist.coverImage,
        itemCount: playlist.items.length,
      },
      offline.isOffline,
      offline.isDownloading,
    );
  }

  return {
    offline,
    handlePlay,
    handleShuffle,
    handleMenu,
  };
}
