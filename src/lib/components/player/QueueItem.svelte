<script lang="ts">
  import { playerStore } from "$lib/stores/player.svelte";
  import { GripHorizontalIcon, PlayIcon } from "@lucide/svelte";
  import { Button } from "../ui/button";
  import type { AudioFile } from "$lib/schemas";

  interface DragHandleProps {
    onpointerdown: (e: PointerEvent) => void;
    style: string;
  }

  const {
    index,
    isCurrentTrack,
    track,
    dragHandleProps,
  }: {
    index: number;
    isCurrentTrack: boolean;
    track: AudioFile;
    dragHandleProps?: DragHandleProps;
  } = $props();

  const textColor = $derived(
    `color-mix(in oklab, ${playerStore.trackColor} 80%, var(--foreground))`,
  );

  let swipeContainer: HTMLDivElement;
  let isRemoving = $state(false);
  let removeDirection = $state<"left" | "right" | null>(null);

  $effect(() => {
    if (swipeContainer && !isRemoving) {
      const centerPosition =
        swipeContainer.scrollWidth / 2 - swipeContainer.clientWidth / 2;
      swipeContainer.scrollLeft = centerPosition;
    }
  });

  function onSwipeEnd() {
    if (!swipeContainer || isRemoving) return;

    const scroll_center = swipeContainer.scrollWidth / 2;
    const viewport_center = swipeContainer.clientWidth / 2;
    const current = swipeContainer.scrollLeft + viewport_center;
    const dx = current - scroll_center;

    if (Math.abs(dx) >= 100) {
      isRemoving = true;
      removeDirection = dx < 0 ? "right" : "left";
      setTimeout(() => {
        playerStore.removeFromQueue(index);
      }, 200);
    }
  }
</script>

<div
  class="swipe-container"
  class:removing={isRemoving}
  class:removing-left={removeDirection === "left"}
  class:removing-right={removeDirection === "right"}
  bind:this={swipeContainer}
  ontouchend={onSwipeEnd}
  onpointerup={onSwipeEnd}
>
  <div class="swipe-pad"></div>
  <div class="flex items-center justify-center gap-2">
    <Button
      variant="ghost"
      onclick={() => playerStore.playAtIndex(index)}
      class="h-auto !transition-none w-full flex items-center gap-3 p-2 text-left group rounded-lg
     {isCurrentTrack ? 'bg-muted/70' : ''}"
    >
      <div class="w-8 text-center flex-shrink-0">
        {#if isCurrentTrack && playerStore.isPlaying}
          <PlayIcon
            size={16}
            fill="currentColor"
            class="m-auto"
            style="color: {textColor};"
          />
        {:else}
          <span class="text-sm text-muted-foreground">{index + 1}</span>
        {/if}
      </div>

      <div class="flex-1 min-w-0">
        <p
          class="font-medium truncate text-sm"
          style="color: {isCurrentTrack ? textColor : 'var(--foreground)'};"
        >
          {track.metadata?.title ?? track.filename ?? ""}
        </p>
        <p
          class="text-xs truncate"
          style="color: {isCurrentTrack
            ? textColor
            : 'var(--muted-foreground)'};"
        >
          {track.metadata?.artist ?? "Unknown Artist"}
        </p>
      </div>

      {#if dragHandleProps}
        <span
          class="text-muted-foreground px-2 cursor-grab active:cursor-grabbing touch-none"
          onpointerdown={dragHandleProps.onpointerdown}
          style={dragHandleProps.style}
          role="button"
          aria-label="Drag to reorder"
        >
          <GripHorizontalIcon />
        </span>
      {:else if track.metadata && track.metadata.duration && track.metadata.duration > 0}
        <span class="text-muted-foreground px-2">
          <GripHorizontalIcon />
        </span>
      {/if}
    </Button>
  </div>
  <div class="swipe-pad"></div>
</div>

<style>
  .swipe-container {
    width: 100%;
    scroll-snap-type: x mandatory;
    overflow-x: scroll;
    display: grid;
    grid-template-columns: auto 1fr auto;
    container-type: inline-size;
    transition:
      opacity 200ms ease-out,
      transform 200ms ease-out;

    &.removing {
      opacity: 0;
    }

    &.removing-left {
      transform: translateX(-100%);
    }

    &.removing-right {
      transform: translateX(100%);
    }

    > :nth-child(2) {
      width: 100cqw;
      scroll-snap-align: center;
    }

    .swipe-pad {
      width: 50cqw;
    }
    @media (width > 768px) {
      .swipe-pad {
        width: 0;
      }
    }

    -ms-overflow-style: none;
    scrollbar-width: none;
    ::-webkit-scrollbar {
      display: none;
    }
  }
</style>
