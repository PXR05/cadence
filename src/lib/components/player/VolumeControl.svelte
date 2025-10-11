<script lang="ts">
  import { playerStore } from "$lib/stores/player.svelte";
  import { VolumeIcon, VolumeXIcon } from "../icons";

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
  <button
    onclick={toggleMute}
    class="size-8 grid place-items-center hover:bg-background/50 transition-colors"
    aria-label={isMuted ? "Unmute" : "Mute"}
  >
    {#if isMuted}
      <VolumeXIcon size={20} />
    {:else}
      <VolumeIcon size={20} />
    {/if}
  </button>

  <div class="group relative w-24 h-4 flex items-center bg-background">
    <div class="absolute inset-0 bg-muted/50 pointer-events-none">
      <div
        style="width: {playerStore.volume * 100}%"
        class="h-full bg-foreground/30 group-hover:border-r-12 border-foreground"
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
