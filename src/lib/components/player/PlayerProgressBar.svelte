<script lang="ts">
  import { playerStore } from "$lib/stores/player.svelte";
  import { formatTime } from "$lib/utils/format";

  const {
    height = 6,
    showTime,
    isPanelAnimating = false,
  }: {
    height?: number;
    showTime?: boolean;
    isPanelAnimating?: boolean;
  } = $props();

  let progressBar: HTMLDivElement | null = $state(null);
  let isDragging = $state(false);
  let pendingSeekPosition = $state<number | null>(null);

  const currentProgress = $derived(
    pendingSeekPosition !== null
      ? (pendingSeekPosition / playerStore.duration) * 100
      : playerStore.progress * 100,
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

  const primaryColor = $derived(playerStore.trackColor ?? "var(--primary)");
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
  style="height: {height}px;"
  class="relative group cursor-pointer transition-colors flex items-center justify-between text-xs touch-none"
  onmousedown={handleProgressMouseDown}
  ontouchstart={handleProgressTouchStart}
  role="slider"
  tabindex="0"
  aria-label="Seek slider"
  aria-valuemin={0}
  aria-valuemax={playerStore.duration}
  aria-valuenow={displayTime}
>
  <div
    class="absolute inset-0 pointer-events-none rounded-full overflow-clip"
    style="background-color:
      color-mix(
        in oklab,
        {primaryColor} 20%,
        transparent
      );"
  >
    <div
      style="
      transform: translate3d({-100 + currentProgress}%, 0, 0);
      transition: {isDragging || isPanelAnimating
        ? 'none'
        : 'transform 100ms linear'};
      background-color:
        color-mix(
          in oklab,
          {primaryColor} 40%,
          var(--foreground)
        );"
      class="w-full h-full rounded-full"
    ></div>
    <div
      style="transform: translate3d(calc({currentProgress}% - {height}px), 0, 0);
      transition: {isDragging || isPanelAnimating
        ? 'none'
        : 'transform 100ms linear'};"
      class="w-full h-full absolute inset-0"
    >
      <div
        style="width: {height * 2}px; height: {height}px;"
        class="rounded-full dark:bg-white bg-black group-hover:opacity-100 opacity-0"
      ></div>
    </div>
  </div>
  {#if showTime}
    <div
      style="padding-top: {height * 3.5}px;"
      class="w-full flex justify-between gap-2 text-muted-foreground select-none pointer-events-none tabular-nums"
    >
      <span draggable={false}>
        {formatTime(displayTime)}
      </span>
      <span draggable={false}>
        {formatTime(playerStore.duration)}
      </span>
    </div>
  {/if}
</div>
