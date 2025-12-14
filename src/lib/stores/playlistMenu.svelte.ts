import type { Playlist } from "$lib/schemas";

function createPlaylistMenuStore() {
  let playlist = $state<Playlist | null>(null);
  let isOffline = $state(false);
  let isDownloading = $state(false);
  let onPlaylistUpdated = $state<(() => void) | undefined>(undefined);
  let onPlaylistDeleted = $state<(() => void) | undefined>(undefined);

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
    get onPlaylistUpdated() {
      return onPlaylistUpdated;
    },
    get onPlaylistDeleted() {
      return onPlaylistDeleted;
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
      downloading: boolean = false,
      updatedCallback?: () => void,
      deletedCallback?: () => void,
    ) {
      playlist = targetPlaylist;
      isOffline = offline;
      isDownloading = downloading;
      onPlaylistUpdated = updatedCallback;
      onPlaylistDeleted = deletedCallback;
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
      onPlaylistUpdated = undefined;
      onPlaylistDeleted = undefined;
    },
  };
}

export const playlistMenuStore = createPlaylistMenuStore();
