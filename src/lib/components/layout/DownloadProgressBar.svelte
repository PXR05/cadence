<script lang="ts">
  import { appearanceStore } from "$lib/stores/appearance.svelte";
  import { playerStore } from "$lib/stores/player.svelte";

  const {
    percentage = 0,
    height = 6,
  }: {
    percentage?: number;
    height?: number;
  } = $props();

  const clampedPercentage = $derived(Math.max(0, Math.min(100, percentage)));
</script>

<div
  style="height: {height}px;"
  class="relative w-full rounded-full overflow-clip"
>
  <div
    class="absolute inset-0"
    style="background-color: {playerStore.darkTrackColor};"
  ></div>
  <div
    style="
      transform: translate3d({-100 + clampedPercentage}%, 0, 0);
      transition: {appearanceStore.disableAnimations
      ? 'none'
      : 'transform 150ms ease-out'};
      background-color: {playerStore.lightTrackColor};"
    class="w-full h-full rounded-full"
  ></div>
</div>
