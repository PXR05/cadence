<script lang="ts">
  import { playerStore } from "$lib/stores/player.svelte";
  import { GripHorizontalIcon, PlayIcon, XIcon } from "@lucide/svelte";
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

  const textColor = $derived(
    `color-mix(in oklab, ${playerStore.trackColor} 80%, var(--foreground))`,
  );

  function handleSwipe() {
    playerStore.removeFromQueue(index);
  }
</script>

<Swiper onswipe={handleSwipe}>
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
            onpointerdown={dragHandleProps.onpointerdown}
            style={dragHandleProps.style}
            role="button"
            aria-label="Drag to reorder"
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
