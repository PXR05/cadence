<script lang="ts">
  import { playerStore } from "$lib/stores/player.svelte";
  import {
    PauseIcon,
    PlayIcon,
    SkipBackIcon,
    SkipForwardIcon,
  } from "@lucide/svelte";
  import { Button } from "../ui/button";

  interface Props {
    variant?: "compact" | "large";
  }

  let { variant = "compact" }: Props = $props();

  const sizes = {
    compact: { button: 8, primary: 10, icon: 4, primaryIcon: 6 },
    large: { button: 12, primary: 16, icon: 6, primaryIcon: 8 },
  };

  const size = $derived(sizes[variant]);

  const textColor = $derived(
    `color-mix(in oklab, ${playerStore.trackColor} 30%, var(--foreground))`
  );
</script>

<div
  class="flex items-center {variant === 'large'
    ? 'justify-center'
    : ''} gap-{variant === 'large' ? '4' : '2'}"
>
  <Button
    variant="ghost"
    onclick={() => playerStore.playPrevious()}
    class="size-{size.button} grid place-items-center"
    style="color: {textColor};"
    aria-label="Previous track"
  >
    <SkipBackIcon
      absoluteStrokeWidth
      strokeWidth={2}
      fill="currentColor"
      class="size-{size.icon}"
    />
  </Button>

  <Button
    variant="ghost"
    onclick={() => playerStore.togglePlayPause()}
    class="size-{size.primary} grid place-items-center"
    style="color: {textColor};"
    aria-label={playerStore.isPlaying ? "Pause" : "Play"}
  >
    {#if playerStore.isPlaying}
      <PauseIcon
        absoluteStrokeWidth
        strokeWidth={2}
        fill="currentColor"
        class="size-{size.primaryIcon}"
      />
    {:else}
      <PlayIcon
        absoluteStrokeWidth
        strokeWidth={2}
        fill="currentColor"
        class="size-{size.primaryIcon}"
      />
    {/if}
  </Button>

  <Button
    variant="ghost"
    onclick={() => playerStore.playNext()}
    class="size-{size.button} grid place-items-center"
    style="color: {textColor};"
    aria-label="Next track"
  >
    <SkipForwardIcon
      absoluteStrokeWidth
      strokeWidth={2}
      fill="currentColor"
      class="size-{size.icon}"
    />
  </Button>
</div>
