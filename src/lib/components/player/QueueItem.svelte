<script lang="ts">
  import { playerStore } from "$lib/stores/player.svelte";
  import { GripHorizontalIcon, PlayIcon } from "@lucide/svelte";
  import { Button } from "../ui/button";
  import { formatTime } from "$lib/utils/format";
  import type { AudioFile } from "$lib/schemas";

  const {
    index,
    isCurrentTrack,
    track,
  }: {
    index: number;
    isCurrentTrack: boolean;
    track: AudioFile;
  } = $props();

  const textColor = $derived(
    `color-mix(in oklab, ${playerStore.trackColor} 80%, var(--foreground))`,
  );
</script>

<div class="w-full flex items-center justify-center gap-2">
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
        style="color: {isCurrentTrack ? textColor : 'var(--muted-foreground)'};"
      >
        {track.metadata?.artist ?? "Unknown Artist"}
      </p>
    </div>

    {#if track.metadata && track.metadata.duration && track.metadata.duration > 0}
      <span class="text-muted-foreground px-2">
        <GripHorizontalIcon />
      </span>
    {/if}
  </Button>
</div>
