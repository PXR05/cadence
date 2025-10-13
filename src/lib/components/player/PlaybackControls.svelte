<script lang="ts">
  import { playerStore } from "$lib/stores/player.svelte";
  import {
    PauseIcon,
    PlayIcon,
    SkipBackIcon,
    SkipForwardIcon,
  } from "@lucide/svelte";

  interface Props {
    variant?: "compact" | "large";
  }

  let { variant = "compact" }: Props = $props();

  const sizes = {
    compact: { button: 8, primary: 10, icon: 18, primaryIcon: 22 },
    large: { button: 12, primary: 16, icon: 24, primaryIcon: 32 },
  };

  const size = $derived(sizes[variant]);
</script>

<div
  class="flex items-center {variant === 'large'
    ? 'justify-center'
    : ''} gap-{variant === 'large' ? '4' : '2'}"
>
  <button
    onclick={() => playerStore.playPrevious()}
    class="size-{size.button} grid place-items-center hover:bg-{variant ===
    'large'
      ? 'muted'
      : 'background/50'} transition-colors {variant === 'large'
      ? ''
      : 'disabled:opacity-30 disabled:cursor-not-allowed'}"
    aria-label="Previous track"
  >
    <SkipBackIcon
      absoluteStrokeWidth
      strokeWidth={2}
      fill="currentColor"
      size={size.icon}
    />
  </button>

  <button
    onclick={() => playerStore.togglePlayPause()}
    class="size-{size.primary} grid place-items-center hover:bg-{variant ===
    'large'
      ? 'muted'
      : 'background/50'} transition-colors {variant === 'large' ? '' : ''}"
    aria-label={playerStore.isPlaying ? "Pause" : "Play"}
  >
    {#if playerStore.isPlaying}
      <PauseIcon
        absoluteStrokeWidth
        strokeWidth={2}
        fill="currentColor"
        size={size.primaryIcon}
      />
    {:else}
      <PlayIcon
        absoluteStrokeWidth
        strokeWidth={2}
        fill="currentColor"
        size={size.primaryIcon}
      />
    {/if}
  </button>

  <button
    onclick={() => playerStore.playNext()}
    class="size-{size.button} grid place-items-center hover:bg-{variant ===
    'large'
      ? 'muted'
      : 'background/50'} transition-colors {variant === 'large'
      ? ''
      : 'disabled:opacity-30 disabled:cursor-not-allowed'}"
    aria-label="Next track"
  >
    <SkipForwardIcon
      absoluteStrokeWidth
      strokeWidth={2}
      fill="currentColor"
      size={size.icon}
    />
  </button>
</div>
