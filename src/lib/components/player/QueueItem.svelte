<script lang="ts">
  import { getImageUrl } from "$lib/constants";
  import { playerStore } from "$lib/stores/player.svelte";
  import {
    GripHorizontalIcon,
    PlayIcon,
    Volume2Icon,
    XIcon,
  } from "@lucide/svelte";
  import { Button } from "../ui/button";
  import { Swiper } from "../ui/swiper";
  import type { AudioFile } from "$lib/schemas";

  const {
    index,
    isCurrentTrack,
    track,
    dragHandleProps,
  }: {
    index: number;
    isCurrentTrack: boolean;
    track: AudioFile;
    dragHandleProps?: {
      onpointerdown: (e: PointerEvent) => void;
      style: string;
    };
  } = $props();

  let swiperRef: Swiper | null = $state(null);

  $effect(() => {
    index;
    swiperRef?.recenter();
  });

  const textColor = $derived(
    `color-mix(in oklab, ${playerStore.trackColor} 80%, var(--foreground))`,
  );

  function handleSwipe() {
    playerStore.removeFromQueue(index);
  }
</script>

<Swiper bind:this={swiperRef} onswipe={handleSwipe}>
  <div class="group flex items-center justify-center gap-2">
    <Button
      variant="ghost"
      onclick={() => playerStore.playAtIndex(index)}
      class="h-auto w-full flex items-center gap-3 p-2.5 text-left group rounded-lg
     {isCurrentTrack ? 'bg-muted/70' : ''}"
    >
      <div
        class="relative rounded-sm size-12 shrink-0 overflow-hidden bg-muted"
      >
        <img
          loading="lazy"
          crossorigin="use-credentials"
          src={getImageUrl(track.id)}
          alt={track.metadata?.title ?? track.filename ?? track.id}
          class="size-full object-cover"
        />
        {#if isCurrentTrack && playerStore.isPlaying}
          <div
            class="absolute inset-0 grid place-items-center bg-background/80"
          >
            <Volume2Icon class="size-5" style="color: {textColor};" />
          </div>
        {/if}
      </div>

      <div class="flex-1 min-w-0">
        <p
          class="text-base font-medium truncate group-hover:text-foreground {isCurrentTrack
            ? 'text-foreground'
            : 'text-muted-foreground'}"
        >
          {track.metadata?.title ?? track.filename ?? ""}
        </p>
        <p
          class="text-sm truncate group-hover:text-foreground {isCurrentTrack
            ? 'text-foreground'
            : 'text-muted-foreground'}"
        >
          {track.metadata?.artist ?? "Unknown Artist"}
        </p>
      </div>

      {#if dragHandleProps}
        <div class="flex items-center group/grip">
          <button
            type="button"
            class="text-muted-foreground p-1 hidden md:opacity-0 md:group-hover/grip:opacity-100 md:block hover:text-destructive transition-opacity"
            onclick={(e) => {
              e.stopPropagation();
              playerStore.removeFromQueue(index);
            }}
            aria-label="Remove from queue"
          >
            <XIcon size={18} />
          </button>
          <span
            class="text-muted-foreground px-2 cursor-grab active:cursor-grabbing touch-none"
            onpointerdown={(e) => {
              e.stopPropagation();
              dragHandleProps.onpointerdown(e);
            }}
            style={dragHandleProps.style}
            role="button"
            tabindex="0"
            aria-label="Drag to reorder"
            data-vaul-no-drag
          >
            <GripHorizontalIcon />
          </span>
        </div>
      {:else if track.metadata && track.metadata.duration && track.metadata.duration > 0}
        <span class="text-muted-foreground px-2">
          <GripHorizontalIcon />
        </span>
      {/if}
    </Button>
  </div>
</Swiper>
