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
  }
) {
  const actualIndex = index % opts.queueLength;
  return (
    Math.abs(actualIndex - opts.currentIndex) <= opts.buffer &&
    opts.queueLength > 0
  );
}
