<script lang="ts">
  import { playerStore } from "$lib/stores/player.svelte";
  import {
    PauseIcon,
    PlayIcon,
    RepeatIcon,
    ShuffleIcon,
    SkipBackIcon,
    SkipForwardIcon,
  } from "@lucide/svelte";
  import { Button } from "../ui/button";
  import { createWebHaptics } from "web-haptics/svelte";
  import { onDestroy } from "svelte";

  const { trigger, destroy } = createWebHaptics();
  onDestroy(destroy);

  interface Props {
    variant?: "compact" | "large";
    monochrome?: boolean;
  }

  let { variant = "compact", monochrome = false }: Props = $props();

  const sizes = {
    compact: { button: 8, primary: 10, icon: 4, subIcon: 4, primaryIcon: 6 },
    large: { button: 12, primary: 16, icon: 6, subIcon: 5, primaryIcon: 8 },
  };

  const size = $derived(sizes[variant]);

  const textColor = $derived(
    monochrome ? "var(--foreground)" : playerStore.lightTrackColor,
  );
</script>

<div class="flex items-center gap-4">
  <Button
    variant="ghost"
    onclick={() => {
      trigger([{ duration: 8 }]);
      playerStore.isShuffled = !playerStore.isShuffled;
    }}
    class="size-{size.button} max-md:rounded-xl grid place-items-center
    {playerStore.isShuffled ? 'hover:bg-accent/50 bg-accent' : 'opacity-50'}
    {variant === 'large' ? 'mr-auto' : 'ml-auto'}"
    style="color: {textColor};"
    aria-label="Shuffle tracks"
  >
    <ShuffleIcon
      absoluteStrokeWidth
      strokeWidth={2}
      class="size-{size.subIcon}"
    />
  </Button>

  <Button
    variant="ghost"
    onclick={() => {
      trigger([{ duration: 10 }]);
      playerStore.playPrevious();
    }}
    class="size-{size.button} max-md:rounded-xl grid place-items-center"
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
    onclick={() => {
      trigger([{ duration: 10 }]);
      playerStore.togglePlayPause();
    }}
    class="size-{size.primary} max-md:rounded-2xl grid place-items-center"
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
    onclick={() => {
      trigger([{ duration: 10 }]);
      playerStore.playNext();
    }}
    class="size-{size.button} max-md:rounded-xl grid place-items-center"
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

  <Button
    variant="ghost"
    onclick={() => {
      trigger([{ duration: 8 }]);
      playerStore.isRepeated = !playerStore.isRepeated;
    }}
    class="size-{size.button} max-md:rounded-xl grid place-items-center
    {playerStore.isRepeated ? 'hover:bg-accent/50 bg-accent' : 'opacity-50'}
    {variant === 'large' ? 'ml-auto' : 'mr-auto'}"
    style="color: {textColor};"
    aria-label="Repeat track"
  >
    <RepeatIcon
      absoluteStrokeWidth
      strokeWidth={2}
      class="size-{size.subIcon}"
    />
  </Button>
</div>
