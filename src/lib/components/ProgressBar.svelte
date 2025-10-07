<script lang="ts">
  import { playerStore } from "$lib/stores/player.svelte";
  import { formatTime } from "$lib/utils/format";

  let progressBar: HTMLDivElement | null = $state(null);
  let isDragging = $state(false);
  let pendingSeekPosition = $state<number | null>(null);

  const currentProgress = $derived(
    pendingSeekPosition !== null
      ? (pendingSeekPosition / playerStore.duration) * 100
      : playerStore.progress * 100
  );

  const displayTime = $derived(pendingSeekPosition ?? playerStore.currentTime);

  function calculateSeekPosition(clientX: number): number | null {
    if (progressBar && playerStore.duration) {
      const rect = progressBar.getBoundingClientRect();
      const clickX = clientX - rect.left;
      const percentage = clickX / rect.width;
      const newTime = percentage * playerStore.duration;
      return Math.max(0, Math.min(newTime, playerStore.duration));
    }
    return null;
  }

  function startSeek(clientX: number) {
    isDragging = true;
    pendingSeekPosition = calculateSeekPosition(clientX);
  }

  function updateSeek(clientX: number) {
    if (isDragging) {
      pendingSeekPosition = calculateSeekPosition(clientX);
    }
  }

  function endSeek() {
    if (isDragging && pendingSeekPosition !== null) {
      playerStore.seek(pendingSeekPosition);
      pendingSeekPosition = null;
    }
    isDragging = false;
  }

  function handleProgressMouseDown(e: MouseEvent) {
    startSeek(e.clientX);
  }

  function handleMouseMove(e: MouseEvent) {
    updateSeek(e.clientX);
  }

  function handleProgressTouchStart(e: TouchEvent) {
    if (e.touches.length > 0) {
      startSeek(e.touches[0].clientX);
    }
  }

  function handleTouchMove(e: TouchEvent) {
    if (isDragging && e.touches.length > 0) {
      updateSeek(e.touches[0].clientX);
    }
  }
</script>

<svelte:window
  onmousemove={handleMouseMove}
  onmouseup={endSeek}
  ontouchmove={handleTouchMove}
  ontouchend={endSeek}
  ontouchcancel={endSeek}
/>

<div
  bind:this={progressBar}
  class="relative group h-6 bg-background cursor-pointer transition-colors px-2 flex items-center justify-between text-xs font-mono touch-none"
  onmousedown={handleProgressMouseDown}
  ontouchstart={handleProgressTouchStart}
  role="slider"
  tabindex="0"
  aria-label="Seek slider"
  aria-valuemin={0}
  aria-valuemax={playerStore.duration}
  aria-valuenow={playerStore.currentTime}
>
  <div class="absolute inset-0 bg-muted/50 pointer-events-none">
    <div
      style="width: {currentProgress}%; transition: {isDragging
        ? 'none'
        : 'width 100ms linear'};"
      class="h-full bg-foreground/30 group-hover:border-r-16 border-foreground"
    ></div>
  </div>

  <span
    draggable={false}
    class="relative z-10 text-foreground select-none pointer-events-none"
  >
    {formatTime(displayTime)}
  </span>
  <span
    draggable={false}
    class="relative z-10 text-foreground select-none pointer-events-none"
  >
    {formatTime(playerStore.duration)}
  </span>
</div>
