<script lang="ts">
  import { playerStore } from "$lib/stores/player.svelte";
  import {
    Volume2 as Volume2Icon,
    VolumeX as VolumeXIcon,
  } from "@lucide/svelte";
  import { Button } from "../ui/button";

  const {
    side = "top",
  }: {
    side?: "top" | "bottom";
  } = $props();

  function handleVolumeChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const nextVolume = parseFloat(target.value) / 100;
    if (nextVolume > 0 && playerStore.isMuted) {
      playerStore.isMuted = false;
    }
    playerStore.volume = nextVolume;
  }

  function toggleMute() {
    playerStore.toggleMute();
  }

  const isMuted = $derived(playerStore.isMuted || playerStore.volume === 0);

  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    const delta = -e.deltaY;
    const step = 0.02;
    if (delta > 0) {
      playerStore.volume = Math.min(playerStore.volume + step, 1);
      if (playerStore.isMuted && playerStore.volume > 0) {
        playerStore.isMuted = false;
      }
    } else {
      playerStore.volume = Math.max(playerStore.volume - step, 0);
      if (playerStore.volume === 0) {
        playerStore.isMuted = true;
      }
    }
  }
</script>

<div class="group/volume relative" onwheel={handleWheel}>
  <Button
    variant="ghost"
    onclick={toggleMute}
    class="size-8 grid place-items-center hover:bg-background/50 transition-colors"
    aria-label={isMuted ? "Unmute" : "Mute"}
  >
    {#if isMuted}
      <VolumeXIcon size={18} />
    {:else}
      <Volume2Icon size={18} />
    {/if}
  </Button>

  <div
    class="pointer-events-none absolute left-1/2 -translate-x-1/2 h-34 w-20 flex items-end justify-center opacity-0 transition-all duration-150 ease-out group-hover/volume:pointer-events-auto group-hover/volume:opacity-100 group-focus-within/volume:pointer-events-auto group-focus-within/volume:opacity-100 group-hover/volume:translate-y-0 group-focus-within/volume:translate-y-0
    {side === 'top' ? 'bottom-full translate-y-2' : ''}
    {side === 'bottom' ? 'top-full -translate-y-2' : ''}"
  >
    <div
      class="relative h-32 w-8 rounded-lg border bg-muted grid place-items-center
      {side === 'top' ? 'mb-2' : ''}
      {side === 'bottom' ? 'mt-2' : ''}"
    >
      <div
        class="absolute inset-y-3 left-1/2 -translate-x-1/2 w-1.5 rounded-lg overflow-clip pointer-events-none"
        style="background-color: color-mix(in oklab, var(--foreground) 20%, transparent);"
      >
        <div
          class="absolute bottom-0 w-full rounded-lg"
          style="
              height: {playerStore.volume * 100}%;
              background-color: var(--foreground);"
        ></div>
      </div>

      <div
        class="absolute left-1/2 -translate-x-1/2 transition-opacity duration-150 opacity-80 group-hover/volume:opacity-100 group-focus-within/volume:opacity-100"
        style="bottom: calc({playerStore.volume} * (100% - 26px) + 10px);"
      >
        <div class="rounded-full bg-foreground w-3 h-1.5"></div>
      </div>

      <input
        type="range"
        min="0"
        max="100"
        step="0.01"
        value={playerStore.volume * 100}
        oninput={handleVolumeChange}
        class="absolute inset-0 z-10 cursor-pointer opacity-0 [writing-mode:vertical-lr] [direction:rtl]"
        aria-label="Volume"
      />
    </div>
  </div>
</div>
