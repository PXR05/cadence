<script lang="ts">
  import { playerStore } from "$lib/stores/player.svelte";
  import { Volume2Icon, VolumeXIcon } from "@lucide/svelte";
  import { Button } from "../ui/button";

  function handleVolumeChange(e: Event) {
    const target = e.target as HTMLInputElement;
    playerStore.volume = parseFloat(target.value);
    if (playerStore.volume > 0) playerStore.isMuted = false;
    playerStore.playerRef!.volume = playerStore.volume;
  }

  function toggleMute() {
    playerStore.playerRef!.muted = !playerStore.isMuted;
    playerStore.isMuted = !playerStore.isMuted;
  }

  const isMuted = $derived(playerStore.isMuted || playerStore.volume === 0);
</script>

<div class="flex items-center gap-2">
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
    class="rounded-lg overflow-clip group relative w-24 h-1.5 flex items-center"
  >
    <div
      class="absolute inset-0 pointer-events-none"
      style="background-color: color-mix(in oklab, #{playerStore.trackColor} 20%, transparent);"
    >
      <div
        class="h-full rounded-lg"
        style="
          width: {playerStore.volume * 100}%;
          background-color: color-mix(in oklab, #{playerStore.trackColor} 80%, var(--foreground));"
      ></div>
    </div>
    <input
      type="range"
      min="0"
      max="1"
      step="0.01"
      value={playerStore.volume}
      oninput={handleVolumeChange}
      class="relative w-full h-full opacity-0 cursor-pointer z-10"
      aria-label="Volume"
    />
  </div>
</div>
