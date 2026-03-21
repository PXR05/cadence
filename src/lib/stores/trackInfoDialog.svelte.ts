import type { AudioFile } from "$lib/schemas";

function createTrackInfoDialogStore() {
  let track = $state<AudioFile | null>(null);

  let openDialogFn = $state<((trackId: string) => void) | undefined>(undefined);
  let closeDialogFn = $state<(() => void) | undefined>(undefined);

  return {
    get track() {
      return track;
    },

    registerDialogHandlers(
      openFn: (trackId: string) => void,
      closeFn: () => void,
    ) {
      openDialogFn = openFn;
      closeDialogFn = closeFn;
    },

    open(targetTrack: AudioFile) {
      track = targetTrack;
      openDialogFn?.(targetTrack.id);
    },

    openById(trackId: string) {
      openDialogFn?.(trackId);
    },

    setTrack(targetTrack: AudioFile) {
      track = targetTrack;
    },

    close() {
      closeDialogFn?.();
    },

    clear() {
      track = null;
    },
  };
}

export const trackInfoDialogStore = createTrackInfoDialogStore();
