import { playerStore } from "$lib/stores/player.svelte";

export function shouldLoadItem(
  index: number,
  opts: {
    currentIndex: number;
    buffer: number;
    queueLength: number;
  } = {
    currentIndex: playerStore.queueIndex,
    buffer: 1,
    queueLength: playerStore.trackQueue.length,
  },
) {
  if (opts.queueLength === 0) {
    return false;
  }
  const actualIndex = index % opts.queueLength;
  const inRange = Math.abs(actualIndex - opts.currentIndex) <= opts.buffer;
  if (opts.currentIndex === 0) {
    return inRange || actualIndex === opts.queueLength - 1;
  }
  if (opts.currentIndex === opts.queueLength - 1) {
    return inRange || actualIndex === 0;
  }
  return inRange;
}
