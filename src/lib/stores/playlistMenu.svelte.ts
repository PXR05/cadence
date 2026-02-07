import type { Playlist } from "$lib/schemas";

function createPlaylistMenuStore() {
  let playlist = $state<Playlist | null>(null);
  let isOffline = $state(false);
  let isDownloading = $state(false);
  
  let openDialogFn = $state<((playlistId: string) => void) | undefined>(
    undefined,
  );
  let closeDialogFn = $state<(() => void) | undefined>(undefined);

  return {
    get playlist() {
      return playlist;
    },
    get isOffline() {
      return isOffline;
    },
    get isDownloading() {
      return isDownloading;
    },

    registerDialogHandlers(
      openFn: (playlistId: string) => void,
      closeFn: () => void,
    ) {
      openDialogFn = openFn;
      closeDialogFn = closeFn;
    },

    open(
      targetPlaylist: Playlist,
      offline: boolean,
      downloading: boolean = false
    ) {
      playlist = targetPlaylist;
      isOffline = offline;
      isDownloading = downloading;
      openDialogFn?.(targetPlaylist.id);
    },

    setPlaylist(
      targetPlaylist: Playlist,
      offline: boolean = false,
      downloading: boolean = false,
    ) {
      playlist = targetPlaylist;
      isOffline = offline;
      isDownloading = downloading;
    },

    close() {
      closeDialogFn?.();
    },

    updateOfflineStatus(offline: boolean) {
      isOffline = offline;
    },

    updateDownloadingStatus(downloading: boolean) {
      isDownloading = downloading;
    },

    clear() {
      playlist = null;
      isOffline = false;
      isDownloading = false;
    },
  };
}

export const playlistMenuStore = createPlaylistMenuStore();
