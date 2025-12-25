import type { AudioFile } from "$lib/schemas";

function createTrackMenuStore() {
  let track = $state<AudioFile | null>(null);
  let isOffline = $state(false);
  let onOfflineStatusChange = $state<(() => void) | undefined>(undefined);

  let openDialogFn = $state<((trackId: string) => void) | undefined>(undefined);
  let closeDialogFn = $state<(() => void) | undefined>(undefined);

  return {
    get track() {
      return track;
    },
    get isOffline() {
      return isOffline;
    },
    get onOfflineStatusChange() {
      return onOfflineStatusChange;
    },

    registerDialogHandlers(
      openFn: (trackId: string) => void,
      closeFn: () => void,
    ) {
      openDialogFn = openFn;
      closeDialogFn = closeFn;
    },

    open(
      targetTrack: AudioFile,
      offline: boolean,
      offlineStatusChangeCallback?: () => void,
    ) {
      track = targetTrack;
      isOffline = offline;
      onOfflineStatusChange = offlineStatusChangeCallback;
      openDialogFn?.(targetTrack.id);
    },

    setTrack(targetTrack: AudioFile, offline: boolean = false) {
      track = targetTrack;
      isOffline = offline;
    },

    close() {
      closeDialogFn?.();
    },

    updateOfflineStatus(offline: boolean) {
      isOffline = offline;
    },

    clear() {
      track = null;
      isOffline = false;
      onOfflineStatusChange = undefined;
    },
  };
}

export const trackMenuStore = createTrackMenuStore();
