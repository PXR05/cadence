<script lang="ts">
  import { playerStore } from "$lib/stores/player.svelte";
  import { formatTime } from "$lib/utils/format";
  import { IsMobile } from "$lib/hooks/is-mobile.svelte";

  const {
    height = 6,
    showTime,
    timeSide,
    isPanelAnimating = false,
    monochrome = false,
  }: {
    height?: number;
    showTime?: boolean;
    timeSide?: "side" | "bottom";
    isPanelAnimating?: boolean;
    monochrome?: boolean;
  } = $props();

  let progressBar: HTMLDivElement | null = $state(null);
  let isDragging = $state(false);
  let pendingSeekPosition = $state<number | null>(null);
  let isHovering = $state(false);
  let hoverPosition = $state<{ x: number; time: number } | null>(null);

  const isMobile = new IsMobile();

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

  function handleProgressMouseEnter() {
    isHovering = true;
  }

  function handleProgressMouseLeave() {
    isHovering = false;
    hoverPosition = null;
  }

  function handleProgressMouseMove(e: MouseEvent) {
    if (progressBar && playerStore.duration && !isMobile.current) {
      const rect = progressBar.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;
      const time = Math.max(
        0,
        Math.min(percentage * playerStore.duration, playerStore.duration),
      );
      hoverPosition = { x: e.clientX - rect.left, time };
    }
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

<div class="flex gap-2 items-center">
  {#if showTime && timeSide === "side"}
    <span
      class="text-xs tabular-nums opacity-75"
      style="color: {monochrome
        ? 'var(--muted-foreground)'
        : playerStore.lightTrackColor};"
    >
      {formatTime(displayTime)}
    </span>
  {/if}
  <div
    bind:this={progressBar}
    onmousedown={handleProgressMouseDown}
    ontouchstart={handleProgressTouchStart}
    onmouseenter={handleProgressMouseEnter}
    onmouseleave={handleProgressMouseLeave}
    onmousemove={handleProgressMouseMove}
    role="slider"
    tabindex="0"
    aria-label="Seek slider"
    aria-valuemin={0}
    aria-valuemax={playerStore.duration}
    aria-valuenow={displayTime}
    class="group py-2 w-full"
  >
    <div
      style="height: {height}px;"
      class="relative cursor-pointer transition-colors flex items-center justify-between text-xs touch-none"
    >
      <div
        class="absolute inset-0 pointer-events-none rounded-full overflow-clip"
        style="background-color: {monochrome
          ? 'color-mix(in oklab, var(--foreground) 20%, transparent)'
          : playerStore.darkTrackColor};"
      >
        <div
          style="
          transform: translate3d({-100 + currentProgress}%, 0, 0);
          transition: {isDragging || isPanelAnimating
            ? 'none'
            : 'transform 100ms linear'};
          background-color: {monochrome
            ? 'var(--foreground)'
            : playerStore.lightTrackColor};"
          class="w-full h-full rounded-full"
        ></div>
      </div>
      
      <div
        style="transform: translate3d(calc({currentProgress}% - {height}px), 0, 0);
          transition: {isDragging || isPanelAnimating
          ? 'none'
          : 'transform 100ms linear'};"
        class="w-full h-full absolute inset-0"
      >
        <div
          style="width: {height}px; 
            height: {height * (timeSide === 'bottom' ? 3 : 2)}px; 
            margin-top: -{height / (timeSide === 'bottom' ? 1 : 2)}px;"
          class="rounded-full bg-foreground"
        ></div>
      </div>

      {#if showTime && timeSide === "bottom"}
        <div
          style="padding-top: {height * 8}px; 
            color: {monochrome
            ? 'var(--muted-foreground)'
            : playerStore.lightTrackColor};"
          class="w-full flex justify-between gap-2 select-none pointer-events-none tabular-nums opacity-75"
        >
          <span draggable={false}>
            {formatTime(displayTime)}
          </span>
          <span draggable={false}>
            {formatTime(playerStore.duration)}
          </span>
        </div>
      {/if}

      {#if !isMobile.current && isHovering && hoverPosition && progressBar}
        <div
          style="left: {hoverPosition.x}px; transform: translateX(-50%); bottom: {height +
            6}px;"
          class="absolute pointer-events-none bg-popover text-popover-foreground px-2 py-1 rounded-lg text-xs shadow-lg whitespace-nowrap tabular-nums"
        >
          {formatTime(hoverPosition.time)}
        </div>
      {/if}
    </div>
  </div>
  {#if showTime && timeSide === "side"}
    <span
      class="text-xs tabular-nums opacity-75"
      style="color: {monochrome
        ? 'var(--muted-foreground)'
        : playerStore.lightTrackColor};"
    >
      {formatTime(playerStore.duration)}
    </span>
  {/if}
</div>
